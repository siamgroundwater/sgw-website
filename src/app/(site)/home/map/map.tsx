'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  Layers3,
  LocateFixed,
  MapPin,
  MapPinned,
  X,
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import type { ProjectSummary } from '@/lib/project-summaries'
import { localePath, type LocalizedLocale } from '@/i18n/config'
import type { LocalizedContent } from '@/i18n/localized-content'
import {
  PROJECT_CATEGORY_KEYS,
  getLocalizedProjectPresentation,
  getProjectCategoryKey,
  type ProjectCategoryKey,
} from '@/i18n/projects'
import './map.css'
import type { Map as LeafletMap } from 'leaflet'

export type HomeProject = ProjectSummary
type MappableProject = ProjectSummary & { lat: number; lng: number }
type MapFilter = 'all' | ProjectCategoryKey
type LocationStatus = 'idle' | 'locating' | 'found' | 'error'

type CurrentLocation = {
  lat: number
  lng: number
  accuracy: number
}

type HomeMapProps = {
  projects: HomeProject[]
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
    locate: string
    locating: string
    locationFound: string
    locationUnavailable: string
    locationDenied: string
  }
> = {
  th: {
    locate: 'ตำแหน่งปัจจุบัน',
    locating: 'กำลังค้นหาตำแหน่งของคุณ…',
    locationFound: 'พบตำแหน่งปัจจุบันแล้ว',
    locationUnavailable: 'ไม่สามารถค้นหาตำแหน่งปัจจุบันได้ กรุณาตรวจสอบการตั้งค่าอุปกรณ์',
    locationDenied: 'กรุณาอนุญาตให้เว็บไซต์เข้าถึงตำแหน่งของคุณ',
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
    locate: 'Current location',
    locating: 'Finding your location…',
    locationFound: 'Current location found',
    locationUnavailable: 'Your current location could not be found. Check your device settings.',
    locationDenied: 'Allow location access to use this feature.',
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
    locate: '当前位置',
    locating: '正在查找您的位置…',
    locationFound: '已找到当前位置',
    locationUnavailable: '无法获取当前位置，请检查设备设置。',
    locationDenied: '请允许网站访问您的位置。',
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
    locate: '現在地',
    locating: '現在地を取得しています…',
    locationFound: '現在地を表示しました',
    locationUnavailable: '現在地を取得できませんでした。端末の設定をご確認ください。',
    locationDenied: '位置情報へのアクセスを許可してください。',
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
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
)
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
)
const MarkerClusterGroup = dynamic(
  () => import('react-leaflet-cluster').then((mod) => mod.default),
  { ssr: false }
)

const FALLBACK_CENTER: [number, number] = [15, 100]

