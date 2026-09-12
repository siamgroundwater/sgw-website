import { redirect } from 'next/navigation'
import Image from 'next/image'
import { AlertCircle } from 'lucide-react'
import CmsLoginForm from '@/components/cms/CmsLoginForm'
import { CmsLanguageSwitcher } from '@/components/cms/CmsLanguage'
import { getCurrentCmsUser } from '@/server/cms/guards'
import { getCmsLocale } from '@/server/cms/locale'
import { safeCmsReturnTo } from '@/lib/cms-access'
import '@/components/cms/CmsAccessImprovements.css'

export const dynamic = 'force-dynamic'

export default async function CmsLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; reauth?: string }> }) {
  const parameters = await searchParams
  const returnTo = safeCmsReturnTo(parameters.returnTo)
  const locale = await getCmsLocale()
  const copy = locale === 'th' ? {
    eyebrow: 'พื้นที่จัดการเนื้อหา',
    instruction: 'ใช้บัญชี CMS ที่สร้างโดยผู้ดูแลระบบ SGW',
    openWebsite: 'เปิดเว็บไซต์ Siam Groundwater',
    setup: 'การตั้งค่า CMS ยังไม่สมบูรณ์ กรุณาเพิ่ม MongoDB และค่าเซสชันจาก .env.example แล้วสร้างผู้ดูแลระบบคนแรก',
    signIn: 'เข้าสู่ระบบ',
  } : {
    eyebrow: 'Content workspace',
    instruction: 'Use the CMS account created by the SGW administrator.',
    openWebsite: 'Open Siam Groundwater website',
    setup: 'CMS setup is incomplete. Add MongoDB and session settings from .env.example, then seed the first administrator.',
    signIn: 'Sign in',
  }
  let user = null
  try {
    user = await getCurrentCmsUser()
  } catch {
    // The setup notice below remains visible when MongoDB or the session secret is not configured.
  }
  if (user && parameters.reauth !== '1') redirect(returnTo)

  const sessionSecret = process.env.CMS_SESSION_SECRET?.trim() || ''
  const configured = Boolean(
    process.env.MONGODB_URI &&
      sessionSecret.length >= 32 &&
      !sessionSecret.toLowerCase().startsWith('replace-with')
  )

  return (
    <main className="cms-login-page">
      <section className="cms-login-shell" aria-labelledby="cms-login-title">
        <a
          className="cms-login-brand"
          href="/"
          target="_blank"
          rel="noreferrer"
          aria-label={copy.openWebsite}
        >
          <span className="cms-login-logo-mark">
            <Image
              className="cms-login-logo"
              src="/images/logo/logo_SGW_white.svg"
              alt=""
              width={920}
              height={920}
              priority
            />
          </span>
          <span>Siam Groundwater CMS</span>
        </a>

        <section className="cms-login-form-panel">
          <div className="cms-login-language"><CmsLanguageSwitcher /></div>
          <div className="cms-login-heading">
            <p className="cms-eyebrow">{copy.eyebrow}</p>
            <h1 id="cms-login-title">{copy.signIn}</h1>
            <p>{copy.instruction}</p>
          </div>
          {!configured ? (
            <p className="cms-notice">
              <AlertCircle aria-hidden="true" />
              {copy.setup}
            </p>
          ) : null}
          <CmsLoginForm returnTo={returnTo} />
        </section>
      </section>
    </main>
  )
}
