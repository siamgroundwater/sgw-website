'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  Layers3,
  MapPin,
  MapPinned,
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { projects as projectRegistry, type Project } from '@/lib/projects'
import { localePath, type LocalizedLocale } from '@/i18n/config'
import type { LocalizedContent } from '@/i18n/localized-content'
import {
  PROJECT_CATEGORY_KEYS,
  getLocalizedProjectPresentation,
  getProjectCategoryKey,
  type ProjectCategoryKey,
} from '@/i18n/projects'
import './map.css'

export type HomeProject = Project
type MappableProject = Project & { lat: number; lng: number }
type MapFilter = 'all' | ProjectCategoryKey

type HomeMapProps = {
  projects?: HomeProject[]
  title?: string
  locale?: LocalizedLocale
  projectCopy?: LocalizedContent['projects']
}

const mapCopy: Record<
  LocalizedLocale,
  {
    eyebrow: string
    intro: string
    mapped: string
    total: string
    filterLabel: string
    loading: string
    empty: string
    viewProject: string
  }
> = {
  th: {
    eyebrow: 'แผนที่ผลงาน',
    intro: 'ค้นหาผลงานตามพื้นที่และประเภทโครงการ แล้วเปิดดูรายละเอียด ภาพ และขอบเขตงานของแต่ละโครงการ',
    mapped: 'โครงการบนแผนที่',
    total: 'โครงการทั้งหมด',
    filterLabel: 'กรองโครงการบนแผนที่ตามหมวดหมู่',
    loading: 'กำลังโหลดแผนที่โครงการ…',
    empty: 'ไม่พบโครงการที่มีตำแหน่งในหมวดหมู่นี้',
    viewProject: 'ดูรายละเอียดโครงการ',
  },
  en: {
    eyebrow: 'Project map',
    intro: 'Explore work by location and project type, then open each record for its images, scope and details.',
    mapped: 'projects on the map',
    total: 'total projects',
    filterLabel: 'Filter map projects by category',
    loading: 'Loading project map…',
    empty: 'No mapped projects were found in this category.',
    viewProject: 'View project details',
  },
  zh: {
    eyebrow: '项目地图',
    intro: '按地区和项目类型查看案例，并打开项目记录了解图片、范围和详细信息。',
    mapped: '地图项目',
    total: '全部项目',
    filterLabel: '按类别筛选地图项目',
    loading: '正在加载项目地图…',
    empty: '此类别中没有带地图位置的项目。',
    viewProject: '查看项目详情',
  },
  ja: {
    eyebrow: '実績マップ',
    intro: '地域と案件種別から実績を探し、画像、業務範囲、詳細情報をご覧いただけます。',
    mapped: '地図掲載案件',
    total: '全案件',
    filterLabel: 'カテゴリで地図の案件を絞り込む',
    loading: '実績マップを読み込んでいます…',
    empty: 'このカテゴリには位置情報付きの案件がありません。',
    viewProject: '案件詳細を見る',
  },
}

const fallbackCategoryLabels: Record<ProjectCategoryKey, string> = {
  government: 'ภาครัฐ',
  factory: 'โรงงาน',
  resort: 'โรงแรม รีสอร์ต',
  agriculture: 'เกษตรกรรม ปศุสัตว์',
  dewatering: 'Dewatering',
  other: 'อื่นๆ',
}

let LeafletLib: typeof import('leaflet') | null = null

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), {
  ssr: false,
})
const MarkerClusterGroup = dynamic(
  () => import('react-leaflet-cluster').then((mod) => mod.default),
  { ssr: false }
)

const FALLBACK_CENTER: [number, number] = [15, 100]

function isMappableProject(project: Project): project is MappableProject {
  return (
    typeof project.lat === 'number' &&
    Number.isFinite(project.lat) &&
    project.lat >= -90 &&
    project.lat <= 90 &&
    typeof project.lng === 'number' &&
    Number.isFinite(project.lng) &&
    project.lng >= -180 &&
    project.lng <= 180
  )
}

