/**
 * Champs localisés (fr/en) venant de Sanity — source unique du type et de la
 * résolution d'un titre. Module neutre (ni client ni serveur) : utilisé au
 * build (viewerData, data) et dans le navigateur (via useI18n().title).
 */
export type Locale = 'fr' | 'en'

export type LocalizedString = { fr: string; en: string } | string

/** Titre dans la langue demandée, repli sur le français. */
export function resolveTitle(title: LocalizedString | undefined | null, locale: Locale = 'fr'): string {
  if (!title) return ''
  if (typeof title === 'string') return title
  return title[locale] || title.fr || ''
}
