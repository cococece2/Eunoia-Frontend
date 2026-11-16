// Crisis and eating-disorder help, by language.
// Used by the AI chatbox's "get help now" card. Numbers were checked against official pages in Nov 2026.
// ⚠ Please re-check every number before launch (and ask a native speaker to read each language), because lines change.
//   Sources: 988lifeline.org, allianceforeatingdisorders.com, sanidad.gob.es/linea024, sante.fr (3114),
//   en.nhc.gov.cn (12356), since2011.net (Yorisoi Hotline), findahelpline.com (Korea).

export type Helpline = { name: string; how: string }
type LangCode = 'en' | 'ja' | 'es' | 'fr' | 'zh' | 'ko'

export const HELPLINES: Record<LangCode, Helpline[]> = {
  en: [
    { name: '988 Suicide & Crisis Lifeline (US)', how: 'Call or text 988, any time' },
    { name: 'Alliance for Eating Disorders helpline (US)', how: '(866) 662-1235, Mon–Fri 9am–7pm ET' },
    { name: 'Emergency', how: '911 (US) or your local emergency number' },
    { name: 'Other countries', how: 'findahelpline.com' },
  ],
  ja: [
    { name: 'よりそいホットライン', how: '0120-279-338（無料・24時間）' },
    { name: '緊急のとき', how: '救急 119 ／ 警察 110' },
    { name: '他の国・地域', how: 'findahelpline.com' },
  ],
  es: [
    { name: 'Línea 024 (España)', how: 'Llama al 024: gratuita, confidencial, 24 horas' },
    { name: '988 (EE. UU.)', how: 'Llama al 988 y pulsa 2, o envía AYUDA por mensaje de texto al 988' },
    { name: 'Emergencias', how: '112 (España) o el número de emergencias de tu país' },
    { name: 'Otros países', how: 'findahelpline.com' },
  ],
  fr: [
    { name: '3114 (France)', how: 'Appelle le 3114: gratuit, 24 h/24, 7 j/7' },
    { name: 'Urgence', how: '112, le 15 (SAMU), ou le numéro d’urgence de ton pays' },
    { name: 'Autres pays', how: 'findahelpline.com' },
  ],
  zh: [
    { name: '12356 心理援助热线', how: '拨打 12356（目前已在部分省份开通）' },
    { name: '紧急情况', how: '急救 120 ／ 报警 110' },
    { name: '其他国家和地区', how: 'findahelpline.com' },
  ],
  ko: [
    { name: '자살예방상담전화', how: '109' },
    { name: '청소년상담전화', how: '1388' },
    { name: '긴급 상황', how: '119 (구급) ／ 112 (경찰)' },
    { name: '다른 나라', how: 'findahelpline.com' },
  ],
}

// Words that suggest someone may be in danger. If a message matches, the chat shows the help card right away,
// whatever the AI replies. Not perfect, so the AI's own instructions also cover this.
export const CRISIS_WORDS =
  /(kill myself|suicid|end my life|want to die|don'?t want to (be here|live)|self[- ]?harm|hurt myself|cut myself|overdose|死にたい|自殺|消えたい|自傷|リストカット|生きていたくない|quitarme la vida|quiero morir|hacerme daño|autolesi|me tuer|envie de mourir|me faire du mal|automutil|自杀|想死|不想活|自残|轻生|자살|죽고 ?싶|자해|살기 싫)/i
