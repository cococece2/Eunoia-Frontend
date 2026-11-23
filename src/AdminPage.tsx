import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { supabase } from './lib/supabase'
import type { LetterStatus } from './MyLetters'
import { RISKY, RISKY_MESSAGE } from './safety'

// The admin area lives at  <site>/#/admin . It has its own login and only works for
// accounts listed in the `admins` table (see db/03-letter-review.sql in the backend repo).
// The database itself enforces this, so hiding the page is not what keeps it safe.

type AdminLetter = {
  id: number
  body: string
  status: LetterStatus
  review_note: string | null
  reviewed_at: string | null
  created_at: string
  profiles?: { sailor_name?: string | null } | { sailor_name?: string | null }[] | null
}

type Session = { user: { id: string; email?: string } } | null

const BG = 'linear-gradient(180deg,#dfeaeb 0%,#C6DDED 55%,#9AB3CA 100%)'
const card: CSSProperties = { background: 'linear-gradient(180deg,#f8f3ee 0%,#eef3f2 100%)', borderRadius: 20, border: '1.5px solid rgba(154,179,202,.28)', boxShadow: '0 14px 40px rgba(44,74,92,.12)' }
const input: CSSProperties = { width: '100%', background: 'rgba(255,255,255,.85)', border: '1.5px solid rgba(154,179,202,.3)', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#2c4a5c', outline: 'none', fontFamily: 'Nunito,sans-serif' }
const btn = (bg: string, color = 'white'): CSSProperties => ({ background: bg, color, border: 'none', borderRadius: 50, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' })
const GOOD = 'linear-gradient(135deg,#7aa58e,#5d8a72)'
const BAD = 'linear-gradient(135deg,#c08080,#a06060)'
const SOFT = 'rgba(154,179,202,.2)'

const TABS: { id: LetterStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

const sailor = (l: AdminLetter) => (Array.isArray(l.profiles) ? l.profiles[0] : l.profiles)?.sailor_name ?? 'A sailor'
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '')

function Shell({ children, onSignOut, email }: { children: React.ReactNode; onSignOut?: () => void; email?: string }) {
  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Nunito,sans-serif', color: '#2c4a5c' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '16px clamp(16px,4vw,32px)', borderBottom: '1px solid rgba(154,179,202,.3)', background: 'rgba(223,234,235,.8)', backdropFilter: 'blur(10px)' }}>
        <div className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>⚓ Eunora <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#6a8a98', marginLeft: 6 }}>Admin</span></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {email && <span style={{ fontSize: 12.5, color: '#6a8a98' }}>{email}</span>}
          <a href="#" style={{ ...btn(SOFT, '#3a5a72'), textDecoration: 'none' }}>← Back to site</a>
          {onSignOut && <button onClick={onSignOut} style={btn(SOFT, '#3a5a72')}>Log out</button>}
        </div>
      </header>
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '28px 16px 60px' }}>{children}</main>
    </div>
  )
}

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(/invalid login/i.test(error.message) ? 'That email and password do not match.' : error.message)
  }
  return (
    <Shell>
      <form onSubmit={submit} style={{ ...card, maxWidth: 400, margin: '40px auto 0', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 400, margin: 0, textAlign: 'center' }}>Admin login</h1>
        <p style={{ fontSize: 13.5, color: '#6a8a98', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.55 }}>Review letters before they float out to sea.</p>
        {!supabase && <div style={{ fontSize: 13, color: '#5a4020', background: 'rgba(196,154,66,.12)', borderRadius: 12, padding: '9px 14px' }}>Supabase keys are not set, so login can't work yet.</div>}
        <label style={{ fontSize: 12, fontWeight: 700, color: '#5a7a82', letterSpacing: '.06em', textTransform: 'uppercase' }}>Email
          <input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} style={{ ...input, marginTop: 6 }} />
        </label>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#5a7a82', letterSpacing: '.06em', textTransform: 'uppercase' }}>Password
          <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={{ ...input, marginTop: 6 }} />
        </label>
        {error && <div role="alert" style={{ fontSize: 13, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '9px 14px' }}>{error}</div>}
        <button type="submit" disabled={busy || !supabase} style={{ ...btn('linear-gradient(135deg,#9AB3CA,#7a9ab0)'), padding: '13px 0', fontSize: 15, opacity: busy ? 0.6 : 1 }}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </Shell>
  )
}

