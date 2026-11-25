// The question each task asks before it counts as done. Writing a few words is how a sailor shows they really did it.
// Keep these gentle and about feelings. Never ask for food amounts, numbers, weights or sizes.
// To add one: add a line with the quest's id. Every new English sentence also needs a translation in src/i18n/*.ts.
// Tasks added on the admin page can carry their own question; if they don't, DEFAULT_PROMPT is used.

export const DEFAULT_PROMPT = 'How did it go? Write a few words about it.'

export const PROMPTS: Record<string, string> = {
  // Anchor Points
  a1: 'What are the 3 things your body did for you today?',
  a2: 'How did you feel after breathing slowly?',
  a3: 'Which emotion is it? Add a few words about it.',
  a4: 'What did you notice? One thing you saw, one you touched, one you heard.',
  a5: 'What are you proud of?',
  a6: 'What kind thing did you say to yourself?',
  a7: 'How did you feel after breathing slowly?',
  a8: 'What are you grateful for today?',
  a9: 'Write a few lines about what was on your mind.',
  // Wave Riders
  w1: 'What did you do, and how did your body feel?',
  w2: 'What did the fresh air feel like?',
  w3: 'Which song was it, and how did it make you feel?',
  w4: 'What did you do, and how did your body feel?',
  w5: 'Which song was it, and how did it make you feel?',
  w6: 'What did you make or do, and how did it feel?',
  w7: 'Who or what did you spend time with, and how did it feel?',
  w8: 'What did you notice while you did it?',
  w9: 'How did your body feel as you rested?',
  // Crew Connection
  c1: 'Who did you message, and how did it feel?',
  c2: 'What stayed with you from the letter you read?',
  c3: 'What did you share with the crew?',
  c4: 'What did you share about your day?',
  c5: 'Who did you message, and how did it feel?',
  c6: 'What did you learn when you listened?',
  c7: 'Who did you thank, and for what?',
  c8: 'Who or what did you spend time with, and how did it feel?',
  c9: 'What did you write for them? A few kind words are perfect.',
  // Nourishment Quest
  n1: 'How did it feel to eat without distractions?',
  n2: 'How did looking after yourself feel today?',
  n3: 'What was it like to try something new?',
  n4: 'What did you enjoy about it?',
  n5: 'How did you feel afterwards?',
  n6: 'What did you like about it: the taste, smell or texture?',
  n7: 'What was it like to share it?',
  n8: 'What did you enjoy about it?',
  n9: 'What are you looking forward to?',
  // Calm Harbor
  h1: 'What did you notice while you did it?',
  h2: 'What calm thing did you do instead?',
  h3: 'How did your body feel as you rested?',
  h4: 'What did you hear, and how did it feel?',
  h5: 'What did you notice while you did it?',
  h6: 'What was the worry you set aside?',
  h7: 'How did your body feel as you rested?',
  h8: 'What gentle thing did you do tonight?',
  h9: 'What did you notice while you did it?',
  // Treasure Hunt
  t1: 'What made you smile?',
  t2: 'What memory or photo warmed you up?',
  t3: 'What did you do just for fun?',
  t4: 'What did you learn?',
  t5: 'What made you laugh?',
  t6: 'What did you notice while you did it?',
  t7: 'What are you looking forward to?',
  t8: 'What did you share, and who with?',
  t9: 'What did you do just for fun?',
}

export const promptFor = (q: { id: string; prompt?: string | null }) => q.prompt?.trim() || PROMPTS[q.id] || DEFAULT_PROMPT
