'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ProjectCards } from '@/app/(site)/home/projects/projects'
import type { LocalizedLocale } from '@/i18n/config'
import type { LocalizedContent } from '@/i18n/localized-content'
import type { ProjectSummary } from '@/lib/project-summaries'

const PROJECTS_PER_PAGE = 6

export default function NearbyProjectsSection({
  projects,
  locale,
  copy,
  title,
}: {
  projects: ProjectSummary[]
  locale: LocalizedLocale
  copy: LocalizedContent['projects']
  title: string
}) {
  const [visibleCount, setVisibleCount] = useState(PROJECTS_PER_PAGE)
  const visibleProjects = projects.slice(0, visibleCount)
  const canShowMore = visibleProjects.length < projects.length

  return (
    <section className="project-detail-nearby" aria-labelledby="project-detail-nearby-title">
      <h2 id="project-detail-nearby-title">{title}</h2>
      <ProjectCards
        projects={visibleProjects}
        locale={locale}
        copy={copy}
        className="project-detail-nearby-grid"
      />
      {canShowMore && (
        <button
          type="button"
          className="project-detail-nearby-more"
          onClick={() => setVisibleCount((count) => count + PROJECTS_PER_PAGE)}
        >
          <Plus aria-hidden="true" />
          {copy.loadMore}
        </button>
      )}
    </section>
  )
}
