import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// Same shape as the built-in LETTERS in App.tsx, so the existing bottles and scroll can show them.
export type UserLetter = { id: number; name: string; preview: string; glassColor: string; delay: string; text: string }

const GLASS = ['#4e7d70', '#3d6878', '#4a6875', '#7d6040', '#3d6880', '#4a5878']

/** Letters written by users that you have approved (approved = true in Supabase). */
export function useUserLetters(): UserLetter[] {
  const [letters, setLetters] = useState<UserLetter[]>([])
  useEffect(() => {
    const sb = supabase
    if (!sb) return
    let cancelled = false
    sb.from('letters')
      .select('id,body,profiles(sailor_name)')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (cancelled || !data) return
        setLetters(data.map((r: any, i: number) => {
          const text = String(r.body)
          const first = text.split(/[.!?\n]/)[0].trim()
          const preview = (first.length > 48 ? first.slice(0, 48).trim() : first) + '…'
          return {
            id: 1000 + Number(r.id), // offset so it never clashes with the built-in letters
            name: r.profiles?.sailor_name ?? 'A sailor',
            preview,
            glassColor: GLASS[i % GLASS.length],
            delay: `${(i % 6) * 0.3}s`,
            text,
          }
        }))
      })
    return () => { cancelled = true }
  }, [])
  return letters
}

const MIN = 50
const MAX = 1500

function WriteLetterModal({ user, onClose }: { user: { id: string; sailor: string } | null; onClose: () => void }) {
  const [text, setText] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const len = text.trim().length
  const valid = len >= MIN && len <= MAX && agree

  async function submit() {
    if (!valid || busy) return
    setBusy(true); setError('')
    if (supabase && user) {
      const { error } = await supabase.from('letters').insert({ user_id: user.id, body: text.trim() })
      if (error) {
        setBusy(false)
        setError(/row-level security|violates/i.test(error.message)
          ? 'You can seal up to 3 bottles a day. Please try again tomorrow.'
          : 'Could not seal the bottle. Please try again.')
        return
      }
    }
    setBusy(false); setDone(true)
  }

  return (
    <div className="scroll-modal-wrap" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="scroll-modal open" role="dialog" aria-modal="true" aria-label="Write a letter in a bottle" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="scroll-rod" style={{ margin: '0 -2px' }} />
        <div className="scroll-body" style={{ overflowY: 'auto', position: 'relative', textAlign: 'left' }}>
          <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 16, background: 'rgba(58,42,26,.08)', border: 'none', color: '#6a5030', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 17 }}>✕</button>

          {done ? (
            <div style={{ textAlign: 'center', padding: '30px 6px' }}>
              <div style={{ fontSize: 42, marginBottom: 12 }}>🍾</div>
              <div className="font-display" style={{ color: '#3a2a1a', fontWeight: 600, fontSize: 22, marginBottom: 10 }}>Your bottle is sealed</div>
              <p style={{ color: '#5a4020', lineHeight: 1.75, fontSize: 14.5, fontFamily: 'Georgia,serif', margin: '0 0 22px' }}>
                {supabase ? 'A person reads every letter before it floats out to sea, so it may take a little while to appear. Thank you for sharing your story. It could be exactly what someone needs.' : 'Preview mode: letters are only saved once login is connected.'}
              </p>
              <button onClick={onClose} style={{ background: 'linear-gradient(135deg,#9AB3CA,#7a9ab0)', color: 'white', border: 'none', borderRadius: 50, padding: '11px 30px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>Close</button>
            </div>
          ) : (
            <>
              <div className="font-display" style={{ color: '#3a2a1a', fontWeight: 600, fontSize: 21, marginBottom: 4, paddingRight: 30 }}>Write a letter in a bottle</div>
              <div style={{ fontSize: 11, color: '#9a8060', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                {user ? `Signed as ${user.sailor}` : 'Preview'}
              </div>

              <div style={{ background: 'rgba(154,128,80,.1)', border: '1px solid rgba(154,128,80,.25)', borderRadius: 12, padding: '10px 14px', fontSize: 12.5, color: '#5a4020', lineHeight: 1.6, marginBottom: 14 }}>
                Write to someone who is struggling right now: how it felt, what helped, what you wish you'd known. Please <b>leave out numbers</b> (weights, calories, sizes), <b>methods or tips</b>, and <b>real names</b>. Letters that don't follow this can't be shared.
              </div>

              <textarea value={text} onChange={e => setText(e.target.value)} rows={9} maxLength={MAX} placeholder="Dear sailor…"
                style={{ width: '100%', resize: 'vertical', background: 'rgba(255,255,255,.45)', border: '1.5px solid rgba(154,128,80,.25)', borderRadius: 12, padding: '12px 14px', fontFamily: 'Georgia,serif', fontSize: 14.5, lineHeight: '26px', color: '#3a2a1a', outline: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: len < MIN ? '#9a8060' : '#6a8a78', margin: '6px 2px 12px' }}>
                <span>{len < MIN ? `${MIN - len} more characters to go` : 'Looks good'}</span>
                <span>{len} / {MAX}</span>
              </div>

              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5, color: '#5a4020', lineHeight: 1.55, cursor: 'pointer', marginBottom: 14 }}>
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
                <span>I understand my letter will be read by a person first, and if approved it will be shown to everyone under my sailor name.</span>
              </label>

              <div style={{ fontSize: 12, color: '#8a7050', lineHeight: 1.6, marginBottom: 14 }}>
                If you're struggling right now, please don't wait for a reply here. Call or text 988 (US) or your local emergency number, or visit the Lighthouse.
              </div>

              {error && <div role="alert" style={{ fontSize: 13, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>{error}</div>}

              <button onClick={submit} disabled={!valid || busy}
                style={{ width: '100%', background: valid && !busy ? 'linear-gradient(135deg,#9AB3CA,#7a9ab0)' : 'rgba(154,179,202,.3)', color: 'white', border: 'none', borderRadius: 50, padding: '13px 0', fontSize: 15, fontWeight: 700, cursor: valid && !busy ? 'pointer' : 'default', fontFamily: 'Nunito,sans-serif', letterSpacing: '.04em' }}>
                {busy ? 'Sealing…' : 'Seal the bottle'}
              </button>
            </>
          )}
        </div>
        <div className="scroll-rod" style={{ margin: '0 -2px' }} />
      </div>
    </div>
  )
}

/** A button that opens the "write a letter" scroll. Asks people to log in first. */
export function WriteLetterButton({ user, onLogin }: { user: { id: string; sailor: string } | null; onLogin: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => (user || !supabase ? setOpen(true) : onLogin())}
        style={{ background: 'rgba(255,255,255,.55)', color: '#3a5a72', border: '1.5px solid rgba(154,179,202,.5)', borderRadius: 50, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif', backdropFilter: 'blur(8px)', transition: 'all .2s' }}>
        ✉️ Write your own letter
      </button>
      {open && <WriteLetterModal user={user} onClose={() => setOpen(false)} />}
    </>
  )
}
