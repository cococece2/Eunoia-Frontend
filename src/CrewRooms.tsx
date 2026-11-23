import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from './lib/supabase'
import { useI18n } from './i18n'
import { RISKY } from './safety'

export type ChatUser = { id: string; sailor: string }
type Room = { id: string; name: string; description: string; emoji: string; members: number; pending?: boolean }
type Msg = { id: string; userId: string | null; sailor: string; text: string; time: string; replyTo: string | null }

const COLORS = ['#7a9ab0', '#6a8a9a', '#8a7a9a', '#6a8a78', '#9a8a6a', '#8a7070', '#7090a8', '#6a7a88']
const colorFor = (name: string) => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}
const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const MSG_COLS = 'id,user_id,body,created_at,reply_to,profiles!messages_user_id_fkey(sailor_name)'
const toMsg = (r: any): Msg => ({
  id: String(r.id),
  userId: r.user_id,
  sailor: r.profiles?.sailor_name ?? 'Sailor',
  text: r.body,
  time: fmt(r.created_at),
  replyTo: r.reply_to ? String(r.reply_to) : null,
})

// ── Preview mode (used only until Supabase is connected) ─────────────────────
const DEMO_ROOMS: Room[] = [
  { id: 'daily', name: 'Daily Check-ins', emoji: '🌅', members: 128, description: 'How is the water today? Share a word, a feeling, or a small win.' },
  { id: 'wins', name: 'Small Wins', emoji: '🎉', members: 94, description: 'Ate a meal, told someone, took a breath. It all counts here.' },
  { id: 'rough', name: 'Rough Seas', emoji: '🌧️', members: 76, description: 'A gentle place for the hard days. Listen first, advise only if asked.' },
  { id: 'family', name: 'Family & Friends', emoji: '🫂', members: 41, description: 'Talking to the people who love you, even when it feels scary.' },
  { id: 'quiet', name: 'Quiet Harbor', emoji: '⚓', members: 58, description: 'No pressure to talk. Just sit with the crew for a while.' },
]
const DEMO_MSGS: Record<string, Msg[]> = {
  daily: [
    { id: 'd1', userId: 'x1', sailor: 'CoralDrifter_47', text: 'Hey everyone 👋 Just found this place. Really needed it today.', time: '9:14 AM', replyTo: null },
    { id: 'd2', userId: 'x2', sailor: 'TealHarbor_22', text: "Welcome 💙 We're all sailing together here, no judgment.", time: '9:15 AM', replyTo: null },
  ],
  wins: [
    { id: 'w1', userId: 'x3', sailor: 'MoonRipple_31', text: 'I ate lunch with my family for the first time in months 🌊 Small win.', time: '9:31 AM', replyTo: null },
    { id: 'w2', userId: 'x2', sailor: 'TealHarbor_22', text: 'THAT IS HUGE 🎉 Please be proud of yourself.', time: '9:32 AM', replyTo: null },
  ],
}

type Props = {
  user: ChatUser | null
  onLogin: () => void
  decor?: ReactNode // e.g. <OceanLife/>
  waves?: ReactNode // e.g. <Waves .../>
}

const pillBtn = (on: boolean): React.CSSProperties => ({
  background: on ? 'rgba(106,138,120,.14)' : 'linear-gradient(135deg,#9AB3CA,#7a9ab0)',
  color: on ? '#4a6a58' : 'white',
  border: on ? '1px solid rgba(106,138,120,.3)' : '1px solid transparent',
  borderRadius: 50, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'Nunito,sans-serif', whiteSpace: 'nowrap', transition: 'all .2s',
})

const CREW_EMOJIS = ['⚓', '🌊', '🐚', '🐬', '🐢', '🌅', '🌙', '⭐', '🎨', '🎵', '📚', '🌱', '🐾', '☕', '💙', '🫶']

function NewCrewModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [emoji, setEmoji] = useState('⚓')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const nm = name.trim(), ds = desc.trim()
    if (nm.length < 3) { setError(t('Give your crew a name (at least 3 letters).')); return }
    if (ds.length < 10) { setError(t('Write a short description (at least 10 letters).')); return }
    if (RISKY.test(nm) || RISKY.test(ds)) { setError(t('Please leave out numbers about weight, food or body size, and anything about diets or fasting.')); return }
    const sb = supabase
    if (!sb) return
    setBusy(true); setError('')
    const { error } = await sb.rpc('create_room', { p_name: nm, p_description: ds, p_emoji: emoji })
    setBusy(false)
    if (error) {
      const m = error.message
      setError(
        m.includes('already exists') ? t('A crew with that name already exists. Try a different name.')
        : m.includes('waiting for approval') ? t('You already have 2 crews waiting for approval. Please wait for those first.')
        : m.includes('few crews today') ? t('You have started a few crews today already. Please try again tomorrow.')
        : m.includes('create_room') ? t('This is not set up yet. Please try again later.')
        : t('Could not send your crew. Please try again.'))
      return
    }
    setSent(true)
    onDone()
  }

  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid rgba(154,179,202,.5)', borderRadius: 14, padding: '10px 14px', fontSize: 14, fontFamily: 'Nunito,sans-serif', background: 'rgba(255,255,255,.9)', color: '#2c4a5c', outline: 'none' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 800, color: '#5a7a82', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }
  return (
    <div className="scroll-modal-wrap" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="animate-fade-in-up" role="dialog" aria-modal="true" aria-label={t('Start a new crew')}
        style={{ position: 'relative', width: '100%', maxWidth: 480, background: 'linear-gradient(180deg,#f8f3ee 0%,#dfeaeb 100%)', borderRadius: 24, boxShadow: '0 28px 70px rgba(44,74,92,.25)', border: '1.5px solid rgba(154,179,202,.25)', padding: '28px 26px', textAlign: 'left' }}>
        <button onClick={onClose} aria-label={t('Close')} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', fontSize: 20, color: '#8aa4b0', cursor: 'pointer' }}>✕</button>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 40 }}>{emoji}</div>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 400, color: '#2c4a5c', margin: '10px 0 8px' }}>{t('Thank you! Your crew is on its way.')}</h2>
            <p style={{ fontSize: 14, color: '#6a8a98', lineHeight: 1.65, margin: '0 0 18px' }}>{t('We check every new crew to keep everyone safe. You will get a notification when it is approved.')}</p>
            <button onClick={onClose} style={{ ...pillBtn(false), padding: '10px 28px', fontSize: 13 }}>{t('Done')}</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h2 className="font-display" style={{ fontSize: 26, fontWeight: 400, color: '#2c4a5c', margin: 0 }}>{t('Start a new crew')}</h2>
              <p style={{ fontSize: 13, color: '#6a8a98', margin: '6px 0 0', lineHeight: 1.55 }}>{t('A crew is a chat room around something you care about. Every new crew is checked before it appears.')}</p>
            </div>
            <label style={lbl}>{t('Crew name')}
              <input value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder={t('e.g. Art & Doodles')} style={{ ...field, marginTop: 6, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }} />
            </label>
            <label style={lbl}>{t('What is it about?')}
              <textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={200} rows={3} placeholder={t('e.g. Share what you are drawing, writing or making. All skill levels welcome.')} style={{ ...field, marginTop: 6, resize: 'vertical', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }} />
            </label>
            <div>
              <div style={lbl}>{t('Pick an emoji')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CREW_EMOJIS.map(em => (
                  <button type="button" key={em} onClick={() => setEmoji(em)} aria-pressed={emoji === em}
                    style={{ width: 38, height: 38, fontSize: 20, borderRadius: 12, cursor: 'pointer', background: emoji === em ? 'rgba(154,179,202,.35)' : 'rgba(255,255,255,.7)', border: emoji === em ? '2px solid #7a9ab0' : '1.5px solid rgba(154,179,202,.35)' }}>{em}</button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: '#5a4020', background: 'rgba(196,154,66,.1)', border: '1px solid rgba(196,154,66,.28)', borderRadius: 12, padding: '9px 12px', lineHeight: 1.55 }}>
              📌 {t('Crews should be kind and safe. No numbers about weight, calories or sizes, and no diet tips.')}
            </div>
            {error && <div role="alert" style={{ fontSize: 13, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '9px 14px' }}>{error}</div>}
            <button type="submit" disabled={busy} style={{ ...pillBtn(false), padding: '12px 24px', fontSize: 14, opacity: busy ? 0.6 : 1 }}>{busy ? t('Sending…') : t('Send for approval')}</button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function CrewRooms({ user, onLogin, decor, waves }: Props) {
  const { t, tr } = useI18n()
  const demo = !supabase
  const me: ChatUser | null = user ?? (demo ? { id: 'demo', sailor: 'GuestSailor' } : null)

  const [rooms, setRooms] = useState<Room[]>(demo ? DEMO_ROOMS : [])
  const [joined, setJoined] = useState<Set<string>>(new Set())
  const [active, setActive] = useState<Room | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!demo)
  const [reported, setReported] = useState<Set<string>>(new Set())
  const [replyTo, setReplyTo] = useState<Msg | null>(null)
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastSent = useRef(0)
  const idRef = useRef(1000)
  const listRef = useRef<HTMLDivElement>(null)

  // Load the room list (also used after you start a crew, to show it as "waiting")
  const loadRooms = useCallback(() => {
    const sb = supabase
    if (!sb) return
    sb.from('rooms')
      .select('id,name,description,emoji,status,room_members(count)')
      .order('sort_order')
      .then(({ data, error }: {
        data: { id: string; name: string; description: string; emoji: string; status?: string; room_members: { count: number }[] }[] | null
        error: unknown
      }) => {
        if (error) setError(t("Could not load the crews. Try refreshing the page."))
        else setRooms((data ?? []).map((r) => ({ id: r.id, name: r.name, description: r.description, emoji: r.emoji, members: r.room_members?.[0]?.count ?? 0, pending: r.status === 'pending' })))
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { loadRooms() }, [loadRooms])

  // Which crews I have joined
  useEffect(() => {
    const sb = supabase
    if (!sb || !user) { setJoined(new Set()); return }
    sb.from('room_members').select('room_id').eq('user_id', user.id)
      .then(({ data }: { data: { room_id: string }[] | null }) => setJoined(new Set((data ?? []).map((r) => r.room_id as string))))
  }, [user?.id])

  // Messages for the open room (+ live updates)
  useEffect(() => {
    setMsgs([]); setError(''); setInput(''); setReplyTo(null)
    if (!active) return
    const sb = supabase
    if (!sb) { setMsgs(DEMO_MSGS[active.id] ?? []); return }
    const roomId = active.id
    let cancelled = false
    sb.from('messages').select(MSG_COLS).eq('room_id', roomId)
      .order('created_at', { ascending: false }).limit(100)
      .then(({ data, error }: { data: any[] | null; error: unknown }) => {
        if (cancelled) return
        if (error) setError(t("Could not load messages."))
        else setMsgs((data ?? []).slice().reverse().map(toMsg))
      })
    const channel = sb.channel(`room-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, async (payload: any) => {
        const { data } = await sb.from('messages').select(MSG_COLS).eq('id', payload.new.id).single()
        if (data && !cancelled) setMsgs(m => (m.some(x => x.id === String((data as any).id)) ? m : [...m, toMsg(data)]))
      })
      .subscribe()
    return () => { cancelled = true; sb.removeChannel(channel) }
  }, [active?.id])

  // Keep the newest message in view (scrolls the chat box, not the whole page)
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs])

  function bump(roomId: string, d: number) {
    setRooms(rs => rs.map(r => (r.id === roomId ? { ...r, members: Math.max(0, r.members + d) } : r)))
    setActive(a => (a && a.id === roomId ? { ...a, members: Math.max(0, a.members + d) } : a))
  }

  async function join(room: Room) {
    setError('')
    const sb = supabase
    if (!sb) { setJoined(j => new Set(j).add(room.id)); bump(room.id, 1); setActive(a => a ?? room); return }
    if (!user) { onLogin(); return }
    const { error } = await sb.from('room_members').insert({ room_id: room.id, user_id: user.id })
    if (error && error.code !== '23505') { setError(t("Could not join. Please try again.")); return }
    setJoined(j => new Set(j).add(room.id)); bump(room.id, 1)
    setActive(a => a ?? room)   // go straight into the chat
  }

  async function leave(room: Room) {
    setError('')
    const sb = supabase
    if (!sb) { setJoined(j => { const n = new Set(j); n.delete(room.id); return n }); bump(room.id, -1); return }
    if (!user) return
    const { error } = await sb.from('room_members').delete().eq('room_id', room.id).eq('user_id', user.id)
    if (error) { setError(t("Could not leave. Please try again.")); return }
    setJoined(j => { const n = new Set(j); n.delete(room.id); return n }); bump(room.id, -1)
  }

  async function send() {
    const text = input.trim()
    if (!text || !active) return
    if (!me) { onLogin(); return }
    if (Date.now() - lastSent.current < 2000) { setError(t("Easy there, sailor. Wait a moment between messages.")); return }
    lastSent.current = Date.now()
    setError(''); setInput('')
    const sb = supabase
    if (!sb) {
      setMsgs(m => [...m, { id: String(idRef.current++), userId: me.id, sailor: me.sailor, text, time: fmt(new Date().toISOString()), replyTo: replyTo?.id ?? null }])
      setReplyTo(null)
      return
    }
    const row: Record<string, unknown> = { room_id: active.id, user_id: me.id, body: text }
    if (replyTo) row.reply_to = Number(replyTo.id)
    const { data, error } = await sb.from('messages').insert(row).select(MSG_COLS).single()
    if (error || !data) { setError(t("Your message did not send. Make sure you have joined this crew.")); setInput(text); return }
    setReplyTo(null)
    setMsgs(m => (m.some(x => x.id === String((data as any).id)) ? m : [...m, toMsg(data)]))
  }

  // Put "@Name " in the box so the sailor gets a tag notification.
  function tag(name: string) {
    setInput(v => {
      const mention = `@${name} `
      if (v.includes(mention)) return v
      return (v && !v.endsWith(' ') ? v + ' ' : v) + mention
    })
    inputRef.current?.focus()
  }

  function startReply(m: Msg) {
    setReplyTo(m)
    inputRef.current?.focus()
  }

  // Shows @Name tags in bold, for sailors who have spoken in this room.
  function withTags(text: string) {
    const names = Array.from(new Set(msgs.map(m => m.sailor))).filter(n => text.includes('@' + n)).sort((a, b) => b.length - a.length)
    if (names.length === 0) return text
    const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp('(@(?:' + names.map(esc).join('|') + ')(?![A-Za-z0-9_]))', 'g')
    return text.split(re).map((part, i) => (i % 2 === 1 ? <b key={i} style={{ color: '#5a6a9a' }}>{part}</b> : part))
  }

  async function report(m: Msg) {
    setReported(s => new Set(s).add(m.id))
    if (!supabase || !user) return
    await supabase.from('reports').insert({ message_id: Number(m.id), reporter_id: user.id })
  }

  const inRoom = !!active && joined.has(active.id)

  return (
    <section id="chat" style={{ position: 'relative', background: 'linear-gradient(180deg,#f8f3ee 0%,#E0D8D0 45%,#dfeaeb 100%)', padding: '100px 24px 130px', overflow: 'hidden' }}>
      {decor}
      <div style={{ maxWidth: active ? 760 : 960, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ fontSize: 12, letterSpacing: '.2em', color: '#5a7a82', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>{t("Anonymous crew rooms")}</div>
          <h2 className="font-display" style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 400, color: '#2c4a5c', marginBottom: 16, lineHeight: 1.2 }}>
            {tr("Find your <i>crew</i>")}
          </h2>
          <p style={{ fontSize: 15, color: '#6a8a98', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 20px' }}>
            {t("Pick a crew that fits how today feels. Every sailor here understands the storm.")}
          </p>
          {me ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.65)', border: '1px solid rgba(154,179,202,.25)', borderRadius: 50, padding: '8px 20px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: colorFor(me.sailor), boxShadow: `0 0 8px ${colorFor(me.sailor)}` }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2c4a5c' }}>{t("You are: {name}", { name: me.sailor })}</span>
            </div>
          ) : (
            <button onClick={onLogin} style={{ ...pillBtn(false), padding: '10px 24px', fontSize: 13 }}>{t("Log in to join the conversation")}</button>
          )}
          {!demo && me && !active && (
            <div style={{ marginTop: 14 }}>
              <button onClick={() => setCreating(true)} style={{ ...pillBtn(true), background: 'rgba(255,255,255,.8)', color: '#3a5a72', border: '1.5px solid rgba(154,179,202,.5)', padding: '9px 20px', fontSize: 13 }}>＋ {t("Start a new crew")}</button>
            </div>
          )}
        </div>

        {!active ? (
          <>
            {loading && <div style={{ textAlign: 'center', color: '#6a8a98', fontSize: 14 }}>{t("Loading the crews…")}</div>}
            {!loading && rooms.length === 0 && <div style={{ textAlign: 'center', color: '#6a8a98', fontSize: 14 }}>No crews yet. Run the setup SQL to add some.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
              {rooms.map(room => (
                <div key={room.id} className="res-card" role="button" tabIndex={0}
                  onClick={() => { if (!room.pending) setActive(room) }} onKeyDown={e => { if (e.key === 'Enter' && !room.pending) setActive(room) }}
                  style={{ background: 'rgba(255,255,255,.72)', borderRadius: 20, padding: 24, backdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 26 }}>{room.emoji}</span>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#2c4a5c' }}>{t(room.name)}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#6a8a98', lineHeight: 1.6, flex: 1 }}>{t(room.description)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#8aa4b0' }}>{t("{n} sailors", { n: room.members })}</span>
                    {room.pending
                      ? <span style={{ fontSize: 12, fontWeight: 700, color: '#7a6a40', background: 'rgba(196,154,66,.14)', borderRadius: 50, padding: '6px 14px' }}>{t("Waiting for approval")}</span>
                      : <button onClick={e => { e.stopPropagation(); joined.has(room.id) ? setActive(room) : join(room) }} style={pillBtn(joined.has(room.id))}>
                          {joined.has(room.id) ? t("Open") : t("Join")}
                        </button>}
                  </div>
                </div>
              ))}
            </div>
            {demo && <p style={{ textAlign: 'center', fontSize: 12, color: '#8a9aaa', marginTop: 18 }}>Preview mode: messages stay on this device until login is connected.</p>}
            {error && <p style={{ textAlign: 'center', fontSize: 13, color: '#8a5a5a', marginTop: 14 }}>{error}</p>}
            {creating && createPortal(<NewCrewModal onClose={() => setCreating(false)} onDone={loadRooms} />, document.body)}
          </>
        ) : (
          <div style={{ background: 'rgba(255,255,255,.65)', border: '1.5px solid rgba(154,179,202,.22)', borderRadius: 24, overflow: 'hidden', backdropFilter: 'blur(12px)', boxShadow: '0 8px 40px rgba(44,74,92,.08)' }}>
            <div style={{ padding: '14px 20px', background: 'linear-gradient(90deg,rgba(224,216,208,.6),rgba(198,221,237,.6))', borderBottom: '1px solid rgba(154,179,202,.15)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', color: '#5a7a92', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Nunito,sans-serif', padding: 0 }}>{t("← All crews")}</button>
              <span style={{ fontSize: 20 }}>{active.emoji}</span>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#2c4a5c' }}>{t(active.name)}</div>
                <div style={{ fontSize: 11, color: '#6a8a98' }}>{t("{n} sailors", { n: active.members })}</div>
              </div>
              <button onClick={() => (inRoom ? leave(active) : join(active))} style={pillBtn(inRoom)}>{inRoom ? t("Joined ✓") : t("Join crew")}</button>
            </div>

            <div style={{ margin: '14px 20px 0', padding: '10px 14px', borderRadius: 14, background: 'rgba(196,154,66,.1)', border: '1px solid rgba(196,154,66,.28)', fontSize: 12.5, color: '#5a4020', lineHeight: 1.55 }}>
              📌 {t("Be kind, and keep numbers (weights, calories, sizes) out of the chat. If you are in danger, {crisis}. The Lighthouse section has more help.", { crisis: t("call or text 988 (US) or your local emergency number") })}
            </div>

            <div ref={listRef} style={{ height: 380, overflowY: 'auto', padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {msgs.length === 0 && <div style={{ margin: 'auto', color: '#8a9aaa', fontSize: 14, textAlign: 'center' }}>{t("It's quiet in here. Say hello 👋")}</div>}
              {msgs.map(msg => {
                const isMe = !!me && msg.userId === me.id
                const color = colorFor(msg.sailor)
                return (
                  <div key={msg.id} className="chat-msg" style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${color},rgba(198,221,237,.5))`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚓</div>
                    <div style={{ maxWidth: '72%' }}>
                      <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 4, textAlign: isMe ? 'right' : 'left' }}>
                        {!isMe && me && inRoom
                          ? <button onClick={() => tag(msg.sailor)} title={t("Tag this sailor")} style={{ background: 'none', border: 'none', padding: 0, color, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>{msg.sailor}</button>
                          : msg.sailor}
                      </div>
                      {msg.replyTo && (() => {
                        const parent = msgs.find(x => x.id === msg.replyTo)
                        return (
                          <div style={{ fontSize: 11.5, color: '#7a8a98', background: 'rgba(154,179,202,.14)', borderLeft: '3px solid rgba(154,179,202,.6)', borderRadius: 8, padding: '4px 8px', marginBottom: 4, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            ↪ {parent ? `${parent.sailor}: ${parent.text}` : t("Replying to an earlier message")}
                          </div>
                        )
                      })()}
                      <div style={{ background: isMe ? `${color}18` : 'rgba(255,255,255,.7)', border: isMe ? `1px solid ${color}30` : '1px solid rgba(154,179,202,.2)', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', fontSize: 14, color: '#2c4a5c', lineHeight: 1.55, wordBreak: 'break-word' }}>{withTags(msg.text)}</div>
                      <div style={{ fontSize: 10, color: '#9aaab0', marginTop: 4, textAlign: isMe ? 'right' : 'left', display: 'flex', gap: 10, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <span>{msg.time}</span>
                        {!isMe && me && inRoom && <button onClick={() => startReply(msg)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 10, color: '#7a9ab0', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Nunito,sans-serif' }}>{t("Reply")}</button>}
                        {!isMe && me && (reported.has(msg.id)
                          ? <span>{t("Reported. Thank you.")}</span>
                          : <button onClick={() => report(msg)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 10, color: '#9aaab0', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Nunito,sans-serif' }}>{t("Report")}</button>)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {error && <div role="alert" style={{ padding: '0 20px 8px', fontSize: 12.5, color: '#8a5a5a' }}>{error}</div>}

            {replyTo && inRoom && (
              <div style={{ margin: '0 16px', padding: '8px 12px', background: 'rgba(154,179,202,.16)', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: '#4a6a82' }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>↪ {t("Replying to {name}", { name: replyTo.sailor })}: {replyTo.text}</span>
                <button onClick={() => setReplyTo(null)} aria-label={t("Cancel reply")} style={{ background: 'none', border: 'none', color: '#8aa4b0', cursor: 'pointer', fontSize: 15 }}>✕</button>
              </div>
            )}
            <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(154,179,202,.12)', display: 'flex', gap: 10, background: 'rgba(248,243,238,.4)', alignItems: 'center' }}>
              {!me ? (
                <>
                  <span style={{ flex: 1, fontSize: 13, color: '#6a8a98' }}>{t("Log in to join the conversation.")}</span>
                  <button onClick={onLogin} style={pillBtn(false)}>{t("Log in")}</button>
                </>
              ) : !inRoom ? (
                <>
                  <span style={{ flex: 1, fontSize: 13, color: '#6a8a98' }}>{t("Join this crew to chat.")}</span>
                  <button onClick={() => join(active)} style={pillBtn(false)}>{t("Join crew")}</button>
                </>
              ) : (
                <>
                  <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} placeholder={t("Send a message to your crew…")} maxLength={280}
                    style={{ flex: 1, background: 'rgba(255,255,255,.75)', border: '1.5px solid rgba(154,179,202,.22)', borderRadius: 50, padding: '10px 20px', fontSize: 14, color: '#2c4a5c', outline: 'none', fontFamily: 'Nunito,sans-serif', transition: 'border-color .2s' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(154,179,202,.55)' }} onBlur={e => { e.target.style.borderColor = 'rgba(154,179,202,.22)' }} />
                  <button onClick={send} disabled={!input.trim()}
                    style={{ background: input.trim() ? 'linear-gradient(135deg,#9AB3CA,#7a9ab0)' : 'rgba(154,179,202,.18)', color: input.trim() ? 'white' : '#9aaab0', border: 'none', borderRadius: 50, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: input.trim() ? 'pointer' : 'default', fontFamily: 'Nunito,sans-serif', transition: 'all .2s' }}>{t("Send ⛵")}</button>
                </>
              )}
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: '#8a9aaa', marginTop: 14, lineHeight: 1.6 }}>{t("Safe, anonymous peer support, not a substitute for professional help. Be kind 💙")}</p>
      </div>
      {waves}
    </section>
  )
}
