/**
 * Schéma Sanity : Page À propos
 *
 * Document singleton (un seul dans la base).
 * Contient bio et liens de contact dynamiques.
 *
 * i18n: Champs localisés FR/EN (bio, contacts.label)
 */
import { localizedRichText, localizedString } from './helpers/localizedFields'

export default {
  name: 'about',
  title: 'À propos',
  type: 'document',
  fields: [
    // Bio localisée (rich text)
    localizedRichText('bio', 'Biographie'),
    {
      name: 'contacts',
      title: 'Liens de contact',
      type: 'array',
      description: 'Glisser-déposer pour réordonner',
      of: [{
        type: 'object',
        fields: [
          // Label localisé
          localizedString('label', 'Nom affiché'),
          {
            name: 'value',
            title: 'Valeur',
            type: 'string',
            description: 'Ex: frederic@fornini.com ou URL complète',
            validation: Rule => Rule.required()
          },
          {
            name: 'type',
            title: 'Type',
            type: 'string',
            options: {
              list: [
                { title: 'Email', value: 'email' },
                { title: 'URL externe', value: 'url' },
                { title: 'Texte simple', value: 'text' }
              ],
              layout: 'radio'
            },
            initialValue: 'url',
            description: 'Email = mailto:, URL = ouvre nouvel onglet'
          }
        ],
        preview: {
          select: {
            title: 'label.fr',
            subtitle: 'value'
          }
        }
      }]
    }
  ],
  // Aperçu dans la liste du Studio
  preview: {
    prepare() {
      return {
        title: 'À propos',
        subtitle: 'Bio et liens de contact'
      }
    }
  }
}
