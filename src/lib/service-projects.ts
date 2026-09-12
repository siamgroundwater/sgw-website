import type { ServiceKey } from '../i18n/localized-content.ts'
import { normalizeProjectWorkTypes } from './project-work-types.ts'
import type { CmsProjectWorkType } from '../types/cms.ts'

export const SERVICE_PROJECT_WORK_TYPES: Record<
  ServiceKey,
  CmsProjectWorkType
> = {
  survey: 'groundwater-survey',
  drilling: 'groundwater-well-drilling',
  maintenance: 'groundwater-well-maintenance',
  consult: 'groundwater-project-remediation',
}

export function selectServiceProjects<T extends { workTypes: unknown }>(
  projects: readonly T[],
  serviceKey: ServiceKey,
  limit: number | 'all' = 3
) {
  const requiredWorkType = SERVICE_PROJECT_WORK_TYPES[serviceKey]
  const matches = projects.filter((project) =>
    normalizeProjectWorkTypes(project.workTypes).includes(requiredWorkType)
  )

  return limit === 'all' ? matches : matches.slice(0, limit)
}
