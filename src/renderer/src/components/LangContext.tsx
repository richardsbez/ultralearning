import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { type Lang, type Translations, loadLang, saveLang, loadTranslations, LANG_LABELS } from '../i18n'

interface LangCtx {
  lang: Lang
  t: Translations | null
  pendingLang: Lang | null   // set when user picked a new lang, awaiting restart
  setLang: (l: Lang) => void
  restart: () => void
}

const Ctx = createContext<LangCtx>({ lang: 'pt', t: null, pendingLang: null, setLang: () => {}, restart: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang] = useState<Lang>(loadLang)
  const [t, setT] = useState<Translations | null>(null)
  const [pendingLang, setPendingLang] = useState<Lang | null>(null)

  useEffect(() => {
    loadTranslations(lang).then(setT)
  }, [lang])

  const setLang = (newLang: Lang) => {
    if (newLang === lang) return
    saveLang(newLang)
    setPendingLang(newLang)
  }

  const restart = () => window.api.restartApp()

  return (
    <Ctx.Provider value={{ lang, t, pendingLang, setLang, restart }}>
      {children}
    </Ctx.Provider>
  )
}

export function useLang() { return useContext(Ctx) }

export function useT() {
  const { t, lang, pendingLang, setLang, restart } = useContext(Ctx)
  return { t: t!, lang, pendingLang, setLang, restart }
}

export { LANG_LABELS }
