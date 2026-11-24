import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useI18n } from './i18n'
import { LAND_RINGS } from './worldLand'
import {
  UNITS, START, NM_PER_DAY, XP_PER_DAY, toUnits, routeInfo, pointAt, headingAt, sailedPoints,
  fmtLat, fmtLon, type LonLat, type RouteInfo,
} from './sailing'

// The two voyage pictures:
//   VoyagePanel = the eagle-eye view. A camera follows the boat from above, and zooms in as the boat gets closer.
//   VoyageMap   = the whole world with the route and where the boat is now.

export type VoyageDest = { id: string; label: string; lon: number; lat: number; accent: string; flag: ReactNode }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const nf = (n: number) => Math.round(n).toLocaleString()
const toPts = (pts: LonLat[]) => pts.map(p => { const u = toUnits(p); return `${u.x.toFixed(1)},${u.y.toFixed(1)}` }).join(' ')

const SEA = 'linear-gradient(160deg,#7db3d8 0%,#5f98c4 55%,#4d86b6 100%)'
const LAND = '#f3ecd9'
const LAND_EDGE = '#d3c6a3'

const CSS = `
.vy-waves{position:absolute;inset:0;pointer-events:none;opacity:.32;
  background-image:repeating-linear-gradient(115deg,rgba(255,255,255,0) 0 22px,rgba(255,255,255,.28) 23px 25px,rgba(255,255,255,0) 26px 64px),
                   repeating-linear-gradient(70deg,rgba(255,255,255,0) 0 40px,rgba(255,255,255,.18) 41px 42px,rgba(255,255,255,0) 43px 90px);
  animation:vy-drift 16s linear infinite}
@keyframes vy-drift{to{background-position:256px 128px,-180px 90px}}
.vy-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,rgba(255,255,255,0) 55%,rgba(20,50,80,.28) 100%)}
.vy-boat{animation:vy-bob 3.2s ease-in-out infinite;transform-origin:50% 45%}
@keyframes vy-bob{0%,100%{transform:scale(1) rotate(-1.2deg)}50%{transform:scale(1.035) rotate(1.2deg)}}
.vy-wake{animation:vy-wake 1.8s ease-out infinite;transform-origin:50% 0}
@keyframes vy-wake{0%{opacity:.85;transform:scale(.85,.9)}100%{opacity:.25;transform:scale(1.15,1.2)}}
.vy-pulse{animation:vy-pulse 2.2s ease-out infinite}
@keyframes vy-pulse{0%{transform:scale(.6);opacity:.7}100%{transform:scale(1.9);opacity:0}}
@media (prefers-reduced-motion:reduce){.vy-waves,.vy-boat,.vy-wake,.vy-pulse{animation:none}}
`

/** The boat, seen from straight above. Bow points up. */
function BoatTop({ wake = true }: { wake?: boolean }) {
  return (
    <svg viewBox="0 0 80 150" width="100%" style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      <defs><filter id="vy-blur"><feGaussianBlur stdDeviation="2.2" /></filter></defs>
      {wake && (
        <g className="vy-wake">
          <path d="M40 96 C30 112 22 128 14 150 L28 150 C32 132 36 118 40 108 C44 118 48 132 52 150 L66 150 C58 128 50 112 40 96 Z" fill="rgba(255,255,255,.75)" />
          <ellipse cx="40" cy="104" rx="9" ry="7" fill="rgba(255,255,255,.7)" />
        </g>
      )}
      <ellipse cx="46" cy="58" rx="19" ry="46" fill="rgba(10,40,70,.28)" filter="url(#vy-blur)" />
      <g className="vy-boat">
        <path d="M40 6 C57 22 61 54 57 94 Q40 103 23 94 C19 54 23 22 40 6 Z" fill="#fbf6ea" stroke="#8aa4b8" strokeWidth="1.4" />
        <path d="M40 15 C52 29 55 55 52 88 Q40 94 28 88 C25 55 28 29 40 15 Z" fill="#d9b98a" />
        <path d="M40 15 C52 29 55 55 52 88" fill="none" stroke="rgba(120,80,40,.25)" strokeWidth="1" />
        <rect x="33" y="62" width="14" height="18" rx="5" fill="#fbf6ea" stroke="#b9a98a" strokeWidth="1" />
        <path d="M40 14 L40 52 Q27 40 33 22 Z" fill="#ffffff" stroke="#c9d8e4" strokeWidth="1" />
        <path d="M40 52 Q64 64 52 96 L40 92 Z" fill="#ffffff" stroke="#c9d8e4" strokeWidth="1.2" />
        <path d="M40 52 L43 95" stroke="#9a7a58" strokeWidth="2" strokeLinecap="round" />
        <circle cx="40" cy="52" r="3.4" fill="#5a4a3a" />
        <circle cx="40" cy="52" r="1.4" fill="#e0b85a" />
      </g>
    </svg>
  )
}

