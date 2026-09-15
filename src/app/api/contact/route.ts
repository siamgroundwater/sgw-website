import { NextRequest, NextResponse } from 'next/server'
import {
  normalizeText,
  validateContactPayload,
} from '@/lib/contact-validation'

const MAX_BODY_BYTES = 12_000
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX = 5

type RateLimitEntry = { count: number; resetAt: number }
const rateLimitStore = new Map<string, RateLimitEntry>()

function getClientKey(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'
  )
}

function isRateLimited(key: string) {
  const now = Date.now()
  const current = rateLimitStore.get(key)

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  current.count += 1
  rateLimitStore.set(key, current)
  return current.count > RATE_LIMIT_MAX
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === request.nextUrl.host
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: 'คำขอไม่ถูกต้อง' }, { status: 403 })
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ message: 'ข้อความมีขนาดใหญ่เกินไป' }, { status: 413 })
  }

  const clientKey = getClientKey(request)
  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { message: 'ส่งข้อความบ่อยเกินไป กรุณารอสักครู่หรือติดต่อทางโทรศัพท์' },
      { status: 429 }
    )
  }

  let payload: Record<string, unknown>
  try {
    const text = await request.text()
    if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json({ message: 'ข้อความมีขนาดใหญ่เกินไป' }, { status: 413 })
    }
    const value: unknown = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return NextResponse.json({ message: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
    }
    payload = value as Record<string, unknown>
  } catch {
    return NextResponse.json({ message: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }

  // Silently accept bot submissions caught by the hidden field.
  if (normalizeText(payload.website, 200)) {
    return NextResponse.json({ message: 'ส่งข้อความเรียบร้อยแล้ว' })
  }

  const validation = validateContactPayload(payload)
  if (!validation.ok) {
    return NextResponse.json({ message: validation.message }, { status: 400 })
  }
  const { subject, name, company, phone, email, details } = validation.data

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.CONTACT_FROM_EMAIL
  const toEmail = process.env.CONTACT_TO_EMAIL || 'sgw_th@outlook.com'

  if (!apiKey || !fromEmail) {
    return NextResponse.json(
      {
        message:
          'ระบบรับข้อความกำลังตั้งค่า กรุณาส่งอีเมลถึง sgw_th@outlook.com หรือโทร 0-2735-0789',
      },
      { status: 503 }
    )
  }

  const text = [
    `หัวข้อ: ${subject}`,
    `ชื่อ: ${name}`,
    `บริษัท/โครงการ: ${company || '-'}`,
    `โทรศัพท์: ${phone}`,
    `อีเมล: ${email}`,
    '',
    'รายละเอียด:',
    details,
  ].join('\n')

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `[เว็บไซต์ SGW] ${subject}`,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) throw new Error('Email provider rejected the request')

    return NextResponse.json({
      message: 'ส่งข้อความเรียบร้อยแล้ว ทีมงานจะติดต่อกลับโดยเร็ว',
    })
  } catch {
    return NextResponse.json(
      {
        message:
          'ยังส่งข้อความไม่ได้ กรุณาส่งอีเมลถึง sgw_th@outlook.com หรือโทร 0-2735-0789',
      },
      { status: 502 }
    )
  }
}
