import Image from 'next/image'
import type { SiteLocale } from '@/i18n/config'
import { diagramCopy, diagramPositions, type DiagramKind } from './diagram-copy'
import './LearningDiagram.css'

type Props = { kind: DiagramKind; locale: SiteLocale; src: string; alt: string; priority?: boolean }

/** Content for an existing figure; annotations remain readable without interaction. */
export default function LearningDiagram({ kind, locale, src, alt, priority = false }: Props) {
  const copy = diagramCopy[locale][kind]
  return (
    <>
      <div className="learning-diagram-image">
        <Image src={src} alt={alt} width={kind === 'system' || kind === 'quality' ? 1600 : 1536} height={kind === 'system' || kind === 'quality' ? 900 : 1024} sizes="(width <= 900px) 100vw, 1100px" priority={priority} />
        <div className="learning-diagram-markers" aria-hidden="true">
          {diagramPositions[kind].map((point, index) => <span key={index} style={{ left: `${point.x}%`, top: `${point.y}%` }}>{index + 1}</span>)}
        </div>
      </div>
      <figcaption className="learning-diagram-caption">
        <strong className="learning-diagram-title">{copy.title}</strong>
        <ol className="learning-diagram-key" role="list">
          {copy.points.map((point, index) => <li key={point.title}><strong><span aria-hidden="true">{index + 1}</span>{point.title}</strong><p>{point.text}</p></li>)}
        </ol>
        <p className="learning-diagram-note">{copy.note}</p>
      </figcaption>
    </>
  )
}
