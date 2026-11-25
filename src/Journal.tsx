import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from './lib/supabase'
import { useI18n } from './i18n'

// Finishing a task means writing a few words about it. The answers go in a private journal only that sailor can read.

const MIN_CHARS = 3

/** Keeps the answer in the sailor's private journal. If the database isn't ready, the task still counts. */
export async function saveReflection(uid: string, quest: { id: string; text: string }, answer: string, day: string) {
  if (!supabase) return
  await supabase.from('quest_reflections').insert({ user_id: uid, quest_id: quest.id, quest_text: quest.text.slice(0, 300), answer: answer.slice(0, 600), day })
}

export function ReflectionModal({ questText, prompt, onSubmit, onCancel }: { questText: string; prompt: string; onSubmit: (answer: string) => void; onCancel: () => void }) {
  const { t } = useI18n()
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCancel])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (answer.trim().length < MIN_CHARS) { setError(t('Write a few words to finish this task.')); return }
    onSubmit(answer.trim())
  }

  return createPortal(
    <div className="scroll-modal-wrap" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <form onSubmit={submit} className="animate-fade-in-up" role="dialog" aria-modal="true" aria-label={t('Finish this task')}
        style={{ position: 'relative', width: '100%', maxWidth: 480, background: 'linear-gradient(180deg,#f8f3ee 0%,#dfeaeb 100%)', borderRadius: 24, boxShadow: '0 28px 70px rgba(44,74,92,.25)', border: '1.5px solid rgba(154,179,202,.25)', padding: '28px 26px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button type="button" onClick={onCancel} aria-label={t('Close')} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', fontSize: 20, color: '#8aa4b0', cursor: 'pointer' }}>✕</button>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5a7a82', marginBottom: 6 }}>{t('Finish this task')}</div>
          <div style={{ fontSize: 14.5, color: '#4a6a82', lineHeight: 1.55, background: 'rgba(154,179,202,.16)', borderRadius: 12, padding: '10px 14px' }}>{questText}</div>
        </div>
        <label style={{ display: 'block', fontSize: 17, fontWeight: 700, color: '#2c4a5c', lineHeight: 1.4 }}>
          {t(prompt)}
          <textarea autoFocus value={answer} onChange={e => { setAnswer(e.target.value); setError('') }} maxLength={600} rows={4}
            placeholder={t('Write a few words here…')}
            style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, border: '1.5px solid rgba(154,179,202,.5)', borderRadius: 14, padding: '12px 14px', fontSize: 15, fontFamily: 'Nunito,sans-serif', fontWeight: 400, background: 'rgba(255,255,255,.92)', color: '#2c4a5c', outline: 'none', resize: 'vertical' }} />
        </label>
        <div style={{ fontSize: 12.5, color: '#6a8a98', lineHeight: 1.55 }}>🔒 {t('Only you can see this. It is kept in your private journal.')}</div>
        {error && <div role="alert" style={{ fontSize: 13, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '9px 14px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="submit" style={{ background: 'linear-gradient(135deg,#9AB3CA,#7a9ab0)', color: 'white', border: 'none', borderRadius: 50, padding: '12px 28px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>{t('Finish task')}</button>
          <button type="button" onClick={onCancel} style={{ background: 'rgba(255,255,255,.8)', color: '#3a5a72', border: '1.5px solid rgba(154,179,202,.5)', borderRadius: 50, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>{t('Not now')}</button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

type Entry = { id: number; quest_text: string; answer: string; day: string; created_at: string }

function JournalModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [rows, setRows] = useState<Entry[] | null>(null)
  const load = useCallback(async () => {
    if (!supabase) { setRows([]); return }
    const { data } = await supabase.from('quest_reflections').select('id,quest_text,answer,day,created_at').order('created_at', { ascending: false }).limit(100)
    setRows((data ?? []) as Entry[])
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function remove(id: number) {
    if (!supabase || !window.confirm(t('Delete this entry from your journal?'))) return
    await supabase.from('quest_reflections').delete().eq('id', id)
    setRows(r => (r ?? []).filter(x => x.id !== id))
  }
  const when = (iso: string) => { try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' } }

  return createPortal(
    <div className="scroll-modal-wrap" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="animate-fade-in-up" role="dialog" aria-modal="true" aria-label={t('My journal')}
        style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#f8f3ee 0%,#dfeaeb 100%)', borderRadius: 24, boxShadow: '0 28px 70px rgba(44,74,92,.25)', border: '1.5px solid rgba(154,179,202,.25)', textAlign: 'left' }}>
        <div style={{ padding: '26px 26px 12px', position: 'relative' }}>
          <button onClick={onClose} aria-label={t('Close')} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', fontSize: 20, color: '#8aa4b0', cursor: 'pointer' }}>✕</button>
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 400, color: '#2c4a5c', margin: 0 }}>{t('My journal')}</h2>
          <p style={{ fontSize: 13, color: '#6a8a98', margin: '6px 0 0', lineHeight: 1.55 }}>🔒 {t('The words you write when you finish a task. Only you can see them.')}</p>
        </div>
        <ul style={{ margin: 0, padding: '6px 26px 26px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows === null ? <li style={{ listStyle: 'none', color: '#6a8a98' }}>…</li>
            : rows.length === 0 ? <li style={{ listStyle: 'none', textAlign: 'center', color: '#6a8a98', fontSize: 14, padding: '30px 0', lineHeight: 1.6 }}>{t('Nothing here yet. Finish a task and your words will be kept here.')}</li>
            : rows.map(r => (
              <li key={r.id} style={{ listStyle: 'none', background: 'rgba(255,255,255,.7)', border: '1.5px solid rgba(154,179,202,.28)', borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#8a9aaa', marginBottom: 6, display: 'flex', gap: 8 }}>
                  <span>{when(r.created_at)}</span>
                  <button onClick={() => remove(r.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#a08080', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Nunito,sans-serif' }}>{t('Delete')}</button>
                </div>
                <div style={{ fontSize: 12.5, color: '#5a7a92', fontWeight: 700, lineHeight: 1.45, marginBottom: 6 }}>{r.quest_text}</div>
                <div style={{ fontSize: 14.5, color: '#2c3a46', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.answer}</div>
              </li>
            ))}
        </ul>
      </div>
    </div>,
    document.body,
  )
}

export function JournalButton({ style }: { style?: CSSProperties }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  if (!supabase) return null
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ background: 'rgba(255,255,255,.85)', color: '#3a5a72', border: '1.5px solid rgba(154,179,202,.5)', borderRadius: 50, padding: '9px 20px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito,sans-serif', ...style }}>📖 {t('My journal')}</button>
      {open && <JournalModal onClose={() => setOpen(false)} />}
    </>
  )
}
