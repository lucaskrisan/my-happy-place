export const STUDIO_MEDIA_TYPES = [
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const isStudioMediaType = (value: string): value is (typeof STUDIO_MEDIA_TYPES)[number] =>
  (STUDIO_MEDIA_TYPES as readonly string[]).includes(value);

export const studioMediaTypeForMime = (value: string): "video" | "audio" | "image" | undefined =>
  value.startsWith("video/") ? "video" : value.startsWith("audio/") ? "audio" : value.startsWith("image/") ? "image" : undefined;
