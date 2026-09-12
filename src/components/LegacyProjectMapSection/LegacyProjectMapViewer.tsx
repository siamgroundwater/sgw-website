'use client'

import Image from 'next/image'
import {
  ExternalLink,
  Minus,
  RotateCcw,
  X,
  ZoomIn,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './LegacyProjectMapSection.module.css'

export type LegacyMapViewerCopy = {
  action: string
  close: string
  controls: string
  dialogTitle: string
  instructions: string
  openOriginal: string
  reset: string
  zoomIn: string
  zoomLevel: string
  zoomOut: string
}

type LegacyProjectMapViewerProps = {
  copy: LegacyMapViewerCopy
  imageAlt: string
  imagePath: string
}

type Point = {
  x: number
  y: number
}

type Transform = Point & {
  scale: number
}

type PointerStart = Point & {
  startedAt: number
}

const IMAGE_WIDTH = 1808
const IMAGE_HEIGHT = 2560
const IMAGE_ASPECT_RATIO = IMAGE_WIDTH / IMAGE_HEIGHT
const MIN_SCALE = 1
const MAX_SCALE = 4
const ZOOM_STEP = 0.25
const KEYBOARD_PAN_STEP = 48
const HOVER_PREVIEW_SCALE = 3.2
const DEFAULT_TRANSFORM: Transform = { scale: MIN_SCALE, x: 0, y: 0 }

function boundValue(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function distanceBetween(first: Point, second: Point) {
  return Math.hypot(second.x - first.x, second.y - first.y)
}

function midpointBetween(first: Point, second: Point): Point {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  }
}

export default function LegacyProjectMapViewer({
  copy,
  imageAlt,
  imagePath,
}: LegacyProjectMapViewerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const [isHoverPreviewActive, setIsHoverPreviewActive] = useState(false)
  const [transform, setTransform] = useState<Transform>(DEFAULT_TRANSFORM)
  const transformRef = useRef<Transform>(DEFAULT_TRANSFORM)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const hoverPreviewActiveRef = useRef(false)
  const hoverPreviewRef = useRef<HTMLElement>(null)
  const hoverTargetRef = useRef<HTMLSpanElement>(null)
  const mapPanelRef = useRef<HTMLDivElement>(null)
  const previewStageRef = useRef<HTMLDivElement>(null)
  const previewImageRef = useRef<HTMLImageElement>(null)
  const pointersRef = useRef(new Map<number, Point>())
  const pointerStartsRef = useRef(new Map<number, PointerStart>())
  const hadMultiplePointersRef = useRef(false)
  const lastTapRef = useRef<(Point & { tappedAt: number }) | null>(null)
  const lastTouchToggleAtRef = useRef(0)
  const titleId = useId()
  const instructionsId = useId()

  const constrainTransform = useCallback((candidate: Transform): Transform => {
    const scale = boundValue(candidate.scale, MIN_SCALE, MAX_SCALE)
    const canvas = canvasRef.current

    if (!canvas || scale === MIN_SCALE) {
      return { scale, x: 0, y: 0 }
    }

    const canvasWidth = canvas.clientWidth
    const canvasHeight = canvas.clientHeight
    const renderedWidth = Math.min(
      canvasWidth,
      canvasHeight * IMAGE_ASPECT_RATIO
    )
    const renderedHeight = renderedWidth / IMAGE_ASPECT_RATIO
    const maximumX = Math.max(0, (renderedWidth * scale - canvasWidth) / 2)
    const maximumY = Math.max(0, (renderedHeight * scale - canvasHeight) / 2)

    return {
      scale,
      x: boundValue(candidate.x, -maximumX, maximumX),
      y: boundValue(candidate.y, -maximumY, maximumY),
    }
  }, [])

  const commitTransform = useCallback(
    (candidate: Transform) => {
      const constrained = constrainTransform(candidate)
      transformRef.current = constrained
      setTransform(constrained)
    },
    [constrainTransform]
  )

  const resetTransform = useCallback(() => {
    commitTransform(DEFAULT_TRANSFORM)
  }, [commitTransform])

  const zoomToPoint = useCallback(
    (requestedScale: number, clientPoint?: Point) => {
      const current = transformRef.current
      const nextScale = boundValue(requestedScale, MIN_SCALE, MAX_SCALE)
      const canvas = canvasRef.current

      if (!canvas || !clientPoint || nextScale === current.scale) {
        commitTransform({ ...current, scale: nextScale })
        return
      }

      const bounds = canvas.getBoundingClientRect()
      const localPoint = {
        x: clientPoint.x - bounds.left - bounds.width / 2,
        y: clientPoint.y - bounds.top - bounds.height / 2,
      }
      const scaleRatio = nextScale / current.scale

      commitTransform({
        scale: nextScale,
        x: localPoint.x - (localPoint.x - current.x) * scaleRatio,
        y: localPoint.y - (localPoint.y - current.y) * scaleRatio,
      })
    },
    [commitTransform]
  )

  const toggleZoomAtPoint = useCallback(
    (point: Point) => {
      const nextScale =
        transformRef.current.scale > MIN_SCALE ? MIN_SCALE : MIN_SCALE * 2
      zoomToPoint(nextScale, point)
    },
    [zoomToPoint]
  )

  const setHoverPreviewActive = (isActive: boolean) => {
    if (hoverPreviewActiveRef.current === isActive) return
    hoverPreviewActiveRef.current = isActive
    setIsHoverPreviewActive(isActive)
  }

  const openViewer = (event: ReactMouseEvent<HTMLButtonElement>) => {
    openerRef.current = event.currentTarget
    setHoverPreviewActive(false)
    pointersRef.current.clear()
    pointerStartsRef.current.clear()
    hadMultiplePointersRef.current = false
    lastTapRef.current = null
    transformRef.current = DEFAULT_TRANSFORM
    setTransform(DEFAULT_TRANSFORM)
    setIsInteracting(false)
    setIsOpen(true)
  }

  const closeViewer = useCallback(() => {
    const opener = openerRef.current
    pointersRef.current.clear()
    pointerStartsRef.current.clear()
    hadMultiplePointersRef.current = false
    lastTapRef.current = null
    transformRef.current = DEFAULT_TRANSFORM
    setTransform(DEFAULT_TRANSFORM)
    setIsInteracting(false)
    setIsOpen(false)
    window.requestAnimationFrame(() => opener?.focus())
  }, [])

  useEffect(() => {
    const clearHoverPreview = () => {
      hoverPreviewActiveRef.current = false
      setIsHoverPreviewActive(false)
    }

    window.addEventListener('resize', clearHoverPreview)
    window.addEventListener('orientationchange', clearHoverPreview)
    return () => {
      window.removeEventListener('resize', clearHoverPreview)
      window.removeEventListener('orientationchange', clearHoverPreview)
    }
  }, [])

  useEffect(() => {
    const mapPanel = mapPanelRef.current
    const previewStage = previewStageRef.current
    if (!mapPanel || !previewStage) return

    const matchPreviewWidth = () => {
      const mapWidth = mapPanel.getBoundingClientRect().width
      if (mapWidth > 0) {
        previewStage.style.setProperty('--hover-preview-width', `${mapWidth}px`)
      }
    }
    const resizeObserver = new ResizeObserver(matchPreviewWidth)

    matchPreviewWidth()
    resizeObserver.observe(mapPanel)

    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const body = document.body
    const root = document.documentElement
    const scrollY = window.scrollY
    const scrollbarWidth = window.innerWidth - root.clientWidth
    const previousBodyOverflow = body.style.overflow
    const previousBodyPaddingRight = body.style.paddingRight
    const previousBodyPosition = body.style.position
    const previousBodyTop = body.style.top
    const previousBodyWidth = body.style.width
    const previousRootOverscroll = root.style.overscrollBehavior

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    root.style.overscrollBehavior = 'none'

    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(
        window.getComputedStyle(body).paddingRight
      ) || 0
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
    }

    window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeViewer()
        return
      }

      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      const first = focusableElements[0]
      const last = focusableElements.at(-1)

      if (!first || !last) return

      if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      body.style.overflow = previousBodyOverflow
      body.style.paddingRight = previousBodyPaddingRight
      body.style.position = previousBodyPosition
      body.style.top = previousBodyTop
      body.style.width = previousBodyWidth
      root.style.overscrollBehavior = previousRootOverscroll
      document.removeEventListener('keydown', handleKeyDown)
      window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' })
    }
  }, [closeViewer, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const reframeMap = () => commitTransform(transformRef.current)
    const resizeObserver = new ResizeObserver(reframeMap)
    const canvas = canvasRef.current

    if (canvas) resizeObserver.observe(canvas)
    window.addEventListener('resize', reframeMap)
    window.addEventListener('orientationchange', reframeMap)
    const frame = window.requestAnimationFrame(reframeMap)

    return () => {
      resizeObserver.disconnect()
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', reframeMap)
      window.removeEventListener('orientationchange', reframeMap)
    }
  }, [commitTransform, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const direction = event.deltaY < 0 ? 1 : -1
      zoomToPoint(transformRef.current.scale + direction * ZOOM_STEP, {
        x: event.clientX,
        y: event.clientY,
      })
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [isOpen, zoomToPoint])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    const point = { x: event.clientX, y: event.clientY }
    pointersRef.current.set(event.pointerId, point)
    pointerStartsRef.current.set(event.pointerId, {
      ...point,
      startedAt: performance.now(),
    })

    if (pointersRef.current.size > 1 || transformRef.current.scale > MIN_SCALE) {
      setIsInteracting(true)
    }

    if (pointersRef.current.size > 1) {
      hadMultiplePointersRef.current = true
      lastTapRef.current = null
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return

    const previousPointers = new Map(pointersRef.current)
    const nextPoint = { x: event.clientX, y: event.clientY }
    pointersRef.current.set(event.pointerId, nextPoint)

    const currentPointers = Array.from(pointersRef.current.values())
    const previousPointerList = Array.from(previousPointers.values())

    if (currentPointers.length >= 2 && previousPointerList.length >= 2) {
      const previousDistance = distanceBetween(
        previousPointerList[0],
        previousPointerList[1]
      )
      const nextDistance = distanceBetween(currentPointers[0], currentPointers[1])

      if (previousDistance === 0) return

      const current = transformRef.current
      const nextScale = boundValue(
        current.scale * (nextDistance / previousDistance),
        MIN_SCALE,
        MAX_SCALE
      )
      const previousMidpoint = midpointBetween(
        previousPointerList[0],
        previousPointerList[1]
      )
      const nextMidpoint = midpointBetween(currentPointers[0], currentPointers[1])
      const canvasBounds = event.currentTarget.getBoundingClientRect()
      const localMidpoint = {
        x: previousMidpoint.x - canvasBounds.left - canvasBounds.width / 2,
        y: previousMidpoint.y - canvasBounds.top - canvasBounds.height / 2,
      }
      const scaleRatio = nextScale / current.scale

      setIsInteracting(true)
      commitTransform({
        scale: nextScale,
        x:
          localMidpoint.x -
          (localMidpoint.x - current.x) * scaleRatio +
          (nextMidpoint.x - previousMidpoint.x),
        y:
          localMidpoint.y -
          (localMidpoint.y - current.y) * scaleRatio +
          (nextMidpoint.y - previousMidpoint.y),
      })
      return
    }

    if (currentPointers.length === 1 && transformRef.current.scale > MIN_SCALE) {
      const previousPoint = previousPointers.get(event.pointerId)
      if (!previousPoint) return

      setIsInteracting(true)
      commitTransform({
        ...transformRef.current,
        x: transformRef.current.x + nextPoint.x - previousPoint.x,
        y: transformRef.current.y + nextPoint.y - previousPoint.y,
      })
    }
  }

  const finishPointer = (
    event: ReactPointerEvent<HTMLDivElement>,
    allowDoubleTap: boolean
  ) => {
    const point = pointersRef.current.get(event.pointerId)
    const start = pointerStartsRef.current.get(event.pointerId)
    const wasOnlyPointer = pointersRef.current.size === 1
    const belongedToMultiPointerGesture = hadMultiplePointersRef.current

    pointersRef.current.delete(event.pointerId)
    pointerStartsRef.current.delete(event.pointerId)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (pointersRef.current.size === 0) {
      setIsInteracting(false)
      hadMultiplePointersRef.current = false
    }

    if (
      !allowDoubleTap ||
      event.pointerType !== 'touch' ||
      !wasOnlyPointer ||
      belongedToMultiPointerGesture ||
      !point ||
      !start ||
      performance.now() - start.startedAt > 300 ||
      distanceBetween(point, start) > 12
    ) {
      return
    }

    const now = performance.now()
    const lastTap = lastTapRef.current

    if (
      lastTap &&
      now - lastTap.tappedAt <= 325 &&
      distanceBetween(point, lastTap) <= 32
    ) {
      lastTapRef.current = null
      lastTouchToggleAtRef.current = now
      toggleZoomAtPoint(point)
      return
    }

    lastTapRef.current = { ...point, tappedAt: now }
  }

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (performance.now() - lastTouchToggleAtRef.current < 500) return
    toggleZoomAtPoint({ x: event.clientX, y: event.clientY })
  }

  const updateHoverPreview = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!window.matchMedia('(width > 1200px)').matches) return

    const image = previewImageRef.current
    if (!image) return

    const imageBounds = image.getBoundingClientRect()
    const panelBounds = event.currentTarget.getBoundingClientRect()
    if (imageBounds.width === 0 || imageBounds.height === 0) return

    const isInsideImage =
      event.clientX >= imageBounds.left &&
      event.clientX <= imageBounds.right &&
      event.clientY >= imageBounds.top &&
      event.clientY <= imageBounds.bottom

    if (!isInsideImage) {
      setHoverPreviewActive(false)
      return
    }

    const sourceX = boundValue(
      (event.clientX - imageBounds.left) / imageBounds.width,
      0,
      1
    )
    const sourceY = boundValue(
      (event.clientY - imageBounds.top) / imageBounds.height,
      0,
      1
    )

    const hoverPreview = hoverPreviewRef.current
    if (hoverPreview) {
      const previewWidth = hoverPreview.clientWidth
      const previewHeight = hoverPreview.clientHeight
      const renderedImageWidth = previewWidth * HOVER_PREVIEW_SCALE
      const renderedImageHeight = renderedImageWidth / IMAGE_ASPECT_RATIO
      const backgroundX = boundValue(
        previewWidth / 2 - sourceX * renderedImageWidth,
        previewWidth - renderedImageWidth,
        0
      )
      const backgroundY = boundValue(
        previewHeight / 2 - sourceY * renderedImageHeight,
        previewHeight - renderedImageHeight,
        0
      )
      hoverPreview.style.backgroundPosition = `${backgroundX}px ${backgroundY}px`
    }

    if (hoverTargetRef.current) {
      hoverTargetRef.current.style.left = `${event.clientX - panelBounds.left}px`
      hoverTargetRef.current.style.top = `${event.clientY - panelBounds.top}px`
    }

    setHoverPreviewActive(true)
  }

  const hideHoverPreview = () => setHoverPreviewActive(false)

  const handleCanvasKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = transformRef.current

    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      zoomToPoint(current.scale + ZOOM_STEP)
      return
    }

    if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      zoomToPoint(current.scale - ZOOM_STEP)
      return
    }

    if (event.key === '0') {
      event.preventDefault()
      resetTransform()
      return
    }

    if (current.scale === MIN_SCALE) return

    const movementByKey: Partial<Record<string, Point>> = {
      ArrowDown: { x: 0, y: -KEYBOARD_PAN_STEP },
      ArrowLeft: { x: KEYBOARD_PAN_STEP, y: 0 },
      ArrowRight: { x: -KEYBOARD_PAN_STEP, y: 0 },
      ArrowUp: { x: 0, y: KEYBOARD_PAN_STEP },
    }
    const movement = movementByKey[event.key]

    if (!movement) return
    event.preventDefault()
    commitTransform({
      ...current,
      x: current.x + movement.x,
      y: current.y + movement.y,
    })
  }

  const zoomPercentage = `${Math.round(transform.scale * 100)}%`

  return (
    <div className={styles.viewer}>
      <button type="button" className={styles.action} onClick={openViewer}>
        {copy.action}
        <ZoomIn aria-hidden="true" />
      </button>

      <div ref={previewStageRef} className={styles.previewStage}>
        <div
          ref={mapPanelRef}
          className={styles.mapPanel}
          onPointerDown={updateHoverPreview}
          onPointerEnter={updateHoverPreview}
          onPointerMove={updateHoverPreview}
          onPointerLeave={hideHoverPreview}
          onPointerUp={hideHoverPreview}
          onPointerCancel={hideHoverPreview}
        >
          <Image
            ref={previewImageRef}
            src={imagePath}
            alt={imageAlt}
            width={IMAGE_WIDTH}
            height={IMAGE_HEIGHT}
            sizes="(width <= 760px) 88vw, (width <= 1100px) 92vw, 1100px"
            className={styles.mapImage}
            draggable={false}
            priority
          />
          <span
            ref={hoverTargetRef}
            className={styles.hoverTarget}
            data-active={isHoverPreviewActive}
            aria-hidden="true"
          />
        </div>

        <aside
          ref={hoverPreviewRef}
          className={styles.hoverPreview}
          data-active={isHoverPreviewActive}
          style={{
            backgroundImage: `url("${imagePath}")`,
          }}
          aria-hidden="true"
        />
      </div>

      {isOpen &&
        createPortal(
          <div className={styles.modalRoot}>
            <button
              type="button"
              className={styles.backdrop}
              aria-label={copy.close}
              tabIndex={-1}
              onClick={closeViewer}
            />

            <section
              ref={dialogRef}
              className={styles.dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={instructionsId}
            >
              <header className={styles.modalHeader}>
                <div className={styles.modalHeading}>
                  <h2 id={titleId}>{copy.dialogTitle}</h2>
                  <p id={instructionsId}>{copy.instructions}</p>
                </div>

                <div className={styles.controls} aria-label={copy.controls}>
                  <div className={styles.zoomControls}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={copy.zoomOut}
                      title={copy.zoomOut}
                      disabled={transform.scale <= MIN_SCALE}
                      onClick={() => zoomToPoint(transform.scale - ZOOM_STEP)}
                    >
                      <Minus aria-hidden="true" />
                    </button>
                    <output
                      className={styles.zoomLevel}
                      aria-label={`${copy.zoomLevel}: ${zoomPercentage}`}
                      aria-live="polite"
                    >
                      {zoomPercentage}
                    </output>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={copy.zoomIn}
                      title={copy.zoomIn}
                      disabled={transform.scale >= MAX_SCALE}
                      onClick={() => zoomToPoint(transform.scale + ZOOM_STEP)}
                    >
                      <ZoomIn aria-hidden="true" />
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={copy.reset}
                    title={copy.reset}
                    disabled={transform.scale === MIN_SCALE}
                    onClick={resetTransform}
                  >
                    <RotateCcw aria-hidden="true" />
                  </button>

                  <a
                    href={imagePath}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.iconButton}
                    aria-label={copy.openOriginal}
                    title={copy.openOriginal}
                  >
                    <ExternalLink aria-hidden="true" />
                  </a>

                  <button
                    ref={closeButtonRef}
                    type="button"
                    className={`${styles.iconButton} ${styles.closeButton}`}
                    aria-label={copy.close}
                    title={copy.close}
                    onClick={closeViewer}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              </header>

              <div
                ref={canvasRef}
                className={styles.canvas}
                data-zoomed={transform.scale > MIN_SCALE}
                data-interacting={isInteracting}
                role="img"
                aria-label={`${imageAlt}. ${copy.instructions}`}
                tabIndex={0}
                onDoubleClick={handleDoubleClick}
                onKeyDown={handleCanvasKeyDown}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => finishPointer(event, true)}
                onPointerCancel={(event) => finishPointer(event, false)}
                onLostPointerCapture={(event) => finishPointer(event, false)}
              >
                <div
                  className={styles.transformLayer}
                  style={{
                    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
                  }}
                >
                  <Image
                    src={imagePath}
                    alt=""
                    fill
                    sizes="100vw"
                    className={styles.modalImage}
                    draggable={false}
                    quality={90}
                    priority
                  />
                </div>
              </div>
            </section>
          </div>,
          document.body
        )}
    </div>
  )
}
