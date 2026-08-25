export function getMetaPixelId(): string {
  return (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();
}
