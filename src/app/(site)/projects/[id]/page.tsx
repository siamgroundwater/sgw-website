import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, MessageCircle } from 'lucide-react'
import { notFound, permanentRedirect } from 'next/navigation'
import ProjectMediaSlider from '@/components/ProjectMediaSlider/ProjectMediaSlider'
import { createThaiPageMetadata } from '@/lib/site-metadata'
import {
  getProjectMapUrl,
} from '@/lib/projects'
import { getPublicProjectById, getPublicProjectByLegacyId, listPublicProjects } from '@/server/public-projects'
import './page.css'

export const revalidate = 60

type ProjectPageProps = {
  params: Promise<{ id: string }>
}

async function resolveProject(id: string) {
  return (await getPublicProjectById(id)) || (await getPublicProjectByLegacyId(id))
}

export async function generateStaticParams() {
  return (await listPublicProjects()).map((project) => ({ id: String(project._id) }))
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { id } = await params
  const project = await resolveProject(id)
  if (!project) return { title: 'ไม่พบโครงการ | Siam Groundwater' }

  return createThaiPageMetadata({
    title: `${project.title} | ผลงาน Siam Groundwater`,
    description: project.summary || `ข้อมูลสรุปโครงการ ${project.title} จากทะเบียนผลงานของบริษัท สยามกราวด์วอเตอร์ จำกัด`,
    pathname: `/projects/${project._id}`,
  })
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { id } = await params
  const project = await resolveProject(id)
  if (!project) notFound()
  if (id !== project._id) permanentRedirect(`/projects/${project._id}`)
  const mapUrl = getProjectMapUrl(project)

  return (
    <main className="project-detail-page">
      <nav className="project-detail-breadcrumb" aria-label="เส้นทางนำทาง">
        <Link href="/">หน้าแรก</Link>
        <span aria-hidden="true">/</span>
        <Link href="/projects">ผลงานของเรา</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{project.title}</span>
      </nav>

      <article className="project-detail-card">
        <ProjectMediaSlider
          images={project.galleryImages}
          locale="th"
          projectNumber={project._id}
          title={project.title}
        />

        <div className="project-detail-content">
          <h1>{project.title}</h1>
          <p className="project-detail-lead">{project.location}</p>

          <dl className="project-detail-facts">
            {project.year && (
              <div>
                <dt>ปีผลงาน</dt>
                <dd>{project.year}</dd>
              </div>
            )}
            <div>
              <dt>สถานที่โครงการ</dt>
              <dd>{project.location}</dd>
            </div>
            <div>
              <dt>ประเภทงาน</dt>
              <dd>{project.projectTypeLabel}</dd>
            </div>
            <div>
              <dt>หมวดหมู่</dt>
              <dd>{project.category.join(' • ')}</dd>
            </div>
            {project.workTypes.length > 0 && (
              <div>
                <dt>ขอบเขตงาน</dt>
                <dd>{project.workTypes.join(' • ')}</dd>
              </div>
            )}
            {project.businessTypes.length > 0 && (
              <div>
                <dt>ประเภทธุรกิจ</dt>
                <dd>{project.businessTypes.join(' • ')}</dd>
              </div>
            )}
          </dl>

          <section className="project-detail-record">
            <h2>รายละเอียดงาน</h2>
            <p className="project-detail-story">{project.summary}</p>
            {project.details.length ? <div className="project-detail-sections">{project.details.map((detail, index) => <p key={`${index}-${detail.slice(0, 24)}`}>{detail}</p>)}</div> : null}
            <p className="project-detail-source">
              เรียบเรียงจากทะเบียนผลงานและเนื้อหาที่เผยแพร่ในเว็บไซต์เดิมของบริษัท
            </p>
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
                ดูตำแหน่งบนแผนที่
              </a>
            )}
            <Link href="/contact" className="project-detail-secondary">
              <MessageCircle aria-hidden="true" />
              ขอข้อมูลโครงการใกล้เคียง
            </Link>
          </div>
        </div>
      </article>
    </main>
  )
}