function LetterCard({ letter, onReview }: { letter: AdminLetter; onReview: (id: number, decision: 'approved' | 'rejected', note: string) => Promise<string | null> }) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function act(decision: 'approved' | 'rejected') {
    setBusy(true); setError('')
    const err = await onReview(letter.id, decision, note)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <article style={{ ...card, padding: '18px 20px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 10 }}>
        <b style={{ fontSize: 15 }}>{sailor(letter)}</b>
        <span style={{ fontSize: 12, color: '#8a9aaa' }}>written {when(letter.created_at)}</span>
        {letter.reviewed_at && <span style={{ fontSize: 12, color: '#8a9aaa' }}>· reviewed {when(letter.reviewed_at)}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8a9aaa' }}>{letter.body.length} chars</span>
      </div>
      <p style={{ margin: 0, fontFamily: 'Georgia,serif', fontSize: 14.5, lineHeight: 1.75, color: '#3a2a1a', whiteSpace: 'pre-line', background: 'rgba(255,255,255,.6)', borderRadius: 12, padding: '12px 14px' }}>{letter.body}</p>
      {letter.review_note && <div style={{ marginTop: 10, fontSize: 13, color: '#4a5a6a' }}><b>Note sent to writer:</b> {letter.review_note}</div>}

      {noteOpen && (
        <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Optional note the writer will see, e.g. why it couldn't be shared"
          style={{ ...input, marginTop: 12, resize: 'vertical', fontSize: 13.5 }} />
      )}
      {error && <div role="alert" style={{ marginTop: 10, fontSize: 13, color: '#8a5a5a' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        {letter.status !== 'approved' && <button disabled={busy} onClick={() => act('approved')} style={btn(GOOD)}>{letter.status === 'rejected' ? 'Approve after all' : 'Approve'}</button>}
        {letter.status !== 'rejected' && <button disabled={busy} onClick={() => act('rejected')} style={btn(BAD)}>{letter.status === 'approved' ? 'Unpublish' : 'Reject'}</button>}
        <button onClick={() => setNoteOpen(o => !o)} style={btn('transparent', '#5a7a92')}>{noteOpen ? 'Hide note' : '+ Add a note for the writer'}</button>
      </div>
    </article>
  )
}

function ReviewQueue({ email, onSignOut, switcher }: { email?: string; onSignOut: () => void; switcher?: React.ReactNode }) {
  const [tab, setTab] = useState<LetterStatus>('pending')
  const [letters, setLetters] = useState<AdminLetter[] | null>(null)
  const [counts, setCounts] = useState<Record<LetterStatus, number>>({ pending: 0, approved: 0, rejected: 0 })
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    setError('')
    const [list, ...cs] = await Promise.all([
      sb.from('letters').select('id,body,status,review_note,reviewed_at,created_at,profiles(sailor_name)')
        .eq('status', tab).order('created_at', { ascending: tab === 'pending' }).limit(200),
      ...TABS.map(t => sb.from('letters').select('id', { count: 'exact', head: true }).eq('status', t.id)),
    ])
    if (list.error) { setError(list.error.message); return }
    setLetters(list.data as AdminLetter[])
    setCounts({ pending: cs[0].count ?? 0, approved: cs[1].count ?? 0, rejected: cs[2].count ?? 0 })
  }, [tab])

  useEffect(() => { setLetters(null); load() }, [load])

  async function review(id: number, decision: 'approved' | 'rejected', note: string) {
    if (!supabase) return 'Not connected.'
    const { error } = await supabase.rpc('review_letter', { letter_id: id, decision, note: note.trim() || null })
    if (error) return error.message
    setFlash(decision === 'approved' ? 'Approved. It is now in the bottles carousel, and the writer has been notified.' : 'Rejected. The writer has been notified.')
    setTimeout(() => setFlash(''), 4000)
    setLetters(ls => ls?.filter(l => l.id !== id) ?? null)
    load()
    return null
  }

  return (
    <Shell email={email} onSignOut={onSignOut}>
      {switcher}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <h1 className="font-display" style={{ fontSize: 30, fontWeight: 400, margin: 0 }}>Letters in bottles</h1>
        <button onClick={load} style={{ ...btn(SOFT, '#3a5a72'), marginLeft: 'auto' }}>↻ Refresh</button>
      </div>
      <div role="tablist" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            style={{ ...btn(tab === t.id ? 'white' : 'rgba(255,255,255,.45)', tab === t.id ? '#2c4a5c' : '#5a7a92'), border: `1.5px solid ${tab === t.id ? '#9AB3CA' : 'rgba(154,179,202,.3)'}` }}>
            {t.label} <span style={{ opacity: .7 }}>({counts[t.id]})</span>
          </button>
        ))}
      </div>
      {flash && <div role="status" style={{ marginBottom: 14, fontSize: 13.5, color: '#3e6a55', background: 'rgba(106,138,120,.16)', borderRadius: 12, padding: '10px 14px' }}>{flash}</div>}
      {error && <div role="alert" style={{ marginBottom: 14, fontSize: 13.5, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '10px 14px' }}>{error}</div>}
      {letters === null
        ? <p style={{ color: '#6a8a98' }}>Loading…</p>
        : letters.length === 0
          ? <div style={{ ...card, padding: '40px 20px', textAlign: 'center', color: '#6a8a98' }}>{tab === 'pending' ? 'All caught up. No letters are waiting.' : `No ${tab} letters yet.`}</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{letters.map(l => <LetterCard key={l.id} letter={l} onReview={review} />)}</div>}
    </Shell>
  )
}

// ── Bonus challenges (the gumball machine) ───────────────────────────────────
type ChallengeRow = {
  id: number
  body: string
  translations: Record<string, string> | null
  active: boolean
  created_at: string
}

const TRANSLATION_FIELDS = [
  { code: 'ja', label: '日本語 (Japanese)' },
  { code: 'es', label: 'Español (Spanish)' },
  { code: 'fr', label: 'Français (French)' },
  { code: 'zh', label: '简体中文 (Chinese)' },
  { code: 'ko', label: '한국어 (Korean)' },
] as const

// A simple safety net that matches the site's rules: no numbers about weight, food or body size,
// and nothing about diets, fasting or exercise tips. It cannot catch everything, so still read what you write.
type Section = 'letters' | 'flagged' | 'crews' | 'daily' | 'bonus'