export default function HomeMap({
  projects,
  title,
  locale = 'th',
  projectCopy,
}: HomeMapProps) {
  const [leafletReady, setLeafletReady] = useState(false)
  const [filter, setFilter] = useState<MapFilter>('all')
  const copy = mapCopy[locale]
  const data = projects ?? projectRegistry

  useEffect(() => {
    let active = true

    void import('leaflet').then((L) => {
      if (!active) return
      LeafletLib = L

      L.Marker.prototype.options.icon = L.icon({
        iconUrl: '/images/map/marker-icon.png',
        iconRetinaUrl: '/images/map/marker-icon-2x.png',
        shadowUrl: '/images/map/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -36],
        shadowSize: [41, 41],
      })

      setLeafletReady(true)
    })

    return () => {
      active = false
    }
  }, [])

  const validProjects = useMemo<MappableProject[]>(
    () => data.filter(isMappableProject),
    [data]
  )

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(
      PROJECT_CATEGORY_KEYS.map((category) => [category, 0])
    ) as Record<ProjectCategoryKey, number>

    validProjects.forEach((project) => {
      counts[getProjectCategoryKey(project.projectType)] += 1
    })
    return counts
  }, [validProjects])

  const filteredProjects = useMemo(
    () =>
      filter === 'all'
        ? validProjects
        : validProjects.filter(
            (project) => getProjectCategoryKey(project.projectType) === filter
          ),
    [filter, validProjects]
  )

  const center: [number, number] = useMemo(() => {
    if (!validProjects.length) return FALLBACK_CENTER
    const latSum = validProjects.reduce((sum, project) => sum + project.lat, 0)
    const lngSum = validProjects.reduce((sum, project) => sum + project.lng, 0)
    return [latSum / validProjects.length, lngSum / validProjects.length]
  }, [validProjects])

  const createClusterCustomIcon = (cluster: { getChildCount: () => number }) => {
    const L = LeafletLib
    if (!L) return undefined

    const count = cluster.getChildCount()
    const bucketClass =
      count >= 20
        ? 'home-map-cluster-bucket-large'
        : count >= 6
          ? 'home-map-cluster-bucket-medium'
          : 'home-map-cluster-bucket-small'

    return L.divIcon({
      html: `<span>${count}</span>`,
      className: `home-map-cluster-icon ${bucketClass}`,
      iconSize: L.point(44, 44, true),
    })
  }

  const categoryLabel = (category: ProjectCategoryKey) =>
    projectCopy?.categories[category] ?? fallbackCategoryLabels[category]

  const heading = title ?? 'ตัวอย่างผลงาน ทุกภูมิภาค ทั่วประเทศ'

  return (
    <section className="home-map-section" aria-labelledby="home-map-title">
      <div className="home-map-header">
        <div className="home-map-heading-copy">
          <p className="home-map-eyebrow">
            <MapPinned aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h2 className="home-map-title" id="home-map-title">
            {heading}
          </h2>
          <p className="home-map-intro">{copy.intro}</p>
        </div>

        <div className="home-map-stats" aria-label={heading}>
          <div>
            <strong>{validProjects.length}</strong>
            <span>{copy.mapped}</span>
          </div>
          <div>
            <strong>{data.length}</strong>
            <span>{copy.total}</span>
          </div>
        </div>
      </div>

      <div
        className="home-map-filters"
        role="group"
        aria-label={copy.filterLabel}
      >
        <button
          type="button"
          className={filter === 'all' ? 'is-active' : ''}
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          <Layers3 aria-hidden="true" />
          <span>{projectCopy?.all ?? 'ทั้งหมด'}</span>
          <b>{validProjects.length}</b>
        </button>
        {PROJECT_CATEGORY_KEYS.map((category) => (
          <button
            type="button"
            className={filter === category ? 'is-active' : ''}
            aria-pressed={filter === category}
            onClick={() => setFilter(category)}
            key={category}
          >
            <span>{categoryLabel(category)}</span>
            <b>{categoryCounts[category]}</b>
          </button>
        ))}
      </div>

      <div className="home-map-wrapper">
        {!leafletReady ? (
          <div className="home-map-loading" role="status">
            <MapPinned aria-hidden="true" />
            <span>{copy.loading}</span>
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={6}
            minZoom={4}
            maxZoom={18}
            scrollWheelZoom
            className="home-map-container"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <MarkerClusterGroup
              chunkedLoading
              iconCreateFunction={createClusterCustomIcon}
              spiderfyOnEveryZoom={false}
              showCoverageOnHover={false}
              maxClusterRadius={34}
            >
              {filteredProjects.map((project) => {
                const presentation = projectCopy
                  ? getLocalizedProjectPresentation(project, projectCopy)
                  : undefined
                const detailHref = localePath(
                  `/projects/${project._id}`,
                  locale
                )

                return (
                  <Marker
                    key={project._id}
                    position={[project.lat, project.lng]}
                  >
                    <Popup minWidth={420}>
                      <article className="home-map-popup">
                        <Link
                          href={detailHref}
                          className="home-map-popup-image"
                          aria-label={`${copy.viewProject}: ${project.title}`}
                        >
                          <Image
                            src={project.localCoverImage}
                            alt=""
                            width={640}
                            height={400}
                            sizes="320px"
                          />
                        </Link>

                        <div className="home-map-popup-content">
                          <p className="home-map-popup-category">
                            {presentation?.categoryLabel ??
                              project.category.join(', ')}
                          </p>
                          <h3>
                            <Link href={detailHref}>{project.title}</Link>
                          </h3>

                          <div className="home-map-popup-meta">
                            <span>
                              <MapPin aria-hidden="true" />
                              {project.location}
                            </span>
                            {project.year && (
                              <span>
                                <CalendarDays aria-hidden="true" />
                                {projectCopy?.yearLabel ?? 'ปีผลงาน'}{' '}
                                {project.year}
                              </span>
                            )}
                          </div>

                          <Link
                            href={detailHref}
                            className="home-map-popup-action"
                          >
                            {projectCopy?.details ?? copy.viewProject}
                            <ArrowRight aria-hidden="true" />
                          </Link>
                        </div>
                      </article>
                    </Popup>
                  </Marker>
                )
              })}
            </MarkerClusterGroup>
          </MapContainer>
        )}

        {leafletReady && filteredProjects.length === 0 && (
          <div className="home-map-empty" role="status">
            <MapPin aria-hidden="true" />
            {copy.empty}
          </div>
        )}
      </div>
    </section>
  )
}