function isMappableProject(project: HomeProject): project is MappableProject {
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
  const [selectedProject, setSelectedProject] =
    useState<MappableProject | null>(null)
  const [currentLocation, setCurrentLocation] =
    useState<CurrentLocation | null>(null)
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>('idle')
  const [locationMessage, setLocationMessage] = useState('')
  const mapRef = useRef<LeafletMap | null>(null)
  const isMountedRef = useRef(true)
  const copy = mapCopy[locale]
  const data = projects

  const setMapRef = useCallback((map: LeafletMap | null) => {
    mapRef.current = map
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

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

  useEffect(() => {
    if (locationStatus !== 'found') return

    const timeoutId = window.setTimeout(() => {
      setLocationMessage('')
      setLocationStatus('idle')
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [locationStatus])

  const moveToCurrentLocation = () => {
    if (locationStatus === 'locating') return

    if (!navigator.geolocation) {
      setLocationStatus('error')
      setLocationMessage(copy.locationUnavailable)
      return
    }

    setLocationStatus('locating')
    setLocationMessage(copy.locating)

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!isMountedRef.current) return

        const nextLocation = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: Math.max(coords.accuracy, 1),
        }

        setCurrentLocation(nextLocation)
        setLocationStatus('found')
        setLocationMessage(copy.locationFound)
        setSelectedProject(null)
        mapRef.current?.flyTo(
          [nextLocation.lat, nextLocation.lng],
          Math.max(mapRef.current.getZoom(), 15),
          { animate: true, duration: 1.1 }
        )
      },
      (error) => {
        if (!isMountedRef.current) return
        setLocationStatus('error')
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? copy.locationDenied
            : copy.locationUnavailable
        )
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    )
  }

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

  const selectedPresentation =
    selectedProject && projectCopy
      ? getLocalizedProjectPresentation(selectedProject, projectCopy)
      : undefined
  const selectedDetailHref = selectedProject
    ? localePath(`/projects/${selectedProject._id}`, locale)
    : ''

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
          onClick={() => {
            setFilter('all')
            setSelectedProject(null)
          }}
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
            onClick={() => {
              setFilter(category)
              setSelectedProject(null)
            }}
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
            ref={setMapRef}
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
              spiderfyOnEveryZoom
              zoomToBoundsOnClick={false}
              showCoverageOnHover={false}
              maxClusterRadius={34}
              spiderfyDistanceMultiplier={1.35}
            >
              {filteredProjects.map((project) => (
                <Marker
                  key={project._id}
                  position={[project.lat, project.lng]}
                  title={project.title}
                  alt={project.title}
                  eventHandlers={{
                    click: () => setSelectedProject(project),
                  }}
                />
              ))}
            </MarkerClusterGroup>

            {currentLocation && (
              <>
                <Circle
                  center={[currentLocation.lat, currentLocation.lng]}
                  radius={currentLocation.accuracy}
                  interactive={false}
                  pathOptions={{
                    color: '#0891b2',
                    fillColor: '#67e8f9',
                    fillOpacity: 0.14,
                    weight: 1,
                  }}
                />
                <CircleMarker
                  center={[currentLocation.lat, currentLocation.lng]}
                  radius={8}
                  interactive={false}
                  pathOptions={{
                    color: '#ffffff',
                    fillColor: '#0891b2',
                    fillOpacity: 1,
                    weight: 3,
                  }}
                />
              </>
            )}
          </MapContainer>
        )}

        {leafletReady && (
          <div className="home-map-location-control">
            <button
              type="button"
              className={locationStatus === 'locating' ? 'is-locating' : ''}
              aria-label={copy.locate}
              aria-busy={locationStatus === 'locating'}
              title={copy.locate}
              onClick={moveToCurrentLocation}
              disabled={locationStatus === 'locating'}
            >
              <LocateFixed aria-hidden="true" />
              <span>{copy.locate}</span>
            </button>
            {locationMessage && (
              <p
                className={`home-map-location-message is-${locationStatus}`}
                role="status"
                aria-live="polite"
              >
                {locationMessage}
              </p>
            )}
          </div>
        )}

        {selectedProject && (
          <article
            className="home-map-popup home-map-popup-overlay"
            aria-label={`${copy.viewProject}: ${selectedProject.title}`}
          >
            <button
              type="button"
              className="home-map-popup-dismiss"
              aria-label="Close project details"
              onClick={() => setSelectedProject(null)}
            >
              <X aria-hidden="true" />
            </button>

            <Link
              href={selectedDetailHref}
              className="home-map-popup-image"
              aria-label={`${copy.viewProject}: ${selectedProject.title}`}
            >
              <Image
                src={selectedProject.coverImage}
                alt=""
                width={640}
                height={400}
                sizes="320px"
              />
            </Link>

            <div className="home-map-popup-content">
              <p className="home-map-popup-category">
                {selectedPresentation?.categoryLabel ??
                  selectedProject.category.join(', ')}
              </p>
              <h3>
                <Link href={selectedDetailHref}>{selectedProject.title}</Link>
              </h3>

              <div className="home-map-popup-meta">
                <span>
                  <MapPin aria-hidden="true" />
                  {selectedProject.location}
                </span>
                {selectedProject.year && (
                  <span>
                    <CalendarDays aria-hidden="true" />
                    {projectCopy?.yearLabel && `${projectCopy.yearLabel} `}
                    {selectedProject.year}
                  </span>
                )}
              </div>

              <Link
                href={selectedDetailHref}
                className="home-map-popup-action"
                target="_blank"
                rel="noopener noreferrer"
              >
                {projectCopy?.details ?? copy.viewProject}
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </article>
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
