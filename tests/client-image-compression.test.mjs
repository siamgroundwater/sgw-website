import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { prepareCmsImage, prepareTeamPortrait } from '../src/lib/client-image-compression.ts'

async function withImageEnvironment({ encodedBytes = 400, height, width }, callback) {
  const previousBitmap = globalThis.createImageBitmap
  const previousDocument = globalThis.document
  const canvases = []
  let closeCalls = 0
  let decodeCalls = 0
  let encodeCalls = 0

  globalThis.createImageBitmap = async () => {
    decodeCalls += 1
    return {
      close() { closeCalls += 1 },
      height,
      width,
    }
  }
  globalThis.document = {
    createElement(name) {
      assert.equal(name, 'canvas')
      const canvas = {
        height: 0,
        width: 0,
        getContext() {
          return {
            drawImage() {},
            imageSmoothingEnabled: false,
            imageSmoothingQuality: 'low',
          }
        },
        toBlob(done, type) {
          const byteCount = Array.isArray(encodedBytes)
            ? encodedBytes[Math.min(encodeCalls, encodedBytes.length - 1)]
            : encodedBytes
          encodeCalls += 1
          done(new Blob([new Uint8Array(byteCount)], { type }))
        },
      }
      canvases.push(canvas)
      return canvas
    },
  }

  try {
    return await callback({
      canvases,
      closeCalls: () => closeCalls,
      decodeCalls: () => decodeCalls,
    })
  } finally {
    if (previousBitmap === undefined) delete globalThis.createImageBitmap
    else globalThis.createImageBitmap = previousBitmap
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
}

test('high-resolution preparation decodes and downsizes a small-byte oversized source', async () => {
  await withImageEnvironment({ width: 7016, height: 9922 }, async (environment) => {
    const source = new File([new Uint8Array(1024)], 'poster.png', { type: 'image/png' })
    const progress = []
    const prepared = await prepareCmsImage(source, {
      onProgress: (value) => progress.push(value),
      profile: 'high-resolution',
    })

    assert.notEqual(prepared.file, source)
    assert.equal(prepared.file.name, 'poster.webp')
    assert.equal(prepared.file.type, 'image/webp')
    assert.equal(environment.decodeCalls(), 1)
    assert.equal(environment.closeCalls(), 1)
    assert.equal(environment.canvases.length, 1)
    assert.equal(Math.max(environment.canvases[0].width, environment.canvases[0].height), 5000)
    assert.deepEqual(progress, [2, 8, 20, 25, 31, 100])
    URL.revokeObjectURL(prepared.previewUrl)
  })
})

test('team portrait preparation rejects an image whose shortest edge is below 480 pixels', async () => {
  await withImageEnvironment({ width: 479, height: 700 }, async (environment) => {
    const source = new File([new Uint8Array(1024)], 'small-portrait.jpg', { type: 'image/jpeg' })

    await assert.rejects(
      prepareTeamPortrait(source),
      { message: 'TEAM_PORTRAIT_RESOLUTION_TOO_LOW' }
    )
    assert.equal(environment.decodeCalls(), 1)
    assert.equal(environment.closeCalls(), 1)
    assert.equal(environment.canvases.length, 0)
  })
})

test('team portrait preparation rejects aspect ratios outside 0.6 to 1.25', async () => {
  for (const dimensions of [
    { width: 599, height: 1000, name: 'too-narrow.jpg' },
    { width: 1260, height: 1000, name: 'too-wide.jpg' },
  ]) {
    await withImageEnvironment(dimensions, async (environment) => {
      const source = new File([new Uint8Array(1024)], dimensions.name, { type: 'image/jpeg' })

      await assert.rejects(
        prepareTeamPortrait(source),
        { message: 'TEAM_PORTRAIT_ASPECT_RATIO_INVALID' }
      )
      assert.equal(environment.decodeCalls(), 1)
      assert.equal(environment.closeCalls(), 1)
      assert.equal(environment.canvases.length, 0)
    })
  }
})

test('successful team portrait compression never shrinks its shortest edge below 480 pixels', async () => {
  const overBudgetBytes = 3 * 1024 * 1024 + 1
  await withImageEnvironment({
    encodedBytes: [overBudgetBytes, overBudgetBytes, 1000],
    width: 600,
    height: 1000,
  }, async (environment) => {
    const source = new File([new Uint8Array(overBudgetBytes)], 'dense-portrait.jpg', { type: 'image/jpeg' })
    const prepared = await prepareTeamPortrait(source)

    assert.notEqual(prepared.file, source)
    assert.equal(prepared.file.type, 'image/webp')
    assert.deepEqual(
      environment.canvases.map((canvas) => [canvas.width, canvas.height]),
      [[600, 1000], [492, 820], [480, 800]]
    )
    assert.equal(
      environment.canvases.every((canvas) => Math.min(canvas.width, canvas.height) >= 480),
      true
    )
    URL.revokeObjectURL(prepared.previewUrl)
  })
})

test('high-resolution preparation retains an original only after size and dimensions are validated', async () => {
  await withImageEnvironment({ width: 3000, height: 4000 }, async (environment) => {
    const source = new File([new Uint8Array(1024)], 'map.jpg', { type: 'image/jpeg' })
    const progress = []
    const prepared = await prepareCmsImage(source, {
      onProgress: (value) => progress.push(value),
      profile: 'high-resolution',
    })

    assert.equal(prepared.file, source)
    assert.equal(environment.decodeCalls(), 1)
    assert.equal(environment.closeCalls(), 1)
    assert.equal(environment.canvases.length, 0)
    assert.deepEqual(progress, [2, 8, 20, 100])
    URL.revokeObjectURL(prepared.previewUrl)
  })
})

test('high-resolution preparation re-encodes an over-budget source even when dimensions fit', async () => {
  await withImageEnvironment({ width: 3000, height: 4000 }, async (environment) => {
    const source = new File([
      new Uint8Array(3.5 * 1024 * 1024 + 1),
    ], 'large-map.jpg', { type: 'image/jpeg' })
    const prepared = await prepareCmsImage(source, { profile: 'high-resolution' })

    assert.notEqual(prepared.file, source)
    assert.equal(environment.decodeCalls(), 1)
    assert.equal(environment.closeCalls(), 1)
    assert.equal(environment.canvases.length, 1)
    assert.equal(Math.max(environment.canvases[0].width, environment.canvases[0].height), 4000)
    URL.revokeObjectURL(prepared.previewUrl)
  })
})

test('high-resolution preparation rejects a landscape image even when its ratio would otherwise pass', async () => {
  await withImageEnvironment({ width: 4000, height: 3000 }, async (environment) => {
    const source = new File([new Uint8Array(1024)], 'landscape-map.jpg', { type: 'image/jpeg' })

    await assert.rejects(
      prepareCmsImage(source, { profile: 'high-resolution' }),
      { message: 'SITE_MEDIA_ASPECT_RATIO_INVALID' }
    )
    assert.equal(environment.decodeCalls(), 1)
    assert.equal(environment.closeCalls(), 1)
    assert.equal(environment.canvases.length, 0)
  })
})

test('high-resolution preparation rejects insufficient dimensions before creating an upload file', async () => {
  await withImageEnvironment({ width: 900, height: 2200 }, async (environment) => {
    const source = new File([new Uint8Array(1024)], 'small-poster.png', { type: 'image/png' })

    await assert.rejects(
      prepareCmsImage(source, { profile: 'high-resolution' }),
      { message: 'SITE_MEDIA_RESOLUTION_TOO_LOW' }
    )
    assert.equal(environment.decodeCalls(), 1)
    assert.equal(environment.closeCalls(), 1)
    assert.equal(environment.canvases.length, 0)
  })
})

test('high-resolution preparation rejects the wrong portrait proportion before upload', async () => {
  await withImageEnvironment({ width: 1200, height: 2000 }, async (environment) => {
    const source = new File([new Uint8Array(1024)], 'wide-poster.png', { type: 'image/png' })

    await assert.rejects(
      prepareCmsImage(source, { profile: 'high-resolution' }),
      { message: 'SITE_MEDIA_ASPECT_RATIO_INVALID' }
    )
    assert.equal(environment.decodeCalls(), 1)
    assert.equal(environment.closeCalls(), 1)
    assert.equal(environment.canvases.length, 0)
  })
})

test('high-resolution compression never shrinks below the server resolution floor', async () => {
  await withImageEnvironment({
    encodedBytes: 3.5 * 1024 * 1024 + 1,
    width: 1240,
    height: 2000,
  }, async (environment) => {
    const source = new File([
      new Uint8Array(3.5 * 1024 * 1024 + 1),
    ], 'dense-map.jpg', { type: 'image/jpeg' })

    await assert.rejects(
      prepareCmsImage(source, { profile: 'high-resolution' }),
      { message: 'IMAGE_COMPRESSION_TOO_LARGE' }
    )
    assert.equal(environment.canvases.length, 8)
    assert.equal(
      environment.canvases.every((canvas) => canvas.width >= 1000 && canvas.height >= 2000),
      true
    )
  })
})

test('image selection paints and holds visible compression progress around preparation', () => {
  const selector = readFileSync(new URL('../src/components/cms/CmsDeferredProjectImages.tsx', import.meta.url), 'utf8')
  assert.ok(selector.indexOf('requestAnimationFrame') < selector.indexOf('prepareCmsImage(file'))
  assert.ok(selector.indexOf('setPreparationProgress(100)') < selector.indexOf('setPreparing(false)'))
  assert.match(selector, /window\.setTimeout\(resolve, 120\)/)
  assert.match(selector, /SITE_MEDIA_RESOLUTION_TOO_LOW/)
  assert.match(selector, /ด้านสั้นต้องมีอย่างน้อย 1,000 พิกเซล/)
  assert.match(selector, /SITE_MEDIA_ASPECT_RATIO_INVALID/)
  assert.match(selector, /ใช้ภาพแนวตั้งที่มีสัดส่วนใกล้เคียง/)
})
