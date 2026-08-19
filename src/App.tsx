import { useState, useEffect, useRef, useCallback } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────

const MAP_W = 900, MAP_H = 460, HOME_X = 350, HOME_Y = 128
function toXY(lon: number, lat: number) {
  return { x: (lon + 180) / 360 * MAP_W, y: (90 - lat) / 180 * MAP_H }
}

const DESTINATIONS = [
  { id:'paris',       label:'Paris',        flag:'🗼', lon:2.3,   lat:48.9,  tagline:'Where you rediscover the joy of being alive',        color:'#e8ecf2', accent:'#7a8fa8', seas:'North Atlantic',  dist:'3,628 nm',  days:'23 days', vibe:'Cafés and golden light' },
  { id:'kyoto',       label:'Kyoto',        flag:'🌸', lon:135.8, lat:35.0,  tagline:'Ancient gardens where stillness becomes strength',     color:'#f0ece8', accent:'#9a8070', seas:'Pacific Ocean',   dist:'11,204 nm', days:'71 days', vibe:'Cherry blossoms & peace' },
  { id:'santorini',   label:'Santorini',    flag:'⛵', lon:25.4,  lat:36.4,  tagline:'White cliffs, blue domes — sea meets sky',             color:'#e4ecf4', accent:'#6a8aaa', seas:'Mediterranean',   dist:'2,185 nm',  days:'14 days', vibe:'Sunsets and open sky' },
  { id:'bali',        label:'Bali',         flag:'🌺', lon:115.2, lat:-8.7,  tagline:'Island of healing where nature restores',              color:'#e8f0ea', accent:'#6a9070', seas:'Indian Ocean',    dist:'8,432 nm',  days:'54 days', vibe:'Rice terraces & warmth' },
  { id:'reykjavik',   label:'Reykjavík',    flag:'🌌', lon:-21.8, lat:64.1,  tagline:'Where the dark sky dances with color',                 color:'#eae8f2', accent:'#8080a8', seas:'North Atlantic',  dist:'1,680 nm',  days:'11 days', vibe:'Northern lights & hot springs' },
  { id:'maldives',    label:'Maldives',     flag:'🐠', lon:73.0,  lat:3.2,   tagline:'Crystal waters where peace lives',                     color:'#e2eef2', accent:'#5a8a98', seas:'Indian Ocean',    dist:'7,910 nm',  days:'50 days', vibe:'Turquoise & tranquility' },
  { id:'machupicchu', label:'Machu Picchu', flag:'🏔️', lon:-72.5, lat:-13.2, tagline:'Above the clouds — see how far you have come',         color:'#eeeae0', accent:'#8a7a50', seas:'South Atlantic', dist:'6,240 nm',  days:'40 days', vibe:'Mist, mountains & wonder' },
  { id:'capetown',    label:'Cape Town',    flag:'🦁', lon:18.4,  lat:-33.9, tagline:"Where two oceans meet and stories begin again",         color:'#f0e8e8', accent:'#9a6868', seas:'South Atlantic', dist:'6,820 nm',  days:'44 days', vibe:'Winelands & wild coast' },
]

const CONTINENTS = [
  'M55,42 L120,32 L175,38 L225,55 L260,78 L290,95 L300,125 L290,155 L275,185 L255,210 L225,240 L185,255 L155,248 L115,228 L80,205 L58,175 L42,145 L40,105 L45,72 Z',
  'M215,18 L268,14 L290,28 L288,48 L262,56 L228,54 L210,40 Z',
  'M160,252 L200,246 L242,255 L265,280 L280,320 L278,370 L258,415 L222,428 L182,415 L162,380 L150,340 L148,295 L152,268 Z',
  'M375,65 L390,58 L415,55 L442,60 L462,72 L468,90 L460,108 L440,118 L415,122 L392,115 L375,100 L368,82 Z',
  'M375,130 L450,120 L498,135 L515,162 L512,205 L500,260 L480,308 L455,342 L420,358 L385,348 L362,318 L350,278 L352,232 L360,185 L366,155 Z',
  'M450,62 L520,50 L625,42 L725,48 L808,65 L840,90 L838,120 L820,145 L790,162 L740,172 L680,178 L618,182 L555,178 L498,168 L472,148 L458,120 L448,90 Z',
  'M618,182 L660,185 L700,195 L740,210 L720,228 L680,225 L630,212 L608,198 Z',
  'M650,268 L728,258 L782,268 L800,298 L798,335 L775,358 L738,365 L695,362 L658,345 L638,310 L640,282 Z',
  'M0,432 L900,432 L900,460 L0,460 Z',
  'M790,112 L808,105 L818,118 L810,132 L792,128 Z',
  'M315,52 L330,46 L346,50 L348,62 L333,68 L318,63 Z',
  'M363,73 L371,68 L379,72 L377,82 L368,83 Z',
]

const OCEAN_LABELS = [
  { x:195,y:210,text:'Atlantic Ocean' }, { x:700,y:290,text:'Pacific Ocean' },
  { x:620,y:245,text:'Indian Ocean'   }, { x:450,y:445,text:'Southern Ocean' },
]

// ── Quest data ────────────────────────────────────────────────────────────────

const QUEST_CATS = [
  { id:'anchor', label:'Anchor Points',    icon:'⚓', color:'#7a9ab0',
    desc:'Ground yourself in the present moment.',
    quests:[{id:'a1',text:"Write 3 things your body did for you today",xp:20},{id:'a2',text:'Take 5 slow, deep breaths with your eyes closed',xp:10},{id:'a3',text:"Name one emotion you're feeling right now, without judgment",xp:15}] },
  { id:'wave',   label:'Wave Riders',      icon:'🌊', color:'#6a8a9a',
    desc:'Ride the energy of being alive.',
    quests:[{id:'w1',text:'Move your body for 10 minutes — walk, stretch, dance',xp:25},{id:'w2',text:'Go outside and feel fresh air on your face',xp:15},{id:'w3',text:'Listen to a song that lifts your spirits',xp:10}] },
  { id:'crew',   label:'Crew Connection',  icon:'💬', color:'#8a7a9a',
    desc:'No sailor sails alone.',
    quests:[{id:'c1',text:'Send one kind or honest message to someone you trust',xp:20},{id:'c2',text:'Read a survivor letter from the message bottles',xp:15},{id:'c3',text:"Post a message in the ship's crew chat",xp:15}] },
  { id:'nourish',label:'Nourishment Quest',icon:'🌱', color:'#6a8a78',
    desc:'Gentle fuel for your voyage.',
    quests:[{id:'n1',text:'Have one full meal sitting down without distractions',xp:30},{id:'n2',text:'Drink 6 glasses of water today',xp:15},{id:'n3',text:'Try something new to eat — even one small bite counts',xp:25}] },
]
const ALL_QUESTS = QUEST_CATS.flatMap(c => c.quests)
const MAX_XP = ALL_QUESTS.reduce((s,q) => s + q.xp, 0)
function xpLevel(xp: number) {
  if (xp < 50)  return { rank:'Deckhand',   icon:'🪣', next:50 }
  if (xp < 110) return { rank:'First Mate', icon:'🧭', next:110 }
  if (xp < 175) return { rank:'Navigator',  icon:'⚓', next:175 }
  return               { rank:'Captain',    icon:'🏴‍☠️', next:MAX_XP }
}
const BADGES = [
  {id:'first',xp:20,icon:'🌊',label:'First Wave'},{id:'steady',xp:60,icon:'⚓',label:'Steady Sailor'},
  {id:'nav',xp:120,icon:'🧭',label:'Navigator'},{id:'cap',xp:180,icon:'🏆',label:'Captain'},
]

// ── Chat data ─────────────────────────────────────────────────────────────────

const SAILOR_NAMES  = ['CoralDrifter','TealHarbor','SeaSprite','SilverWave','MoonRipple','PearlTide','AquaLight','StormBreaker']
const SAILOR_COLORS = ['#7a9ab0','#6a8a9a','#8a7a9a','#6a8a78','#9a8a6a','#8a7070','#7090a8','#6a7a88']
const genSailor = () => `${SAILOR_NAMES[Math.floor(Math.random()*SAILOR_NAMES.length)]}_${Math.floor(Math.random()*90)+10}`

const SEED_MSGS = [
  {id:1,sailor:'CoralDrifter_47',color:'#7a9ab0',text:"Hey everyone 👋 Just found this place. Really needed it today.",time:'9:14 AM',isMe:false},
  {id:2,sailor:'TealHarbor_22',  color:'#6a8a9a',text:"Welcome 💙 We're all sailing together here — no judgment.",time:'9:15 AM',isMe:false},
  {id:3,sailor:'SeaSprite_08',   color:'#8a7a9a',text:"Today was hard. I skipped breakfast again. Trying not to be too hard on myself.",time:'9:18 AM',isMe:false},
  {id:4,sailor:'MoonRipple_31',  color:'#6a8a78',text:"I ate lunch with my family for the first time in months 🌊 Small win.",time:'9:31 AM',isMe:false},
  {id:5,sailor:'TealHarbor_22',  color:'#6a8a9a',text:"THAT IS HUGE 🎉 Please be proud of yourself.",time:'9:32 AM',isMe:false},
]
const AUTO_REPLIES = [
  {sailor:'CoralDrifter_47',color:'#7a9ab0',text:"We hear you 🌊 You're not sailing this alone."},
  {sailor:'TealHarbor_22',  color:'#6a8a9a',text:"Thank you for sharing that. It matters. You matter 💙"},
  {sailor:'SeaSprite_08',   color:'#8a7a9a',text:"Sending calm waters your way 🫂"},
  {sailor:'MoonRipple_31',  color:'#6a8a78',text:"Same boat here. We've got you ⚓"},
  {sailor:'PearlTide_19',   color:'#9a8a6a',text:"This crew is with you. One wave at a time 💜"},
]

// ── Letters ───────────────────────────────────────────────────────────────────

