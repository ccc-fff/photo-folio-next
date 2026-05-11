/**
 * Helpers pour champs localisés (FR/EN)
 *
 * Structure : champ par champ avec sous-champs fr/en
 * Ex: title.fr, title.en
 */

/**
 * Champ string localisé
 */
export const localizedString = (name, title, options = {}) => ({
  name,
  title,
  type: 'object',
  fields: [
    {
      name: 'fr',
      title: '🇫🇷 Français',
      type: 'string',
      ...options
    },
    {
      name: 'en',
      title: '🇬🇧 English',
      type: 'string',
      ...options
    }
  ],
  options: {
    collapsible: false,
    columns: 2
  }
})

/**
 * Champ text (multilignes) localisé
 */
export const localizedText = (name, title, options = {}) => ({
  name,
  title,
  type: 'object',
  fields: [
    {
      name: 'fr',
      title: '🇫🇷 Français',
      type: 'text',
      rows: 4,
      ...options
    },
    {
      name: 'en',
      title: '🇬🇧 English',
      type: 'text',
      rows: 4,
      ...options
    }
  ],
  options: {
    collapsible: false
  }
})

/**
 * Champ rich text (Portable Text) localisé
 */
export const localizedRichText = (name, title) => ({
  name,
  title,
  type: 'object',
  fields: [
    {
      name: 'fr',
      title: '🇫🇷 Français',
      type: 'array',
      of: [{ type: 'richTextBlock' }]
    },
    {
      name: 'en',
      title: '🇬🇧 English',
      type: 'array',
      of: [{ type: 'richTextBlock' }]
    }
  ],
  options: {
    collapsible: false
  }
})
