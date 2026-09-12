'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ProjectCards } from '@/app/(site)/home/projects/projects'
import type { LocalizedLocale } from '@/i18n/config'
import type { LocalizedContent } from '@/i18n/localized-content'
import type { ProjectSummary } from '@/lib/project-summaries'

type DisplayLimit = 6 | 12 | 24 | 'all'

const displayOptions = [6, 12, 24] as const

const selectorCopy: Record<
  LocalizedLocale,
  { label: string; loadMore: string; showing: string }
> = {
  th: { label: 'เลือกจำนวนโครงการที่แสดง', loadMore: 'แสดงเพิ่มเติม', showing: 'แสดง' },
  en: { label: 'Choose how many projects to show', loadMore: 'Load more', showing: 'Showing' },
  zh: { label: '选择显示的项目数量', loadMore: '加载更多', showing: '显示' },
  ja: { label: '表示するプロジェクト数を選択', loadMore: 'さらに表示', showing: '表示中' },
}

export default function ServiceProjectSelector({
  projects,
  locale,
  copy,
}: {
  projects: ProjectSummary[]
  locale: LocalizedLocale
  copy: LocalizedContent['projects']
}) {
  const [limit, setLimit] = useState<DisplayLimit>(6)
  const [visibleCount, setVisibleCount] = useState(6)
  const controls = selectorCopy[locale]
  const visibleProjects =
    limit === 'all' ? projects : projects.slice(0, visibleCount)
  const availableOptions = displayOptions.filter(
    (option) => option < projects.length
  )
  const canLoadMore = limit !== 'all' && visibleProjects.length < projects.length

  const selectLimit = (option: Exclude<DisplayLimit, 'all'>) => {
    setLimit(option)
    setVisibleCount(option)
  }

  const showAllProjects = () => {
    setLimit('all')
    setVisibleCount(projects.length)
  }

  const loadMoreProjects = () => {
    if (limit === 'all') return
    setVisibleCount((count) => Math.min(count + limit, projects.length))
  }

  return (
    <>
      {projects.length > 6 && (
        <div className="service-detail-project-controls">
          <span role="status">
            {controls.showing} {visibleProjects.length} / {projects.length}
          </span>
          <div
            className="service-detail-project-count-buttons"
            role="group"
            aria-label={controls.label}
          >
            {availableOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={limit === option ? 'is-active' : undefined}
                aria-pressed={limit === option}
                onClick={() => selectLimit(option)}
              >
                {option}
              </button>
            ))}
            <button
              type="button"
              className={limit === 'all' ? 'is-active' : undefined}
              aria-pressed={limit === 'all'}
              onClick={showAllProjects}
            >
              {copy.all}
            </button>
          </div>
        </div>
      )}

      <ProjectCards
        projects={visibleProjects}
        locale={locale}
        copy={copy}
        className="service-detail-projects-grid"
      />

      {canLoadMore && (
        <button
          type="button"
          className="service-detail-projects-load-more"
          onClick={loadMoreProjects}
        >
          <Plus aria-hidden="true" />
          {controls.loadMore}
        </button>
      )}
    </>
  )
}