const LETTERS = [
  { id:1, name:'Maya, 19',  preview:'I used to measure my worth in numbers…',        glassColor:'#4e7d70', delay:'0s',
    text:`I used to measure my worth in numbers — calories, pounds, inches. At 16, those numbers were the only thing I felt I could control when everything else felt like chaos.\n\nRecovery started when someone finally said: "You are more than your body." Not a doctor, not a therapist — my friend, sitting with me at lunch, who noticed I hadn't eaten in two days.\n\nThere were so many relapses. Recovery isn't a straight line — it's more like sailing. Some days the water is calm, and some days you're fighting a storm that feels bigger than you are. But you keep sailing.\n\nI'm 19 now. I eat breakfast every morning. Not every bite is easy, but I'm here. You can be here too.` },
  { id:2, name:'Jess, 22',  preview:'My lowest point was fainting at school…',        glassColor:'#3d6878', delay:'0.3s',
    text:`My lowest point was the day I fainted at school. I remember the fluorescent lights and feeling strangely proud — which is the most heartbreaking thing I can say.\n\nAnorexia convinced me that shrinking was an achievement. It took two hospitalizations and a therapist named Dr. Chen to help me understand what I was really starving for — safety, control, belonging.\n\nIf you're reading this: what you're feeling is real and valid, but the illness is lying to you about what you need. You deserve nourishment. You deserve to take up space.\n\nIt's been three years. I still have hard days, but I have so many more good ones.` },
  { id:3, name:'Rowan, 17', preview:'I was scared that recovery meant losing myself…', glassColor:'#4a6875', delay:'0.6s',
    text:`I was scared that if I recovered, I would lose myself. The eating disorder had become my identity — the sick one, the thin one, the one who had "control." I didn't know who I was without it.\n\nBut here's what no one tells you: recovery gives you back more of yourself than the illness ever took. I started painting again. I laughed until I cried at a movie. I ate birthday cake at my best friend's party.\n\nYou are not your eating disorder. You are the person underneath it — funny, creative, worthy of love — waiting to come back.\n\nI'm 17 and still in recovery. It's hard. But you are never sailing alone.` },
  { id:4, name:'Sam, 21',   preview:'Food became my enemy when life felt out of control…', glassColor:'#7d6040', delay:'0.9s',
    text:`Food became my enemy when life felt out of control — a family falling apart, a school where I never fit in. Restricting felt like the one thing that was mine.\n\nWhat helped me most wasn't being told to "just eat." It was someone sitting with me, asking what was actually wrong. It was therapy that got underneath the behavior.\n\nThere's no shame in needing help — getting help is the bravest thing you can do.\n\nTo any teen reading this: you are worth fighting for. The storm does end. There is shore.` },
  { id:5, name:'Lily, 20',  preview:'My mum noticed before I did…',                   glassColor:'#3d6880', delay:'1.2s',
    text:`My mum noticed before I did. I was so deep inside it I couldn't see what everyone else could. I was angry when she made me go to the doctor. I didn't think I was "sick enough."\n\nThat's one of the cruelest things about this illness — it tells you you're fine, that you need to lose more before you deserve help. That voice is a lie. You deserve help right now, exactly as you are.\n\nI'm 20 now and studying nutrition — the most beautiful kind of revenge on the illness that once tried to destroy me.\n\nYou are enough. You have always been enough.` },
  { id:6, name:'Alex, 23',  preview:'Nobody tells you how lonely an eating disorder is…', glassColor:'#4a5878', delay:'1.5s',
    text:`Nobody tells you how lonely an eating disorder is. How it isolates you from meals, from friends, from the simple pleasure of eating pizza with people you love.\n\nFor years I planned my entire life around avoiding food. I missed parties. I lied to my family. I built a prison and called it discipline.\n\nThe turning point was finding a community of people in recovery online. Hearing "me too" for the first time. Not being alone in it.\n\nIf you're struggling, please reach out. Breaking the silence is the first wave you have to cross. Everything after is easier than that first one.\n\nYou are not alone in this ocean.` },
]

const RESOURCES = [
  {name:'NEDA Helpline',         desc:"National Eating Disorders Association. Call, text, or chat 24/7.", contact:'1-800-931-2237',   link:'https://www.nationaleatingdisorders.org/help-support/contact-helpline',icon:'📞'},
  {name:'Crisis Text Line',      desc:"Text HOME to 741741 anytime for any crisis.",                      contact:'Text HOME to 741741',link:'https://www.crisistextline.org',icon:'💬'},
  {name:'Beat Eating Disorders', desc:"UK charity with helplines and community for young people.",        contact:'0808 801 0677',     link:'https://www.beateatingdisorders.org.uk',icon:'🇬🇧'},
  {name:'Eating Disorder Hope',  desc:"Resources, treatment finders, and recovery stories.",              contact:'Online resources',  link:'https://www.eatingdisorderhope.com',icon:'🌟'},
  {name:'NAMI HelpLine',         desc:"National Alliance on Mental Illness — free, nationwide support.",  contact:'1-800-950-6264',    link:'https://www.nami.org/help',icon:'🧠'},
  {name:'Teen Line',             desc:"Teen-to-teen helpline staffed by trained teen volunteers.",        contact:'1-800-852-8336',    link:'https://teenlineonline.org',icon:'🌊'},
]

// ── SVG helpers ───────────────────────────────────────────────────────────────

function WaveSVG({ color, opacity=1, v=0 }: { color:string; opacity?:number; v?:number }) {
  const p = [
    "M0,40 C150,80 350,0 600,40 C850,80 1050,0 1200,40 L1200,80 L0,80 Z",
    "M0,50 C200,10 400,70 600,35 C800,0 1000,60 1200,30 L1200,80 L0,80 Z",
    "M0,30 C100,60 300,20 500,50 C700,80 900,20 1200,45 L1200,80 L0,80 Z",
  ]
  return <svg viewBox="0 0 1200 80" preserveAspectRatio="none" style={{display:'block'}}><path d={p[v%3]} fill={color} opacity={opacity}/></svg>
}

function Waves({ h=100, c1='#C6DDED', c2='#9AB3CA', c3='#8aa4b4' }: { h?:number; c1?:string; c2?:string; c3?:string }) {
  return (
    <div className="wave-wrap" style={{height:h}}>
      <div className="wl wl-1" style={{height:h}}><WaveSVG color={c1} opacity={.5}/><WaveSVG color={c1} opacity={.5}/></div>
      <div className="wl wl-2" style={{height:Math.round(h*.75)}}><WaveSVG color={c2} opacity={.65} v={1}/><WaveSVG color={c2} opacity={.65} v={1}/></div>
      <div className="wl wl-3" style={{height:Math.round(h*.55)}}><WaveSVG color={c3} opacity={.9} v={2}/><WaveSVG color={c3} opacity={.9} v={2}/></div>
    </div>
  )
}

// ── Realistic Bottle ──────────────────────────────────────────────────────────

function CorkSVG({ w=20, h=24 }: { w?:number; h?:number }) {
  return (
    <svg viewBox="0 0 20 24" width={w} height={h} fill="none">
      {/* body */}
      <rect x="1" y="0" width="18" height="24" rx="3" fill="#b8922e"/>
      {/* top cap sheen */}
      <rect x="1" y="0" width="18" height="7" rx="3" fill="#d4aa48"/>
      {/* bottom shading */}
      <rect x="1" y="18" width="18" height="6" rx="2" fill="#8a6810"/>
      {/* grain lines horizontal */}
      {[5,9,13,17].map(y => <line key={y} x1="2" y1={y} x2="18" y2={y} stroke="#7a5a10" strokeWidth=".6" opacity=".55"/>)}
      {/* grain lines vertical */}
      {[5,10,15].map(x => <line key={x} x1={x} y1="2" x2={x} y2="22" stroke="#7a5a10" strokeWidth=".4" opacity=".3"/>)}
      {/* specular */}
      <rect x="1" y="0" width="18" height="4" rx="3" fill="white" opacity=".18"/>
      {/* side shadow */}
      <rect x="15" y="0" width="4" height="24" rx="2" fill="black" opacity=".1"/>
    </svg>
  )
}

