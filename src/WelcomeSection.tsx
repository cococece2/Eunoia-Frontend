import { useI18n } from './i18n'

type Props = {
  name: string        // the sailor's name
  rank: string        // English rank name, e.g. "Deckhand" (translated here)
  xp: number          // lifetime XP
  nextXp: number      // XP needed for the next rank
  isTop: boolean      // true once they reached the top rank
  done: number        // quests done today
  total: number       // quests available today
}

// One short, kind line per day. Same line for everyone on the same day.
const THOUGHTS = [
  'You showed up today, and that already counts.',
  'Rest is part of the journey, not a detour.',
  'You do not have to sail fast. You just have to keep sailing.',
  'Be as kind to yourself as you would be to a friend.',
  'Small steps still move the ship.',
]

const linkBtn: React.CSSProperties = {
  display: 'inline-block', textDecoration: 'none', borderRadius: 50, padding: '11px 24px', fontSize: 14, fontWeight: 700,
  fontFamily: 'Nunito,sans-serif', background: 'rgba(255,255,255,.7)', color: '#3a5a72', border: '1.5px solid rgba(154,179,202,.45)',
}

/** A personal welcome for people who are logged in. Shows their rank, progress and today's quests. */
export default function WelcomeSection({ name, rank, xp, nextXp, isTop, done, total }: Props) {
  const { t } = useI18n()
  const dayIndex = Math.floor(new Date().getTime() / 86_400_000)
  const thought = THOUGHTS[dayIndex % THOUGHTS.length]
  const pct = isTop ? 100 : Math.max(4, Math.min(100, Math.round((xp / nextXp) * 100)))
  const questPct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0

  return (
    <section id="welcome" style={{ scrollMarginTop: 70, background: 'linear-gradient(180deg,#f8f3ee 0%,#e9f0f0 100%)', padding: '56px 24px 48px' }}>
      <div className="animate-fade-in-up" style={{ maxWidth: 820, margin: '0 auto', background: 'rgba(255,255,255,.7)', border: '1.5px solid rgba(154,179,202,.3)', borderRadius: 28, padding: '36px 32px', boxShadow: '0 18px 50px rgba(44,74,92,.1)' }}>
        <div style={{ fontSize: 12, letterSpacing: '.2em', color: '#5a7a82', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>{t('Your voyage continues')}</div>
        <h2 className="font-display" style={{ fontSize: 'clamp(28px,4.5vw,42px)', fontWeight: 400, color: '#2c4a5c', lineHeight: 1.2, margin: '0 0 8px' }}>
          {t('Welcome back, {name}', { name })}
        </h2>
        <p style={{ fontSize: 16, color: '#6a8a98', lineHeight: 1.7, margin: '0 0 26px', fontStyle: 'italic' }}>
          {t('A thought for today')}: {t(thought)}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginBottom: 26 }}>
          <div style={{ background: 'rgba(223,234,235,.6)', borderRadius: 18, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#5a7a82', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{t(rank)}</div>
            <div style={{ height: 10, background: 'rgba(154,179,202,.3)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#9AB3CA,#c49a42)', borderRadius: 10, transition: 'width .6s' }} />
            </div>
            <div style={{ fontSize: 13, color: '#4a6a82' }}>
              {isTop ? t('You have reached the highest rank. Captain!') : t('{xp} XP, with {n} to go for your next rank', { xp, n: Math.max(0, nextXp - xp) })}
            </div>
          </div>
          <div style={{ background: 'rgba(223,234,235,.6)', borderRadius: 18, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#5a7a82', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{t("Today's quests")}</div>
            <div style={{ height: 10, background: 'rgba(154,179,202,.3)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${questPct}%`, height: '100%', background: 'linear-gradient(90deg,#9AB3CA,#6a9a82)', borderRadius: 10, transition: 'width .6s' }} />
            </div>
            <div style={{ fontSize: 13, color: '#4a6a82' }}>{t('{done} of {total} quests done today', { done, total })}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="#quests" style={{ ...linkBtn, background: 'linear-gradient(135deg,#9AB3CA,#7a9ab0)', color: 'white', border: 'none' }}>{t("Today's quests")}</a>
          <a href="#chat" style={linkBtn}>{t('Visit your crew')}</a>
          <a href="#letters" style={linkBtn}>{t('Write a letter')}</a>
        </div>
        <div style={{ fontSize: 12, color: '#8a9aaa', marginTop: 16 }}>{t('Your progress is saved automatically.')}</div>
      </div>
    </section>
  )
}
