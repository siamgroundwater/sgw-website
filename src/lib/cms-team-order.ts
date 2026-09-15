export function reorderCmsIds(ids: string[], activeId: string, targetId: string) {
  if (activeId === targetId) return ids
  const activeIndex = ids.indexOf(activeId)
  const targetIndex = ids.indexOf(targetId)
  if (activeIndex < 0 || targetIndex < 0) return ids
  const next = [...ids]
  const [moved] = next.splice(activeIndex, 1)
  next.splice(targetIndex, 0, moved)
  return next
}

export function reorderCmsIdsByIndex(
  ids: string[],
  activeId: string,
  initialIndex: number,
  targetIndex: number
) {
  if (
    initialIndex === targetIndex ||
    !Number.isInteger(initialIndex) ||
    !Number.isInteger(targetIndex) ||
    initialIndex < 0 ||
    targetIndex < 0 ||
    initialIndex >= ids.length ||
    targetIndex >= ids.length ||
    ids[initialIndex] !== activeId
  ) return ids

  const next = [...ids]
  const [moved] = next.splice(initialIndex, 1)
  next.splice(targetIndex, 0, moved)
  return next
}

export type CmsOrderedMember = {
  id: string
  order: number
  role: 'leader' | 'member'
}

export function reorderCmsMembersByIndex<T extends CmsOrderedMember>(
  members: T[],
  activeId: string,
  initialIndex: number,
  targetIndex: number
) {
  const current = [...members].sort((left, right) =>
    (left.role === 'leader' ? 0 : 1) - (right.role === 'leader' ? 0 : 1) ||
    left.order - right.order ||
    left.id.localeCompare(right.id)
  )
  const currentIds = current.map((member) => member.id)
  const nextIds = reorderCmsIdsByIndex(currentIds, activeId, initialIndex, targetIndex)
  if (nextIds === currentIds) return members

  const memberById = new Map(current.map((member) => [member.id, member]))
  return nextIds.map((id, position) => ({
    ...(memberById.get(id) as T),
    order: position,
    role: position === 0 ? 'leader' as const : 'member' as const,
  }))
}