function BottleBodySVG({ color, id, open=false }: { color:string; id:number; open?:boolean }) {
  const gId = `b${id}`
  // path: neck opening at top (y=22), shoulder curves, body, rounded bottom
  const body = `M22,22 L42,22 L41,50 C50,58 52,72 52,88 L52,158 Q52,170 32,172 Q12,170 12,158 L12,88 C12,72 14,58 23,50 Z`
  const neck = `M22,22 L42,22 L41,50 L23,50 Z`
  return (
    <svg viewBox="0 0 64 185" width="64" height="185" fill="none">
      <defs>
        {/* side-to-side gradient for glass depth */}
        <linearGradient id={`gd-${gId}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#000" stopOpacity=".22"/>
          <stop offset="18%"  stopColor="#000" stopOpacity=".06"/>
          <stop offset="50%"  stopColor="#fff" stopOpacity=".1"/>
          <stop offset="82%"  stopColor="#000" stopOpacity=".04"/>
          <stop offset="100%" stopColor="#000" stopOpacity=".28"/>
        </linearGradient>
        {/* highlight stripe */}
        <linearGradient id={`hl-${gId}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#fff" stopOpacity="0"/>
          <stop offset="28%" stopColor="#fff" stopOpacity=".55"/>
          <stop offset="46%" stopColor="#fff" stopOpacity=".18"/>
          <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
        </linearGradient>
        {/* subtle vertical top-bottom tint */}
        <linearGradient id={`vg-${gId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fff" stopOpacity=".08"/>
          <stop offset="100%" stopColor="#000" stopOpacity=".12"/>
        </linearGradient>
        <clipPath id={`clip-${gId}`}><path d={body}/></clipPath>
      </defs>

      {/* ── base glass fill ── */}
      <path d={body} fill={color} opacity=".78"/>

      {/* ── letter inside visible through glass ── */}
      <g clipPath={`url(#clip-${gId})`} opacity=".55">
        {/* rolled scroll shape */}
        <rect x="22" y="72" width="20" height="52" rx="3" fill="#f8f0e4"/>
        {/* top curl */}
        <ellipse cx="32" cy="72" rx="10" ry="4" fill="#eddec8"/>
        {/* ruled lines */}
        {[84,91,98,105,112].map(y => (
          <line key={y} x1="25" y1={y} x2="39" y2={y} stroke="#9a8060" strokeWidth=".9" opacity=".7"/>
        ))}
        {/* small wax seal visible */}
        <circle cx="32" cy="124" r="4" fill="#8B0000" opacity=".6"/>
      </g>

      {/* ── glass depth / side gradient overlay ── */}
      <path d={body} fill={`url(#gd-${gId})`}/>
      {/* ── vertical tint ── */}
      <path d={body} fill={`url(#vg-${gId})`}/>

      {/* ── specular highlight stripe (left-center) ── */}
      <path d={body} fill={`url(#hl-${gId})`}/>
      {/* thin bright line */}
      <path d="M17,62 C15,72 14,84 14,98 L14,148" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".38"/>

      {/* ── bottom caustic ── */}
      <ellipse cx="32" cy="170" rx="17" ry="5" fill={color} opacity=".8"/>
      <ellipse cx="32" cy="170" rx="17" ry="5" fill="#000" opacity=".1"/>

      {/* ── neck ring (glass lip) ── */}
      <rect x="20" y="17" width="24" height="6" rx="2.5" fill={color} opacity=".95"/>
      <rect x="20" y="17" width="24" height="6" rx="2.5" fill={`url(#gd-${gId})`}/>
      <rect x="20" y="17" width="24" height="2" rx="1" fill="white" opacity=".22"/>

      {/* ── twine / rope around neck ── */}
      {[28,32,36].map(y => (
        <path key={y} d={`M22,${y} Q32,${y-4} 42,${y}`} stroke="#8B6914" strokeWidth="1.3" fill="none" opacity=".6"/>
      ))}

      {/* ── sealing wax drip ── */}
      <path d="M28,50 Q32,56 36,50 Q34,54 32,55 Q30,54 28,50 Z" fill="#8B0000" opacity=".75"/>
      <circle cx="32" cy="51" r="3.5" fill="#a00000" opacity=".7" className="wax-seal"/>

      {/* ── worn paper label ── */}
      <g transform="rotate(-2,32,108)">
        <rect x="17" y="92" width="30" height="36" rx="3" fill="#f8f0e4" opacity=".68"/>
        <rect x="19" y="94" width="26" height="32" rx="2" fill="none" stroke="#c8a860" strokeWidth=".5" opacity=".55"/>
        {[100,105,110,115].map(y => (
          <line key={y} x1="22" y1={y} x2="42" y2={y} stroke="#9a8060" strokeWidth=".7" opacity=".4"/>
        ))}
      </g>

      {/* ── neck opening when open (no cork) ── */}
      {open && (
        <ellipse cx="32" cy="22" rx="10" ry="3.5" fill={color} opacity=".7">
          <animate attributeName="opacity" values=".7;1;.7" dur="1.5s" repeatCount="indefinite"/>
        </ellipse>
      )}
    </svg>
  )
}

// ── Bottle card with cork-pop ─────────────────────────────────────────────────

type BottlePhase = 'idle' | 'popping' | 'open'

function BottleCard({ letter, onClick }: { letter: typeof LETTERS[0]; onClick: () => void }) {
  const [phase, setPhase] = useState<BottlePhase>('idle')
  const [corkGone, setCorkGone] = useState(false)

  function handleClick() {
    if (phase !== 'idle') return
    setPhase('popping')
    // cork disappears ~halfway through pop
    setTimeout(() => setCorkGone(true), 420)
    // open modal after pop finishes
    setTimeout(() => {
      setPhase('open')
      onClick()
    }, 700)
    // reset for reuse after modal close
    setTimeout(() => {
      setPhase('idle')
      setCorkGone(false)
    }, 4000)
  }

  return (
    <div
      className={`bottle-card ${phase === 'idle' ? 'idle' : phase === 'popping' ? 'shaking' : ''}`}
      style={{ animationDelay: letter.delay, textAlign: 'center', cursor: 'pointer' }}
      onClick={handleClick}
      role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') handleClick() }}
      aria-label={`Read letter from ${letter.name}`}
    >
      <div style={{ position: 'relative', width: 64, height: 209, margin: '0 auto' }}>
        {/* Cork – absolutely positioned above bottle neck */}
        {!corkGone && (
          <div
            className={phase === 'popping' ? 'cork-popping' : 'cork-idle'}
            style={{
              position: 'absolute',
              top: -2,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              transformOrigin: 'center bottom',
            }}
          >
            <CorkSVG w={20} h={24}/>
          </div>
        )}
        <div style={{ position: 'absolute', top: 24, left: 0 }}>
          <BottleBodySVG color={letter.glassColor} id={letter.id} open={corkGone}/>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 13, color: '#2c4a5c', fontWeight: 700 }}>{letter.name}</div>
      <div style={{ fontSize: 11, color: '#6a8a98', marginTop: 4, maxWidth: 130, lineHeight: 1.4 }}>{letter.preview}</div>
    </div>
  )
}

// ── Scroll modal (unfurl animation) ──────────────────────────────────────────

function ScrollModal({ letter, onClose }: { letter: typeof LETTERS[0]; onClose: () => void }) {
  const [phase, setPhase] = useState<'appearing'|'unfurling'|'open'>('appearing')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('unfurling'), 40)
    const t2 = setTimeout(() => setPhase('open'), 980)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="scroll-modal-wrap" onClick={onClose}>
      <div
        className={`scroll-modal ${phase === 'unfurling' ? 'unfurling' : phase === 'open' ? 'open' : ''}`}
        style={{ opacity: phase === 'appearing' ? 0 : 1, transform: phase === 'appearing' ? 'perspective(700px) rotateX(84deg) scaleY(.04)' : undefined }}
        onClick={e => e.stopPropagation()}
      >
        {/* top wooden rod */}
        <div className="scroll-rod" style={{ margin: '0 -2px' }}/>

        {/* parchment body */}
        <div className="scroll-body">
          <button
            onClick={onClose}
            style={{ position:'absolute',top:22,right:20,background:'rgba(58,42,26,.08)',border:'none',color:'#6a5030',width:30,height:30,borderRadius:'50%',cursor:'pointer',fontSize:17,display:'flex',alignItems:'center',justifyContent:'center' }}
          >×</button>

          {/* wax seal decorative */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ width:36,height:36,borderRadius:'50%',background:'radial-gradient(circle at 40% 35%,#c00,#600)',boxShadow:'0 2px 8px rgba(0,0,0,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>✉</div>
            <div>
              <div className="font-display" style={{ color:'#3a2a1a',fontWeight:600,fontSize:18 }}>A letter from {letter.name}</div>
              <div style={{ fontSize:11,color:'#9a8060',letterSpacing:'.08em',textTransform:'uppercase',marginTop:2 }}>Found washed ashore</div>
            </div>
          </div>

          {/* horizontal divider with wave */}
          <svg viewBox="0 0 480 12" style={{ width:'100%',marginBottom:18,opacity:.4 }}>
            <path d="M0,6 C60,0 120,12 180,6 C240,0 300,12 360,6 C420,0 480,12 480,6" stroke="#9a8060" strokeWidth="1.5" fill="none"/>
          </svg>

          {phase === 'open' && (
            <div className="scroll-text-reveal" style={{ color:'#3a2a1a',lineHeight:1.95,fontSize:14.5,whiteSpace:'pre-line',maxHeight:'52vh',overflowY:'auto',fontFamily:'Georgia,serif' }}>
              {letter.text}
            </div>
          )}
          {phase !== 'open' && (
            <div style={{ height:200 }}/>
          )}

          {/* bottom signature line */}
          {phase === 'open' && (
            <div style={{ marginTop:22,paddingTop:16,borderTop:'1px dashed rgba(154,128,80,.3)',fontSize:13,color:'#9a8060',fontStyle:'italic',textAlign:'center' }}>
              "You are never sailing alone." ⚓
            </div>
          )}
        </div>

        {/* bottom wooden rod */}
        <div className="scroll-rod" style={{ margin: '0 -2px' }}/>
      </div>
    </div>
  )
}

// ── Ocean life ────────────────────────────────────────────────────────────────

