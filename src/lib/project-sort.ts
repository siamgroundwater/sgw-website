type ProjectWithYear = {
  _id: number | string
  year: number | null
}

export function sortProjectsNewestFirst<T extends ProjectWithYear>(
  projectRecords: readonly T[]
) {
  return [...projectRecords].sort((left, right) => {
    const leftYear = left.year ?? Number.NEGATIVE_INFINITY
    const rightYear = right.year ?? Number.NEGATIVE_INFINITY
    return rightYear - leftYear || String(left._id).localeCompare(String(right._id))
  })
}
