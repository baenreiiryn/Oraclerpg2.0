export type MediaRole = "icon" | "portrait" | "token" | "artwork" | "thumbnail";
export type MediaStoragePolicy = "remote" | "mirrorOnDemand" | "local";

export interface MediaAsset {
  id: string;
  role: MediaRole;
  provider: string;
  sourcePath: string;
  sourceUrl: string;
  mimeType?: string;
  width?: number;
  height?: number;
  storagePolicy?: MediaStoragePolicy;
  localPath?: string;
  attribution?: string;
  license?: string;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface EntityMediaData {
  primaryRole?: MediaRole;
  assets: readonly MediaAsset[];
}

export function getMediaAsset(media: EntityMediaData | undefined, role?: MediaRole): MediaAsset | undefined {
  if (!media?.assets.length) return undefined;
  if (role) return media.assets.find(asset => asset.role === role);
  if (media.primaryRole) return media.assets.find(asset => asset.role === media.primaryRole) ?? media.assets[0];
  return media.assets[0];
}