type Cam = { cx: number; cy: number; D: number; h: number }

function targetCam(info: RouteInfo, sailed: number): Cam {
  const u = toUnits(pointAt(info, sailed).pos)
  const remaining = Math.max(0, info.total - sailed)
  // Far from the destination we see a big stretch of sea. As the boat closes in, the camera drops lower.
  return { cx: u.x, cy: u.y, D: clamp(7 + remaining / 110, 9, 80), h: headingAt(info, sailed) }
}

const angleLerp = (a: number, b: number, t: number) => { const d = ((b - a + 540) % 360) - 180; return (a + d * t + 360) % 360 }

/** Moves the camera smoothly to its new place (and on first show, sails the boat from the harbor to where it is now). */
function useCamera(target: Cam, from: Cam) {
  const [cam, setCam] = useState<Cam>(from)
  const ref = useRef(cam)
  const first = useRef(true)
  useEffect(() => {
    const start = ref.current
    const dur = first.current ? 3000 : 1500
    first.current = false
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { ref.current = target; setCam(target); return }
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      const c: Cam = {
        cx: start.cx + (target.cx - start.cx) * e,
        cy: start.cy + (target.cy - start.cy) * e,
        D: Math.exp(Math.log(start.D) + (Math.log(target.D) - Math.log(start.D)) * e),
        h: angleLerp(start.h, target.h, e),
      }
      ref.current = c
      setCam(c)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.cx, target.cy, target.D, target.h])
  return cam
}

function Pin({ dest, size = 40, label = true }: { dest: VoyageDest; size?: number; label?: boolean }) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <span className="vy-pulse" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: dest.accent, opacity: 0.5 }} />
        <div style={{ position: 'relative', width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: 'white', border: `3px solid ${dest.accent}`, boxShadow: '0 4px 14px rgba(20,50,80,.35)' }}>{dest.flag}</div>
      </div>
      {label && <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', textShadow: '0 1px 4px rgba(20,50,80,.7)', whiteSpace: 'nowrap' }}>{t(dest.label)}</span>}
    </div>
  )
}

