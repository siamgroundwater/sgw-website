import { MapPinned } from 'lucide-react'
import type { LocalizedLocale } from '@/i18n/config'
import LegacyProjectMapViewer, {
  type LegacyMapViewerCopy,
} from './LegacyProjectMapViewer'
import styles from './LegacyProjectMapSection.module.css'

type LegacyMapCopy = LegacyMapViewerCopy & {
  eyebrow: string
  title: string
  imageAlt: string
}

const copyByLocale: Record<LocalizedLocale, LegacyMapCopy> = {
  th: {
    eyebrow: 'ผลงานในอดีต',
    title: 'ตัวอย่างโครงการทั่วประเทศไทย',
    imageAlt: 'แผนที่โครงการและลูกค้าในอดีตของสยามกราวด์วอเตอร์ทั่วประเทศไทย',
    action: 'เปิดและซูมแผนที่',
    close: 'ปิด',
    controls: 'เครื่องมือดูแผนที่',
    dialogTitle: 'ตัวอย่างโครงการทั่วประเทศไทย',
    instructions: 'ลากเพื่อเลื่อน ใช้สองนิ้ว ล้อเมาส์ หรือปุ่มเพื่อซูม',
    openOriginal: 'เปิดไฟล์ต้นฉบับ',
    reset: 'กลับเป็นขนาดปกติ',
    zoomIn: 'ขยาย',
    zoomLevel: 'ระดับการซูม',
    zoomOut: 'ย่อ',
  },
  en: {
    eyebrow: 'Historical portfolio',
    title: 'A nationwide map of project experience',
    imageAlt: 'Map of historical Siam Groundwater customers and projects across Thailand',
    action: 'Open and zoom map',
    close: 'Close',
    controls: 'Map viewer controls',
    dialogTitle: 'Nationwide project experience map',
    instructions: 'Drag to pan. Pinch, use the mouse wheel, or use the buttons to zoom.',
    openOriginal: 'Open original image',
    reset: 'Reset view',
    zoomIn: 'Zoom in',
    zoomLevel: 'Zoom level',
    zoomOut: 'Zoom out',
  },
  zh: {
    eyebrow: '历史项目档案',
    title: '覆盖泰国各地的项目经验地图',
    imageAlt: '暹罗地下水在泰国各地的历史客户与项目地图',
    action: '打开并缩放地图',
    close: '关闭',
    controls: '地图查看工具',
    dialogTitle: '泰国全国项目经验地图',
    instructions: '拖动查看，或使用双指、鼠标滚轮及按钮缩放。',
    openOriginal: '打开原图',
    reset: '重置视图',
    zoomIn: '放大',
    zoomLevel: '缩放比例',
    zoomOut: '缩小',
  },
  ja: {
    eyebrow: '過去の実績',
    title: 'タイ全土に広がるプロジェクト経験',
    imageAlt: 'タイ全土におけるサイアム・グラウンドウォーターの過去のお客様とプロジェクトの地図',
    action: '地図を開いて拡大',
    close: '閉じる',
    controls: '地図ビューアーの操作',
    dialogTitle: 'タイ全土のプロジェクト実績マップ',
    instructions: 'ドラッグで移動し、ピンチ、マウスホイール、またはボタンで拡大できます。',
    openOriginal: '原寸画像を開く',
    reset: '表示をリセット',
    zoomIn: '拡大',
    zoomLevel: '拡大率',
    zoomOut: '縮小',
  },
}

export default function LegacyProjectMapSection({
  locale = 'th',
}: {
  locale?: LocalizedLocale
}) {
  const copy = copyByLocale[locale]
  const imagePath = '/images/customers/legacy-project-map.jpg'

  return (
    <aside className={styles.section} aria-labelledby="legacy-project-map-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>
          <MapPinned aria-hidden="true" />
          {copy.eyebrow}
        </p>
        <h3 id="legacy-project-map-title">{copy.title}</h3>
      </div>

      <LegacyProjectMapViewer
        imagePath={imagePath}
        imageAlt={copy.imageAlt}
        copy={copy}
      />
    </aside>
  )
}
