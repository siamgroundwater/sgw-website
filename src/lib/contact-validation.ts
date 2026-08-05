export type ContactData = {
  subject: string
  name: string
  company: string
  phone: string
  email: string
  details: string
  consent: 'accepted'
}

type ContactValidationResult =
  | { ok: true; data: ContactData }
  | { ok: false; message: string }

export function normalizeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateContactPayload(
  payload: Record<string, unknown>
): ContactValidationResult {
  const subject = normalizeText(payload.subject, 120)
  const name = normalizeText(payload.name, 100)
  const company = normalizeText(payload.company, 120)
  const phone = normalizeText(payload.phone, 30)
  const email = normalizeText(payload.email, 160)
  const details = normalizeText(payload.details, 3000)
  const consent = normalizeText(payload.consent, 20)

  if (!subject || !name || !phone || !email || !details || consent !== 'accepted') {
    return {
      ok: false,
      message: 'กรุณากรอกข้อมูลที่จำเป็นและยืนยันความยินยอม',
    }
  }

  if (!isValidEmail(email)) {
    return { ok: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' }
  }

  return {
    ok: true,
    data: {
      subject,
      name,
      company,
      phone,
      email,
      details,
      consent: 'accepted',
    },
  }
}
