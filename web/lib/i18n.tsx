'use client'

import { createContext, useCallback, useContext, useSyncExternalStore, ReactNode } from 'react'
import { resolveTitle, type Locale, type LocalizedString } from './localized'

export type { Locale } from './localized'

// Type pour les champs localisés
export type LocalizedField<T> = { fr: T; en: T } | undefined | null

interface I18nContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: <T>(field: LocalizedField<T>) => T | undefined
  /** Titre localisé (chaîne simple ou { fr, en }) — repli sur le français. */
  title: (field: LocalizedString | undefined | null) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

// La langue vit hors de React (localStorage + langue du navigateur) : on la lit
// avec useSyncExternalStore. Le HTML statique est en français (getServerSnapshot),
// la langue réelle s'applique à l'hydratation, comme avant.
const LOCALE_EVENT = 'locale-change'

function readLocale(): Locale {
  try {
    const saved = localStorage.getItem('locale')
    if (saved === 'fr' || saved === 'en') return saved
  } catch {
    // stockage indisponible (navigation privée stricte) : langue du navigateur
  }
  return navigator.language.slice(0, 2).toLowerCase() === 'en' ? 'en' : 'fr'
}

function subscribe(onChange: () => void) {
  window.addEventListener(LOCALE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(LOCALE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore<Locale>(subscribe, readLocale, () => 'fr')

  const setLocale = useCallback((l: Locale) => {
    try {
      localStorage.setItem('locale', l)
    } catch {
      // stockage indisponible : le choix ne survivra pas au rechargement
    }
    window.dispatchEvent(new Event(LOCALE_EVENT))
  }, [])

  const t = <T,>(field: LocalizedField<T>): T | undefined => {
    if (!field) return undefined
    // Return current locale, fallback to FR if not available
    return field[locale] ?? field.fr
  }

  const title = (field: LocalizedString | undefined | null) => resolveTitle(field, locale)

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, title }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
