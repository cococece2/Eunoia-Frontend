import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// One bonus challenge, as shown in the gumball machine.
// `translations` is optional, e.g. { ja: "...", es: "..." }. If a language is missing there,
// the site falls back to its built-in translations, and then to the English text.
export type Challenge = {
  id: number | string
  body: string
  translations?: Record<string, string> | null
}

// Used when the database is not connected, or has no active challenges yet.
export const BUILT_IN_CHALLENGES: Challenge[] = [
  'Write one sentence about what "shore" means to you and save it somewhere you will see every day.',
  'Tell someone you trust one thing you are proud of this week.',
  'Do one tiny kind thing for someone, like a compliment or a thank-you.',
  'Step outside or look out a window and notice one beautiful thing.',
  'Put on a song that feels safe and listen to it all the way through.',
  'Write down one thing you are grateful your body let you do today, like hugging someone or laughing.',
  'Write a short note to your future self about the calm seas ahead.',
  'Message a friend just to say hi, no reason needed.',
  'Do something cozy for a few minutes: a warm drink, a soft blanket, a favourite show.',
].map((body, i) => ({ id: `built-in-${i}`, body }))

/** The active bonus challenges. Starts with the built-in list, then switches to the database list. */
export function useBonusChallenges(): Challenge[] {
  const [list, setList] = useState<Challenge[]>(BUILT_IN_CHALLENGES)
  useEffect(() => {
    const sb = supabase
    if (!sb) return
    let cancelled = false
    sb.from('bonus_challenges')
      .select('id,body,translations')
      .eq('active', true)
      .order('id', { ascending: true })
      .then(({ data, error }: { data: Challenge[] | null; error: unknown }) => {
        if (cancelled || error || !data || data.length === 0) return
        setList(data)
      })
    return () => { cancelled = true }
  }, [])
  return list
}
