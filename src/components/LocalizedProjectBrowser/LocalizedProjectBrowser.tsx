'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'
import { projects } from '@/lib/projects'
import { localePath, type LocalizedLocale } from '@/i18n/config'
import type { LocalizedContent } from '@/i18n/localized-content'
import {
  PROJECT_CATEGORY_KEYS,
  getLocalizedProjectPresentation,
  getProjectCategoryKey,
  type ProjectCategoryKey,
} from '@/i18n/projects'
import './LocalizedProjectBrowser.css'

type LocalizedProjectBrowserProps = {
  locale: LocalizedLocale
  copy: LocalizedContent['projects']
}

export default function LocalizedProjectBrowser({
  locale,
  copy,
}: LocalizedProjectBrowserProps) {
  const [filter, setFilter] = useState<'all' | ProjectCategoryKey>('all')
  const [visibleCount, setVisibleCount] = useState(12)

  const filteredProjects = useMemo(
    () =>
      filter === 'all'
        ? projects
        : projects.filter(
            (project) => getProjectCategoryKey(project.projectType) === filter
          ),
    [filter]
  )

  const visibleProjects = filteredProjects.slice(0, visibleCount)

  const selectFilter = (nextFilter: 'all' | ProjectCategoryKey) => {
    setFilter(nextFilter)
    setVisibleCount(12)
  }

  return (
    <>
      <div className="localized-project-filters" aria-label={copy.categoryLabel}>
        <button
          type="button"
          className={filter === 'all' ? 'is-active' : ''}
          onClick={() => selectFilter('all')}
        >
          {copy.all}
        </button>
        {PROJECT_CATEGORY_KEYS.map((category) => (
          <button
            type="button"
            key={category}
            className={filter === category ? 'is-active' : ''}
            onClick={() => selectFilter(category)}
          >
            {copy.categories[category]}
          </button>
        ))}
      </div>

      <p className="localized-project-count" role="status">
        {copy.showing} {visibleProjects.length} / {filteredProjects.length}
      </p>

      <div className="localized-project-grid">
        {visibleProjects.map((project) => {
          const presentation = getLocalizedProjectPresentation(project, copy)
          return (
            <article key={project._id} className="localized-project-card">
              <Link
                href={localePath(`/projects/${project._id}`, locale)}
                className="localized-project-card-visual"
                aria-label={`${copy.details}: ${project.title}`}
              >
                <Image
                  src={project.localCoverImage}
                  alt={project.title}
                  width={800}
                  height={600}
                  sizes="(width <= 600px) 100vw, (width <= 900px) 50vw, 33vw"
                />
                <span>
                  {copy.yearLabel}: {project.year ?? '—'}
                </span>
              </Link>
              <div className="localized-project-card-body">
                <p>{presentation.categoryLabel}</p>
                <h2>{project.title}</h2>
                <span>{project.location}</span>
                <span>{presentation.typeLabel}</span>
                <Link href={localePath(`/projects/${project._id}`, locale)}>
                  {copy.details}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </article>
          )
        })}
      </div>

      {visibleCount < filteredProjects.length && (
        <button
          type="button"
          className="localized-project-load-more"
          onClick={() => setVisibleCount((count) => count + 12)}
        >
          <Plus aria-hidden="true" />
          {copy.loadMore}
        </button>
      )}
    </>
  )
}
