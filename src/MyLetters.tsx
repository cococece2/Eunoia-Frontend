import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from './lib/supabase'
import { useI18n } from './i18n'

export type LetterStatus = 'pending' | 'approved' | 'rejected'

export type MyLetter = {
  id: number
  body: string
  status: LetterStatus
  review_note: string | null
  reviewed_at: string | null
  author_seen: boolean
  created_at: string
}

/** The signed-in person's own letters, newest first, plus how many have unread review news. */
export function useMyLetters(uid: string | undefined) {
  const [letters, setLetters] = useState<MyLetter[]>([])

  const refresh = useCallback(async () => {
    if (!supabase || !uid) { setLetters([]); return }
    const { data } = await supabase.from('letters')
      .select('id,body,status,review_note,reviewed_at,author_seen,created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setLetters(data as MyLetter[])
  }, [uid])

  // Load on login, and again whenever the tab comes back into focus, so a decision
  // made while they were away shows up without a reload.
  useEffect(() => {
    refresh()
    const onFocus = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => { document.removeEventListener('visibilitychange', onFocus); window.removeEventListener('focus', onFocus) }
  }, [refresh])

  const markSeen = useCallback(async () => {
    if (!supabase || !uid) return
    await supabase.rpc('mark_my_letters_seen')
    setLetters(ls => ls.map(l => ({ ...l, author_seen: true })))
  }, [uid])

  return { letters, unseen: letters.filter(l => !l.author_seen).length, refresh, markSeen }
}

const STATUS: Record<LetterStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:  { label: 'Waiting to be read', color: '#7a6a40', bg: 'rgba(196,154,66,.14)',  icon: '⏳' },
  approved: { label: 'Floating out to sea', color: '#3e6a55', bg: 'rgba(106,138,120,.16)', icon: '🍾' },
  rejected: { label: 'Not shared',          color: '#8a5a5a', bg: 'rgba(138,90,90,.10)',   icon: '✉️' },
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' }
}

function LetterItem({ letter, isNew }: { letter: MyLetter; isNew: boolean }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const s = STATUS[letter.status]
  const long = letter.body.length > 180
  return (
    <li style={{ listStyle: 'none', background: isNew ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.55)', border: `1.5px solid ${isNew ? 'rgba(154,179,202,.6)' : 'rgba(154,179,202,.22)'}`, borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ background: s.bg, color: s.color, borderRadius: 50, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{s.icon} {t(s.label)}</span>
        {isNew && <span style={{ background: '#c0504d', color: 'white', borderRadius: 50, padding: '2px 8px', fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>{t("New")}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#8a9aaa' }}>{fmtDate(letter.created_at)}</span>
      </div>
      <p style={{ margin: 0, fontFamily: 'Georgia,serif', fontSize: 13.5, lineHeight: 1.65, color: '#3a2a1a', whiteSpace: 'pre-line' }}>
        {expanded || !long ? letter.body : letter.body.slice(0, 180).trim() + '…'}
      </p>
      {long && (
        <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', padding: 0, marginTop: 6, color: '#5a7a92', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>
          {expanded ? t("Show less") : t("Read all")}
        </button>
      )}
      {letter.status === 'approved' && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: '#3e6a55', lineHeight: 1.55 }}>{t("Your letter is now in the Letters in Bottles section for everyone to read. Thank you.")}</div>
      )}
      {letter.status === 'rejected' && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: '#6a5050', lineHeight: 1.55 }}>{t("This letter couldn't be shared this time. You're always welcome to write another.")}</div>
      )}
      {letter.review_note && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: '#4a5a6a', background: 'rgba(154,179,202,.14)', borderRadius: 10, padding: '8px 12px', lineHeight: 1.55 }}>
          <b>{t("Note from the reviewer:")}</b> {letter.review_note}
        </div>
      )}
    </li>
  )
}

