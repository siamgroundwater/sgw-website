export function normalizeSlug(value: string) {
  const clean = value.trim()
  if (!clean) return ''

  let decoded = clean
  try {
    decoded = decodeURIComponent(clean)
  } catch {
    // Keep malformed legacy values unchanged so validation can report them safely.
  }

  return decoded.normalize('NFKC').toLowerCase().trim()
}