function FishSVG({ color, size=34, flip=false }: { color:string; size?:number; flip?:boolean }) {
  return (
    <svg width={size} height={size*.6} viewBox="0 0 60 36" fill="none" style={{transform:flip?'scaleX(-1)':'none'}}>
      <path d="M42 18 C42 18 56 10 58 18 C56 26 42 18 42 18Z" fill={color} opacity=".85"/>
      <ellipse cx="24" cy="18" rx="22" ry="12" fill={color} opacity=".85"/>
      <circle cx="10" cy="14" r="3.5" fill="white" opacity=".9"/>
      <circle cx="9" cy="13" r="1.8" fill="#2c4a5c"/>
      <path d="M30 12 C34 10 38 14 36 18" stroke="white" strokeWidth="1" opacity=".25" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function JellySVG({ color, size=48 }: { color:string; size?:number }) {
  return (
    <div className="animate-jellyfish" style={{width:size}}>
      <svg viewBox="0 0 50 70" fill="none" width={size}>
        <ellipse cx="25" cy="20" rx="20" ry="18" fill={color} opacity=".55"/>
        <ellipse cx="25" cy="20" rx="20" ry="18" fill="white" opacity=".1"/>
        {[10,17,25,33,40].map((x,i)=>(
          <path key={i} d={`M${x} 36 Q${x+(i%2?2:-2)} ${50+i*3} ${x+(i%2?-1:1)} ${60+i*2}`} stroke={color} strokeWidth="1.5" opacity=".45" fill="none" strokeLinecap="round"/>
        ))}
      </svg>
    </div>
  )
}

function Seaweed({ color, h=80 }: { color:string; h?:number }) {
  return (
    <div className="animate-seaweed" style={{display:'inline-block',height:h}}>
      <svg viewBox="0 0 20 80" width="16" height={h} fill="none">
        <path d="M10 80 C10 80 4 65 8 55 C12 45 16 40 10 28 C4 16 8 5 10 0" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" opacity=".65"/>
        <path d="M10 60 C10 60 2 55 4 48" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" opacity=".45"/>
        <path d="M10 40 C10 40 18 35 16 28" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" opacity=".45"/>
      </svg>
    </div>
  )
}

function OceanLife() {
  const fish = [
    {color:'#7a9ab0',size:30,top:'22%',dur:28,delay:0},{color:'#8a9a80',size:22,top:'55%',dur:22,delay:6,flip:true},
    {color:'#9a8070',size:26,top:'38%',dur:35,delay:12},{color:'#8a7a9a',size:20,top:'72%',dur:19,delay:3,flip:true},
    {color:'#6a8a9a',size:32,top:'16%',dur:40,delay:18,flip:true},{color:'#9a9070',size:20,top:'80%',dur:26,delay:9},
  ]
  const bubbles = Array.from({length:10},(_,i)=>({id:i,left:4+i*9,size:5+Math.random()*9,delay:i*.75,dur:4+Math.random()*4}))
  return (
    <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'}}>
      {fish.map((f,i)=>(
        <div key={i} className={f.flip?'fish-l':'fish-r'} style={{top:f.top,animationDuration:`${f.dur}s`,animationDelay:`${f.delay}s`}}>
          <FishSVG color={f.color} size={f.size} flip={f.flip}/>
        </div>
      ))}
      {bubbles.map(b=>(
        <div key={b.id} className="bubble" style={{left:`${b.left}%`,bottom:16,width:b.size,height:b.size,animationDuration:`${b.dur}s`,animationDelay:`${b.delay}s`}}/>
      ))}
    </div>
  )
}

function SeabedDecor() {
  const items = [
    {t:'weed',c:'#5a7a6a',h:70},{t:'weed',c:'#4a6878',h:50},{t:'coral',c:'#9a7060',sz:30},
    {t:'weed',c:'#6a8a78',h:60},{t:'pebble',c:'#8a8a7a',sz:18},{t:'weed',c:'#4a6870',h:80},
    {t:'weed',c:'#5a7888',h:45},{t:'coral',c:'#8a7050',sz:26},{t:'weed',c:'#4a6878',h:65},
    {t:'weed',c:'#5a7a6a',h:55},{t:'coral',c:'#6a8a78',sz:22},{t:'weed',c:'#6a8a80',h:72},
    {t:'weed',c:'#4a6878',h:58},{t:'weed',c:'#5a7a6a',h:42},
  ]
  return (
    <div style={{position:'absolute',bottom:0,left:0,right:0,display:'flex',alignItems:'flex-end',gap:10,padding:'0 32px',pointerEvents:'none',overflow:'hidden',height:90}}>
      {items.map((it,i)=>{
        if(it.t==='weed') return <Seaweed key={i} color={it.c} h={it.h as number}/>
        if(it.t==='coral') return <div key={i} style={{width:it.sz,height:Math.round((it.sz as number)*.72),borderRadius:'50% 50% 50% 50%/60% 60% 40% 40%',background:`linear-gradient(135deg,${it.c},#c8a860)`,marginBottom:3,animation:'coral-sway 3s ease-in-out infinite',transformOrigin:'bottom center',animationDelay:`${i*.3}s`}}/>
        return <div key={i} style={{width:it.sz,height:it.sz,borderRadius:'50%',background:it.c,opacity:.4,marginBottom:4}}/>
      })}
    </div>
  )
}

function RainDrops({ n=20 }:{n?:number}) {
  const drops = Array.from({length:n},(_,i)=>({id:i,left:Math.random()*100,dur:.65+Math.random()*.8,delay:Math.random()*2,h:12+Math.random()*14}))
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}>
      {drops.map(d=><div key={d.id} className="rain-drop" style={{left:`${d.left}%`,height:d.h,animationDuration:`${d.dur}s`,animationDelay:`${d.delay}s`}}/>)}
    </div>
  )
}

function Stars() {
  const stars = Array.from({length:36},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*55,s:Math.random()*2+.5,del:Math.random()*4,dur:2+Math.random()*3}))
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}>
      {stars.map(s=><div key={s.id} className="animate-twinkle" style={{position:'absolute',borderRadius:'50%',background:'white',left:`${s.x}%`,top:`${s.y}%`,width:s.s,height:s.s,animationDelay:`${s.del}s`,animationDuration:`${s.dur}s`}}/>)}
    </div>
  )
}

function ShipSVG({ stormy=false, size=120 }:{stormy?:boolean;size?:number}) {
  return (
    <div className={stormy?'animate-storm':'animate-bob'} style={{width:size,filter:'drop-shadow(0 6px 14px rgba(44,74,92,.28))'}}>
      <svg viewBox="0 0 120 100" fill="none">
        <line x1="60" y1="15" x2="60" y2="58" stroke="#c8a97a" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M61 18 L85 50 L61 55 Z" fill="#f8f3ee" opacity=".95"/>
        <path d="M59 22 L38 48 L59 52 Z" fill="#E0D8D0" opacity=".9"/>
        <path d="M20 62 L100 62 L90 78 L30 78 Z" fill="#3a5a72" stroke="#4a6a82" strokeWidth="1.5"/>
        <path d="M30 64 L90 64 L85 70 L35 70 Z" fill="#4a6a82" opacity=".4"/>
        <path d="M60 15 L60 8 L73 11 L60 14 Z" fill="#9AB3CA"/>
      </svg>
    </div>
  )
}

function LighthouseSVG() {
  return (
    <svg viewBox="0 0 80 160" fill="none" width="80">
      <rect x="25" y="130" width="30" height="30" rx="3" fill="#C6DDED"/>
      <path d="M28 40 L52 40 L50 130 L30 130 Z" fill="#f8f3ee" stroke="#C6DDED" strokeWidth="1"/>
      <path d="M28 60 L52 60 L51 75 L29 75 Z" fill="#9a7060" opacity=".65"/>
      <path d="M29 95 L51 95 L50.5 110 L29.5 110 Z" fill="#9a7060" opacity=".65"/>
      <rect x="24" y="25" width="32" height="16" rx="3" fill="#2c4a5c"/>
      <circle cx="40" cy="33" r="8" fill="#c49a42" className="animate-lh-glow"/>
      <circle cx="40" cy="33" r="5" fill="#fff" opacity=".95"/>
      <path d="M22 25 L58 25 L50 18 L30 18 Z" fill="#2c4a5c"/>
      <path d="M30 18 L50 18 L44 12 L36 12 Z" fill="#2c4a5c"/>
      <rect x="35" y="55" width="10" height="12" rx="5" fill="#C6DDED" opacity=".7"/>
      <rect x="35" y="90" width="10" height="12" rx="5" fill="#C6DDED" opacity=".7"/>
      <path d="M34 130 L46 130 L46 115 Q40 110 34 115 Z" fill="#2c4a5c"/>
    </svg>
  )
}

// ── World Map ─────────────────────────────────────────────────────────────────

