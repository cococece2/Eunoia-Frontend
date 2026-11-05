// Rotating daily quests.
// Every day the site shows the same number of quests per category as before (3), picked from a bigger pool.
// The pick depends only on the date, so everyone sees the same quests on the same day,
// and nothing needs to be stored. Yesterday's quests are skipped, so you never get the same list two days in a row.
//
// To add your own quests: add a line to the right category below. Keep ids unique (a10, w10, ...).
// Tip for this community: leave out numbers, calories, weights and anything about "burning off" food.

type Quest = { id: string; text: string; xp: number }

export const EXTRA_QUESTS: Record<string, Quest[]> = {
  // Anchor Points: grounding and self-kindness
  anchor: [
    { id: 'a4', text: 'Try the 5-4-3-2-1 trick: notice 5 things you see, 4 you can touch, 3 you hear', xp: 15 },
    { id: 'a5', text: "Write down one thing you're proud of from this week", xp: 15 },
    { id: 'a6', text: 'Say one kind thing to yourself, out loud or in your head', xp: 15 },
    { id: 'a7', text: 'Put a hand on your heart and breathe slowly for one minute', xp: 10 },
    { id: 'a8', text: "Write down one thing you're grateful for today", xp: 10 },
    { id: 'a9', text: 'Journal for five minutes about anything on your mind', xp: 20 },
  ],
  // Wave Riders: gentle movement, rest and joy
  wave: [
    { id: 'w4', text: 'Stretch gently for a few minutes, just because it feels good', xp: 15 },
    { id: 'w5', text: 'Dance to one song in your room like nobody is watching', xp: 15 },
    { id: 'w6', text: 'Do something creative: draw, doodle, write, or make something', xp: 20 },
    { id: 'w7', text: 'Spend a few minutes with a pet, a plant, or somewhere green', xp: 15 },
    { id: 'w8', text: 'Take a slow walk with no goal, just to notice what is around you', xp: 20 },
    { id: 'w9', text: 'Rest on purpose: lie down for ten minutes with your phone away', xp: 15 },
  ],
  // Crew Connection: reaching out
  crew: [
    { id: 'c4', text: 'Tell someone you trust one real thing about your day', xp: 20 },
    { id: 'c5', text: 'Message a friend just to say hi', xp: 15 },
    { id: 'c6', text: 'Ask someone how they are really doing, and listen to the answer', xp: 20 },
    { id: 'c7', text: 'Thank someone for something, big or small', xp: 20 },
    { id: 'c8', text: 'Spend ten minutes with someone who makes you feel safe', xp: 20 },
    { id: 'c9', text: 'Write a letter in a bottle for someone who is struggling', xp: 25 },
  ],
  // Nourishment Quest: gentle, no counting, no rules
  nourish: [
    { id: 'n4', text: 'Eat a snack you enjoy, and let yourself enjoy it', xp: 20 },
    { id: 'n5', text: 'Have something to eat within a couple of hours of waking up', xp: 25 },
    { id: 'n6', text: 'Notice one thing you like about a food: its taste, smell or texture', xp: 15 },
    { id: 'n7', text: 'Share a meal or snack with someone you feel safe around', xp: 30 },
    { id: 'n8', text: 'Have a warm drink and enjoy it slowly', xp: 10 },
    { id: 'n9', text: 'Think of a food you are looking forward to this week', xp: 15 },
  ],
}

// ── Helpers (deterministic "random" so the same date always gives the same list) ──

function hash(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: T[], seed: string): T[] {
  const a = [...items]
  const r = rng(hash(seed))
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Whole days since 1970 for a "YYYY-MM-DD" date. */
function dayNumber(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

/**
 * How it rotates: the pool is shuffled, then dealt out in groups (3 quests a day).
 * With 9 quests in a pool that is 3 days per round, so every quest shows up once per round.
 * A new round is shuffled again, and the first day of a round never repeats the
 * last day of the round before it.
 */
function dealt<Q extends Quest>(pool: Q[], n: number, catId: string, dayNum: number): Q[] {
  const rounds = Math.max(1, Math.floor(pool.length / n)) // days per round
  const round = Math.floor(dayNum / rounds)
  const pos = dayNum - round * rounds

  const order = shuffled(pool, `${round}:${catId}`).slice(0, rounds * n)
  if (rounds >= 3) {
    // Keep day 1 of this round different from the last day of the previous round.
    const prev = shuffled(pool, `${round - 1}:${catId}`).slice(0, rounds * n)
    const prevLast = new Set(prev.slice((rounds - 1) * n, rounds * n).map(q => q.id))
    for (let i = 0; i < n; i++) {
      if (!prevLast.has(order[i].id)) continue
      for (let j = n; j < (rounds - 1) * n; j++) { // swap with a quest from the middle days
        if (!prevLast.has(order[j].id)) { [order[i], order[j]] = [order[j], order[i]]; break }
      }
    }
  }
  return order.slice(pos * n, pos * n + n)
}

/** Returns your categories with the day's quests swapped in. Everything else (icons, colors) stays yours. */
export function pickDaily<C extends { id: string; quests: Quest[] }>(day: string, cats: C[]): C[] {
  const dayNum = dayNumber(day)
  return cats.map(cat => {
    const pool = [...cat.quests, ...(EXTRA_QUESTS[cat.id] ?? [])]
    return { ...cat, quests: dealt(pool, cat.quests.length, cat.id, dayNum) }
  })
}