function MyLettersPanel({ letters, newIds, onClose }: { letters: MyLetter[]; newIds: Set<number>; onClose: () => void }) {
  const { t } = useI18n()
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="scroll-modal-wrap" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="animate-fade-in-up" role="dialog" aria-modal="true" aria-label={t("My letters")}
        style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#f8f3ee 0%,#dfeaeb 100%)', borderRadius: 24, boxShadow: '0 28px 70px rgba(44,74,92,.25)', border: '1.5px solid rgba(154,179,202,.25)', textAlign: 'left' }}>
        <div style={{ padding: '26px 26px 12px', position: 'relative' }}>
          <button onClick={onClose} aria-label={t("Close")} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', fontSize: 20, color: '#8aa4b0', cursor: 'pointer' }}>✕</button>
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 400, color: '#2c4a5c', margin: 0 }}>{t("My letters")}</h2>
          <p style={{ fontSize: 13, color: '#6a8a98', margin: '6px 0 0', lineHeight: 1.55 }}>{t("Every letter is read by a person before it floats out to sea. Here's where yours are.")}</p>
        </div>
        <ul style={{ margin: 0, padding: '6px 26px 26px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {letters.length === 0
            ? <li style={{ listStyle: 'none', textAlign: 'center', color: '#6a8a98', fontSize: 14, padding: '30px 0' }}>{t("You haven't sealed any bottles yet.")}</li>
            : letters.map(l => <LetterItem key={l.id} letter={l} isNew={newIds.has(l.id)} />)}
        </ul>
      </div>
    </div>
  )
}

/**
 * Nav button for signed-in people: "My letters" with a badge when a letter has been
 * approved or rejected since they last looked, plus a one-time nudge after login.
 */
export function MyLettersButton({ uid, style }: { uid: string; style: CSSProperties }) {
  const { t } = useI18n()
  const { letters, unseen, refresh, markSeen } = useMyLetters(uid)
  const [open, setOpen] = useState(false)
  const [newIds, setNewIds] = useState<Set<number>>(new Set())
  const [nudgeDismissed, setNudgeDismissed] = useState(false)

  async function openPanel() {
    await refresh()
    setOpen(true)
    setNudgeDismissed(true)
  }

  // Remember which ones were new when the panel opened (so they stay highlighted while
  // it's open), then mark them read in the database.
  useEffect(() => {
    if (!open) return
    const ids = new Set(letters.filter(l => !l.author_seen).map(l => l.id))
    if (ids.size) { setNewIds(ids); markSeen() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!supabase) return null
  const approved = letters.filter(l => !l.author_seen && l.status === 'approved').length
  const showNudge = unseen > 0 && !nudgeDismissed && !open

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={openPanel} style={{ ...style, position: 'relative' }} aria-label={unseen ? t("My letters ({n} new)", { n: unseen }) : t("My letters")}>
        ✉ {t("My letters")}
        {unseen > 0 && (
          <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: '#c0504d', color: 'white', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', boxShadow: '0 2px 6px rgba(0,0,0,.2)' }}>{unseen}</span>
        )}
      </button>
      {showNudge && (
        <div role="status" className="animate-fade-in-up" style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 250, background: 'white', color: '#2c4a5c', borderRadius: 14, padding: '12px 14px', fontSize: 13, lineHeight: 1.5, boxShadow: '0 12px 30px rgba(44,74,92,.2)', border: '1px solid rgba(154,179,202,.3)', textTransform: 'none', letterSpacing: 0 }}>
          <button onClick={() => setNudgeDismissed(true)} aria-label={t("Close")} style={{ position: 'absolute', top: 4, right: 8, background: 'none', border: 'none', color: '#8aa4b0', cursor: 'pointer', fontSize: 14 }}>✕</button>
          <div style={{ fontWeight: 700, marginBottom: 4, paddingRight: 14 }}>{approved > 0 ? t("🍾 Your letter is floating out to sea!") : t("✉️ A letter of yours has been read")}</div>
          <button onClick={openPanel} style={{ background: 'none', border: 'none', padding: 0, color: '#5a7a92', fontWeight: 700, cursor: 'pointer', fontSize: 12.5, fontFamily: 'Nunito,sans-serif' }}>{t("See my letters →")}</button>
        </div>
      )}
      {open && createPortal(<MyLettersPanel letters={letters} newIds={newIds} onClose={() => { setOpen(false); setNewIds(new Set()) }} />, document.body)}
    </div>
  )
}