function SectionTabs({ section, onChange }: { section: Section; onChange: (s: Section) => void }) {
  const tab = (id: Section, label: string) => (
    <button key={id} onClick={() => onChange(id)} aria-pressed={section === id}
      style={{ ...btn(section === id ? 'white' : 'rgba(255,255,255,.45)', section === id ? '#2c4a5c' : '#5a7a92'), border: `1.5px solid ${section === id ? '#9AB3CA' : 'rgba(154,179,202,.3)'}` }}>{label}</button>
  )
  return <nav aria-label="Admin sections" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>{tab('letters', 'Letters')}{tab('flagged', 'Flagged messages')}{tab('crews', 'Crew requests')}{tab('daily', 'Daily tasks')}{tab('bonus', 'Bonus challenges')}</nav>
}

function TranslationFields({ tr, setTr }: { tr: Record<string, string>; setTr: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12.5, color: '#6a8a98', lineHeight: 1.5 }}>Leave a language empty and visitors in that language will see the English text.</div>
      {TRANSLATION_FIELDS.map(f => (
        <label key={f.code} style={{ fontSize: 12, fontWeight: 700, color: '#5a7a82' }}>{f.label}
          <textarea value={tr[f.code] ?? ''} onChange={e => setTr(t => ({ ...t, [f.code]: e.target.value }))} maxLength={300} rows={2}
            style={{ ...input, marginTop: 4, resize: 'vertical', fontSize: 14, fontWeight: 400 }} />
        </label>
      ))}
    </div>
  )
}

