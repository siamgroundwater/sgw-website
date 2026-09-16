type PositionedProject = {
  _id: string
  lat: number | null
  lng: number | null
}

const EARTH_RADIUS_KM = 6371

function hasValidCoordinates(
  project: PositionedProject
): project is PositionedProject & { lat: number; lng: number } {
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

function toRadians(value: number) {
  return value * (Math.PI / 180)
}

function distanceInKilometres(
  from: PositionedProject & { lat: number; lng: number },
  to: PositionedProject & { lat: number; lng: number }
) {
  const latitudeDelta = toRadians(to.lat - from.lat)
  const longitudeDelta = toRadians(to.lng - from.lng)
  const fromLatitude = toRadians(from.lat)
  const toLatitude = toRadians(to.lat)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(haversine)))
}

export function selectNearbyProjects<T extends PositionedProject>(
  currentProject: PositionedProject,
  projects: readonly T[],
  limit = 3
) {
  if (!hasValidCoordinates(currentProject) || limit <= 0) return []

  return projects
    .filter(
      (project): project is T & { lat: number; lng: number } =>
        project._id !== currentProject._id && hasValidCoordinates(project)
    )
    .map((project) => ({
      distance: distanceInKilometres(currentProject, project),
      project,
    }))
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.project._id.localeCompare(right.project._id)
    )
    .slice(0, Math.floor(limit))
    .map(({ project }) => project)
}
