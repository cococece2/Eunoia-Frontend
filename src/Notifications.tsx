import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from './lib/supabase'
import { useI18n } from './i18n'

export type NotificationKind = 'reply' | 'mention' | 'message_hidden' | 'moderator_note' | 'crew_approved' | 'crew_declined'

export type Notice = {
  id: number
  kind: NotificationKind
  from_name: string | null
  room_name: string | null
  snippet: string | null
  note: string | null
  read: boolean
  created_at: string
}

/** The signed-in person's notifications, newest first, plus how many are unread. */
export function useNotifications(uid: string | undefined) {
  const [items, setItems] = useState<Notice[]>([])

  const refresh = useCallback(async () => {
    if (!supabase || !uid) { setItems([]); return }
    const { data } = await supabase.from('notifications')
      .select('id,kind,from_name,room_name,snippet,note,read,created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setItems(data as Notice[])
  }, [uid])

  useEffect(() => {
    refresh()
    const sb = supabase
    // Live: a new notification arrives while the site is open.
    const channel = sb && uid
      ? sb.channel(`notifications-${uid}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => { refresh() })
          .subscribe()
      : null
    // Also refresh when the tab comes back into view, in case live updates were asleep.
    const onFocus = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
      if (sb && channel) sb.removeChannel(channel)
    }
  }, [refresh, uid])

  const markRead = useCallback(async () => {
    if (!supabase || !uid) return
    await supabase.rpc('mark_notifications_read')
    setItems(xs => xs.map(x => ({ ...x, read: true })))
  }, [uid])

  return { items, unread: items.filter(x => !x.read).length, refresh, markRead }
}

const LOOK: Record<NotificationKind, { icon: string; color: string; bg: string }> = {
  reply:          { icon: '💬', color: '#3a5a72', bg: 'rgba(154,179,202,.22)' },
  mention:        { icon: '🏷️', color: '#6a5a8a', bg: 'rgba(138,122,154,.18)' },
  message_hidden: { icon: '🙈', color: '#8a5a5a', bg: 'rgba(138,90,90,.10)' },
  moderator_note: { icon: '⚓', color: '#7a6a40', bg: 'rgba(196,154,66,.14)' },
  crew_approved:  { icon: '🎉', color: '#3e6a55', bg: 'rgba(106,138,120,.16)' },
  crew_declined:  { icon: '🌊', color: '#7a6a40', bg: 'rgba(196,154,66,.14)' },
}

function fmtWhen(iso: string) {
  try { return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

function NoticeItem({ n, isNew, onGo }: { n: Notice; isNew: boolean; onGo: () => void }) {
  const { t } = useI18n()
  const look = LOOK[n.kind]
  const name = n.from_name ?? t('Someone')
  const title =
    n.kind === 'reply' ? t('{name} replied to your message', { name })
    : n.kind === 'mention' ? t('{name} tagged you', { name })
    : n.kind === 'message_hidden' ? t('One of your messages was hidden')
    : n.kind === 'crew_approved' ? t('Your crew was approved')
    : n.kind === 'crew_declined' ? t('Your crew was not approved this time')
    : t('A note from the crew moderators')
  const hiddenWhy = t("It didn't fit our crew guidelines: be kind, and keep numbers about weight, calories or sizes out of the chat. Thank you for understanding.")
  return (
    <li style={{ listStyle: 'none', background: isNew ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.55)', border: `1.5px solid ${isNew ? 'rgba(154,179,202,.6)' : 'rgba(154,179,202,.22)'}`, borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ background: look.bg, color: look.color, borderRadius: 50, padding: '3px 10px', fontSize: 12.5, fontWeight: 700 }}>{look.icon} {title}</span>
        {isNew && <span style={{ background: '#c0504d', color: 'white', borderRadius: 50, padding: '2px 8px', fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>{t('New')}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#8a9aaa' }}>{fmtWhen(n.created_at)}</span>
      </div>
      {(n.kind === 'crew_approved' || n.kind === 'crew_declined') && n.room_name && (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#3a4a5a', fontWeight: 700 }}>{n.room_name}</p>
      )}
      {n.kind === 'crew_approved' && <div style={{ marginTop: 6, fontSize: 12.5, color: '#4a6a58' }}>{t('It is live now, and you have joined it. Thank you for building the crew.')}</div>}
      {n.snippet && (
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#3a4a5a', borderLeft: '3px solid rgba(154,179,202,.5)', paddingLeft: 10, wordBreak: 'break-word' }}>“{n.snippet}”</p>
      )}
      {n.kind === 'message_hidden' && <div style={{ marginTop: 8, fontSize: 12.5, color: '#6a5050', lineHeight: 1.55 }}>{hiddenWhy}</div>}
      {n.note && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: '#4a5a6a', background: 'rgba(154,179,202,.14)', borderRadius: 10, padding: '8px 12px', lineHeight: 1.55, wordBreak: 'break-word' }}>
          <b>{t('Note from the moderators:')}</b> {n.note}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        {n.room_name && n.kind !== 'crew_approved' && n.kind !== 'crew_declined' && <span style={{ fontSize: 12, color: '#8a9aaa' }}>{t(n.room_name)}</span>}
        {(n.kind === 'reply' || n.kind === 'mention') && (
          <a href="#chat" onClick={onGo} style={{ fontSize: 12.5, fontWeight: 700, color: '#5a7a92', textDecoration: 'none' }}>{t('Go to the crew chat →')}</a>
        )}
      </div>
    </li>
  )
}

function NotificationsPanel({ items, newIds, onClose }: { items: Notice[]; newIds: Set<number>; onClose: () => void }) {
  const { t } = useI18n()
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="scroll-modal-wrap" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="animate-fade-in-up" role="dialog" aria-modal="true" aria-label={t('Notifications')}
        style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#f8f3ee 0%,#dfeaeb 100%)', borderRadius: 24, boxShadow: '0 28px 70px rgba(44,74,92,.25)', border: '1.5px solid rgba(154,179,202,.25)', textAlign: 'left' }}>
        <div style={{ padding: '26px 26px 12px', position: 'relative' }}>
          <button onClick={onClose} aria-label={t('Close')} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', fontSize: 20, color: '#8aa4b0', cursor: 'pointer' }}>✕</button>
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 400, color: '#2c4a5c', margin: 0 }}>{t('Notifications')}</h2>
          <p style={{ fontSize: 13, color: '#6a8a98', margin: '6px 0 0', lineHeight: 1.55 }}>{t('Replies, tags, and notes from the crew moderators show up here.')}</p>
        </div>
        <ul style={{ margin: 0, padding: '6px 26px 26px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.length === 0
            ? <li style={{ listStyle: 'none', textAlign: 'center', color: '#6a8a98', fontSize: 14, padding: '30px 0' }}>{t('No notifications yet.')}</li>
            : items.map(n => <NoticeItem key={n.id} n={n} isNew={newIds.has(n.id)} onGo={onClose} />)}
        </ul>
      </div>
    </div>
  )
}

/** Nav button for signed-in people: 🔔 Notifications, with a red number for unread ones. */
export function NotificationsButton({ uid, style }: { uid: string; style: CSSProperties }) {
  const { t } = useI18n()
  const { items, unread, refresh, markRead } = useNotifications(uid)
  const [open, setOpen] = useState(false)
  const [newIds, setNewIds] = useState<Set<number>>(new Set())
  const [nudgeDismissed, setNudgeDismissed] = useState(false)

  async function openPanel() {
    await refresh()
    setOpen(true)
    setNudgeDismissed(true)
  }

  // Remember which were new when the panel opened (so they stay highlighted), then mark them read.
  useEffect(() => {
    if (!open) return
    const ids = new Set(items.filter(x => !x.read).map(x => x.id))
    if (ids.size) { setNewIds(ids); markRead() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!supabase) return null
  const showNudge = unread > 0 && !nudgeDismissed && !open

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={openPanel} style={{ ...style, position: 'relative' }} aria-label={unread ? t('Notifications ({n} new)', { n: unread }) : t('Notifications')}>
        🔔 {t('Notifications')}
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: '#c0504d', color: 'white', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', boxShadow: '0 2px 6px rgba(0,0,0,.2)' }}>{unread}</span>
        )}
      </button>
      {showNudge && (
        <div role="status" className="animate-fade-in-up" style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 240, background: 'white', color: '#2c4a5c', borderRadius: 14, padding: '12px 14px', fontSize: 13, lineHeight: 1.5, boxShadow: '0 12px 30px rgba(44,74,92,.2)', border: '1px solid rgba(154,179,202,.3)', textTransform: 'none', letterSpacing: 0 }}>
          <button onClick={() => setNudgeDismissed(true)} aria-label={t('Close')} style={{ position: 'absolute', top: 4, right: 8, background: 'none', border: 'none', color: '#8aa4b0', cursor: 'pointer', fontSize: 14 }}>✕</button>
          <div style={{ fontWeight: 700, marginBottom: 4, paddingRight: 14 }}>{t('🔔 You have new notifications')}</div>
          <button onClick={openPanel} style={{ background: 'none', border: 'none', padding: 0, color: '#5a7a92', fontWeight: 700, cursor: 'pointer', fontSize: 12.5, fontFamily: 'Nunito,sans-serif' }}>{t('See them →')}</button>
        </div>
      )}
      {open && createPortal(<NotificationsPanel items={items} newIds={newIds} onClose={() => { setOpen(false); setNewIds(new Set()) }} />, document.body)}
    </div>
  )
}
