/** Format YYYY-MM-DD as d mmm yyyy (e.g. 5 May 2026) */
export function formatIsoAsDMmmYyyy(iso: string) {
  const [y, m, d] = iso.split('-').map((x) => x.trim())
  if (!y || !m || !d) return ''
  const day = String(Number(d))
  const mon = new Date(2000, Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short' })
  return `${day} ${mon} ${y}`
}
