import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import CmsLoginForm from '@/components/cms/CmsLoginForm'
import { CmsLanguageSwitcher } from '@/components/cms/CmsLanguage'
import { getCurrentCmsUser } from '@/server/cms/guards'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

export default async function CmsLoginPage() {
  const locale = await getCmsLocale()
  const copy = locale === 'th' ? {
    authorized: 'สำหรับพนักงานที่ได้รับอนุญาต',
    brandDescription: 'จัดการผลงาน บริการ บทความความรู้ ผู้ใช้ และประวัติการแก้ไขของ SGW ได้ในที่เดียว',
    brandEyebrow: 'พื้นที่จัดการเนื้อหาส่วนตัว',
    instruction: 'ใช้บัญชี CMS ที่สร้างโดยผู้ดูแลระบบ SGW',
    openWebsite: 'เปิดเว็บไซต์ Siam Groundwater',
    setup: 'การตั้งค่า CMS ยังไม่สมบูรณ์ กรุณาเพิ่ม MongoDB และค่าเซสชันจาก .env.example แล้วสร้างผู้ดูแลระบบคนแรก',
    signIn: 'เข้าสู่ระบบ',
  } : {
    authorized: 'Authorized team members',
    brandDescription: 'Manage SGW projects, services, learning content, users, and editorial history from one secure workspace.',
    brandEyebrow: 'Private content workspace',
    instruction: 'Use the CMS account created by the SGW administrator.',
    openWebsite: 'Open Siam Groundwater website',
    setup: 'CMS setup is incomplete. Add MongoDB and session settings from .env.example, then seed the first administrator.',
    signIn: 'Sign in',
  }
  try {
    const user = await getCurrentCmsUser()
    if (user) redirect('/cms/dashboard')
  } catch {
    // The setup notice below remains visible when MongoDB or the session secret is not configured.
  }

  const sessionSecret = process.env.CMS_SESSION_SECRET?.trim() || ''
  const configured = Boolean(
    process.env.MONGODB_URI &&
      sessionSecret.length >= 32 &&
      !sessionSecret.toLowerCase().startsWith('replace-with')
  )

  return (
    <main className="cms-login-page">
      <section className="cms-login-shell" aria-labelledby="cms-login-title">
        <div className="cms-login-brand">
          <a href="/" target="_blank" rel="noreferrer" aria-label={copy.openWebsite}>
            <img className="cms-login-logo" src="/images/logo/logo_SGW_white.svg" alt="Siam Groundwater" />
          </a>
          <div className="cms-login-brand-copy">
            <p className="cms-eyebrow">{copy.brandEyebrow}</p>
            <h1 id="cms-login-title">Siam Groundwater CMS</h1>
            <p>{copy.brandDescription}</p>
          </div>
        </div>

        <div className="cms-login-form-panel">
          <div className="cms-login-language"><CmsLanguageSwitcher /></div>
          <div className="cms-login-heading">
            <p className="cms-eyebrow">{copy.authorized}</p>
            <h2>{copy.signIn}</h2>
            <p>{copy.instruction}</p>
          </div>
          {!configured ? (
            <p className="cms-notice">
              <AlertCircle aria-hidden="true" />
              {copy.setup}
            </p>
          ) : null}
          <CmsLoginForm />
        </div>
      </section>
    </main>
  )
}
