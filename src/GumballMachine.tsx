import { useEffect, useRef, useState } from 'react'
import Trophy from './imports/Trophy.png'
import { useI18n } from './i18n'

// The bonus-quest gumball machine. Turn the handle, a gumball drops out, tap it to open your quest.
// The quests are plain English sentences. They are translated through t(), like the rest of the site.
const BONUS_QUESTS = [
  'Write one sentence about what "shore" means to you and save it somewhere you will see every day.',
  'Tell someone you trust one thing you are proud of this week.',
  'Do one tiny kind thing for someone, like a compliment or a thank-you.',
  'Step outside or look out a window and notice one beautiful thing.',
  'Put on a song that feels safe and listen to it all the way through.',
  'Write down one thing you are grateful your body let you do today, like hugging someone or laughing.',
  'Write a short note to your future self about the calm seas ahead.',
  'Message a friend just to say hi, no reason needed.',
  'Do something cozy for a few minutes: a warm drink, a soft blanket, a favourite show.',
]

const BALL_COLORS = ['#f4a6a0', '#f6d88a', '#a8d5c0', '#a9c6e0', '#cdb8e6', '#f7c59f']
// x, y positions of the gumballs inside the glass (bottom-heavy, like a real machine)
const BALLS: [number, number][] = [
  [70, 130], [90, 133], [110, 133], [130, 130],
  [60, 111], [80, 112], [100, 113], [120, 112], [140, 111],
  [70, 92], [90, 93], [110, 93], [130, 92],
  [88, 73], [112, 73],
]

type Phase = 'idle' | 'rolling' | 'dropped' | 'opened'

const CSS = `
.gm-wrap{--gm-ink:#2c4a5c}
.gm-btn{font-family:inherit;font-weight:800;font-size:14px;border-radius:999px;padding:11px 22px;cursor:pointer;border:1.5px solid rgba(154,179,202,.6);background:#fff;color:#2c4a5c;transition:transform .15s,box-shadow .15s}
.gm-btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(44,74,92,.12)}
.gm-btn:focus-visible,.gm-svg g[role=button]:focus-visible{outline:3px solid #c49a42;outline-offset:3px}
.gm-btn.primary{background:linear-gradient(135deg,#9AB3CA,#7a9ab0);color:#fff;border-color:transparent}
.gm-btn:disabled{opacity:.6;cursor:default;transform:none;box-shadow:none}
.gm-svg .gm-dial{transform-box:fill-box;transform-origin:center}
.gm-rolling .gm-dial{animation:gm-spin 1.2s ease-in-out}
.gm-rolling .gm-ball{animation:gm-jig .32s ease-in-out infinite}
.gm-drop{animation:gm-drop .75s cubic-bezier(.3,1.4,.5,1) both}
.gm-glow{animation:gm-glow 1.3s ease-in-out infinite}
.gm-pop{animation:gm-pop .5s ease-out both}
.gm-card{animation:gm-rise .5s ease-out both}
.gm-svg g[role=button]{cursor:pointer}
@keyframes gm-spin{to{transform:rotate(360deg)}}
@keyframes gm-jig{0%,100%{transform:translate(0,0)}25%{transform:translate(2px,-5px)}50%{transform:translate(-2px,-1px)}75%{transform:translate(1px,-6px)}}
@keyframes gm-drop{from{transform:translateY(-34px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes gm-glow{0%,100%{filter:drop-shadow(0 0 0 rgba(196,154,66,0))}50%{filter:drop-shadow(0 0 7px rgba(196,154,66,.95))}}
@keyframes gm-pop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes gm-rise{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
@media (prefers-reduced-motion:reduce){
  .gm-rolling .gm-dial,.gm-rolling .gm-ball,.gm-drop,.gm-glow,.gm-pop,.gm-card{animation:none}
}
`

