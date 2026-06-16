export function isMissingTableError(code: string | undefined): boolean {
  return code === "PGRST205" || code === "42P01";
}
