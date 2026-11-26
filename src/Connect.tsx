import { LINKS } from './links'
import { useI18n } from './i18n'

// "Stay connected": crowdfunding page, Instagram and the Eunora email. Sits next to the anonymous comment box.

const safeUrl = (u: string) => (/^https:\/\//i.test(u.trim()) ? u.trim() : '')
const safeEmail = (e: string) => (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(e.trim()) ? e.trim() : '')

export default function ConnectCard() {
  const { t } = useI18n()
  const items = [
    { icon: '💛', label: t('Support our crowdfunding'), sub: t('Help Eunora reach more teens'), href: safeUrl(LINKS.crowdfunding), ext: true, bg: 'linear-gradient(135deg,#d9b46a,#c49a42)' },
    { icon: '📸', label: t('Follow us on Instagram'), sub: t('Stories, news and updates'), href: safeUrl(LINKS.instagram), ext: true, bg: 'linear-gradient(135deg,#b48aa8,#8a7aa8)' },
    { icon: '✉️', label: t('Email us'), sub: safeEmail(LINKS.email) || '', href: safeEmail(LINKS.email) ? `mailto:${safeEmail(LINKS.email)}` : '', ext: false, bg: 'linear-gradient(135deg,#9AB3CA,#7a9ab0)' },
  ]
  return (
    <div style={{ position: 'relative', zIndex: 2, flex: '1 1 340px', maxWidth: 480, background: 'rgba(255,255,255,.78)', border: '1.5px solid rgba(154,179,202,.28)', borderRadius: 20, padding: '26px 24px', textAlign: 'center', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 30, marginBottom: 4 }} aria-hidden>🧭</div>
      <h3 className="font-display" style={{ fontSize: 'clamp(22px,4vw,28px)', fontWeight: 400, color: '#2c4a5c', margin: '0 0 6px' }}>{t('Stay connected')}</h3>
      <p style={{ fontSize: 14, color: '#6a8a98', lineHeight: 1.65, margin: '0 0 16px' }}>{t('Support Eunora, follow along or just say hello.')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto', marginBottom: 'auto' }}>
        {items.map(it => {
          const body = (
            <>
              <span style={{ fontSize: 22 }} aria-hidden>{it.icon}</span>
              <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
                <span style={{ fontSize: 14.5, fontWeight: 800 }}>{it.label}</span>
                <span style={{ fontSize: 12.5, opacity: .9, fontWeight: 600, overflowWrap: 'anywhere' }}>{it.href ? it.sub : t('Coming soon')}</span>
              </span>
              {it.href && <span style={{ marginLeft: 'auto', fontSize: 18 }} aria-hidden>→</span>}
            </>
          )
          const style = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 16, textDecoration: 'none', fontFamily: 'Nunito,sans-serif', color: 'white', background: it.bg, boxShadow: '0 6px 16px rgba(44,74,92,.14)' } as const
          return it.href
            ? <a key={it.label} href={it.href} {...(it.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={style}>{body}</a>
            : <div key={it.label} aria-disabled="true" style={{ ...style, background: 'rgba(154,179,202,.35)', color: '#5a7a92', boxShadow: 'none' }}>{body}</div>
        })}
      </div>
    </div>
  )
}
