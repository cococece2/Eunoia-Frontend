import { useEffect, useState } from 'react'
import Anchor from './imports/Anchor.png'
import type { AuthResult } from './useAuth'

const SAILOR_NAMES = ['CoralDrifter','TealHarbor','SeaSprite','SilverWave','MoonRipple','PearlTide','AquaLight','StormBreaker']
const suggestName = () => `${SAILOR_NAMES[Math.floor(Math.random() * SAILOR_NAMES.length)]}${Math.floor(Math.random() * 90) + 10}`

type Props = {
  enabled: boolean
  onClose: () => void
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string, sailorName: string) => Promise<AuthResult>
}

const input: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,.8)', border: '1.5px solid rgba(154,179,202,.28)',
  borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#2c4a5c', outline: 'none',
  fontFamily: 'Nunito,sans-serif', transition: 'border-color .2s',
}
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#5a7a82', letterSpacing: '.06em', marginBottom: 6, display: 'block' }

export default function AuthPage({ enabled, onClose, signIn, signUp }: Props) {
  const [mode, setMode] = useState<'login' | 'join'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState(suggestName)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setNotice('')
    if (mode === 'join') {
      if (name.trim().length < 3 || name.trim().length > 20) return setError('Pick a sailor name between 3 and 20 characters.')
      if (password.length < 8) return setError('Your password needs at least 8 characters.')
    }
    setBusy(true)
    const res = mode === 'login' ? await signIn(email.trim(), password) : await signUp(email.trim(), password, name.trim())
    setBusy(false)
    if (res.error) return setError(res.error)
    if (res.needsConfirm) return setNotice('Almost there — check your email for a link to confirm your account, then log in.')
    onClose()
  }

  const focus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = 'rgba(154,179,202,.65)' }
  const blur = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = 'rgba(154,179,202,.28)' }

  return (
    <div className="scroll-modal-wrap" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="animate-fade-in-up" role="dialog" aria-modal="true" aria-label="Log in"
        style={{ position: 'relative', width: '100%', maxWidth: 420, background: 'linear-gradient(180deg,#f8f3ee 0%,#dfeaeb 100%)', borderRadius: 24, padding: '36px 32px 30px', boxShadow: '0 28px 70px rgba(44,74,92,.25)', border: '1.5px solid rgba(154,179,202,.25)' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', fontSize: 20, color: '#8aa4b0', cursor: 'pointer' }}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <img src={Anchor} alt="" style={{ width: 34, height: 34, objectFit: 'contain', marginBottom: 10 }} />
          <h2 className="font-display" style={{ fontSize: 30, fontWeight: 400, color: '#2c4a5c', lineHeight: 1.2, margin: 0 }}>
            {mode === 'login' ? <>Welcome <em style={{ fontStyle: 'italic', color: '#7a6a5a' }}>back</em></> : <>Join the <em style={{ fontStyle: 'italic', color: '#7a6a5a' }}>crew</em></>}
          </h2>
          <p style={{ fontSize: 14, color: '#6a8a98', lineHeight: 1.6, margin: '10px 0 0' }}>
            {mode === 'login' ? 'Pick up your voyage where you left off.' : 'Save your XP and quests, and chat with the crew.'}
          </p>
        </div>

        <div style={{ display: 'flex', background: 'rgba(154,179,202,.16)', borderRadius: 50, padding: 4, marginBottom: 20 }}>
          {(['login', 'join'] as const).map(m => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(''); setNotice('') }}
              style={{ flex: 1, border: 'none', borderRadius: 50, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif', transition: 'all .2s',
                background: mode === m ? 'white' : 'transparent', color: mode === m ? '#2c4a5c' : '#6a8a98', boxShadow: mode === m ? '0 2px 8px rgba(44,74,92,.1)' : 'none' }}>
              {m === 'login' ? 'Log in' : 'Sign up'}
            </button>
          ))}
        </div>

        {!enabled && (
          <div style={{ background: 'rgba(196,154,66,.1)', border: '1px solid rgba(196,154,66,.3)', borderRadius: 14, padding: '10px 14px', fontSize: 12.5, color: '#5a4020', lineHeight: 1.55, marginBottom: 16 }}>
            Login isn't switched on yet. Add your Supabase keys (see SETUP.md) and this form will work.
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'join' && (
            <div>
              <label style={label} htmlFor="sailor">YOUR SAILOR NAME</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input id="sailor" value={name} onChange={e => setName(e.target.value)} maxLength={20} style={input} onFocus={focus} onBlur={blur} />
                <button type="button" onClick={() => setName(suggestName())} title="Suggest another name"
                  style={{ border: '1.5px solid rgba(154,179,202,.28)', background: 'rgba(255,255,255,.8)', borderRadius: 14, padding: '0 14px', cursor: 'pointer', fontSize: 16 }}>🎲</button>
              </div>
              <div style={{ fontSize: 11.5, color: '#8a9aaa', marginTop: 6, lineHeight: 1.5 }}>This is the only name the crew sees. Never your email or real name.</div>
            </div>
          )}
          <div>
            <label style={label} htmlFor="email">EMAIL</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={input} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={label} htmlFor="password">PASSWORD</label>
            <input id="password" type="password" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} style={input} onFocus={focus} onBlur={blur} />
          </div>

          {error && <div role="alert" style={{ fontSize: 13, color: '#8a5a5a', background: 'rgba(138,90,90,.08)', borderRadius: 12, padding: '9px 14px', lineHeight: 1.5 }}>{error}</div>}
          {notice && <div style={{ fontSize: 13, color: '#4a6a58', background: 'rgba(106,138,120,.12)', borderRadius: 12, padding: '9px 14px', lineHeight: 1.5 }}>{notice}</div>}

          <button type="submit" disabled={busy || !enabled}
            style={{ marginTop: 4, background: busy || !enabled ? 'rgba(154,179,202,.3)' : 'linear-gradient(135deg,#9AB3CA,#7a9ab0)', color: 'white', border: 'none', borderRadius: 50, padding: '14px 0', fontSize: 15, fontWeight: 700, letterSpacing: '.04em', cursor: busy || !enabled ? 'default' : 'pointer', fontFamily: 'Nunito,sans-serif', transition: 'all .2s' }}>
            {busy ? 'Setting sail…' : mode === 'login' ? 'Log in' : 'Join the crew'}
          </button>
        </form>

        <p style={{ fontSize: 11.5, color: '#8a9aaa', textAlign: 'center', lineHeight: 1.6, margin: '18px 0 0' }}>
          Safe, peer support — not a substitute for professional help.
        </p>
      </div>
    </div>
  )
}
