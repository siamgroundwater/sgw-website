export const cmsMediaFolders = ['projects', 'services', 'learning'] as const

export type CmsMediaFolder = (typeof cmsMediaFolders)[number]

export type CmsMediaAsset = {
  bytes: number
  createdAt: string
  format: string
  height: number
  publicId: string
  src: string
  width: number
}

export type CmsStagedMediaUpload = {
  asset: CmsMediaAsset
  token: string
}
