'use client'

import { useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  PROJECT_CATEGORIES,
  type ProjectCategory,
} from '@/lib/project-categories'
import type { ProjectSummary } from '@/lib/project-summaries'
import { localeInfo, localePath, type LocalizedLocale } from '@/i18n/config'
import type { LocalizedContent } from '@/i18n/localized-content'
import {
  PROJECT_CATEGORY_KEYS,
  getLocalizedProjectPresentation,
} from '@/i18n/projects'
import LegacyProjectMapSection from '@/components/LegacyProjectMapSection/LegacyProjectMapSection'
import './projects.css'

type FilterCategory = 'all' | ProjectCategory
type ItemsPerPage = 6 | 10 | 20 | 50 | 100 | 'all'

const toolbarCopy: Record<
  LocalizedLocale,
  { maximum: string; items: string; viewAll: string; showMore: string }
> = {
  th: { maximum: 'แสดงสูงสุด', items: 'รายการ', viewAll: 'ดูโครงการทั้งหมด', showMore: 'แสดงเพิ่มเติม' },
  en: { maximum: 'Show up to', items: 'items', viewAll: 'View all projects', showMore: 'Show more' },
  zh: { maximum: '最多显示', items: '项', viewAll: '查看全部项目', showMore: '显示更多' },
  ja: { maximum: '最大表示数', items: '件', viewAll: 'すべての実績を見る', showMore: 'さらに表示' },
}

export default function ProjectsSection({
  projects,
  locale,
  copy,
  showHistoryMap = false,
  headingLevel = 'h2',
  featured = false,
  initialItemsPerPage = 10,
}: {
  projects: ProjectSummary[]
  locale?: LocalizedLocale
  copy?: LocalizedContent['projects']
  showHistoryMap?: boolean
  headingLevel?: 'h1' | 'h2'
  featured?: boolean
  initialItemsPerPage?: Exclude<ItemsPerPage, 'all'>
}) {
  const [category, setCategory] = useState<FilterCategory>('all')
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(initialItemsPerPage)
  const [visibleCount, setVisibleCount] = useState<number>(initialItemsPerPage)

  const filteredProjects =
    category === 'all'
      ? projects
      : projects.filter((project) => project.category.includes(category))

  const displayedProjects = featured
    ? filteredProjects.slice(0, 6)
    : itemsPerPage === 'all'
      ? filteredProjects
      : filteredProjects.slice(0, visibleCount)

  const handleItemsPerPageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    if (value === 'all') {
      setItemsPerPage('all')
      return
    }

    const amount = Number(value) as Exclude<ItemsPerPage, 'all'>
    setItemsPerPage(amount)
    setVisibleCount(amount)
  }

  const selectCategory = (nextCategory: FilterCategory) => {
    setCategory(nextCategory)
    if (itemsPerPage !== 'all') setVisibleCount(itemsPerPage)
  }

  const numberLocale = locale ? localeInfo[locale].htmlLang : 'th-TH'
  const controls = locale ? toolbarCopy[locale] : undefined
  const Heading = headingLevel

  return (
    <section className="home-projects thirdBackground">
      <div className="projects-header">
        <Heading className="elementor-heading-title elementor-size-default">
          {copy?.title ?? 'ตัวอย่าง โครงการของเรา'}
        </Heading>
        {copy?.intro && <p className="projects-intro">{copy.intro}</p>}

        {showHistoryMap && (
          <LegacyProjectMapSection locale={locale ?? 'th'} />
        )}

        <div className="projects-filter-buttons">
          <button
            type="button"
            className={`filter-button ${category === 'all' ? 'active' : ''} filter-all`}
            onClick={() => selectCategory('all')}
          >
            {copy?.all ?? 'ทั้งหมด'}
          </button>

          {PROJECT_CATEGORIES.map((filterCategory, index) => (
            <button
              type="button"
              key={filterCategory}
              className={`filter-button ${
                category === filterCategory ? 'active' : ''
              }`}
              onClick={() => selectCategory(filterCategory)}
            >
              {copy?.categories[PROJECT_CATEGORY_KEYS[index]] ?? filterCategory}
            </button>
          ))}
        </div>

        <div className="projects-subheader">
          <div className="projects-count">
            {copy?.showing ?? 'แสดง'}{' '}
            {displayedProjects.length.toLocaleString(numberLocale)} /{' '}
            {filteredProjects.length.toLocaleString(numberLocale)}{' '}
            {controls?.items ?? 'โครงการ'}
          </div>

          {!featured && <div className="projects-page-size">
            <label>
              {controls?.maximum ?? 'แสดงสูงสุด'}:{' '}
              <select
                value={itemsPerPage === 'all' ? 'all' : itemsPerPage}
                onChange={handleItemsPerPageChange}
              >
                {[6, 10, 20, 50, 100].map((amount) => (
                  <option key={amount} value={amount}>
                    {amount} {controls?.items ?? 'รายการ'}
                  </option>
                ))}
                <option value="all">{copy?.all ?? 'ทั้งหมด'}</option>
              </select>
            </label>
          </div>}
        </div>
      </div>

      <div className="projects-grid display-posts-listing">
        {displayedProjects.map((project) => {
          const presentation = copy
            ? getLocalizedProjectPresentation(project, copy)
            : undefined
          const href = locale
            ? localePath(`/projects/${project._id}`, locale)
            : `/projects/${project._id}`

          return (
            <Link
              key={project._id}
              href={href}
              className="listing-item project-card"
              aria-label={`${copy?.details ?? 'ดูรายละเอียดโครงการ'} ${project.title}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="image project-card-image-wrapper">
                <Image
                  src={project.coverImage}
                  alt={project.title}
                  width={800}
                  height={600}
                  sizes="(width <= 640px) 100vw, (width <= 1024px) 50vw, 25vw"
                  className="project-card-image"
                  loading="lazy"
                />
              </div>

              <h3
                className="Project-Title title SP-textHead5 removeUnderLine"
                style={{ textAlign: 'center', marginBottom: 0 }}
              >
                {project.title}
              </h3>

              <div className="project-card-meta">
                {project.year && <span>{project.year}</span>}
                <span>{project.location}</span>
              </div>

              <p className="project-type-of-work SP-textHead6" style={{ textAlign: 'center' }}>
                {project.workTypes.join(' · ') || presentation?.typeLabel}
              </p>

              <p className="project-category SP-textHead6" style={{ textAlign: 'center' }}>
                {presentation?.categoryLabel ?? project.category.join(' • ')}
              </p>
            </Link>
          )
        })}
      </div>

      {!featured &&
        itemsPerPage !== 'all' &&
        displayedProjects.length < filteredProjects.length && (
          <div className="projects-show-more-wrap">
            <button
              type="button"
              className="projects-show-more"
              onClick={() => setVisibleCount((count) => count + itemsPerPage)}
            >
              {controls?.showMore ?? 'แสดงเพิ่มเติม'}
            </button>
          </div>
        )}

      {featured && locale && (
        <div className="projects-view-all-wrap">
          <Link href={localePath('/projects', locale)} className="projects-view-all">
            {controls?.viewAll ?? copy?.all}
          </Link>
        </div>
      )}
    </section>
  )
}