export default function GumballMachine() {
  const { t } = useI18n()
  const [phase, setPhase] = useState<Phase>('idle')
  const [quest, setQuest] = useState(0)
  const [color, setColor] = useState(BALL_COLORS[0])
  const timer = useRef<number | undefined>(undefined)
  const lastQuest = useRef(-1)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function roll() {
    if (phase === 'rolling') return
    // pick a quest that is not the one we just had
    let q = Math.floor(Math.random() * BONUS_QUESTS.length)
    if (q === lastQuest.current) q = (q + 1) % BONUS_QUESTS.length
    lastQuest.current = q
    setQuest(q)
    setColor(BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)])
    setPhase('rolling')
    timer.current = window.setTimeout(() => setPhase('dropped'), 1300)
  }

  function openBall() { if (phase === 'dropped') setPhase('opened') }

  const status =
    phase === 'idle' ? t('Turn the handle to roll a bonus quest!')
    : phase === 'rolling' ? t('Rolling…')
    : phase === 'dropped' ? t('Tap your gumball to open it!')
    : ''

  return (
    <div
      className="gm-wrap"
      style={{ marginTop: 28, background: 'linear-gradient(135deg,rgba(196,154,66,.1),rgba(154,112,60,.07))', border: '1.5px solid rgba(196,154,66,.3)', borderRadius: 20, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', justifyContent: 'center' }}
    >
      <style>{CSS}</style>

      <svg
        className={`gm-svg ${phase === 'rolling' ? 'gm-rolling' : ''}`}
        viewBox="0 0 200 280"
        width="190"
        height="266"
        role="img"
        aria-label={t('Gumball machine')}
        style={{ flexShrink: 0, overflow: 'visible' }}
      >
        <defs>
          <clipPath id="gm-glass"><circle cx="100" cy="88" r="60" /></clipPath>
        </defs>

        {/* body */}
        <rect x="42" y="150" width="116" height="118" rx="26" fill="#9AB3CA" stroke="#7a9ab0" strokeWidth="3" />
        <rect x="52" y="158" width="96" height="14" rx="7" fill="rgba(255,255,255,.22)" />
        {/* cute face */}
        <circle cx="82" cy="188" r="4.5" fill="#2c4a5c" />
        <circle cx="118" cy="188" r="4.5" fill="#2c4a5c" />
        <circle cx="76" cy="198" r="6" fill="#f4a6a0" opacity=".7" />
        <circle cx="124" cy="198" r="6" fill="#f4a6a0" opacity=".7" />
        <path d="M91 197 Q100 207 109 197" fill="none" stroke="#2c4a5c" strokeWidth="3" strokeLinecap="round" />

        {/* glass globe + gumballs */}
        <circle cx="100" cy="88" r="62" fill="rgba(255,255,255,.5)" stroke="#c9d9e2" strokeWidth="3" />
        <g clipPath="url(#gm-glass)">
          {BALLS.map(([x, y], i) => (
            <g key={i} className="gm-ball" style={{ animationDelay: `${(i % 5) * 0.06}s` }}>
              <circle cx={x} cy={y} r="11" fill={BALL_COLORS[i % BALL_COLORS.length]} stroke="rgba(44,74,92,.18)" strokeWidth="1.2" />
              <circle cx={x - 3.5} cy={y - 4} r="3" fill="rgba(255,255,255,.55)" />
            </g>
          ))}
        </g>
        <path d="M58 70 Q62 46 86 36" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="5" strokeLinecap="round" />
        {/* lid and neck */}
        <rect x="76" y="20" width="48" height="12" rx="6" fill="#c49a42" />
        <circle cx="100" cy="17" r="7" fill="#e0b85a" />
        <rect x="50" y="140" width="100" height="14" rx="7" fill="#c49a42" />

        {/* dial: tap it to roll */}
        <g
          role="button"
          tabIndex={0}
          aria-label={t('Turn the handle')}
          onClick={roll}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); roll() } }}
        >
          <circle cx="100" cy="228" r="20" fill="#fffaf0" stroke="#c49a42" strokeWidth="3" />
          <g className="gm-dial">
            <rect x="85" y="224" width="30" height="8" rx="4" fill="#c49a42" />
            <circle cx="100" cy="228" r="5" fill="#e0b85a" />
          </g>
        </g>

        {/* dispenser door */}
        <rect x="72" y="248" width="56" height="26" rx="10" fill="#6f8ea6" stroke="#5a7a92" strokeWidth="2" />

        {/* the gumball that drops out */}
        {(phase === 'dropped') && (
          <g
            className="gm-drop gm-glow"
            role="button"
            tabIndex={0}
            aria-label={t('Tap your gumball to open it!')}
            onClick={openBall}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBall() } }}
          >
            <circle cx="100" cy="259" r="12" fill={color} stroke="rgba(44,74,92,.25)" strokeWidth="1.5" />
            <circle cx="96" cy="255" r="3.4" fill="rgba(255,255,255,.6)" />
          </g>
        )}
        {phase === 'opened' && (
          <g className="gm-pop" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            <path d="M100 247 L103 255 L111 258 L103 261 L100 269 L97 261 L89 258 L97 255 Z" fill="#e0b85a" />
          </g>
        )}
      </svg>

      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#5a4020', marginBottom: 6 }}>{t('EPIC QUEST — Bonus Challenge')}</div>

        <div aria-live="polite">
          {status && <div style={{ fontSize: 15, color: '#2c4a5c', marginBottom: 14 }}>{status}</div>}

          {phase === 'opened' && (
            <div className="gm-card" style={{ background: 'rgba(255,255,255,.75)', border: `2px solid ${color}`, borderRadius: 16, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#c49a42', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>{t('Your bonus quest')}</div>
                <div style={{ fontSize: 15, color: '#2c4a5c', lineHeight: 1.55 }}>{t(BONUS_QUESTS[quest])}</div>
              </div>
              <img src={Trophy} alt="" style={{ width: 28, height: 28, flexShrink: 0 }} />
            </div>
          )}
        </div>

        {phase === 'idle' && <button type="button" className="gm-btn primary" onClick={roll}>{t('Turn the handle')}</button>}
        {phase === 'rolling' && <button type="button" className="gm-btn" disabled>{t('Rolling…')}</button>}
        {phase === 'opened' && <button type="button" className="gm-btn primary" onClick={roll}>{t('Roll again')}</button>}

        <div style={{ fontSize: 12, color: '#8a7a60', marginTop: 12 }}>{t('Just for fun. Try it if it feels good, and skip it if it doesn’t.')}</div>
      </div>
    </div>
  )
}
