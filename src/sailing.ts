// Voyage maths: where the boat is on its route, given how many nautical miles it has sailed.
import { ROUTES } from './voyageRoutes'

export type LonLat = [number, number]

export const UNITS = 20            // map units per degree (matches worldLand.ts)
export const NM_PER_DAY = 158      // how far a sailing boat gets in a day
export const XP_PER_DAY = 100      // 100 XP earned = one sailing day = 158 nm. Change this to make voyages faster or slower.
export const NM_PER_XP = NM_PER_DAY / XP_PER_DAY
export const TYPICAL_DAILY_XP = 150 // used only to say "about N days"
export const START: LonLat = ROUTES.paris[0]   // every voyage begins at the same spot in the North Atlantic

export const toUnits = ([lon, lat]: LonLat) => ({ x: (lon + 180) * UNITS, y: (90 - lat) * UNITS })

const R_NM = 3440.065
export function nmBetween(a: LonLat, b: LonLat) {
  const p1 = a[1] * Math.PI / 180, p2 = b[1] * Math.PI / 180
  const dp = p2 - p1, dl = (b[0] - a[0]) * Math.PI / 180
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * R_NM * Math.asin(Math.sqrt(h))
}

export type RouteInfo = { id: string; pts: LonLat[]; cum: number[]; total: number }
const cache: Record<string, RouteInfo> = {}

export function routeInfo(id: string): RouteInfo | null {
  const pts = ROUTES[id]
  if (!pts) return null
  if (cache[id]) return cache[id]
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + nmBetween(pts[i - 1], pts[i]))
  return (cache[id] = { id, pts, cum, total: cum[cum.length - 1] })
}

/** Position on the route after sailing `nm` nautical miles. */
export function pointAt(r: RouteInfo, nm: number): { pos: LonLat; seg: number } {
  const d = Math.max(0, Math.min(r.total, nm))
  let i = 1
  while (i < r.cum.length - 1 && r.cum[i] < d) i++
  const a = r.pts[i - 1], b = r.pts[i]
  const span = r.cum[i] - r.cum[i - 1] || 1
  const t = (d - r.cum[i - 1]) / span
  return { pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], seg: i }
}

/** Compass heading in degrees (0 = north, 90 = east) the boat is pointing at after `nm` miles. */
export function headingAt(r: RouteInfo, nm: number): number {
  const a = pointAt(r, nm - 35).pos, b = pointAt(r, nm + 35).pos
  const dx = b[0] - a[0], dy = b[1] - a[1]
  if (!dx && !dy) return 0
  return (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360
}

/** The part of the route already sailed, as a list of points ending at the boat. */
export function sailedPoints(r: RouteInfo, nm: number): LonLat[] {
  const d = Math.max(0, Math.min(r.total, nm))
  const out: LonLat[] = [r.pts[0]]
  for (let i = 1; i < r.pts.length && r.cum[i] < d; i++) out.push(r.pts[i])
  out.push(pointAt(r, d).pos)
  return out
}

export const xpNeeded = (r: RouteInfo) => Math.ceil(r.total / NM_PER_XP)
export const daysAtSteadyPace = (r: RouteInfo) => Math.max(1, Math.ceil(xpNeeded(r) / TYPICAL_DAILY_XP))

export function fmtLat(lat: number) { return `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}` }
export function fmtLon(lon: number) { return `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}` }
