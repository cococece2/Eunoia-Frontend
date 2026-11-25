import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './lib/supabase'
import { useI18n } from './i18n'

// A private notebook beside the daily tasks: a day planner, free journaling, and the notes written when finishing tasks.
// Everything here is only readable by the person who wrote it.

type Tab = 'plan' | 'thoughts'
type Item = { id: number; day: string; at_time: string | null; body: string; done: boolean }
type Thought = { id: number; body: string; mood: string | null; created_at: string }

const MOODS = ['😊', '😌', '😐', '😔', '😟', '😠']
const dayKey = (d: Date) => d.toLocaleDateString('en-CA')
const shift = (key: string, by: number) => { const d = new Date(key + 'T12:00:00'); d.setDate(d.getDate() + by); return dayKey(d) }

const card = { background: 'rgba(255,255,255,.72)', borderRadius: 20, padding: '24px', border: '1.5px solid rgba(154,179,202,.28)', backdropFilter: 'blur(8px)', textAlign: 'left' as const }
const inputStyle = { border: '1.5px solid rgba(154,179,202,.5)', borderRadius: 12, padding: '10px 12px', fontSize: 14.5, fontFamily: 'Nunito,sans-serif', background: 'rgba(255,255,255,.92)', color: '#2c4a5c', outline: 'none', boxSizing: 'border-box' as const }
const primary = { background: 'linear-gradient(135deg,#9AB3CA,#7a9ab0)', color: 'white', border: 'none', borderRadius: 50, padding: '10px 24px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }
const linkBtn = { background: 'none', border: 'none', color: '#a08080', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Nunito,sans-serif' }

function Planner() {
  const { t, lang } = useI18n()
  const today = dayKey(new Date())
  const [day, setDay] = useState(today)
  const [items, setItems] = useState<Item[] | null>(null)
  const [text, setText] = useState('')
  const [time, setTime] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    if (!supabase) { setItems([]); return }
    const { data } = await supabase.from('planner_items').select('id,day,at_time,body,done').eq('day', day).order('created_at', { ascending: true })
    setItems(((data ?? []) as Item[]).sort((a, b) => (a.at_time ?? '99').localeCompare(b.at_time ?? '99')))
  }, [day])
  useEffect(() => { setItems(null); load() }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || !supabase) return
    setErr('')
    const { error } = await supabase.from('planner_items').insert({ day, body: body.slice(0, 120), at_time: time || null })
    if (error) { setErr(t('Could not save that. Please try again.')); return }
    setText(''); setTime(''); load()
  }
  async function toggle(it: Item) {
    if (!supabase) return
    setItems(l => (l ?? []).map(x => x.id === it.id ? { ...x, done: !x.done } : x))
    await supabase.from('planner_items').update({ done: !it.done }).eq('id', it.id)
  }
  async function remove(it: Item) {
    if (!supabase) return
    setItems(l => (l ?? []).filter(x => x.id !== it.id))
    await supabase.from('planner_items').delete().eq('id', it.id)
  }
  const label = (() => { try { return new Date(day + 'T12:00:00').toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' }) } catch { return day } })()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button aria-label={t('Previous day')} onClick={() => setDay(d => shift(d, -1))} style={{ ...inputStyle, cursor: 'pointer', padding: '6px 14px' }}>‹</button>
        <div style={{ flex: '1 1 160px', textAlign: 'center', fontWeight: 800, color: '#2c4a5c', fontSize: 16 }}>{day === today ? t('Today') + ' · ' : ''}{label}</div>
        <button aria-label={t('Next day')} onClick={() => setDay(d => shift(d, 1))} style={{ ...inputStyle, cursor: 'pointer', padding: '6px 14px' }}>›</button>
        {day !== today && <button onClick={() => setDay(today)} style={{ ...inputStyle, cursor: 'pointer', padding: '6px 14px', fontWeight: 700 }}>{t('Today')}</button>}
      </div>
      <form onSubmit={add} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <input type="time" value={time} onChange={e => setTime(e.target.value)} aria-label={t('Time (optional)')} style={{ ...inputStyle, flex: '0 0 auto' }} />
        <input value={text} onChange={e => setText(e.target.value)} maxLength={120} placeholder={t('Add something to your day…')} aria-label={t('Add something to your day…')} style={{ ...inputStyle, flex: '1 1 180px' }} />
        <button type="submit" style={primary}>{t('Add')}</button>
      </form>
      {err && <div role="alert" style={{ fontSize: 13, color: '#8a5a5a', marginBottom: 10 }}>{err}</div>}
      <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items === null ? <li style={{ listStyle: 'none', color: '#6a8a98' }}>…</li>
          : items.length === 0 ? <li style={{ listStyle: 'none', textAlign: 'center', color: '#6a8a98', fontSize: 14, padding: '22px 0', lineHeight: 1.6 }}>{t('Nothing planned yet. Gentle plans are the best kind: a walk, a snack, a call with a friend, some rest.')}</li>
          : items.map(it => (
            <li key={it.id} className="planner-item" style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 10, background: it.done ? 'rgba(154,179,202,.12)' : 'rgba(255,255,255,.85)', border: '1.5px solid rgba(154,179,202,.28)', borderRadius: 14, padding: '10px 14px' }}>
              <input type="checkbox" checked={it.done} onChange={() => toggle(it)} aria-label={it.body} style={{ width: 20, height: 20, accentColor: '#7a9ab0', cursor: 'pointer', flexShrink: 0 }} />
              {it.at_time && <span style={{ fontSize: 12.5, fontWeight: 800, color: '#5a7a92', flexShrink: 0 }}>{it.at_time.slice(0, 5)}</span>}
              <span style={{ flex: 1, fontSize: 14.5, color: it.done ? '#8a9a98' : '#2c4a5c', textDecoration: it.done ? 'line-through' : 'none', wordBreak: 'break-word', lineHeight: 1.45 }}>{it.body}</span>
              <button onClick={() => remove(it)} style={linkBtn} aria-label={t('Delete')}>✕</button>
            </li>
          ))}
      </ul>
    </div>
  )
}

