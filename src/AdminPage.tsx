import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { supabase } from './lib/supabase'
import type { LetterStatus } from './MyLetters'

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

function ReviewQueue({ email, onSignOut }: { email?: string; onSignOut: () => void }) {
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
  return <ReviewQueue email={session.user.email} onSignOut={signOut} />
}
