import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { notFound } from 'next/navigation'
import GroundwaterCalculator from '@/components/GroundwaterCalculator/GroundwaterCalculator'
import GroundwaterBasics from '@/components/GroundwaterBasics/GroundwaterBasics'
import GroundwaterCaseStudies from '@/components/GroundwaterCaseStudies/GroundwaterCaseStudies'
import GroundwaterLawGuide from '@/components/GroundwaterLawGuide/GroundwaterLawGuide'
import GroundwaterFaq from '@/components/GroundwaterFaq/GroundwaterFaq'
import GroundwaterOwnerGuide from '@/components/GroundwaterOwnerGuide/GroundwaterOwnerGuide'
import { createThaiPageMetadata } from '@/lib/site-metadata'
import {
  getLearningArticle,
  learningArticles,
} from '@/data/learning'
import './page.css'

type LearningPageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return learningArticles.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({
  params,
}: LearningPageProps): Promise<Metadata> {
  const { slug } = await params
  const article = getLearningArticle(slug)
  if (!article) return { title: 'ไม่พบบทความ | Siam Groundwater' }
  return createThaiPageMetadata({
    title: `${article.title} | Siam Groundwater`,
    description: article.description,
    pathname: `/learn/${article.slug}`,
    openGraphType: 'article',
  })
}

export default async function LearningArticlePage({ params }: LearningPageProps) {
  const { slug } = await params
  const article = getLearningArticle(slug)
  if (!article) notFound()

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    inLanguage: 'th-TH',
    author: {
      '@type': 'Organization',
      name: 'Siam Groundwater',
    },
  }

  return (
    <main
      className={`learning-article-page ${
        slug === 'groundwater-calculator-tools'
          ? 'learning-tools-page'
          : slug === 'groundwater-basics-thailand'
            ? 'learning-basics-page'
            : slug === 'groundwater-case-studies-problems'
              ? 'learning-case-studies-page'
              : slug === 'groundwater-law-regulation-thailand'
                ? 'learning-law-page'
                : slug === 'groundwater-faq-thailand'
                  ? 'learning-faq-page'
                  : slug === 'groundwater-guide-factory-hotel-resort'
                    ? 'learning-owner-guide-page'
                  : ''
      }`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />

      <nav className="learning-article-breadcrumb" aria-label="เส้นทางนำทาง">
        <Link href="/">หน้าแรก</Link>
        <span aria-hidden="true">/</span>
        <Link href="/groundwater-learning">ศูนย์การเรียนรู้</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{article.title}</span>
      </nav>

      <header className="learning-article-hero">
        <p className="learning-article-eyebrow">{article.eyebrow}</p>
        <h1>{article.title}</h1>
        <p className="learning-article-description">{article.description}</p>
        <p className="learning-article-audience">
          <strong>เหมาะสำหรับ:</strong> {article.audience}
        </p>
      </header>

      {slug === 'groundwater-calculator-tools' && <GroundwaterCalculator />}
      {slug === 'groundwater-basics-thailand' && <GroundwaterBasics />}
      {slug === 'groundwater-case-studies-problems' && <GroundwaterCaseStudies />}
      {slug === 'groundwater-law-regulation-thailand' && <GroundwaterLawGuide />}
      {slug === 'groundwater-faq-thailand' && <GroundwaterFaq />}
      {slug === 'groundwater-guide-factory-hotel-resort' && <GroundwaterOwnerGuide />}

      {slug !== 'groundwater-calculator-tools' && slug !== 'groundwater-basics-thailand' && slug !== 'groundwater-case-studies-problems' && slug !== 'groundwater-law-regulation-thailand' && slug !== 'groundwater-faq-thailand' && slug !== 'groundwater-guide-factory-hotel-resort' && <article className="learning-article-body">
        {article.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets && (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {article.sources && (
          <aside className="learning-article-sources" aria-labelledby="sources-title">
            <h2 id="sources-title">แหล่งข้อมูลทางการ</h2>
            <ul>
              {article.sources.map((source) => (
                <li key={source.href}>
                  <a href={source.href} target="_blank" rel="noopener noreferrer">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
            <p>ตรวจทานข้อมูลล่าสุด: 2 สิงหาคม 2569</p>
          </aside>
        )}
      </article>}

      {slug !== 'groundwater-basics-thailand' && slug !== 'groundwater-case-studies-problems' && slug !== 'groundwater-law-regulation-thailand' && slug !== 'groundwater-faq-thailand' && slug !== 'groundwater-guide-factory-hotel-resort' && <aside className="learning-article-cta">
        <div>
          <h2>ต้องการประเมินพื้นที่หรือระบบของคุณ?</h2>
          <p>ส่งข้อมูลเบื้องต้นให้ทีมงานช่วยจัดลำดับการสำรวจและการตัดสินใจ</p>
        </div>
        <Link href="/contact">
          <MessageCircle aria-hidden="true" />
          ปรึกษาทีมงาน
        </Link>
      </aside>}
    </main>
  )
}