export function VoyagePanel({ dest, sailedNm, loggedIn }: { dest: VoyageDest; sailedNm: number; loggedIn: boolean }) {
  const { t } = useI18n()
  const info = routeInfo(dest.id)
  if (!info) return null
  const sailed = clamp(sailedNm, 0, info.total)
  const remaining = info.total - sailed
  const arrived = remaining < 0.5
  const target = targetCam(info, sailed)
  const startU = toUnits(START)
  const from: Cam = { cx: startU.x, cy: startU.y, D: 80, h: headingAt(info, 0) }
  const cam = useCamera(target, from)

  const ASPECT = 16 / 9
  const vw = cam.D * UNITS, vh = vw / ASPECT
  const x0 = cam.cx - vw / 2, y0 = cam.cy - vh / 2
  const pct = (x: number, y: number) => ({ left: `${((x - x0) / vw) * 100}%`, top: `${((y - y0) / vh) * 100}%` })

  // Only draw the coastlines that are near the camera (keeps it smooth)
  const q = 10 * UNITS
  const qx0 = Math.floor(x0 / q), qx1 = Math.ceil((x0 + vw) / q), qy0 = Math.floor(y0 / q), qy1 = Math.ceil((y0 + vh) / q)
  const landD = useMemo(
    () => LAND_RINGS.filter(r => r[2] >= qx0 * q && r[0] <= qx1 * q && r[3] >= qy0 * q && r[1] <= qy1 * q).map(r => r[4]).join(''),
    [qx0, qx1, qy0, qy1, q],
  )

  // Graticule (latitude / longitude lines)
  const gs = cam.D > 45 ? 10 : cam.D > 22 ? 5 : cam.D > 11 ? 2 : 1
  const lonMin = x0 / UNITS - 180, lonMax = (x0 + vw) / UNITS - 180
  const latMax = 90 - y0 / UNITS, latMin = 90 - (y0 + vh) / UNITS
  const lons: number[] = []; for (let l = Math.ceil(lonMin / gs) * gs; l <= lonMax; l += gs) lons.push(l)
  const lats: number[] = []; for (let l = Math.ceil(latMin / gs) * gs; l <= latMax; l += gs) lats.push(l)

  const boatPos = pointAt(info, sailed).pos
  const portU = toUnits(info.pts[info.pts.length - 1])
  const destU = toUnits([dest.lon, dest.lat])
  const inland = Math.hypot(destU.x - portU.x, destU.y - portU.y) > 0.4 * UNITS

  // Destination marker: on screen if it fits, otherwise an arrow at the edge of the picture
  const fx = (destU.x - cam.cx) / vw, fy = (destU.y - cam.cy) / vh
  const M = 0.42
  const off = Math.abs(fx) > M || Math.abs(fy) > M
  const sc = off ? Math.min(M / Math.abs(fx || 1e-9), M / Math.abs(fy || 1e-9)) : 1
  const edge = { left: `${(0.5 + fx * sc) * 100}%`, top: `${(0.5 + fy * sc) * 100}%` }
  const arrowDeg = Math.atan2(fx, -fy) * 180 / Math.PI

  const harborU = toUnits(START)
  const harborOn = harborU.x > x0 && harborU.x < x0 + vw && harborU.y > y0 && harborU.y < y0 + vh

  // Scale bar
  const nmPerDeg = 60 * Math.max(0.2, Math.cos(boatPos[1] * Math.PI / 180))
  const barNm = [20, 50, 100, 200, 500, 1000, 2000, 5000].find(n => (n / nmPerDeg) / cam.D >= 0.1) ?? 5000
  const barPct = (barNm / nmPerDeg) / cam.D * 100

  const done = Math.round((sailed / info.total) * 100)
  const chip: CSSProperties = { position: 'absolute', background: 'rgba(255,255,255,.88)', color: '#2c4a5c', borderRadius: 50, padding: '6px 14px', fontSize: 12, fontWeight: 800, boxShadow: '0 4px 14px rgba(20,50,80,.2)' }

  return (
    <div>
      <style>{CSS}</style>
      <div role="img" aria-label={t('Eagle-eye view of your boat sailing to {place}', { place: t(dest.label) })}
        style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 22, overflow: 'hidden', background: SEA, border: '1.5px solid rgba(154,179,202,.5)', boxShadow: '0 12px 40px rgba(44,74,92,.18)' }}>
        <div className="vy-waves" />
        <svg viewBox={`${x0} ${y0} ${vw} ${vh}`} preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0, display: 'block' }}>
          {lons.map(l => <line key={'x' + l} x1={(l + 180) * UNITS} x2={(l + 180) * UNITS} y1={y0} y2={y0 + vh} stroke="rgba(255,255,255,.2)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          {lats.map(l => <line key={'y' + l} y1={(90 - l) * UNITS} y2={(90 - l) * UNITS} x1={x0} x2={x0 + vw} stroke="rgba(255,255,255,.2)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          <path d={landD} fill="none" stroke="rgba(214,242,248,.6)" strokeWidth="10" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={landD} fill={LAND} fillRule="evenodd" stroke={LAND_EDGE} strokeWidth="1.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <polyline points={toPts(info.pts)} fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <polyline points={toPts(sailedPoints(info, sailed))} fill="none" stroke="rgba(255,236,170,.35)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <polyline points={toPts(sailedPoints(info, sailed))} fill="none" stroke="#f0c75e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {inland && <line x1={portU.x} y1={portU.y} x2={destU.x} y2={destU.y} stroke="rgba(120,90,50,.7)" strokeWidth="2.5" strokeDasharray="3 6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>

        {harborOn && (
          <div style={{ position: 'absolute', ...pct(harborU.x, harborU.y), transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', border: '3px solid #c49a42', margin: '0 auto', boxShadow: '0 2px 8px rgba(20,50,80,.35)' }} />
            <div style={{ marginTop: 4, fontSize: 11, fontWeight: 800, color: '#fff', textShadow: '0 1px 4px rgba(20,50,80,.7)', whiteSpace: 'nowrap' }}>{t('Harbor of Beginnings')}</div>
          </div>
        )}

        {!off ? (
          <div style={{ position: 'absolute', ...pct(destU.x, destU.y), transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}><Pin dest={dest} /></div>
        ) : (
          <div style={{ position: 'absolute', ...edge, transform: 'translate(-50%,-50%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ transform: `rotate(${arrowDeg}deg)`, color: '#fff', fontSize: 20, lineHeight: 1, textShadow: '0 1px 5px rgba(20,50,80,.7)' }}>▲</div>
            <Pin dest={dest} size={30} label={false} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: 'rgba(20,50,80,.55)', borderRadius: 50, padding: '2px 9px', whiteSpace: 'nowrap' }}>{t(dest.label)} · {t('{n} nm', { n: nf(remaining) })}</span>
          </div>
        )}

        {/* the boat: the camera is always on it, so it sits in the middle */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: '7.5%', minWidth: 34, maxWidth: 88, transform: `translate(-50%,-34%) rotate(${cam.h}deg)`, transformOrigin: '50% 34%', pointerEvents: 'none' }}>
          <BoatTop />
        </div>

        <div className="vy-vignette" />

        <div style={{ ...chip, top: 12, left: 12 }}>{t('Sailing to {place}', { place: t(dest.label) })}</div>
        <div aria-hidden="true" style={{ position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.88)', boxShadow: '0 4px 14px rgba(20,50,80,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 40 40" width="40" height="40"><path d="M20 6 L25 22 L20 19 L15 22 Z" fill="#c0504d" /><path d="M20 34 L15 22 L20 25 L25 22 Z" fill="#8aa4b8" /><text x="20" y="5" fontSize="7" fontWeight="800" textAnchor="middle" fill="#2c4a5c">N</text></svg>
        </div>
        <div style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'none' }}>
          <div style={{ position: 'relative', width: `${barPct}%`, minWidth: 30, height: 8, borderLeft: '2px solid #fff', borderRight: '2px solid #fff', borderBottom: '2px solid #fff', filter: 'drop-shadow(0 1px 2px rgba(20,50,80,.6))' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', textShadow: '0 1px 4px rgba(20,50,80,.7)' }}>{t('{n} nm', { n: barNm })}</span>
        </div>
        <div style={{ ...chip, bottom: 12, right: 12, fontSize: 11, fontWeight: 700, padding: '5px 12px', background: 'rgba(255,255,255,.8)' }}>{fmtLat(boatPos[1])} · {fmtLon(boatPos[0])}</div>
      </div>

      {/* Progress */}
      <div style={{ marginTop: 16, background: 'rgba(248,243,238,.92)', border: '1px solid rgba(154,179,202,.3)', borderRadius: 18, padding: '16px 20px' }}>
        {arrived ? (
          <div style={{ textAlign: 'center', padding: '6px 0' }}>
            <div className="font-display" style={{ fontSize: 24, color: '#2c4a5c', marginBottom: 6 }}>{t('You have arrived in {place}!', { place: t(dest.label) })}</div>
            <div style={{ fontSize: 14, color: '#6a8a98', lineHeight: 1.6 }}>{t('Well done, sailor. You made it. Pick a new destination above whenever you are ready for your next voyage.')}</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {[[t('Sailed'), t('{n} nm', { n: nf(sailed) })], [t('To go'), t('{n} nm', { n: nf(remaining) })], [t('Progress'), `${done}%`]].map(([k, v]) => (
                <div key={k} style={{ flex: '1 1 110px' }}>
                  <div style={{ fontSize: 12, color: '#6a8a98', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#2c4a5c' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 10, borderRadius: 6, background: 'rgba(154,179,202,.28)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(done, sailed > 0 ? 2 : 0)}%`, height: '100%', background: 'linear-gradient(90deg,#9AB3CA,#c49a42)', borderRadius: 6, transition: 'width 1s ease' }} />
            </div>
            <div style={{ fontSize: 12.5, color: '#6a8a98', marginTop: 10, lineHeight: 1.55 }}>
              {loggedIn
                ? t('Every task you finish sails your boat closer. Every {xp} XP you earn is about {nm} nm.', { xp: XP_PER_DAY, nm: NM_PER_DAY })
                : t('Log in to save your voyage. Your boat sails when you finish your daily tasks.')}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── The whole-world map ──────────────────────────────────────────────────────

const MAP_W = 900, MAP_H = 450
const mx = (lon: number) => (lon + 180) / 360 * MAP_W
const my = (lat: number) => (90 - lat) / 180 * MAP_H
const OCEANS: { text: string; lon: number; lat: number }[] = [
  { text: 'Atlantic Ocean', lon: -32, lat: 14 }, { text: 'Pacific Ocean', lon: -140, lat: -8 }, { text: 'Pacific Ocean', lon: 165, lat: 12 },
  { text: 'Indian Ocean', lon: 78, lat: -22 }, { text: 'Southern Ocean', lon: 20, lat: -62 }, { text: 'Arctic Ocean', lon: 10, lat: 80 },
]

export function VoyageMap({ dest, sailedNm, all }: { dest: VoyageDest | null; sailedNm: number; all: VoyageDest[] }) {
  const { t } = useI18n()
  const landAll = useMemo(() => LAND_RINGS.map(r => r[4]).join(''), [])
  const info = dest ? routeInfo(dest.id) : null
  const sailed = info ? clamp(sailedNm, 0, info.total) : 0
  const boat = info ? pointAt(info, sailed).pos : null
  const heading = info ? headingAt(info, sailed) : 0
  const mp = (p: LonLat) => `${mx(p[0]).toFixed(1)},${my(p[1]).toFixed(1)}`
  const pts = (a: LonLat[]) => a.map(mp).join(' ')
  const start = START
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" style={{ display: 'block', background: 'linear-gradient(180deg,#bcdcec,#92bbd8)' }} role="img" aria-label={t('Your voyage map')}>
      {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(l => <line key={'x' + l} x1={mx(l)} x2={mx(l)} y1="0" y2={MAP_H} stroke="rgba(255,255,255,.35)" strokeWidth=".7" />)}
      {[-60, -30, 0, 30, 60].map(l => <line key={'y' + l} y1={my(l)} y2={my(l)} x1="0" x2={MAP_W} stroke={l === 0 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.35)'} strokeWidth={l === 0 ? 1 : .7} />)}
      <g transform={`scale(${MAP_W / (360 * UNITS)})`}>
        <path d={landAll} fill={LAND} fillRule="evenodd" stroke={LAND_EDGE} strokeWidth="1" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </g>
      {OCEANS.map((o, i) => <text key={i} x={mx(o.lon)} y={my(o.lat)} fill="rgba(44,74,92,.45)" fontSize="11" fontFamily="Nunito,sans-serif" fontStyle="italic" textAnchor="middle">{o.text}</text>)}

      {all.map(d => d.id === dest?.id ? null : (
        <g key={d.id}><circle cx={mx(d.lon)} cy={my(d.lat)} r="4" fill={d.accent} stroke="#fff" strokeWidth="1.5" opacity=".9"><title>{t(d.label)}</title></circle></g>
      ))}

      {info && dest && boat && (
        <g>
          <polyline points={pts(info.pts)} fill="none" stroke="#9a7060" strokeWidth="2" strokeDasharray="1 5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={pts(sailedPoints(info, sailed))} fill="none" stroke="#c49a42" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={mx(start[0])} cy={my(start[1])} r="5" fill="#fff" stroke="#c49a42" strokeWidth="2.5" />
          <text x={mx(start[0])} y={my(start[1]) - 9} textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="Nunito,sans-serif" fill="#2c4a5c">{t('Harbor of Beginnings')}</text>
          <g>
            <circle cx={mx(dest.lon)} cy={my(dest.lat)} r="16" fill={dest.accent} opacity=".16" />
            <circle cx={mx(dest.lon)} cy={my(dest.lat)} r="7" fill={dest.accent} stroke="#fff" strokeWidth="2" />
            <text x={mx(dest.lon)} y={my(dest.lat) + 22} textAnchor="middle" fontSize="12" fontWeight="800" fontFamily="Nunito,sans-serif" fill="#2c4a5c" stroke="rgba(255,255,255,.8)" strokeWidth="3" paintOrder="stroke">{t(dest.label)}</text>
          </g>
          <g transform={`translate(${mx(boat[0])} ${my(boat[1])}) rotate(${heading}) scale(.2) translate(-40 -60)`}>
            <circle cx="40" cy="60" r="62" fill="rgba(255,255,255,.55)" />
            <path d="M40 6 C57 22 61 54 57 94 Q40 103 23 94 C19 54 23 22 40 6 Z" fill="#fbf6ea" stroke="#5a7a92" strokeWidth="5" />
            <path d="M40 52 Q64 64 52 96 L40 92 Z" fill="#fff" stroke="#5a7a92" strokeWidth="4" />
          </g>
        </g>
      )}
    </svg>
  )
}
