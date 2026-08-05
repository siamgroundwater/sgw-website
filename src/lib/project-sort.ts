type ProjectWithYear = {
  _id: number
  year: number | null
}

export function sortProjectsNewestFirst<T extends ProjectWithYear>(
  projectRecords: readonly T[]
) {
  return [...projectRecords].sort((left, right) => {
    const leftYear = left.year ?? Number.NEGATIVE_INFINITY
    const rightYear = right.year ?? Number.NEGATIVE_INFINITY
    return rightYear - leftYear || left._id - right._id
  })
}