function ChallengeForm({ initialBody = '', initialTranslations = {}, saveLabel, onSave, onCancel }: {
  initialBody?: string
  initialTranslations?: Record<string, string>
  saveLabel: string
  onSave: (body: string, translations: Record<string, string>) => Promise<string | null>
  onCancel?: () => void
}) {
  const [body, setBody] = useState(initialBody)
  const [tr, setTr] = useState<Record<string, string>>(initialTranslations)
  const [showTr, setShowTr] = useState(Object.keys(initialTranslations).length > 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (text.length < 5) { setError('Write at least a few words.'); return }
    const clean: Record<string, string> = {}
    for (const f of TRANSLATION_FIELDS) { const v = (tr[f.code] ?? '').trim(); if (v) clean[f.code] = v }
    if ([text, ...Object.values(clean)].some(v => RISKY.test(v))) { setError(RISKY_MESSAGE); return }
    setBusy(true); setError('')
    const err = await onSave(text, clean)
    setBusy(false)
    if (err) { setError(err); return }
    if (!onCancel) { setBody(''); setTr({}); setShowTr(false) }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#5a7a82', letterSpacing: '.06em', textTransform: 'uppercase' }}>Challenge (English)
        <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={300} rows={2} required
          placeholder="e.g. Write down one thing that made you smile today."
          style={{ ...input, marginTop: 6, resize: 'vertical', fontSize: 14, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }} />
      </label>
      <div style={{ fontSize: 12, color: '#8a9aaa' }}>{body.trim().length}/300 · Keep it gentle. No numbers (weights, calories, sizes), no diet or exercise tips.</div>
      <button type="button" onClick={() => setShowTr(o => !o)} style={{ ...btn('transparent', '#5a7a92'), alignSelf: 'flex-start', padding: '4px 0' }}>
        {showTr ? '− Hide translations' : '+ Add translations (optional)'}
      </button>
      {showTr && <TranslationFields tr={tr} setTr={setTr} />}
      {error && <div role="alert" style={{ fontSize: 13, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '9px 14px' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="submit" disabled={busy} style={{ ...btn(GOOD), opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : saveLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} style={btn(SOFT, '#3a5a72')}>Cancel</button>}
      </div>
    </form>
  )
}

function BonusChallenges({ email, onSignOut, switcher }: { email?: string; onSignOut: () => void; switcher: React.ReactNode }) {
  const [rows, setRows] = useState<ChallengeRow[] | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    setError('')
    const { data, error } = await sb.from('bonus_challenges')
      .select('id,body,translations,active,created_at').order('id', { ascending: true })
    if (error) { setError(error.message.includes('bonus_challenges') ? 'The bonus_challenges table is missing. Run 04-bonus-challenges.sql in Supabase first.' : error.message); setRows([]); return }
    setRows(data as ChallengeRow[])
  }, [])

  useEffect(() => { load() }, [load])

  function say(msg: string) { setFlash(msg); setTimeout(() => setFlash(''), 4500) }

  async function add(body: string, translations: Record<string, string>) {
    if (!supabase) return 'Not connected.'
    const { error } = await supabase.from('bonus_challenges').insert({ body, translations })
    if (error) return error.message
    say('Added. Visitors will see it in the gumball machine the next time they open the site.')
    await load()
    return null
  }
  async function save(id: number, body: string, translations: Record<string, string>) {
    if (!supabase) return 'Not connected.'
    const { error } = await supabase.from('bonus_challenges').update({ body, translations }).eq('id', id)
    if (error) return error.message
    setEditing(null)
    say('Saved.')
    await load()
    return null
  }
  async function toggle(row: ChallengeRow) {
    if (!supabase) return
    const { error } = await supabase.from('bonus_challenges').update({ active: !row.active }).eq('id', row.id)
    if (error) { setError(error.message); return }
    say(row.active ? 'Hidden. It will not show in the gumball machine.' : 'Showing again.')
    await load()
  }
  async function remove(row: ChallengeRow) {
    if (!supabase) return
    if (!window.confirm('Delete this challenge for good? (Hiding it is the safer choice.)')) return
    const { error } = await supabase.from('bonus_challenges').delete().eq('id', row.id)
    if (error) { setError(error.message); return }
    say('Deleted.')
    await load()
  }

  const activeCount = rows?.filter(r => r.active).length ?? 0

  return (
    <Shell email={email} onSignOut={onSignOut}>
      {switcher}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <h1 className="font-display" style={{ fontSize: 30, fontWeight: 400, margin: 0 }}>Bonus challenges</h1>
        <button onClick={load} style={{ ...btn(SOFT, '#3a5a72'), marginLeft: 'auto' }}>↻ Refresh</button>
      </div>
      <p style={{ margin: '0 0 18px', fontSize: 14, color: '#6a8a98', lineHeight: 1.6 }}>These are the quests inside the gumball machine. Changes show up for visitors the next time they open the site. No update needed.</p>

      {flash && <div role="status" style={{ marginBottom: 14, fontSize: 13.5, color: '#3e6a55', background: 'rgba(106,138,120,.16)', borderRadius: 12, padding: '10px 14px' }}>{flash}</div>}
      {error && <div role="alert" style={{ marginBottom: 14, fontSize: 13.5, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '10px 14px' }}>{error}</div>}

      <section style={{ ...card, padding: '20px 22px', marginBottom: 22 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Add a new challenge</h2>
        <ChallengeForm saveLabel="Add challenge" onSave={add} />
      </section>

      {rows !== null && rows.length > 0 && activeCount === 0 && (
        <div role="status" style={{ marginBottom: 14, fontSize: 13.5, color: '#5a4020', background: 'rgba(196,154,66,.14)', borderRadius: 12, padding: '10px 14px' }}>Nothing is showing right now, so the site uses its built-in challenges instead. Show at least one below.</div>
      )}

      {rows === null
        ? <p style={{ color: '#6a8a98' }}>Loading…</p>
        : rows.length === 0
          ? <div style={{ ...card, padding: '30px 20px', textAlign: 'center', color: '#6a8a98' }}>No challenges yet. The site is using its built-in ones. Add your first above.</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rows.map(r => (
                <article key={r.id} style={{ ...card, padding: '16px 20px', opacity: r.active ? 1 : 0.65 }}>
                  {editing === r.id ? (
                    <ChallengeForm initialBody={r.body} initialTranslations={r.translations ?? {}} saveLabel="Save changes"
                      onSave={(b, t) => save(r.id, b, t)} onCancel={() => setEditing(null)} />
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{r.body}</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
                        {!r.active && <span style={{ fontSize: 12, fontWeight: 700, color: '#8a5a5a', background: 'rgba(138,90,90,.1)', borderRadius: 50, padding: '3px 10px' }}>Hidden</span>}
                        {r.translations && Object.keys(r.translations).length > 0 && <span style={{ fontSize: 12, color: '#6a8a98' }}>Translated: {Object.keys(r.translations).join(', ')}</span>}
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={() => setEditing(r.id)} style={btn(SOFT, '#3a5a72')}>Edit</button>
                          <button onClick={() => toggle(r)} style={btn(SOFT, '#3a5a72')}>{r.active ? 'Hide' : 'Show'}</button>
                          <button onClick={() => remove(r)} style={btn(BAD)}>Delete</button>
                        </span>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
    </Shell>
  )
}

// ── Flagged messages (chat messages people have reported) ─────────────────────
type Flagged = {
  message_id: number
  body: string
  room_name: string
  author_id: string
  author_name: string | null
  hidden: boolean
  report_count: number
  last_reported: string
  review_status: 'kept' | 'hidden' | null
  reviewed_at: string | null
  created_at: string
}

function FlaggedCard({ m, onDecide }: { m: Flagged; onDecide: (id: number, decision: 'keep' | 'hide', note: string) => Promise<string | null> }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const when = (iso: string) => { try { return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

  async function go(decision: 'keep' | 'hide') {
    setBusy(true); setError('')
    const err = await onDecide(m.message_id, decision, note)
    setBusy(false)
    if (err) setError(err)
  }

  const pending = !m.reviewed_at || new Date(m.last_reported) > new Date(m.reviewed_at)
  return (
    <article style={{ ...card, padding: '16px 20px' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#8a5a5a', background: 'rgba(138,90,90,.1)', borderRadius: 50, padding: '3px 10px' }}>🚩 {m.report_count} {m.report_count === 1 ? 'report' : 'reports'}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: m.hidden ? '#8a5a5a' : '#3e6a55', background: m.hidden ? 'rgba(138,90,90,.1)' : 'rgba(106,138,120,.16)', borderRadius: 50, padding: '3px 10px' }}>{m.hidden ? 'Hidden from the chat' : 'Visible in the chat'}</span>
        {m.reviewed_at && <span style={{ fontSize: 12, color: '#6a8a98' }}>{pending ? 'Reported again after your review' : `You ${m.review_status === 'hidden' ? 'hid it' : 'kept it'} · ${when(m.reviewed_at)}`}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8a9aaa' }}>last reported {when(m.last_reported)}</span>
      </div>
      <p style={{ margin: '0 0 6px', fontSize: 15, lineHeight: 1.6, color: '#2c3a46', background: 'rgba(154,179,202,.12)', borderRadius: 12, padding: '10px 14px', wordBreak: 'break-word' }}>{m.body}</p>
      <div style={{ fontSize: 12.5, color: '#6a8a98', marginBottom: 12 }}>By <b>{m.author_name ?? 'a sailor'}</b> in {m.room_name} · {when(m.created_at)}</div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#5a7a82', letterSpacing: '.06em', textTransform: 'uppercase' }}>
        Note to the sailor (optional)
        <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={2}
          placeholder="e.g. Thanks for being part of the crew. Please keep numbers about weight and food out of the chat."
          style={{ ...input, marginTop: 6, resize: 'vertical', fontSize: 14, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }} />
      </label>
      <div style={{ fontSize: 12, color: '#8a9aaa', margin: '6px 0 12px', lineHeight: 1.5 }}>
        They get a notification if you hide the message or write a note. They are never told who reported them.
      </div>
      {error && <div role="alert" style={{ fontSize: 13, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '9px 14px', marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button disabled={busy} onClick={() => go('keep')} style={{ ...btn(GOOD), opacity: busy ? 0.6 : 1 }}>{note.trim() ? 'Keep message + send note' : 'Keep message'}</button>
        <button disabled={busy} onClick={() => go('hide')} style={{ ...btn(BAD), opacity: busy ? 0.6 : 1 }}>{note.trim() ? 'Hide message + send note' : 'Hide message + notify'}</button>
      </div>
    </article>
  )
}

function FlaggedMessages({ email, onSignOut, switcher }: { email?: string; onSignOut: () => void; switcher: React.ReactNode }) {
  const [rows, setRows] = useState<Flagged[] | null>(null)
  const [pendingOnly, setPendingOnly] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    setError('')
    const { data, error } = await sb.rpc('admin_flagged_messages', { only_pending: pendingOnly })
    if (error) { setError(error.message.includes('admin_flagged_messages') ? 'The flagged-messages tools are missing. Run 06-notifications.sql in Supabase first.' : error.message); setRows([]); return }
    setRows((data ?? []) as Flagged[])
  }, [pendingOnly])

  useEffect(() => { load() }, [load])

  async function decide(id: number, decision: 'keep' | 'hide', note: string) {
    if (!supabase) return 'Not connected.'
    const { error } = await supabase.rpc('review_message', { msg_id: id, decision, note: note.trim() || null })
    if (error) return error.message
    setFlash(decision === 'hide' ? 'Message hidden. The sailor has been notified.' : note.trim() ? 'Message kept. Your note was sent.' : 'Message kept.')
    setTimeout(() => setFlash(''), 5000)
    await load()
    return null
  }

  const pill = (on: boolean): CSSProperties => ({ ...btn(on ? GOOD : SOFT, on ? '#fff' : '#3a5a72') })
  return (
    <Shell email={email} onSignOut={onSignOut}>
      {switcher}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <h1 className="font-display" style={{ fontSize: 30, fontWeight: 400, margin: 0 }}>Flagged messages</h1>
        <button onClick={load} style={{ ...btn(SOFT, '#3a5a72'), marginLeft: 'auto' }}>↻ Refresh</button>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: '#6a8a98', lineHeight: 1.6 }}>
        Chat messages that sailors have reported. A message is hidden automatically after 3 reports, and you can hide or restore it here. Hidden messages disappear for everyone.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setPendingOnly(true)} style={pill(pendingOnly)}>Needs review</button>
        <button onClick={() => setPendingOnly(false)} style={pill(!pendingOnly)}>All reported</button>
      </div>
      {flash && <div role="status" style={{ marginBottom: 14, fontSize: 13.5, color: '#3e6a55', background: 'rgba(106,138,120,.16)', borderRadius: 12, padding: '10px 14px' }}>{flash}</div>}
      {error && <div role="alert" style={{ marginBottom: 14, fontSize: 13.5, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '10px 14px' }}>{error}</div>}
      {rows === null
        ? <p style={{ color: '#6a8a98' }}>Loading…</p>
        : rows.length === 0
          ? <div style={{ ...card, padding: '30px 20px', textAlign: 'center', color: '#6a8a98' }}>{pendingOnly ? 'Nothing to review. All clear. 🌊' : 'No messages have been reported yet.'}</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{rows.map(m => <FlaggedCard key={m.message_id} m={m} onDecide={decide} />)}</div>}
    </Shell>
  )
}

// ── Crew requests (chat crews that sailors want to start) ────────────────────
type CrewRequest = { id: string; name: string; description: string; emoji: string; creator_name: string | null; created_at: string }

function CrewRequestCard({ r, onDecide }: { r: CrewRequest; onDecide: (id: string, decision: 'approve' | 'decline', note: string) => Promise<string | null> }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function go(decision: 'approve' | 'decline') {
    setBusy(true); setError('')
    const err = await onDecide(r.id, decision, note)
    setBusy(false)
    if (err) setError(err)
  }
  const flagged = RISKY.test(r.name) || RISKY.test(r.description)
  return (
    <article style={{ ...card, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 30 }}>{r.emoji}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: '#2c4a5c', wordBreak: 'break-word' }}>{r.name}</div>
          <div style={{ fontSize: 12.5, color: '#6a8a98' }}>Asked by <b>{r.creator_name ?? 'a sailor'}</b> · {new Date(r.created_at).toLocaleDateString()}</div>
        </div>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 14.5, lineHeight: 1.6, background: 'rgba(154,179,202,.12)', borderRadius: 12, padding: '10px 14px', wordBreak: 'break-word' }}>{r.description}</p>
      {flagged && <div style={{ fontSize: 12.5, color: '#8a5a5a', marginBottom: 10 }}>⚠️ This mentions weight, food or diet words. Look closely before approving.</div>}
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#5a7a82', letterSpacing: '.06em', textTransform: 'uppercase' }}>
        Note to the sailor (optional)
        <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={2}
          placeholder="e.g. Love this idea! Or: Thanks, but we already have a crew like this."
          style={{ ...input, marginTop: 6, resize: 'vertical', fontSize: 14, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }} />
      </label>
      {error && <div role="alert" style={{ fontSize: 13, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '9px 14px', margin: '10px 0 0' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <button disabled={busy} onClick={() => go('approve')} style={{ ...btn(GOOD), opacity: busy ? 0.6 : 1 }}>Approve crew</button>
        <button disabled={busy} onClick={() => go('decline')} style={{ ...btn(BAD), opacity: busy ? 0.6 : 1 }}>Decline</button>
      </div>
    </article>
  )
}

function CrewRequests({ email, onSignOut, switcher }: { email?: string; onSignOut: () => void; switcher: React.ReactNode }) {
  const [rows, setRows] = useState<CrewRequest[] | null>(null)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    setError('')
    const { data, error } = await sb.rpc('admin_pending_rooms')
    if (error) { setError(error.message.includes('admin_pending_rooms') ? 'The crew request tools are missing. Run 07-crew-requests.sql in Supabase first.' : error.message); setRows([]); return }
    setRows((data ?? []) as CrewRequest[])
  }, [])
  useEffect(() => { load() }, [load])

  async function decide(id: string, decision: 'approve' | 'decline', note: string) {
    if (!supabase) return 'Not connected.'
    const { error } = await supabase.rpc('review_room', { p_room_id: id, p_decision: decision, p_note: note.trim() || null })
    if (error) return error.message
    setFlash(decision === 'approve' ? 'Crew approved. It is now live, and the sailor who started it has joined.' : 'Crew declined. The sailor has been notified.')
    setTimeout(() => setFlash(''), 5000)
    await load()
    return null
  }

  return (
    <Shell email={email} onSignOut={onSignOut}>
      {switcher}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <h1 className="font-display" style={{ fontSize: 30, fontWeight: 400, margin: 0 }}>Crew requests</h1>
        <button onClick={load} style={{ ...btn(SOFT, '#3a5a72'), marginLeft: 'auto' }}>↻ Refresh</button>
      </div>
      <p style={{ margin: '0 0 18px', fontSize: 14, color: '#6a8a98', lineHeight: 1.6 }}>
        Sailors can ask to start a new chat crew. Nothing goes live until you approve it. Approved crews appear for everyone, and the sailor who started it joins automatically.
      </p>
      {flash && <div role="status" style={{ marginBottom: 14, fontSize: 13.5, color: '#3e6a55', background: 'rgba(106,138,120,.16)', borderRadius: 12, padding: '10px 14px' }}>{flash}</div>}
      {error && <div role="alert" style={{ marginBottom: 14, fontSize: 13.5, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '10px 14px' }}>{error}</div>}
      {rows === null
        ? <p style={{ color: '#6a8a98' }}>Loading…</p>
        : rows.length === 0
          ? <div style={{ ...card, padding: '30px 20px', textAlign: 'center', color: '#6a8a98' }}>No crews are waiting. 🌊</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{rows.map(r => <CrewRequestCard key={r.id} r={r} onDecide={decide} />)}</div>}
    </Shell>
  )
}

// ── Daily tasks (the 6 cards in the quest log) ───────────────────────────────
type DailyRow = {
  id: number
  category: string
  body: string
  xp: number
  translations: Record<string, string> | null
  starts_on: string
  ends_on: string | null
}

const CATEGORIES = [
  { id: 'anchor', label: 'Anchor Points' },
  { id: 'wave', label: 'Wave Riders' },
  { id: 'crew', label: 'Crew Connection' },
  { id: 'nourish', label: 'Nourishment Quest' },
  { id: 'harbor', label: 'Calm Harbor' },
  { id: 'treasure', label: 'Treasure Hunt' },
] as const

const XP_CHOICES = [10, 15, 20, 25, 30]
const dayKey = (offset: number) => new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA')

function dailyStatus(r: DailyRow): { label: string; live: boolean } {
  const today = dayKey(0)
  if (r.ends_on && (r.ends_on <= today || r.ends_on <= r.starts_on)) return { label: 'Hidden', live: false }
  if (r.starts_on > today) return { label: `Starts ${r.starts_on}`, live: false }
  if (r.ends_on) return { label: `Ends ${r.ends_on}`, live: true }
  return { label: 'Live', live: true }
}

function DailyForm({ initial, saveLabel, onSave, onCancel }: {
  initial?: DailyRow
  saveLabel: string
  onSave: (v: { category: string; body: string; xp: number; translations: Record<string, string> }) => Promise<string | null>
  onCancel?: () => void
}) {
  const [category, setCategory] = useState<string>(initial?.category ?? 'anchor')
  const [body, setBody] = useState(initial?.body ?? '')
  const [xp, setXp] = useState(initial?.xp ?? 15)
  const [tr, setTr] = useState<Record<string, string>>(initial?.translations ?? {})
  const [showTr, setShowTr] = useState(Object.keys(initial?.translations ?? {}).length > 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (text.length < 5) { setError('Write at least a few words.'); return }
    const clean: Record<string, string> = {}
    for (const f of TRANSLATION_FIELDS) { const v = (tr[f.code] ?? '').trim(); if (v) clean[f.code] = v }
    if ([text, ...Object.values(clean)].some(v => RISKY.test(v))) { setError(RISKY_MESSAGE); return }
    setBusy(true); setError('')
    const err = await onSave({ category, body: text, xp, translations: clean })
    setBusy(false)
    if (err) { setError(err); return }
    if (!onCancel) { setBody(''); setTr({}); setShowTr(false) }
  }

  const label: CSSProperties = { fontSize: 12, fontWeight: 700, color: '#5a7a82', letterSpacing: '.06em', textTransform: 'uppercase' }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ ...label, flex: '1 1 200px' }}>Card
          <select value={category} onChange={e => setCategory(e.target.value)} disabled={!!initial} style={{ ...input, marginTop: 6, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label style={{ ...label, flex: '0 1 140px' }}>XP reward
          <select value={xp} onChange={e => setXp(Number(e.target.value))} style={{ ...input, marginTop: 6, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
            {XP_CHOICES.map(x => <option key={x} value={x}>{x} XP</option>)}
          </select>
        </label>
      </div>
      <label style={label}>Task (English)
        <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={200} rows={2} required
          placeholder="e.g. Text a friend a song that makes you happy"
          style={{ ...input, marginTop: 6, resize: 'vertical', fontSize: 14, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }} />
      </label>
      <div style={{ fontSize: 12, color: '#8a9aaa' }}>{body.trim().length}/200 · Keep it gentle. No numbers (weights, calories, sizes), no diet or exercise tips.</div>
      <button type="button" onClick={() => setShowTr(o => !o)} style={{ ...btn('transparent', '#5a7a92'), alignSelf: 'flex-start', padding: '4px 0' }}>
        {showTr ? '− Hide translations' : '+ Add translations (optional)'}
      </button>
      {showTr && <TranslationFields tr={tr} setTr={setTr} />}
      {error && <div role="alert" style={{ fontSize: 13, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '9px 14px' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="submit" disabled={busy} style={{ ...btn(GOOD), opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : saveLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} style={btn(SOFT, '#3a5a72')}>Cancel</button>}
      </div>
    </form>
  )
}

function DailyTasks({ email, onSignOut, switcher }: { email?: string; onSignOut: () => void; switcher: React.ReactNode }) {
  const [rows, setRows] = useState<DailyRow[] | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    setError('')
    const { data, error } = await sb.from('daily_quests')
      .select('id,category,body,xp,translations,starts_on,ends_on').order('id', { ascending: true })
    if (error) { setError(error.message.includes('daily_quests') ? 'The daily_quests table is missing. Run 05-daily-quests.sql in Supabase first.' : error.message); setRows([]); return }
    setRows(data as DailyRow[])
  }, [])

  useEffect(() => { load() }, [load])

  function say(msg: string) { setFlash(msg); setTimeout(() => setFlash(''), 5000) }

  async function add(v: { category: string; body: string; xp: number; translations: Record<string, string> }) {
    if (!supabase) return 'Not connected.'
    const { error } = await supabase.from('daily_quests').insert({ ...v, starts_on: dayKey(1) })
    if (error) return error.message
    say('Added. It joins the rotation tomorrow, so everyone keeps the same list today.')
    await load()
    return null
  }
  async function save(id: number, v: { category: string; body: string; xp: number; translations: Record<string, string> }) {
    if (!supabase) return 'Not connected.'
    const { error } = await supabase.from('daily_quests').update({ body: v.body, xp: v.xp, translations: v.translations }).eq('id', id)
    if (error) return error.message
    setEditing(null)
    say('Saved.')
    await load()
    return null
  }
  async function hide(r: DailyRow) {
    if (!supabase) return
    const end = r.starts_on > dayKey(0) ? r.starts_on : dayKey(1)
    const { error } = await supabase.from('daily_quests').update({ ends_on: end }).eq('id', r.id)
    if (error) { setError(error.message); return }
    say(r.starts_on > dayKey(0) ? 'Hidden. It will not start.' : 'Hidden from tomorrow.')
    await load()
  }
  async function show(r: DailyRow) {
    if (!supabase) return
    const { error } = await supabase.from('daily_quests').update({ ends_on: null }).eq('id', r.id)
    if (error) { setError(error.message); return }
    say('Showing again.')
    await load()
  }
  async function remove(r: DailyRow) {
    if (!supabase) return
    if (!window.confirm('Delete this task for good? Today\'s lists may change for people who are using the site right now. (Hiding it is the safer choice.)')) return
    const { error } = await supabase.from('daily_quests').delete().eq('id', r.id)
    if (error) { setError(error.message); return }
    say('Deleted.')
    await load()
  }

  return (
    <Shell email={email} onSignOut={onSignOut}>
      {switcher}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <h1 className="font-display" style={{ fontSize: 30, fontWeight: 400, margin: 0 }}>Daily tasks</h1>
        <button onClick={load} style={{ ...btn(SOFT, '#3a5a72'), marginLeft: 'auto' }}>↻ Refresh</button>
      </div>
      <p style={{ margin: '0 0 18px', fontSize: 14, color: '#6a8a98', lineHeight: 1.6 }}>
        Each card on the site shows 3 tasks a day, picked from a pool that rotates by date, so nobody sees the same list two days in a row. Tasks you add here join that pool, along with the ones built into the site.
        New tasks start <b>tomorrow</b> and hidden ones disappear tomorrow, so everyone keeps the same list all day.
      </p>

      {flash && <div role="status" style={{ marginBottom: 14, fontSize: 13.5, color: '#3e6a55', background: 'rgba(106,138,120,.16)', borderRadius: 12, padding: '10px 14px' }}>{flash}</div>}
      {error && <div role="alert" style={{ marginBottom: 14, fontSize: 13.5, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '10px 14px' }}>{error}</div>}

      <section style={{ ...card, padding: '20px 22px', marginBottom: 22 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Add a new daily task</h2>
        <DailyForm saveLabel="Add task" onSave={add} />
      </section>

      {rows === null
        ? <p style={{ color: '#6a8a98' }}>Loading…</p>
        : rows.length === 0
          ? <div style={{ ...card, padding: '30px 20px', textAlign: 'center', color: '#6a8a98' }}>You haven't added any tasks yet. The site is using its built-in ones.</div>
          : CATEGORIES.map(c => {
              const list = rows.filter(r => r.category === c.id)
              if (list.length === 0) return null
              return (
                <section key={c.id} style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: 15, margin: '0 0 10px', color: '#3a5a72' }}>{c.label}</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {list.map(r => {
                      const st = dailyStatus(r)
                      return (
                        <article key={r.id} style={{ ...card, padding: '14px 18px', opacity: st.live ? 1 : 0.65 }}>
                          {editing === r.id ? (
                            <DailyForm initial={r} saveLabel="Save changes" onSave={v => save(r.id, v)} onCancel={() => setEditing(null)} />
                          ) : (
                            <>
                              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{r.body}</p>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: st.live ? '#3e6a55' : '#8a5a5a', background: st.live ? 'rgba(106,138,120,.16)' : 'rgba(138,90,90,.1)', borderRadius: 50, padding: '3px 10px' }}>{st.label}</span>
                                <span style={{ fontSize: 12, color: '#6a8a98' }}>{r.xp} XP</span>
                                {r.translations && Object.keys(r.translations).length > 0 && <span style={{ fontSize: 12, color: '#6a8a98' }}>Translated: {Object.keys(r.translations).join(', ')}</span>}
                                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <button onClick={() => setEditing(r.id)} style={btn(SOFT, '#3a5a72')}>Edit</button>
                                  {r.ends_on ? <button onClick={() => show(r)} style={btn(SOFT, '#3a5a72')}>{st.live ? 'Keep showing' : 'Show'}</button>
                                    : <button onClick={() => hide(r)} style={btn(SOFT, '#3a5a72')}>Hide</button>}
                                  <button onClick={() => remove(r)} style={btn(BAD)}>Delete</button>
                                </span>
                              </div>
                            </>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            })}
    </Shell>
  )
}

function AdminArea({ email, onSignOut }: { email?: string; onSignOut: () => void }) {
  const [section, setSection] = useState<Section>('letters')
  const switcher = <SectionTabs section={section} onChange={setSection} />
  if (section === 'flagged') return <FlaggedMessages email={email} onSignOut={onSignOut} switcher={switcher} />
  if (section === 'crews') return <CrewRequests email={email} onSignOut={onSignOut} switcher={switcher} />
  if (section === 'daily') return <DailyTasks email={email} onSignOut={onSignOut} switcher={switcher} />
  if (section === 'bonus') return <BonusChallenges email={email} onSignOut={onSignOut} switcher={switcher} />
  return <ReviewQueue email={email} onSignOut={onSignOut} switcher={switcher} />
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | undefined>(undefined)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    const sb = supabase
    if (!sb) { setSession(null); return }
    sb.auth.getSession().then(({ data }: { data: { session: Session } }) => setSession(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e: string, s: Session) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  useEffect(() => {
    if (!supabase || !uid) { setIsAdmin(null); return }
    let cancelled = false
    supabase.rpc('is_admin').then(({ data }: { data: boolean | null }) => { if (!cancelled) setIsAdmin(!!data) })
    return () => { cancelled = true }
  }, [uid])

  const signOut = () => { supabase?.auth.signOut() }

  if (session === undefined) return <Shell><p style={{ color: '#6a8a98' }}>Loading…</p></Shell>
  if (!session) return <AdminLogin />
  if (isAdmin === null) return <Shell email={session.user.email} onSignOut={signOut}><p style={{ color: '#6a8a98' }}>Checking access…</p></Shell>
  if (!isAdmin) return (
    <Shell email={session.user.email} onSignOut={signOut}>
      <div style={{ ...card, maxWidth: 440, margin: '40px auto 0', padding: '30px 26px', textAlign: 'center' }}>
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 400, margin: '0 0 10px' }}>Not an admin account</h1>
        <p style={{ fontSize: 14, color: '#6a8a98', lineHeight: 1.6, margin: '0 0 18px' }}>You're logged in as {session.user.email ?? 'this account'}, which isn't on the admin list. Log out and sign in with your admin account.</p>
        <button onClick={signOut} style={btn('linear-gradient(135deg,#9AB3CA,#7a9ab0)')}>Log out</button>
      </div>
    </Shell>
  )
  return <AdminArea email={session.user.email} onSignOut={signOut} />
}
