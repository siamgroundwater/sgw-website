import Link from 'next/link'
import { MapPin, MessageCircle } from 'lucide-react'
import ProjectMediaSlider from '@/components/ProjectMediaSlider/ProjectMediaSlider'
import { localePath, type LocalizedLocale } from '@/i18n/config'
import {
  getLocalizedProjectPresentation,
  localizeProject,
} from '@/i18n/projects'
import type { LocalizedContent } from '@/i18n/localized-content'
import { getProjectMapUrl, type Project } from '@/lib/projects'
import { projectDetailSections } from '@/lib/project-translations'

type ProjectDetailLabels = {
  breadcrumb: string
  home: string
  projects: string
  year: string
  location: string
  category: string
  workScope: string
  storyTitle: string
  sourceNote: string
  mapAction: string
  enquiryAction: string
}

export default function ProjectDetailView({
  locale,
  content,
  project: rawProject,
  labelOverrides,
  embedded = false,
}: {
  locale: LocalizedLocale
  content: LocalizedContent
  project: Project
  labelOverrides?: Partial<ProjectDetailLabels>
  embedded?: boolean
}) {
  const project = localizeProject(rawProject, locale)
  const presentation = getLocalizedProjectPresentation(project, content.projects)
  const mapUrl = getProjectMapUrl(project)
  const detailSections = projectDetailSections(project.summary, project.details)
  const labels: ProjectDetailLabels = {
    breadcrumb: content.common.breadcrumbLabel,
    home: content.common.home,
    projects: content.projects.title,
    year: content.projects.yearLabel,
    location: content.projects.location,
    category: content.projects.categoryLabel,
    workScope: content.projects.workScopeLabel,
    storyTitle: content.projects.projectStoryTitle,
    sourceNote: content.projects.recoveredRecordNote,
    mapAction: content.projects.mapCta,
    enquiryAction: content.projects.enquiryCta,
    ...labelOverrides,
  }
  const Container = embedded ? 'div' : 'main'

  return (
    <Container className="project-detail-page">
      <nav className="project-detail-breadcrumb" aria-label={labels.breadcrumb}>
        <Link href={localePath('/', locale)}>{labels.home}</Link>
        <span aria-hidden="true">/</span>
        <Link href={localePath('/projects', locale)}>{labels.projects}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{project.title}</span>
      </nav>

      <article className="project-detail-card">
        <ProjectMediaSlider
          images={[project.coverImage, ...project.galleryImages].filter(Boolean)}
          metadata={project.mediaMetadata}
          locale={locale}
          projectNumber={project._id}
          title={project.title}
        />

        <div className="project-detail-content">
          <h1>{project.title}</h1>
          <p className="project-detail-lead">{project.location}</p>

          <dl className="project-detail-facts">
            {project.year && (
              <div>
                <dt>{labels.year}</dt>
                <dd>{project.year}</dd>
              </div>
            )}
            <div>
              <dt>{labels.location}</dt>
              <dd>{project.location}</dd>
            </div>
            <div>
              <dt>{labels.category}</dt>
              <dd>{presentation.categoryLabel}</dd>
            </div>
            {project.workTypes.length > 0 && (
              <div>
                <dt>{labels.workScope}</dt>
                <dd>{project.workTypes.join(' • ')}</dd>
              </div>
            )}
          </dl>

          <section className="project-detail-record">
            <h2>{labels.storyTitle}</h2>
            <p className="project-detail-story">{project.summary}</p>
            {detailSections.length ? (
              <div className="project-detail-sections">
                {detailSections.map((detail, index) => (
                  <p key={`${index}-${detail.slice(0, 24)}`}>{detail}</p>
                ))}
              </div>
            ) : null}
            <p className="project-detail-source">{labels.sourceNote}</p>
          </section>

          <div className="project-detail-actions">
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="project-detail-primary"
              >
                <MapPin aria-hidden="true" />
                {labels.mapAction}
              </a>
            )}
            <Link
              href={localePath('/contact', locale)}
              className="project-detail-secondary"
            >
              <MessageCircle aria-hidden="true" />
              {labels.enquiryAction}
            </Link>
          </div>
        </div>
      </article>
    </Container>
  )
}
