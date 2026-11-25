import { useState, type ReactNode } from 'react'
import { supabase } from './lib/supabase'
import { useI18n } from './i18n'

// A small anonymous comment box. Comments are saved with no name or user id, so nobody can tell who wrote them.
// Only the site admin can read them (#/admin → Comment box).

export default function CommentBox({ locked, onLocked, waves }: { locked: boolean; onLocked: () => void; waves?: ReactNode }) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (locked) { onLocked(); return }
    if (text.trim().length < 3) { setError(t('Write a few words first.')); return }
    if (!supabase) return
    setBusy(true); setError('')
    const { error: err } = await supabase.rpc('send_comment', { p_body: text.trim() })
    setBusy(false)
    if (err) { setError(err.message.includes('wait a minute') ? t('Please wait a minute before sending another comment.') : t('Could not send that. Please try again.')); return }
    setText(''); setSent(true)
  }

  return (
    <section id="feedback" style={{ position: 'relative', background: 'linear-gradient(180deg,#f8f3ee 0%,#f3ece4 60%,#e9e4dc 100%)', padding: '90px 24px 140px', overflow: 'hidden' }}>
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 480, margin: '0 auto', background: 'rgba(255,255,255,.78)', border: '1.5px solid rgba(154,179,202,.28)', borderRadius: 20, padding: '26px 24px', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
        <div style={{ fontSize: 30, marginBottom: 4 }} aria-hidden>💌</div>
        <h3 className="font-display" style={{ fontSize: 'clamp(22px,4vw,28px)', fontWeight: 400, color: '#2c4a5c', margin: '0 0 6px' }}>{t('Anonymous Comment Box')}</h3>
        <p style={{ fontSize: 14, color: '#6a8a98', lineHeight: 1.65, margin: '0 0 16px' }}>{t('Got an idea, a thought or something we could do better? Drop it in. Nobody can see who wrote it.')}</p>
        {sent ? (
          <div role="status" style={{ fontSize: 14.5, color: '#3e6a55', background: 'rgba(106,138,120,.16)', borderRadius: 14, padding: '14px 16px', lineHeight: 1.6 }}>
            {t('Thank you. Your comment was sent, and it is anonymous.')}
            <div><button onClick={() => setSent(false)} style={{ marginTop: 8, background: 'none', border: 'none', color: '#5a7a92', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, fontFamily: 'Nunito,sans-serif' }}>{t('Write another')}</button></div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea value={text} onChange={e => { setText(e.target.value); setError('') }} maxLength={1000} rows={4} aria-label={t('Your comment')} placeholder={t('Write your comment here…')}
              onFocus={() => { if (locked) onLocked() }}
              style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid rgba(154,179,202,.5)', borderRadius: 14, padding: '12px 14px', fontSize: 14.5, fontFamily: 'Nunito,sans-serif', background: 'rgba(255,255,255,.95)', color: '#2c4a5c', outline: 'none', resize: 'vertical', textAlign: 'left' }} />
            {error && <div role="alert" style={{ fontSize: 13, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '9px 14px' }}>{error}</div>}
            <button type="submit" disabled={busy} style={{ alignSelf: 'center', background: 'linear-gradient(135deg,#9AB3CA,#7a9ab0)', color: 'white', border: 'none', borderRadius: 50, padding: '11px 28px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito,sans-serif', opacity: busy ? 0.6 : 1 }}>{busy ? '…' : t('Send anonymously')}</button>
          </form>
        )}
        <p style={{ fontSize: 12.5, color: '#8a9aaa', lineHeight: 1.6, margin: '14px 0 0' }}>{t('We cannot reply to anonymous comments. If you need support right now, please see the Lighthouse section below.')}</p>
      </div>
      {waves}
    </section>
  )
}