function Thoughts() {
  const { t, lang } = useI18n()
  const [rows, setRows] = useState<Thought[] | null>(null)
  const [text, setText] = useState('')
  const [mood, setMood] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    if (!supabase) { setRows([]); return }
    const { data } = await supabase.from('journal_entries').select('id,body,mood,created_at').order('created_at', { ascending: false }).limit(100)
    setRows((data ?? []) as Thought[])
  }, [])
  useEffect(() => { load() }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || !supabase) return
    setErr('')
    const { error } = await supabase.from('journal_entries').insert({ body: body.slice(0, 2000), mood })
    if (error) { setErr(t('Could not save that. Please try again.')); return }
    setText(''); setMood(null); load()
  }
  async function remove(id: number) {
    if (!supabase || !window.confirm(t('Delete this entry from your journal?'))) return
    setRows(r => (r ?? []).filter(x => x.id !== id))
    await supabase.from('journal_entries').delete().eq('id', id)
  }
  const when = (iso: string) => { try { return new Date(iso).toLocaleString(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

  return (
    <div>
      <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <textarea value={text} onChange={e => setText(e.target.value)} maxLength={2000} rows={4} placeholder={t('What is on your mind today? Write anything you like.')} aria-label={t('What is on your mind today? Write anything you like.')} style={{ ...inputStyle, width: '100%', resize: 'vertical' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: '#6a8a98', marginRight: 4 }}>{t('How are you feeling?')}</span>
          {MOODS.map(m => (
            <button type="button" key={m} onClick={() => setMood(mood === m ? null : m)} aria-pressed={mood === m} style={{ fontSize: 20, background: mood === m ? 'rgba(154,179,202,.35)' : 'transparent', border: '1.5px solid ' + (mood === m ? '#7a9ab0' : 'transparent'), borderRadius: 12, padding: '2px 6px', cursor: 'pointer' }}>{m}</button>
          ))}
          <button type="submit" style={{ ...primary, marginLeft: 'auto' }}>{t('Save entry')}</button>
        </div>
      </form>
      {err && <div role="alert" style={{ fontSize: 13, color: '#8a5a5a', marginBottom: 10 }}>{err}</div>}
      <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows === null ? <li style={{ listStyle: 'none', color: '#6a8a98' }}>…</li>
          : rows.length === 0 ? <li style={{ listStyle: 'none', textAlign: 'center', color: '#6a8a98', fontSize: 14, padding: '18px 0', lineHeight: 1.6 }}>{t('No entries yet. This page is just for you.')}</li>
          : rows.map(r => (
            <li key={r.id} className="thought-item" style={{ listStyle: 'none', background: 'rgba(255,255,255,.85)', border: '1.5px solid rgba(154,179,202,.28)', borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: '#8a9aaa', marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                {r.mood && <span style={{ fontSize: 16 }}>{r.mood}</span>}<span>{when(r.created_at)}</span>
                <button onClick={() => remove(r.id)} style={{ ...linkBtn, marginLeft: 'auto' }}>{t('Delete')}</button>
              </div>
              <div style={{ fontSize: 14.5, color: '#2c3a46', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.body}</div>
            </li>
          ))}
      </ul>
    </div>
  )
}

export default function Notebook({ locked, onLocked, waves, decor }: { locked: boolean; onLocked: () => void; waves?: ReactNode; decor?: ReactNode }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('plan')
  const tabs: [Tab, string][] = [['plan', '🗓️ ' + t('Planner')], ['thoughts', '✍️ ' + t('Journal')]]

  return (
    <section id="notebook" style={{ position: 'relative', background: 'linear-gradient(180deg,#f8f3ee 0%,#e6edef 50%,#C6DDED 100%)', padding: '100px 24px 150px', overflow: 'hidden' }}>
      {decor}
    <div style={{ position: 'relative', zIndex: 2, maxWidth: 560, margin: '0 auto', ...card }}>
      <h3 className="font-display" style={{ fontSize: 'clamp(24px,4vw,32px)', fontWeight: 400, color: '#2c4a5c', margin: '0 0 6px', textAlign: 'center' }}>{t('My Notebook')}</h3>
      <p style={{ fontSize: 14, color: '#6a8a98', lineHeight: 1.65, textAlign: 'center', margin: '0 auto 18px', maxWidth: 480 }}>🔒 {t('Plan your day and write down your thoughts. Only you can see your notebook.')}</p>
      {locked ? (
        <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
          <p style={{ fontSize: 14.5, color: '#5a4020', lineHeight: 1.6, margin: '0 0 14px' }}>{t('Create a free account to plan your day and keep a private journal.')}</p>
          <button onClick={onLocked} style={primary}>{t('Log in or sign up')}</button>
        </div>
      ) : (
        <>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 18 }}>
            {tabs.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{ background: tab === id ? 'linear-gradient(135deg,#9AB3CA,#7a9ab0)' : 'rgba(255,255,255,.85)', color: tab === id ? 'white' : '#3a5a72', border: '1.5px solid rgba(154,179,202,.5)', borderRadius: 50, padding: '9px 18px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>{label}</button>
            ))}
          </div>
          {tab === 'plan' && <Planner />}
          {tab === 'thoughts' && <Thoughts />}
          <p style={{ fontSize: 12.5, color: '#8a9aaa', lineHeight: 1.6, textAlign: 'center', margin: '18px 0 0' }}>{t('If things feel too heavy, you are not alone. You can find support in the Lighthouse section below.')}</p>
        </>
      )}
    </div>
    {waves}
    </section>
  )
}
