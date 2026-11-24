import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type AuthSession = { user: { id: string } }

export type Profile = {
  id: string
  sailor_name: string
  total_xp: number            // lifetime XP: only ever goes up
  completed_quests: string[]  // quests ticked off on `quests_day`
  quests_day: string | null   // the (local) date those quests belong to, e.g. "2026-11-04"
}

// Where the boat is sailing: the chosen destination, and the lifetime XP the voyage began at.
export type Voyage = { destination: string | null; start: number }

export type AuthResult = { error?: string; needsConfirm?: boolean }

// Today's date on the person's own device, as YYYY-MM-DD. Daily quests reset when this changes.
export const todayKey = () => new Date().toLocaleDateString('en-CA')

function friendly(message: string) {
  if (/invalid login/i.test(message)) return 'That email and password do not match.'
  if (/already registered/i.test(message)) return 'That email already has an account. Try logging in.'
  if (/password/i.test(message) && /characters/i.test(message)) return 'Choose a longer password (8+ characters).'
  return message
}

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [voyage, setVoyage] = useState<Voyage | null>(null)

  useEffect(() => {
    const sb = supabase
    if (!sb) return
    sb.auth.getSession().then(({ data }: { data: { session: AuthSession | null } }) => setSession(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_event: string, s: AuthSession | null) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id

  useEffect(() => {
    const sb = supabase
    if (!sb || !uid) { setProfile(null); return }
    let cancelled = false
    sb.from('profiles')
      .select('id,sailor_name,total_xp,completed_quests,quests_day')
      .eq('id', uid)
      .single()
      .then(({ data }: { data: Profile | null }) => { if (!cancelled && data) setProfile(data) })
    return () => { cancelled = true }
  }, [uid])

  // The voyage is loaded on its own, so that login keeps working even before 08-voyage.sql has been run.
  // It is also kept on this device as a backup.
  useEffect(() => {
    const sb = supabase
    if (!sb || !uid) { setVoyage(null); return }
    let cancelled = false
    const local = (): Voyage | null => {
      try { const v = JSON.parse(localStorage.getItem(`voyage-${uid}`) ?? 'null'); return v && typeof v.start === 'number' ? v : null } catch { return null }
    }
    sb.from('profiles')
      .select('destination,voyage_start_xp')
      .eq('id', uid)
      .single()
      .then(({ data, error }: { data: { destination: string | null; voyage_start_xp: number } | null; error: unknown }) => {
        if (cancelled) return
        if (!error && data && data.destination) setVoyage({ destination: data.destination, start: data.voyage_start_xp ?? 0 })
        else setVoyage(local())
      })
    return () => { cancelled = true }
  }, [uid])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Login is not connected yet.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? { error: friendly(error.message) } : {}
  }, [])

  const signUp = useCallback(async (email: string, password: string, sailorName: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Login is not connected yet.' }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { sailor_name: sailorName } },
    })
    if (error) return { error: friendly(error.message) }
    // If "Confirm email" is on in Supabase, there is no session until they click the email link.
    return { needsConfirm: !data.session }
  }, [])

  const signOut = useCallback(async () => { await supabase?.auth.signOut() }, [])

  const saveProgress = useCallback(async (xp: number, completed: string[], day: string) => {
    if (!supabase || !uid) return
    await supabase.from('profiles').update({ total_xp: xp, completed_quests: completed, quests_day: day }).eq('id', uid)
  }, [uid])

  const saveVoyage = useCallback(async (destination: string, start: number) => {
    if (!uid) return
    try { localStorage.setItem(`voyage-${uid}`, JSON.stringify({ destination, start })) } catch { /* private mode */ }
    if (!supabase) return
    await supabase.from('profiles').update({ destination, voyage_start_xp: start }).eq('id', uid)   // ignored if the columns are not there yet
  }, [uid])

  return {
    enabled: !!supabase,
    voyage,
    saveVoyage,
    profile,
    user: profile ? { id: profile.id, sailor: profile.sailor_name } : null,
    signIn,
    signUp,
    signOut,
    saveProgress,
  }
}
