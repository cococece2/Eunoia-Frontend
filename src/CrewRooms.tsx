import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from './lib/supabase'

export type ChatUser = { id: string; sailor: string }
type Room = { id: string; name: string; description: string; emoji: string; members: number }
type Msg = { id: string; userId: string | null; sailor: string; text: string; time: string }

const COLORS = ['#7a9ab0', '#6a8a9a', '#8a7a9a', '#6a8a78', '#9a8a6a', '#8a7070', '#7090a8', '#6a7a88']
const colorFor = (name: string) => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}
const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const MSG_COLS = 'id,user_id,body,created_at,profiles(sailor_name)'
const toMsg = (r: any): Msg => ({
  id: String(r.id),
  userId: r.user_id,
  sailor: r.profiles?.sailor_name ?? 'Sailor',
  text: r.body,
  time: fmt(r.created_at),
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
    { id: 'd1', userId: 'x1', sailor: 'CoralDrifter_47', text: 'Hey everyone 👋 Just found this place. Really needed it today.', time: '9:14 AM' },
    { id: 'd2', userId: 'x2', sailor: 'TealHarbor_22', text: "Welcome 💙 We're all sailing together here, no judgment.", time: '9:15 AM' },
  ],
  wins: [
    { id: 'w1', userId: 'x3', sailor: 'MoonRipple_31', text: 'I ate lunch with my family for the first time in months 🌊 Small win.', time: '9:31 AM' },
    { id: 'w2', userId: 'x2', sailor: 'TealHarbor_22', text: 'THAT IS HUGE 🎉 Please be proud of yourself.', time: '9:32 AM' },
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

export default function CrewRooms({ user, onLogin, decor, waves }: Props) {
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
  const lastSent = useRef(0)
  const idRef = useRef(1000)
  const listRef = useRef<HTMLDivElement>(null)

  // Load the room list
  useEffect(() => {
    const sb = supabase
    if (!sb) return
    let cancelled = false
    sb.from('rooms')
      .select('id,name,description,emoji,room_members(count)')
      .order('sort_order')
      .then(({ data, error }: { data: any[] | null; error: unknown }) => {
        if (cancelled) return
        if (error) setError('Could not load the crews. Try refreshing the page.')
        else setRooms((data ?? []).map((r: any) => ({ id: r.id, name: r.name, description: r.description, emoji: r.emoji, members: r.room_members?.[0]?.count ?? 0 })))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Which crews I have joined
  useEffect(() => {
    const sb = supabase
    if (!sb || !user) { setJoined(new Set()); return }
    sb.from('room_members').select('room_id').eq('user_id', user.id)
      .then(({ data }: { data: any[] | null }) => setJoined(new Set((data ?? []).map((r: any) => r.room_id as string))))
  }, [user?.id])

  // Messages for the open room (+ live updates)
  useEffect(() => {
    setMsgs([]); setError(''); setInput('')
    if (!active) return
    const sb = supabase
    if (!sb) { setMsgs(DEMO_MSGS[active.id] ?? []); return }
    const roomId = active.id
    let cancelled = false
    sb.from('messages').select(MSG_COLS).eq('room_id', roomId)
      .order('created_at', { ascending: false }).limit(100)
      .then(({ data, error }: { data: any[] | null; error: any }) => {
        if (cancelled) return
        if (error) setError('Could not load messages.')
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
    if (!sb) { setJoined(j => new Set(j).add(room.id)); bump(room.id, 1); return }
    if (!user) { onLogin(); return }
    const { error } = await sb.from('room_members').insert({ room_id: room.id, user_id: user.id })
    if (error && error.code !== '23505') { setError('Could not join. Please try again.'); return }
    setJoined(j => new Set(j).add(room.id)); bump(room.id, 1)
  }

  async function leave(room: Room) {
    setError('')
    const sb = supabase
    if (!sb) { setJoined(j => { const n = new Set(j); n.delete(room.id); return n }); bump(room.id, -1); return }
    if (!user) return
    const { error } = await sb.from('room_members').delete().eq('room_id', room.id).eq('user_id', user.id)
    if (error) { setError('Could not leave. Please try again.'); return }
    setJoined(j => { const n = new Set(j); n.delete(room.id); return n }); bump(room.id, -1)
  }

  async function send() {
    const text = input.trim()
    if (!text || !active) return
    if (!me) { onLogin(); return }
    if (Date.now() - lastSent.current < 2000) { setError('Easy there, sailor. Wait a moment between messages.'); return }
    lastSent.current = Date.now()
    setError(''); setInput('')
    const sb = supabase
    if (!sb) {
      setMsgs(m => [...m, { id: String(idRef.current++), userId: me.id, sailor: me.sailor, text, time: fmt(new Date().toISOString()) }])
      return
    }
    const { data, error } = await sb.from('messages').insert({ room_id: active.id, user_id: me.id, body: text }).select(MSG_COLS).single()
    if (error || !data) { setError('Your message did not send. Make sure you have joined this crew.'); setInput(text); return }
    setMsgs(m => (m.some(x => x.id === String((data as any).id)) ? m : [...m, toMsg(data)]))
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
          <div style={{ fontSize: 12, letterSpacing: '.2em', color: '#5a7a82', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>Anonymous crew rooms</div>
          <h2 className="font-display" style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 400, color: '#2c4a5c', marginBottom: 16, lineHeight: 1.2 }}>
            Find your <em style={{ fontStyle: 'italic', color: '#7a6a5a' }}>crew</em>
          </h2>
          <p style={{ fontSize: 15, color: '#6a8a98', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 20px' }}>
            Pick a crew that fits how today feels. Every sailor here understands the storm.
          </p>
          {me ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.65)', border: '1px solid rgba(154,179,202,.25)', borderRadius: 50, padding: '8px 20px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: colorFor(me.sailor), boxShadow: `0 0 8px ${colorFor(me.sailor)}` }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2c4a5c' }}>You are: {me.sailor}</span>
            </div>
          ) : (
            <button onClick={onLogin} style={{ ...pillBtn(false), padding: '10px 24px', fontSize: 13 }}>Log in to join the conversation</button>
          )}
        </div>

        {!active ? (
          <>
            {loading && <div style={{ textAlign: 'center', color: '#6a8a98', fontSize: 14 }}>Loading the crews…</div>}
            {!loading && rooms.length === 0 && <div style={{ textAlign: 'center', color: '#6a8a98', fontSize: 14 }}>No crews yet. Run the setup SQL to add some.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
              {rooms.map(room => (
                <div key={room.id} className="res-card" role="button" tabIndex={0}
                  onClick={() => setActive(room)} onKeyDown={e => { if (e.key === 'Enter') setActive(room) }}
                  style={{ background: 'rgba(255,255,255,.72)', borderRadius: 20, padding: 24, backdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 26 }}>{room.emoji}</span>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#2c4a5c' }}>{room.name}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#6a8a98', lineHeight: 1.6, flex: 1 }}>{room.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#8aa4b0' }}>{room.members} sailors</span>
                    <button onClick={e => { e.stopPropagation(); joined.has(room.id) ? leave(room) : join(room) }} style={pillBtn(joined.has(room.id))}>
                      {joined.has(room.id) ? 'Joined ✓' : 'Join'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {demo && <p style={{ textAlign: 'center', fontSize: 12, color: '#8a9aaa', marginTop: 18 }}>Preview mode: messages stay on this device until login is connected.</p>}
            {error && <p style={{ textAlign: 'center', fontSize: 13, color: '#8a5a5a', marginTop: 14 }}>{error}</p>}
          </>
        ) : (
          <div style={{ background: 'rgba(255,255,255,.65)', border: '1.5px solid rgba(154,179,202,.22)', borderRadius: 24, overflow: 'hidden', backdropFilter: 'blur(12px)', boxShadow: '0 8px 40px rgba(44,74,92,.08)' }}>
            <div style={{ padding: '14px 20px', background: 'linear-gradient(90deg,rgba(224,216,208,.6),rgba(198,221,237,.6))', borderBottom: '1px solid rgba(154,179,202,.15)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', color: '#5a7a92', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Nunito,sans-serif', padding: 0 }}>← All crews</button>
              <span style={{ fontSize: 20 }}>{active.emoji}</span>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#2c4a5c' }}>{active.name}</div>
                <div style={{ fontSize: 11, color: '#6a8a98' }}>{active.members} sailors</div>
              </div>
              <button onClick={() => (inRoom ? leave(active) : join(active))} style={pillBtn(inRoom)}>{inRoom ? 'Joined ✓' : 'Join crew'}</button>
            </div>

            <div style={{ margin: '14px 20px 0', padding: '10px 14px', borderRadius: 14, background: 'rgba(196,154,66,.1)', border: '1px solid rgba(196,154,66,.28)', fontSize: 12.5, color: '#5a4020', lineHeight: 1.55 }}>
              📌 Be kind, and keep numbers (weights, calories, sizes) out of the chat. If you are in danger, call or text 988 (US) or your local emergency number. The Lighthouse section has more help.
            </div>

            <div ref={listRef} style={{ height: 380, overflowY: 'auto', padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {msgs.length === 0 && <div style={{ margin: 'auto', color: '#8a9aaa', fontSize: 14, textAlign: 'center' }}>It's quiet in here. Say hello 👋</div>}
              {msgs.map(msg => {
                const isMe = !!me && msg.userId === me.id
                const color = colorFor(msg.sailor)
                return (
                  <div key={msg.id} className="chat-msg" style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${color},rgba(198,221,237,.5))`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚓</div>
                    <div style={{ maxWidth: '72%' }}>
                      <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 4, textAlign: isMe ? 'right' : 'left' }}>{msg.sailor}</div>
                      <div style={{ background: isMe ? `${color}18` : 'rgba(255,255,255,.7)', border: isMe ? `1px solid ${color}30` : '1px solid rgba(154,179,202,.2)', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', fontSize: 14, color: '#2c4a5c', lineHeight: 1.55, wordBreak: 'break-word' }}>{msg.text}</div>
                      <div style={{ fontSize: 10, color: '#9aaab0', marginTop: 4, textAlign: isMe ? 'right' : 'left', display: 'flex', gap: 10, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <span>{msg.time}</span>
                        {!isMe && me && (reported.has(msg.id)
                          ? <span>Reported. Thank you.</span>
                          : <button onClick={() => report(msg)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 10, color: '#9aaab0', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Nunito,sans-serif' }}>Report</button>)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {error && <div role="alert" style={{ padding: '0 20px 8px', fontSize: 12.5, color: '#8a5a5a' }}>{error}</div>}

            <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(154,179,202,.12)', display: 'flex', gap: 10, background: 'rgba(248,243,238,.4)', alignItems: 'center' }}>
              {!me ? (
                <>
                  <span style={{ flex: 1, fontSize: 13, color: '#6a8a98' }}>Log in to join the conversation.</span>
                  <button onClick={onLogin} style={pillBtn(false)}>Log in</button>
                </>
              ) : !inRoom ? (
                <>
                  <span style={{ flex: 1, fontSize: 13, color: '#6a8a98' }}>Join this crew to chat.</span>
                  <button onClick={() => join(active)} style={pillBtn(false)}>Join crew</button>
                </>
              ) : (
                <>
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} placeholder="Send a message to your crew…" maxLength={280}
                    style={{ flex: 1, background: 'rgba(255,255,255,.75)', border: '1.5px solid rgba(154,179,202,.22)', borderRadius: 50, padding: '10px 20px', fontSize: 14, color: '#2c4a5c', outline: 'none', fontFamily: 'Nunito,sans-serif', transition: 'border-color .2s' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(154,179,202,.55)' }} onBlur={e => { e.target.style.borderColor = 'rgba(154,179,202,.22)' }} />
                  <button onClick={send} disabled={!input.trim()}
                    style={{ background: input.trim() ? 'linear-gradient(135deg,#9AB3CA,#7a9ab0)' : 'rgba(154,179,202,.18)', color: input.trim() ? 'white' : '#9aaab0', border: 'none', borderRadius: 50, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: input.trim() ? 'pointer' : 'default', fontFamily: 'Nunito,sans-serif', transition: 'all .2s' }}>Send ⛵</button>
                </>
              )}
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: '#8a9aaa', marginTop: 14, lineHeight: 1.6 }}>Safe, anonymous peer support, not a substitute for professional help. Be kind 💙</p>
      </div>
      {waves}
    </section>
  )
}
