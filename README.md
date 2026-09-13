# Siam Groundwater website

เว็บไซต์บริษัท สยามกราวด์วอเตอร์ จำกัด สำหรับนำเสนอบริการ ผลงาน ทีมงาน
ศูนย์การเรียนรู้ และช่องทางติดต่อโครงการน้ำบาดาลทั่วประเทศไทย

## Requirements

- Node.js 22
- npm 10+

## Local development

```bash
npm ci
npm run dev
```

เปิด `http://localhost:3000`

## Quality checks

Run these checks manually on your computer. This repository no longer includes
GitHub Actions test or production-monitor workflows. The Vercel media-cleanup
schedule in `vercel.json` remains separate and unchanged.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

หรือรันทั้งหมดด้วย `npm run check`

## Contact form configuration

แบบฟอร์มใช้ API route ภายในและส่งอีเมลผ่าน Resend โดยไม่บันทึกข้อความลงไฟล์
หรือพิมพ์ข้อมูลส่วนบุคคลลง log

1. คัดลอก `.env.example` เป็น `.env.local`
2. สร้าง API key และ verified sender domain ใน Resend
3. กำหนด `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` และ `CONTACT_TO_EMAIL`
4. ทดสอบแบบฟอร์มใน staging ก่อนเผยแพร่จริง

หากยังไม่ได้ตั้งค่าอีเมล หน้าเว็บจะแสดงช่องทางอีเมลและโทรศัพท์แทนอย่างชัดเจน

## Content locations

- Published projects: MongoDB `cmsProjects` records with Cloudinary media
- Learning articles: `src/data/learning.ts`
- English, Chinese and Japanese copy: `src/i18n/localized-content.ts`
- Locale configuration, navigation and route helpers: `src/i18n/config.ts`
- Team structure: `src/app/(site)/about/teams/teams.json`

## Languages and routes

- Thai is the default language and keeps the existing unprefixed routes, such as `/services`.
- English uses `/en`, Simplified Chinese uses `/zh`, and Japanese uses `/ja`.
- The language switcher preserves the current page whenever the equivalent translated route exists.
- Localized project details use Thai-first MongoDB content with English project translations and are revalidated after publishing.
- Canonical URLs and `hreflang` alternatives are emitted in localized page metadata and `sitemap.xml`.

ข้อมูลโครงการต้องมาจากข้อมูลที่ตรวจสอบแล้วเท่านั้น สคริปต์แปลงข้อมูลจะไม่สุ่มปี
หรือหมวดหมู่ และไฟล์ทดสอบจะตรวจหา asset ที่หายก่อน build ใน CI

## Deployment checklist

- ตั้งค่า environment variables สำหรับ contact form
- ตั้ง `NEXT_PUBLIC_SITE_URL` เป็น origin จริง หากไม่ใช่ `https://siamgroundwater.com`
- ตรวจ `npm audit`
- รัน `npm run check`
- ทดสอบ `/robots.txt`, `/sitemap.xml`, แบบฟอร์ม และหน้าหลักบนมือถือ
- ตั้ง `CRON_SECRET` ใน Vercel Production; `vercel.json` จะ schedule `/api/cron/cleanup-project-media` และให้ monitor `/api/health`
- หลัง build ให้รัน `npm run test:e2e`; รัน `npm run test:e2e:cms` เฉพาะฐานข้อมูลทดสอบแยกเท่านั้น
