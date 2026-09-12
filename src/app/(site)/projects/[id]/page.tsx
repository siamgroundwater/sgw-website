import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import ProjectDetailView from '@/components/ProjectDetailView/ProjectDetailView'
import { getLocalizedContent } from '@/i18n/localized-content'
import { createThaiPageMetadata } from '@/lib/site-metadata'
import { getPublicProjectById, listPublicProjects } from '@/server/public-projects'
import './page.css'

export const revalidate = 60

type ProjectPageProps = {
  params: Promise<{ id: string }>
}

async function resolveProject(id: string) {
  return getPublicProjectById(id)
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
  return <ProjectDetailView
    locale="th"
    content={getLocalizedContent('th')}
    project={project}
    labelOverrides={{
      breadcrumb: 'เส้นทางนำทาง',
      home: 'หน้าแรก',
      projects: 'ผลงานของเรา',
      category: 'หมวดหมู่',
      mapAction: 'ดูตำแหน่งบนแผนที่',
      enquiryAction: 'ขอข้อมูลโครงการใกล้เคียง',
    }}
  />
}
