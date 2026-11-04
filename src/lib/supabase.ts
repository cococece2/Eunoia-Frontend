import { createClient } from '@supabase/supabase-js'

// These two values come from your Supabase project (Project Settings → API).
// Put them in a file called .env.local — see SETUP.md.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// null until the keys are filled in. The site still works without them:
// the crew rooms run in a local preview mode and the login page explains it isn't connected yet.
export const supabase = url && key ? createClient(url, key) : null
