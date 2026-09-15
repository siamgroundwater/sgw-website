'use client'

import { KeyboardSensor, PointerSensor } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { Accessibility, PointerActivationConstraints, defaultPreset } from '@dnd-kit/dom'
import type { ReactNode } from 'react'

const sortableLinkSensors = [
  PointerSensor.configure({
    activationConstraints(event) {
      return event.pointerType === 'touch'
        ? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 })]
        : [new PointerActivationConstraints.Distance({ value: 5 })]
    },
  }),
  KeyboardSensor.configure({
    keyboardCodes: {
      start: ['Space'],
      cancel: ['Escape'],
      end: ['Space', 'Enter', 'Tab'],
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
    },
  }),
]

export const cmsSortableCardPlugins = (defaults: typeof defaultPreset.plugins) =>
  defaults.filter((plugin) => plugin !== Accessibility)

export type CmsDndSortableLinkProps = {
  id: string
  index: number
  group: string
  enabled: boolean
  href: string
  className: string
  ariaLabel: string
  describedBy?: string
  children: ReactNode
}

type CmsLinkProps = Pick<
  CmsDndSortableLinkProps,
  'id' | 'group' | 'href' | 'className' | 'ariaLabel' | 'describedBy' | 'children'
>

function CmsStaticLink({
  id,
  group,
  href,
  className,
  ariaLabel,
  describedBy,
  children,
}: CmsLinkProps) {
  return (
    <a
      className={className}
      href={href}
      draggable={false}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      data-cms-sort-id={id}
      data-cms-sort-group={group}
      data-cms-sortable="false"
    >
      {children}
    </a>
  )
}

function CmsSortableLink({
  id,
  index,
  group,
  href,
  className,
  ariaLabel,
  describedBy,
  children,
}: Omit<CmsDndSortableLinkProps, 'enabled'>) {
  const { ref } = useSortable({
    accept: group,
    id,
    index,
    group,
    sensors: sortableLinkSensors,
    type: group,
  })

  return (
    <a
      ref={ref}
      className={className}
      href={href}
      draggable={false}
      role="link"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      aria-keyshortcuts="Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight Escape"
      data-cms-sort-id={id}
      data-cms-sort-group={group}
      data-cms-sortable="true"
    >
      {children}
    </a>
  )
}

export function CmsDndSortableLink(props: CmsDndSortableLinkProps) {
  if (!props.enabled) {
    return <CmsStaticLink {...props} />
  }

  return <CmsSortableLink {...props} />
}