function WorldMap({ destId }:{destId:string|null}) {
  const dest = DESTINATIONS.find(d=>d.id===destId)
  const dp = dest ? toXY(dest.lon, dest.lat) : null
  const routePath = dp ? `M ${HOME_X} ${HOME_Y} Q ${(HOME_X+dp.x)/2} ${(HOME_Y+dp.y)/2-48} ${dp.x} ${dp.y}` : ''
  return (
    <div style={{borderRadius:20,overflow:'hidden',background:'linear-gradient(180deg,#C6DDED,#9AB3CA)',border:'1.5px solid rgba(154,179,202,.4)',boxShadow:'inset 0 0 50px rgba(44,74,92,.1)'}}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" style={{display:'block'}}>
        <defs>
          <linearGradient id="ocean-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C6DDED"/><stop offset="100%" stopColor="#9AB3CA"/>
          </linearGradient>
          <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dfeaeb" stopOpacity=".7"/><stop offset="100%" stopColor="#C6DDED" stopOpacity=".8"/>
          </linearGradient>
        </defs>
        <rect width={MAP_W} height={MAP_H} fill="url(#ocean-bg)"/>
        {/* grid */}
        {[72,145,218,290,362].map(y=><line key={y} x1="0" y1={y} x2={MAP_W} y2={y} stroke="rgba(255,255,255,.3)" strokeWidth=".8"/>)}
        {[150,225,300,375,450,525,600,675,750,825].map(x=><line key={x} x1={x} y1="0" x2={x} y2={MAP_H} stroke="rgba(255,255,255,.3)" strokeWidth=".8"/>)}
        {/* continents */}
        {CONTINENTS.map((d,i)=><path key={i} d={d} fill="url(#land)" stroke="rgba(255,255,255,.45)" strokeWidth="1"/>)}
        {/* ocean labels */}
        {OCEAN_LABELS.map((l,i)=><text key={i} x={l.x} y={l.y} fill="rgba(44,74,92,.4)" fontSize="11" fontFamily="Nunito,sans-serif" fontStyle="italic" textAnchor="middle">{l.text}</text>)}
        {/* all destination dots */}
        {DESTINATIONS.map(d=>{
          const pt=toXY(d.lon,d.lat); const sel=d.id===destId
          return <g key={d.id}>{!sel && <><circle cx={pt.x} cy={pt.y} r="4.5" fill={d.accent} opacity=".7"/><text x={pt.x} y={pt.y-8} fill={d.accent} fontSize="11" textAnchor="middle">{d.flag}</text></>}</g>
        })}
        {/* route */}
        {dp && <path d={routePath} fill="none" stroke="#9a7060" strokeWidth="2.5" strokeLinecap="round" pathLength={1} style={{strokeDasharray:'1',strokeDashoffset:'1',animation:'draw-route 2.2s ease-out forwards'}}/>}
        {/* home */}
        <g transform={`translate(${HOME_X-12},${HOME_Y-16})`}>
          <circle cx="12" cy="20" r="12" fill="white" opacity=".85"/>
          <text x="12" y="25" textAnchor="middle" fontSize="14">⛵</text>
        </g>
        <text x={HOME_X} y={HOME_Y+18} fill="#2c4a5c" fontSize="10" textAnchor="middle" fontFamily="Nunito,sans-serif" fontWeight="700">YOU ARE HERE</text>
        {/* selected pin */}
        {dp && dest && (
          <g className="map-pin">
            <circle cx={dp.x} cy={dp.y} r="18" fill={dest.accent} opacity=".12"/>
            <circle cx={dp.x} cy={dp.y} r="10" fill={dest.accent} opacity=".85"/>
            <text x={dp.x} y={dp.y+5} textAnchor="middle" fontSize="11">{dest.flag}</text>
            <text x={dp.x} y={dp.y+26} fill="#2c4a5c" fontSize="11" textAnchor="middle" fontFamily="Nunito,sans-serif" fontWeight="700">{dest.label}</text>
          </g>
        )}
      </svg>
      {dest && (
        <div style={{padding:'16px 24px',background:'rgba(248,243,238,.9)',borderTop:'1px solid rgba(154,179,202,.2)',display:'flex',flexWrap:'wrap'}}>
          {[{icon:'🗺️',label:'Distance',val:dest.dist},{icon:'⛵',label:'Sailing time',val:dest.days},{icon:'🌊',label:'Seas',val:dest.seas},{icon:'✨',label:'Vibe',val:dest.vibe}].map((s,i)=>(
            <div key={i} style={{flex:'1 1 130px',padding:'6px 16px',borderRight:i<3?'1px solid rgba(154,179,202,.18)':'none'}}>
              <div style={{fontSize:12,color:'#6a8a98',marginBottom:3}}>{s.icon} {s.label}</div>
              <div style={{fontSize:13,fontWeight:700,color:'#2c4a5c'}}>{s.val}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Confetti ──────────────────────────────────────────────────────────────────

function Confetti() {
  const pieces = Array.from({length:28},(_,i)=>({id:i,left:Math.random()*100,size:6+Math.random()*8,color:['#9AB3CA','#8a9a80','#c49a42','#9a8a9a','#8a7060','#6a8a9a'][i%6],delay:Math.random()*.8,dur:1.2+Math.random()*.8,rot:Math.random()*360}))
  return (
    <div style={{position:'absolute',top:0,left:0,right:0,height:120,overflow:'hidden',pointerEvents:'none'}}>
      {pieces.map(p=><div key={p.id} className="confetti-piece" style={{left:`${p.left}%`,top:0,width:p.size,height:p.size*.6,background:p.color,animationDuration:`${p.dur}s`,animationDelay:`${p.delay}s`,transform:`rotate(${p.rot}deg)`}}/>)}
    </div>
  )
}

// ── Page sections ─────────────────────────────────────────────────────────────

function HeroSection({ onEnter, destination }:{onEnter:()=>void; destination:string|null}) {
  const [entered, setEntered] = useState(false)
  const dest = DESTINATIONS.find(d=>d.id===destination)
  return (
    <section id="hero" style={{minHeight:'100vh',position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'linear-gradient(180deg,#1a3346 0%,#2c4a5e 22%,#4a6a82 45%,#7a9ab0 68%,#C6DDED 88%,#dfeaeb 100%)'}}>
      <Stars/>
      <div style={{position:'absolute',top:68,right:125,width:54,height:54,borderRadius:'50%',background:'#f8f3ee',boxShadow:'0 0 40px 16px rgba(248,243,238,.3)'}}/>
      {[{t:80,l:'12%',w:220,h:60,d:'0s'},{t:108,l:'36%',w:300,h:80,d:'2s'},{t:62,r:'18%',w:180,h:55,d:'4s'}].map((c,i)=>(
        <div key={i} className="animate-drift-cloud" style={{position:'absolute',top:c.t,left:(c as any).l,right:(c as any).r,width:c.w,height:c.h,borderRadius:50,background:'rgba(198,221,237,.18)',filter:'blur(20px)',animationDelay:c.d}}/>
      ))}
      {dest && (
        <div className="animate-fade-in-up" style={{position:'absolute',top:100,left:40,background:'rgba(255,255,255,.14)',border:'1px solid rgba(255,255,255,.28)',borderRadius:50,padding:'8px 20px',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:18}}>{dest.flag}</span>
          <span style={{fontSize:13,fontWeight:700,color:'white',letterSpacing:'.05em'}}>Sailing to {dest.label}</span>
        </div>
      )}
      <div style={{position:'absolute',bottom:'28%',left:'50%',transform:'translateX(-50%)'}}><ShipSVG size={130}/></div>
      <div style={{position:'absolute',bottom:'36%',left:'11%',opacity:.35}}><JellySVG color="#C6DDED" size={40}/></div>
      <div style={{position:'absolute',bottom:'43%',right:'15%',opacity:.28}}><JellySVG color="#E0D8D0" size={32}/></div>
      <div className="animate-fade-in-up" style={{textAlign:'center',zIndex:2,padding:'0 24px',maxWidth:680}}>
        <div style={{fontSize:12,letterSpacing:'.22em',color:'#C6DDED',textTransform:'uppercase',fontWeight:700,marginBottom:16}}>You are not alone in this storm</div>
        <h1 className="font-display" style={{fontSize:'clamp(40px,7vw,70px)',fontWeight:300,lineHeight:1.15,color:'white',marginBottom:24}}>
          There is <em style={{fontStyle:'italic',color:'#f7b267'}}>shore</em><br/>beyond the storm.
        </h1>
        <p style={{fontSize:18,color:'#C6DDED',lineHeight:1.75,marginBottom:40,maxWidth:480,margin:'0 auto 40px'}}>
          A safe space for teens navigating the storm of anorexia — pick your destination, read letters from survivors, join your crew, and find your lighthouse.
        </p>
        <button onClick={()=>{setEntered(true);setTimeout(onEnter,500)}} style={{background:entered?'rgba(255,255,255,.14)':'rgba(255,255,255,.22)',color:'white',border:'1px solid rgba(255,255,255,.45)',borderRadius:50,padding:'16px 40px',fontSize:16,fontWeight:700,cursor:'pointer',letterSpacing:'.05em',transition:'all .3s',fontFamily:'Nunito,sans-serif',backdropFilter:'blur(8px)'}}>
          {entered?'Setting sail…':'⚓ Begin the Journey'}
        </button>
      </div>
      <Waves h={130} c1="#C6DDED" c2="#9AB3CA" c3="#7a9ab0"/>
      <div style={{position:'absolute',bottom:148,left:'50%',transform:'translateX(-50%)',color:'rgba(255,255,255,.55)',fontSize:11,letterSpacing:'.18em',textTransform:'uppercase',textAlign:'center',animation:'bob 2.5s ease-in-out infinite'}}>↓ scroll to sail on</div>
    </section>
  )
}

function DestinationSection({ selected, onSelect }:{selected:string|null;onSelect:(id:string)=>void}) {
  const [showMap, setShowMap] = useState(false)
  useEffect(()=>{ if(selected) setShowMap(true) },[selected])
  return (
    <section id="destination" style={{position:'relative',background:'linear-gradient(180deg,#dfeaeb 0%,#C6DDED 55%,#9AB3CA 100%)',padding:'100px 24px 130px',overflow:'hidden'}}>
      <OceanLife/>
      <div style={{maxWidth:1000,margin:'0 auto',position:'relative',zIndex:2}}>
        <div style={{textAlign:'center',marginBottom:52}}>
          <div style={{fontSize:12,letterSpacing:'.2em',color:'#4a6a82',textTransform:'uppercase',fontWeight:700,marginBottom:14}}>Where are you sailing?</div>
          <h2 className="font-display" style={{fontSize:'clamp(30px,5vw,50px)',fontWeight:400,color:'#2c4a5c',marginBottom:16,lineHeight:1.2}}>
            Choose your <em style={{fontStyle:'italic',color:'#5a7a92'}}>destination</em>
          </h2>
          <p style={{fontSize:16,color:'#6a8a98',lineHeight:1.7,maxWidth:460,margin:'0 auto'}}>
            Recovery is a journey toward somewhere beautiful. Pick the place that calls to your heart.
          </p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(188px,1fr))',gap:14,marginBottom:48}}>
          {DESTINATIONS.map(d=>(
            <div key={d.id} className={`dest-card ${selected===d.id?'chosen':''}`} style={{background:selected===d.id?d.color:'rgba(248,243,238,.75)',borderRadius:20,padding:'22px 18px',textAlign:'center',backdropFilter:'blur(8px)'}} onClick={()=>onSelect(d.id)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')onSelect(d.id)}}>
              <div style={{fontSize:34,marginBottom:10}}>{d.flag}</div>
              <div style={{fontWeight:700,fontSize:15,color:'#2c4a5c',marginBottom:6}}>{d.label}</div>
              <div style={{fontSize:12,color:'#6a8a98',lineHeight:1.5}}>{d.tagline}</div>
              {selected===d.id && <div style={{marginTop:10,fontSize:11,fontWeight:700,color:d.accent,letterSpacing:'.1em',textTransform:'uppercase'}}>⚓ Your destination</div>}
            </div>
          ))}
        </div>
        {showMap && (
          <div className="animate-fade-in-up" style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:'#4a6a82',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
              <span style={{flex:1,height:1,background:'rgba(74,106,130,.25)',display:'block'}}/> Your voyage map <span style={{flex:1,height:1,background:'rgba(74,106,130,.25)',display:'block'}}/>
            </div>
            <WorldMap destId={selected}/>
          </div>
        )}
      </div>
      <Waves h={110} c1="#9AB3CA" c2="#7a9ab0" c3="#5a7a92"/>
    </section>
  )
}

function QuestSection({ totalXP, onXP }:{totalXP:number;onXP:(xp:number)=>void}) {
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [floats, setFloats] = useState<{id:number;x:number;y:number;val:number}[]>([])
  const [showConfetti, setShowConfetti] = useState(false)
  const fid = useRef(0)
  const allDone = completed.size === ALL_QUESTS.length

  function toggle(qid:string, xp:number, el:HTMLElement|null) {
    if(completed.has(qid)) return
    const next = new Set(completed); next.add(qid)
    setCompleted(next); onXP(xp)
    if(el){
      const r=el.getBoundingClientRect(), pr=el.closest('section')!.getBoundingClientRect()
      setFloats(f=>[...f,{id:fid.current++,x:r.right-pr.left,y:r.top-pr.top,val:xp}])
      setTimeout(()=>setFloats(f=>f.slice(1)),1000)
    }
    if(next.size===ALL_QUESTS.length){ setTimeout(()=>setShowConfetti(true),200); setTimeout(()=>setShowConfetti(false),3000) }
  }

  const lv = xpLevel(totalXP)
  const pct = Math.min(100,(totalXP/MAX_XP)*100)
  const earnedBadges = BADGES.filter(b=>totalXP>=b.xp)

  return (
    <section id="quests" style={{position:'relative',background:'linear-gradient(180deg,#f8f3ee 0%,#E0D8D0 50%,#dfeaeb 100%)',padding:'100px 24px 130px',overflow:'hidden'}}>
      {showConfetti && <Confetti/>}
      {floats.map(f=><div key={f.id} className="xp-float" style={{left:f.x+8,top:f.y}}>+{f.val} XP</div>)}
      <div style={{maxWidth:960,margin:'0 auto',position:'relative',zIndex:2}}>
        <div style={{textAlign:'center',marginBottom:52}}>
          <div style={{fontSize:12,letterSpacing:'.2em',color:'#5a7a82',textTransform:'uppercase',fontWeight:700,marginBottom:14}}>Ship's quest log</div>
          <h2 className="font-display" style={{fontSize:'clamp(30px,5vw,50px)',fontWeight:400,color:'#2c4a5c',marginBottom:16,lineHeight:1.2}}>
            Daily <em style={{fontStyle:'italic',color:'#7a6a5a'}}>Voyage Tasks</em>
          </h2>
          <p style={{fontSize:16,color:'#6a8a98',lineHeight:1.7,maxWidth:480,margin:'0 auto 36px'}}>
            Small acts of self-care are how you sail through the storm. Each task earns XP and brings you closer to shore.
          </p>
          {/* Level bar */}
          <div style={{maxWidth:480,margin:'0 auto',background:'rgba(255,255,255,.7)',borderRadius:20,padding:'20px 28px',border:'1.5px solid rgba(154,179,202,.25)',backdropFilter:'blur(8px)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:22}}>{lv.icon}</span>
                <div><div style={{fontWeight:800,fontSize:16,color:'#2c4a5c'}}>{lv.rank}</div><div style={{fontSize:12,color:'#6a8a98'}}>{totalXP} / {MAX_XP} XP</div></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                {BADGES.map(b=><div key={b.id} title={b.label} style={{fontSize:20,opacity:earnedBadges.find(e=>e.id===b.id)?1:.22,transition:'opacity .4s'}}>{b.icon}</div>)}
              </div>
            </div>
            <div style={{height:10,borderRadius:10,background:'rgba(154,179,202,.2)',overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:10,background:'linear-gradient(90deg,#9AB3CA,#7a9ab0)',width:`${pct}%`,transition:'width .6s cubic-bezier(.4,0,.2,1)'}}/>
            </div>
            {allDone && <div style={{marginTop:12,fontSize:13,fontWeight:700,color:'#5a7a82',textAlign:'center'}}>🎉 All quests complete — you're incredible!</div>}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
          {QUEST_CATS.map(cat=>(
            <div key={cat.id} style={{background:'rgba(255,255,255,.72)',borderRadius:20,padding:'24px',border:`1.5px solid ${cat.color}28`,backdropFilter:'blur(8px)'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                <span style={{fontSize:22}}>{cat.icon}</span>
                <div><div style={{fontWeight:800,fontSize:15,color:'#2c4a5c'}}>{cat.label}</div><div style={{fontSize:12,color:'#6a8a98'}}>{cat.desc}</div></div>
              </div>
              <div style={{height:2,borderRadius:2,background:`${cat.color}22`,marginBottom:16}}>
                <div style={{height:'100%',borderRadius:2,background:cat.color,width:`${cat.quests.filter(q=>completed.has(q.id)).length/cat.quests.length*100}%`,transition:'width .5s ease'}}/>
              </div>
              {cat.quests.map(q=>{
                const done = completed.has(q.id)
                return (
                  <div key={q.id} className={`quest-item ${done?'done':''}`} style={{background:done?`${cat.color}12`:'transparent'}} onClick={e=>toggle(q.id,q.xp,e.currentTarget)}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                      <div style={{width:24,height:24,borderRadius:8,border:done?`2px solid ${cat.color}`:`2px solid ${cat.color}50`,background:done?cat.color:'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',marginTop:1,transition:'all .3s'}}>
                        {done && <span className="animate-check-pop" style={{color:'white',fontSize:14,fontWeight:700}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,color:done?'#8a9a98':'#2c4a5c',textDecoration:done?'line-through':'none',lineHeight:1.5,transition:'color .3s'}}>{q.text}</div>
                        <div style={{fontSize:11,fontWeight:700,color:done?'#9aaab0':cat.color,marginTop:3}}>+{q.xp} XP</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        {/* epic quest */}
        <div style={{marginTop:28,background:'linear-gradient(135deg,rgba(196,154,66,.1),rgba(154,112,60,.07))',border:'1.5px solid rgba(196,154,66,.3)',borderRadius:20,padding:'24px 28px',display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
          <span style={{fontSize:36}}>⚡</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:16,color:'#5a4020',marginBottom:4}}>EPIC QUEST — Bonus Challenge</div>
            <div style={{fontSize:15,color:'#2c4a5c',marginBottom:6}}>Write one sentence about what "shore" means to you and save it somewhere you'll see every day.</div>
            <div style={{fontSize:12,color:'#c49a42',fontWeight:700}}>+50 XP · Rare achievement</div>
          </div>
          <span style={{fontSize:28}}>🏆</span>
        </div>
      </div>
      <Waves h={110} c1="#dfeaeb" c2="#C6DDED" c3="#9AB3CA"/>
    </section>
  )
}

function StormSection() {
  return (
    <section id="storm" style={{position:'relative',background:'linear-gradient(180deg,#2c4a5e 0%,#1e3a4e 50%,#162e3e 100%)',padding:'120px 24px',overflow:'hidden'}}>
      <RainDrops n={22}/>
      <div style={{position:'absolute',right:'8%',top:'18%',opacity:.3}}><ShipSVG stormy size={100}/></div>
      <div style={{maxWidth:820,margin:'0 auto',position:'relative',zIndex:2}}>
        <div style={{fontSize:12,letterSpacing:'.2em',color:'#9AB3CA',textTransform:'uppercase',fontWeight:700,marginBottom:16}}>Understanding the storm</div>
        <h2 className="font-display" style={{fontSize:'clamp(30px,5vw,52px)',fontWeight:400,color:'#f8f3ee',marginBottom:24,lineHeight:1.2}}>
          The storm is real.<br/><em style={{fontStyle:'italic',color:'#f0d080'}}>So is the way through it.</em>
        </h2>
        <p style={{fontSize:17,color:'#9AB3CA',lineHeight:1.8,marginBottom:56,maxWidth:600}}>
          Anorexia isn't a choice or a phase — it's a serious illness that affects your mind, body, and spirit. If you're struggling, you're not alone, and you're not broken. You're sailing through one of the hardest storms there is.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:20,marginBottom:52}}>
          {[{stat:'1 in 100',label:'teens are affected by anorexia',icon:'🌊'},{stat:'9 in 10',label:'people recover with the right support',icon:'⚓'},{stat:'Right now',label:'is the right time to reach out',icon:'🌅'}].map(it=>(
            <div key={it.stat} style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(198,221,237,.18)',borderRadius:16,padding:'26px 20px',textAlign:'center'}}>
              <div style={{fontSize:28,marginBottom:10}}>{it.icon}</div>
              <div className="font-display" style={{fontSize:28,fontWeight:600,color:'#f0d080',marginBottom:8}}>{it.stat}</div>
              <div style={{fontSize:14,color:'#9AB3CA',lineHeight:1.5}}>{it.label}</div>
            </div>
          ))}
        </div>
        <div style={{background:'rgba(198,221,237,.07)',border:'1px solid rgba(198,221,237,.18)',borderLeft:'3px solid #9AB3CA',borderRadius:16,padding:'22px 28px'}}>
          <p style={{fontSize:16,color:'#dfeaeb',lineHeight:1.85,margin:0,fontStyle:'italic'}}>"You don't have to have everything figured out to deserve help. You just have to take the next small step — and there are people waiting to sail alongside you."</p>
        </div>
      </div>
      <Waves h={110} c1="#2c4a5e" c2="#3a5a72" c3="#4a6a82"/>
    </section>
  )
}

function BottlesSection() {
  const [openLetter, setOpenLetter] = useState<typeof LETTERS[0]|null>(null)
  const [poppingId, setPoppingId] = useState<number|null>(null)

  function handleBottleClick(letter: typeof LETTERS[0]) {
    if (poppingId !== null) return
    setPoppingId(letter.id)
    setTimeout(() => { setOpenLetter(letter); setPoppingId(null) }, 720)
  }

  return (
    <section id="letters" style={{position:'relative',background:'linear-gradient(180deg,#dfeaeb 0%,#C6DDED 45%,#9AB3CA 100%)',padding:'120px 24px 110px',overflow:'hidden'}}>
      <OceanLife/>
      <div style={{maxWidth:1100,margin:'0 auto',position:'relative',zIndex:2}}>
        <div style={{textAlign:'center',marginBottom:60}}>
          <div style={{fontSize:12,letterSpacing:'.2em',color:'#4a6a82',textTransform:'uppercase',fontWeight:700,marginBottom:16}}>Messages from survivors</div>
          <h2 className="font-display" style={{fontSize:'clamp(30px,5vw,50px)',fontWeight:400,color:'#2c4a5c',marginBottom:18,lineHeight:1.2}}>
            Letters in <em style={{fontStyle:'italic',color:'#5a7a92'}}>Bottles</em>
          </h2>
          <p style={{fontSize:16,color:'#6a8a98',lineHeight:1.7,maxWidth:500,margin:'0 auto'}}>
            Survivors have sealed their stories in these bottles. Click a bottle — watch the cork fly, and let the letter unfurl.
          </p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:32,justifyItems:'center',paddingBottom:30}}>
          {LETTERS.map(letter=>(
            <BottleCard
              key={letter.id}
              letter={letter}
              onClick={()=>handleBottleClick(letter)}
            />
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:48,marginTop:48,opacity:.25}}>
          {[0,1,2].map(i=><div key={i} style={{width:64,height:16,borderRadius:'50%',border:'1px solid #5a7a92',animation:`ripple 3.5s ease-out ${i*1.2}s infinite`}}/>)}
        </div>
      </div>
      <SeabedDecor/>
      {openLetter && <ScrollModal letter={openLetter} onClose={()=>setOpenLetter(null)}/>}
      <Waves h={100} c1="#9AB3CA" c2="#7a9ab0" c3="#5a7a92"/>
    </section>
  )
}

function CrewChatSection({ myName, myColor }:{myName:string;myColor:string}) {
  const [msgs, setMsgs] = useState(SEED_MSGS)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(100)
  const scroll = useCallback(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),[])
  useEffect(()=>scroll(),[msgs,scroll])

  function send() {
    const t = input.trim(); if(!t) return
    const now = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
    setMsgs(m=>[...m,{id:idRef.current++,sailor:myName,color:myColor,text:t,time:now,isMe:true}])
    setInput('')
    const reply = AUTO_REPLIES[Math.floor(Math.random()*AUTO_REPLIES.length)]
    setTyping(true)
    setTimeout(()=>{
      setTyping(false)
      const rt = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
      setMsgs(m=>[...m,{id:idRef.current++,sailor:reply.sailor,color:reply.color,text:reply.text,time:rt,isMe:false}])
    },1800+Math.random()*1200)
  }

  return (
    <section id="chat" style={{position:'relative',background:'linear-gradient(180deg,#f8f3ee 0%,#E0D8D0 45%,#dfeaeb 100%)',padding:'100px 24px 130px',overflow:'hidden'}}>
      <OceanLife/>
      <div style={{maxWidth:760,margin:'0 auto',position:'relative',zIndex:2}}>
        <div style={{textAlign:'center',marginBottom:44}}>
          <div style={{fontSize:12,letterSpacing:'.2em',color:'#5a7a82',textTransform:'uppercase',fontWeight:700,marginBottom:14}}>Anonymous crew chat</div>
          <h2 className="font-display" style={{fontSize:'clamp(28px,4vw,46px)',fontWeight:400,color:'#2c4a5c',marginBottom:16,lineHeight:1.2}}>
            You are not sailing <em style={{fontStyle:'italic',color:'#7a6a5a'}}>alone</em>
          </h2>
          <p style={{fontSize:15,color:'#6a8a98',lineHeight:1.7,maxWidth:460,margin:'0 auto 20px'}}>
            Connect anonymously with others on the same ocean. Every sailor here understands the storm.
          </p>
          <div style={{display:'inline-flex',alignItems:'center',gap:10,background:'rgba(255,255,255,.65)',border:'1px solid rgba(154,179,202,.25)',borderRadius:50,padding:'8px 20px'}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:myColor,boxShadow:`0 0 8px ${myColor}`}}/>
            <span style={{fontSize:13,fontWeight:700,color:'#2c4a5c'}}>You are: {myName}</span>
          </div>
        </div>
        <div style={{background:'rgba(255,255,255,.65)',border:'1.5px solid rgba(154,179,202,.22)',borderRadius:24,overflow:'hidden',backdropFilter:'blur(12px)',boxShadow:'0 8px 40px rgba(44,74,92,.08)'}}>
          <div style={{padding:'14px 20px',background:'linear-gradient(90deg,rgba(224,216,208,.6),rgba(198,221,237,.6))',borderBottom:'1px solid rgba(154,179,202,.15)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#6a8a78',boxShadow:'0 0 8px #6a8a78'}}/>
            <span style={{fontSize:13,fontWeight:700,color:'#2c4a5c',letterSpacing:'.05em'}}>Ship's Crew Chat — {msgs.length} messages</span>
          </div>
          <div style={{height:380,overflowY:'auto',padding:'20px 20px 8px',display:'flex',flexDirection:'column',gap:14}}>
            {msgs.map(msg=>(
              <div key={msg.id} className="chat-msg" style={{display:'flex',flexDirection:msg.isMe?'row-reverse':'row',gap:10,alignItems:'flex-start'}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:`linear-gradient(135deg,${msg.color},rgba(198,221,237,.5))`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>⚓</div>
                <div style={{maxWidth:'72%'}}>
                  <div style={{fontSize:11,color:msg.color,fontWeight:700,marginBottom:4,textAlign:msg.isMe?'right':'left'}}>{msg.sailor}</div>
                  <div style={{background:msg.isMe?`${msg.color}18`:'rgba(255,255,255,.7)',border:msg.isMe?`1px solid ${msg.color}30`:'1px solid rgba(154,179,202,.2)',borderRadius:msg.isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',padding:'10px 14px',fontSize:14,color:'#2c4a5c',lineHeight:1.55}}>
                    {msg.text}
                  </div>
                  <div style={{fontSize:10,color:'#9aaab0',marginTop:4,textAlign:msg.isMe?'right':'left'}}>{msg.time}</div>
                </div>
              </div>
            ))}
            {typing && (
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:'rgba(154,179,202,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>⚓</div>
                <div style={{background:'rgba(255,255,255,.7)',border:'1px solid rgba(154,179,202,.2)',borderRadius:'18px 18px 18px 4px',padding:'10px 16px',display:'flex',gap:5,alignItems:'center'}}>
                  {[0,.2,.4].map((d,i)=><div key={i} className="typing-dot" style={{animationDelay:`${d}s`}}/>)}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
          <div style={{padding:'14px 16px',borderTop:'1px solid rgba(154,179,202,.12)',display:'flex',gap:10,background:'rgba(248,243,238,.4)'}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send()}} placeholder="Send a message to your crew…" maxLength={280} style={{flex:1,background:'rgba(255,255,255,.75)',border:'1.5px solid rgba(154,179,202,.22)',borderRadius:50,padding:'10px 20px',fontSize:14,color:'#2c4a5c',outline:'none',fontFamily:'Nunito,sans-serif',transition:'border-color .2s'}} onFocus={e=>{e.target.style.borderColor='rgba(154,179,202,.55)'}} onBlur={e=>{e.target.style.borderColor='rgba(154,179,202,.22)'}}/>
            <button onClick={send} disabled={!input.trim()} style={{background:input.trim()?'linear-gradient(135deg,#9AB3CA,#7a9ab0)':'rgba(154,179,202,.18)',color:input.trim()?'white':'#9aaab0',border:'none',borderRadius:50,padding:'10px 22px',fontSize:14,fontWeight:700,cursor:input.trim()?'pointer':'default',fontFamily:'Nunito,sans-serif',transition:'all .2s'}}>
              Send ⛵
            </button>
          </div>
        </div>
        <p style={{textAlign:'center',fontSize:12,color:'#8a9aaa',marginTop:14,lineHeight:1.6}}>Safe, anonymous peer support — not a substitute for professional help. Be kind 💙</p>
      </div>
      <Waves h={110} c1="#dfeaeb" c2="#C6DDED" c3="#9AB3CA"/>
    </section>
  )
}

function LighthouseSection() {
  const [active, setActive] = useState<number|null>(null)
  return (
    <section id="lighthouse" style={{position:'relative',background:'linear-gradient(180deg,#dfeaeb 0%,#E0D8D0 50%,#f8f3ee 100%)',padding:'120px 24px',overflow:'hidden'}}>
      <div style={{position:'absolute',right:'5%',top:'8%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(196,154,66,.07) 0%,transparent 70%)',pointerEvents:'none'}}/>
      <div style={{maxWidth:1100,margin:'0 auto',position:'relative',zIndex:2}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'start'}}>
          <div>
            <div style={{fontSize:12,letterSpacing:'.2em',color:'#8a7050',textTransform:'uppercase',fontWeight:700,marginBottom:16}}>Your guiding light</div>
            <h2 className="font-display" style={{fontSize:'clamp(28px,4vw,46px)',fontWeight:400,color:'#2c4a5c',marginBottom:20,lineHeight:1.2}}>
              The <em style={{fontStyle:'italic',color:'#c49a42'}}>Lighthouse</em><br/>Resource Hub
            </h2>
            <p style={{fontSize:16,color:'#6a8a98',lineHeight:1.8,marginBottom:36}}>
              A lighthouse doesn't chase ships — it stands steady, casting light so you can find your own way.
            </p>
            <div style={{display:'flex',alignItems:'flex-end',gap:24}}>
              <LighthouseSVG/>
              <p style={{fontSize:14,color:'#7a8a7a',fontStyle:'italic',lineHeight:1.65,maxWidth:200,paddingBottom:24}}>"A lighthouse doesn't save ships — it gives them the light to save themselves."</p>
            </div>
            <div style={{position:'relative',height:3,marginTop:28,overflow:'visible'}}><div className="lh-beam"/></div>
          </div>
          <div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {RESOURCES.map((r,i)=>(
                <div key={i} className="res-card" style={{background:active===i?'rgba(198,221,237,.45)':'rgba(255,255,255,.6)',borderRadius:14,padding:'16px 20px',cursor:'pointer',backdropFilter:'blur(8px)'}} onClick={()=>setActive(active===i?null:i)}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{fontSize:22,flexShrink:0}}>{r.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:700,color:'#2c4a5c',marginBottom:3}}>{r.name}</div>
                      <div style={{fontSize:13,color:'#6a8a98',lineHeight:1.5}}>{r.desc}</div>
                    </div>
                    <div style={{color:'#9AB3CA',fontSize:18,transition:'transform .3s',transform:active===i?'rotate(90deg)':'none'}}>›</div>
                  </div>
                  {active===i && (
                    <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid rgba(154,179,202,.18)',animation:'fade-in-up .3s ease-out'}}>
                      <div style={{fontSize:14,color:'#5a7a82',fontWeight:600,marginBottom:10}}>{r.contact}</div>
                      <a href={r.link} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',background:'rgba(154,179,202,.18)',color:'#3a5a72',padding:'8px 20px',borderRadius:50,fontSize:13,fontWeight:600,textDecoration:'none',border:'1px solid rgba(154,179,202,.3)'}} onClick={e=>e.stopPropagation()}>Visit resource →</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{marginTop:18,background:'rgba(196,154,66,.08)',border:'1px solid rgba(196,154,66,.3)',borderRadius:14,padding:'16px 20px',display:'flex',gap:12,alignItems:'flex-start'}}>
              <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:'#8a6020',marginBottom:4}}>In a medical emergency</div>
                <div style={{fontSize:13,color:'#6a8a98',lineHeight:1.5}}>Call 911 (US) or your local emergency number right away.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Waves h={100} c1="#E0D8D0" c2="#C6DDED" c3="#9AB3CA"/>
    </section>
  )
}

function ShoreSection({ destination }:{destination:string|null}) {
  const dest = DESTINATIONS.find(d=>d.id===destination)
  return (
    <section id="shore" style={{position:'relative',background:'linear-gradient(180deg,#9AB3CA 0%,#C6DDED 35%,#dfeaeb 70%,#f8f3ee 100%)',padding:'100px 24px 80px',overflow:'hidden',textAlign:'center'}}>
      <OceanLife/>
      <div style={{maxWidth:680,margin:'0 auto',position:'relative',zIndex:2}}>
        <div style={{fontSize:42,marginBottom:20}}>🌅</div>
        {dest && <div style={{fontSize:24,marginBottom:16}}>{dest.flag}</div>}
        <h2 className="font-display" style={{fontSize:'clamp(30px,5vw,50px)',fontWeight:400,color:'#2c4a5c',marginBottom:20,lineHeight:1.2}}>
          {dest ? <><em style={{fontStyle:'italic',color:'#5a7a92'}}>{dest.label}</em> is waiting.</> : <>Shore is <em style={{fontStyle:'italic',color:'#5a7a92'}}>closer</em> than it feels.</>}
        </h2>
        <p style={{fontSize:17,color:'#6a8a98',lineHeight:1.8,marginBottom:48}}>
          {dest ? `${dest.tagline}. Recovery is your voyage there — every single step counts.` : "Recovery isn't a straight line, but the shore is real. Others have reached it. You can too."}
        </p>
        <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap'}}>
          <a href="#letters" style={{background:'linear-gradient(135deg,#9AB3CA,#7a9ab0)',color:'white',padding:'14px 30px',borderRadius:50,textDecoration:'none',fontWeight:700,fontSize:15}}>Read survivor letters</a>
          <a href="#chat"    style={{background:'rgba(154,179,202,.14)',color:'#3a5a72',padding:'14px 30px',borderRadius:50,textDecoration:'none',fontWeight:700,fontSize:15,border:'1.5px solid rgba(154,179,202,.35)'}}>Join your crew</a>
          <a href="#quests"  style={{background:'rgba(106,138,120,.1)',color:'#3a5a42',padding:'14px 30px',borderRadius:50,textDecoration:'none',fontWeight:700,fontSize:15,border:'1.5px solid rgba(106,138,120,.3)'}}>Today's quests</a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer style={{background:'#dfeaeb',padding:'48px 24px 32px',textAlign:'center',borderTop:'1px solid rgba(154,179,202,.2)'}}>
      <div style={{marginBottom:16,fontSize:24}}>⚓</div>
      <div className="font-display" style={{fontSize:20,color:'#2c4a5c',marginBottom:12,fontStyle:'italic',fontWeight:300}}>Still Sailing</div>
      <p style={{fontSize:13,color:'#6a8a98',lineHeight:1.7,maxWidth:480,margin:'0 auto 28px'}}>This website is a supportive space, not a substitute for medical care. If you are struggling, please reach out to a healthcare professional or one of the resources above.</p>
      <div style={{display:'flex',justifyContent:'center',gap:24,flexWrap:'wrap',marginBottom:28}}>
        {[['#hero','Home'],['#destination','Destination'],['#quests','Quests'],['#storm','Storm'],['#letters','Letters'],['#chat','Crew'],['#lighthouse','Lighthouse']].map(([href,label])=>(
          <a key={href} href={href} className="nav-link">{label}</a>
        ))}
      </div>
      <div style={{fontSize:12,color:'#8a9aaa'}}>Made with care for anyone navigating the storm. You are seen. You are worth it. 💙</div>
    </footer>
  )
}

function Nav({ active, destination }:{active:string;destination:string|null}) {
  const [scrolled, setScrolled] = useState(false)
  const dest = DESTINATIONS.find(d=>d.id===destination)
  useEffect(()=>{
    const h=()=>setScrolled(window.scrollY>60)
    window.addEventListener('scroll',h); return ()=>window.removeEventListener('scroll',h)
  },[])
  return (
    <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:50,padding:'14px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',background:scrolled?'rgba(223,234,235,.92)':'transparent',backdropFilter:scrolled?'blur(14px)':'none',borderBottom:scrolled?'1px solid rgba(154,179,202,.18)':'none',transition:'all .3s'}}>
      <div className="font-display" style={{color:scrolled?'#2c4a5c':'white',fontSize:17,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
        <span style={{color:scrolled?'#9AB3CA':'#C6DDED'}}>⚓</span> Still Sailing
        {dest && <span style={{fontSize:12,fontFamily:'Nunito,sans-serif',fontStyle:'normal',fontWeight:400,color:scrolled?'#7a9ab0':'#C6DDED'}}>→ {dest.flag} {dest.label}</span>}
      </div>
      <div style={{display:'flex',gap:22,alignItems:'center'}}>
        {[['#destination','Map'],['#quests','Quests'],['#letters','Letters'],['#chat','Crew']].map(([href,label])=>(
          <a key={href} href={href} className={`nav-link ${active===href.slice(1)?'active':''}`} style={{color:active===href.slice(1)?(scrolled?'#4a6a82':'#C6DDED'):scrolled?'#6a8a98':'rgba(255,255,255,.7)'}}>{label}</a>
        ))}
        <a href="#lighthouse" style={{background:scrolled?'rgba(154,179,202,.18)':'rgba(255,255,255,.18)',color:scrolled?'#3a5a72':'white',padding:'7px 18px',borderRadius:50,textDecoration:'none',fontSize:12,fontWeight:700,border:scrolled?'1px solid rgba(154,179,202,.3)':'1px solid rgba(255,255,255,.35)',letterSpacing:'.06em',textTransform:'uppercase',backdropFilter:'blur(4px)'}}>Get Help</a>
      </div>
    </nav>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeSection, setActiveSection] = useState('hero')
  const [journeyStarted, setJourneyStarted] = useState(false)
  const [destination, setDestination] = useState<string|null>(null)
  const [totalXP, setTotalXP] = useState(0)
  const [myName]  = useState(()=>genSailor())
  const [myColor] = useState(()=>SAILOR_COLORS[Math.floor(Math.random()*SAILOR_COLORS.length)])

  useEffect(()=>{
    const ids = ['hero','destination','quests','storm','letters','chat','lighthouse','shore']
    const obs = new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)setActiveSection(e.target.id)})},{threshold:.35})
    ids.forEach(id=>{const el=document.getElementById(id);if(el)obs.observe(el)})
    return ()=>obs.disconnect()
  },[])

  return (
    <div style={{fontFamily:'Nunito,sans-serif'}}>
      <Nav active={activeSection} destination={destination}/>
      {journeyStarted && (
        <div style={{position:'fixed',right:18,top:'50%',transform:'translateY(-50%)',zIndex:40,display:'flex',flexDirection:'column',gap:9}}>
          {['hero','destination','quests','storm','letters','chat','lighthouse','shore'].map(id=>(
            <a key={id} href={`#${id}`} aria-label={id}><div className={`jdot ${activeSection===id?'active':''}`}/></a>
          ))}
        </div>
      )}
      <HeroSection onEnter={()=>{setJourneyStarted(true);document.getElementById('destination')?.scrollIntoView({behavior:'smooth'})}} destination={destination}/>
      <DestinationSection selected={destination} onSelect={setDestination}/>
      <QuestSection totalXP={totalXP} onXP={xp=>setTotalXP(t=>t+xp)}/>
      <StormSection/>
      <BottlesSection/>
      <CrewChatSection myName={myName} myColor={myColor}/>
      <LighthouseSection/>
      <ShoreSection destination={destination}/>
      <Footer/>
    </div>
  )
}
