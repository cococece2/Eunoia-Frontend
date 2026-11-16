import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { ja } from './i18n/ja'
import { es } from './i18n/es'
import { fr } from './i18n/fr'
import { zh } from './i18n/zh'
import { ko } from './i18n/ko'

// ── How translation works ────────────────────────────────────────────────────
// Your English text stays exactly where it is in the code. To make a piece of text translatable,
// wrap it:   t("Begin the Journey")
// The language files in src/i18n/ map each English sentence to its translation.
// If a translation is missing, the English text is shown, so nothing ever breaks.

export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'zh', label: '简体中文' },
  { code: 'ko', label: '한국어' },
] as const

export type Lang = (typeof LANGS)[number]['code']
type Vars = Record<string, string | number>
export type Dict = Record<string, string>

const DICTS: Record<Lang, Dict> = { en: {}, ja, es, fr, zh, ko }
const KEY = 'still-sailing-lang'

function fmt(s: string, vars?: Vars) {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`)) : s
}

/** Turns <i>word</i> and <b>word</b> inside a string into styled text. */
function rich(s: string): ReactNode {
  if (!/<[ib]>/.test(s)) return s
  return s.split(/(<i>.*?<\/i>|<b>.*?<\/b>)/g).map((part, i) => {
    const m = part.match(/^<(i|b)>(.*)<\/\1>$/)
    if (!m) return part
    return m[1] === 'i'
      ? <em key={i} style={{ fontStyle: 'italic', color: '#7a6a5a' }}>{m[2]}</em>
      : <b key={i}>{m[2]}</b>
  })
}

type I18n = {
  lang: Lang
  setLang: (l: Lang) => void
  /** Translate a plain string. */
  t: (s: string, vars?: Vars) => string
  /** Translate a string that contains <i>…</i> or <b>…</b>. */
  tr: (s: string, vars?: Vars) => ReactNode
}

const Ctx = createContext<I18n>({
  lang: 'en',
  setLang: () => {},
  t: (s, v) => fmt(s, v),
  tr: (s, v) => rich(fmt(s, v)),
})

export const useI18n = () => useContext(Ctx)

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && LANGS.some(l => l.code === saved)) return saved as Lang
  } catch { /* private window etc. */ }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase()
  const hit = LANGS.find(l => nav.startsWith(l.code))
  return hit ? hit.code : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang }, [lang])

  const value = useMemo<I18n>(() => {
    const dict = DICTS[lang]
    const t = (s: string, vars?: Vars) => fmt(dict[s] ?? s, vars)
    return {
      lang,
      setLang: (l: Lang) => {
        setLangState(l)
        try { localStorage.setItem(KEY, l) } catch { /* ignore */ }
      },
      t,
      tr: (s: string, vars?: Vars) => rich(t(s, vars)),
    }
  }, [lang])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** The language button for the top bar. Pass the same style object your other nav buttons use. */
export function LanguageToggle({ style }: { style?: CSSProperties }) {
  const { lang, setLang, t } = useI18n()
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...style }}>
      <span aria-hidden="true">🌐</span>
      <select
        value={lang}
        onChange={e => setLang(e.target.value as Lang)}
        aria-label={t('Language')}
        style={{ appearance: 'none', WebkitAppearance: 'none', background: 'transparent', border: 'none', color: 'inherit', font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', cursor: 'pointer', outline: 'none', padding: 0 }}
      >
        {LANGS.map(l => <option key={l.code} value={l.code} style={{ color: '#2c4a5c', textTransform: 'none' }}>{l.label}</option>)}
      </select>
    </label>
  )
}
