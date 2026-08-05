'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { LoaderCircle, Mail, Send } from 'lucide-react'
import type { LocalizedContent } from '@/i18n/localized-content'
import { localePath, type SiteLocale } from '@/i18n/config'
import './ContactForm.css'

type SubmitState =
  | { status: 'idle'; message: '' }
  | { status: 'submitting'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

type ContactFormProps = {
  locale?: SiteLocale
  copy?: LocalizedContent['contact']['labels']
}

export default function ContactForm({ locale = 'th', copy }: ContactFormProps) {
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: 'idle',
    message: '',
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())

    setSubmitState({
      status: 'submitting',
      message: copy?.submitting ?? 'กำลังส่งข้อความ…',
    })

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = (await response.json()) as { message?: string }

      if (!response.ok) {
        throw new Error(
          copy?.error || result.message || 'ไม่สามารถส่งข้อความได้ในขณะนี้'
        )
      }

      form.reset()
      setSubmitState({
        status: 'success',
        message:
          copy?.success ||
          result.message ||
          'ส่งข้อความเรียบร้อยแล้ว ทีมงานจะติดต่อกลับโดยเร็ว',
      })
    } catch (error) {
      setSubmitState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : copy?.error ||
              'เกิดข้อผิดพลาด กรุณาลองใหม่หรือติดต่อทางโทรศัพท์',
      })
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate={false}>
      <div className="contact-form-honeypot" aria-hidden="true">
        <label htmlFor="website">{copy?.website ?? 'เว็บไซต์'}</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="contact-form-grid">
        <div className="contact-form-field contact-form-field-full">
          <label htmlFor="subject">{copy?.subject ?? 'หัวข้อที่ต้องการปรึกษา'}</label>
          <input id="subject" name="subject" type="text" maxLength={120} required />
        </div>

        <div className="contact-form-field">
          <label htmlFor="name">{copy?.name ?? 'ชื่อผู้ติดต่อ'}</label>
          <input id="name" name="name" type="text" maxLength={100} autoComplete="name" required />
        </div>

        <div className="contact-form-field">
          <label htmlFor="company">{copy?.company ?? 'บริษัท / โครงการ'}</label>
          <input id="company" name="company" type="text" maxLength={120} autoComplete="organization" />
        </div>

        <div className="contact-form-field">
          <label htmlFor="phone">{copy?.phone ?? 'โทรศัพท์'}</label>
          <input id="phone" name="phone" type="tel" maxLength={30} autoComplete="tel" required />
        </div>

        <div className="contact-form-field">
          <label htmlFor="email">{copy?.email ?? 'อีเมล'}</label>
          <input id="email" name="email" type="email" maxLength={160} autoComplete="email" required />
        </div>

        <div className="contact-form-field contact-form-field-full">
          <label htmlFor="details">{copy?.details ?? 'รายละเอียดโครงการ'}</label>
          <textarea
            id="details"
            name="details"
            required
            maxLength={3000}
            rows={6}
            placeholder={
              copy?.detailsPlaceholder ??
              'เช่น พื้นที่โครงการ ปริมาณน้ำที่ต้องการ ปัญหาที่พบ และช่วงเวลาที่ต้องการดำเนินงาน'
            }
          />
        </div>
      </div>

      <label className="contact-form-consent">
        <input type="checkbox" name="consent" value="accepted" required />
        <span>
          {copy?.consentPrefix ??
            'ยินยอมให้บริษัทใช้ข้อมูลนี้เพื่อติดต่อกลับและประเมินงานตามคำขอ ตาม'}{' '}
          <Link href={localePath('/privacy', locale)}>
            {copy?.privacy ?? 'นโยบายข้อมูลส่วนบุคคล'}
          </Link>
        </span>
      </label>

      <div className="contact-form-actions">
        <button
          type="submit"
          className="contact-form-submit"
          disabled={submitState.status === 'submitting'}
        >
          {submitState.status === 'submitting' ? (
            <LoaderCircle aria-hidden="true" className="contact-form-spinner" />
          ) : (
            <Send aria-hidden="true" />
          )}
          {submitState.status === 'submitting'
            ? copy?.submitting ?? 'กำลังส่ง…'
            : copy?.submit ?? 'ส่งข้อความถึงทีมงาน'}
        </button>
        <a
          href={`mailto:sgw_th@outlook.com?subject=${encodeURIComponent(
            copy?.subject ?? 'สอบถามโครงการน้ำบาดาล'
          )}`}
          className="contact-form-email-fallback"
        >
          <Mail aria-hidden="true" />
          {copy?.emailFallback ?? 'หรือส่งอีเมลโดยตรง'}
        </a>
      </div>

      {submitState.message && (
        <p
          className={`contact-form-status contact-form-status-${submitState.status}`}
          role={submitState.status === 'error' ? 'alert' : 'status'}
        >
          {submitState.message}
        </p>
      )}
    </form>
  )
}
