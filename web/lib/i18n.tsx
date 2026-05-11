'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Locale = 'fr' | 'en'

// Type pour les champs localisés
export type LocalizedField<T> = { fr: T; en: T } | undefined | null

interface I18nContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: <T>(field: LocalizedField<T>) => T | undefined
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // 1. Check localStorage
    const saved = localStorage.getItem('locale') as Locale | null
    if (saved === 'fr' || saved === 'en') {
      setLocaleState(saved)
    } else {
      // 2. Detect browser language
      const browserLang = navigator.language.slice(0, 2).toLowerCase()
      if (browserLang === 'en') {
        setLocaleState('en')
      }
    }
    setIsHydrated(true)
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('locale', l)
  }

  const t = <T,>(field: LocalizedField<T>): T | undefined => {
    if (!field) return undefined
    // Return current locale, fallback to FR if not available
    return field[locale] ?? field.fr
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
