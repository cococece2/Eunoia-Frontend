import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

export type Profile = {
  id: string
  sailor_name: string
  total_xp: number
  completed_quests: string[]
}

export type AuthResult = { error?: string; needsConfirm?: boolean }

function friendly(message: string) {
  if (/invalid login/i.test(message)) return 'That email and password do not match.'
  if (/already registered/i.test(message)) return 'That email already has an account — try logging in.'
  if (/password/i.test(message) && /characters/i.test(message)) return 'Choose a longer password (8+ characters).'
  return message
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const sb = supabase
    if (!sb) return
    sb.auth.getSession().then(({ data }: { data: { session: Session | null } }) => setSession(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id

  useEffect(() => {
    const sb = supabase
    if (!sb || !uid) { setProfile(null); return }
    let cancelled = false
    sb.from('profiles')
      .select('id,sailor_name,total_xp,completed_quests')
      .eq('id', uid)
      .single()
      .then(({ data }) => { if (!cancelled && data) setProfile(data as Profile) })
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

  const saveProgress = useCallback(async (xp: number, completed: string[]) => {
    if (!supabase || !uid) return
    await supabase.from('profiles').update({ total_xp: xp, completed_quests: completed }).eq('id', uid)
  }, [uid])

  return {
    enabled: !!supabase,
    profile,
    user: profile ? { id: profile.id, sailor: profile.sailor_name } : null,
    signIn,
    signUp,
    signOut,
    saveProgress,
  }
}
