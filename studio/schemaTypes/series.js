/**
 * Schéma Sanity : Série photo
 *
 * Une série = une collection d'images ordonnées avec métadonnées.
 * L'ordre des images est crucial (progression narrative).
 *
 * i18n: Champs localisés FR/EN (title, description, shortDescription, client)
 */
import { localizedString, localizedRichText } from './helpers/localizedFields'

export default {
  name: 'series',
  title: 'Série',
  type: 'document',
  fields: [
    // Titre localisé
    localizedString('title', 'Titre', {
      validation: Rule => Rule.required()
    }),
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL de la série (auto-généré depuis le titre FR)',
      options: { source: 'title.fr' },
      validation: Rule => Rule.required()
    },
    {
      name: 'orderRank',
      title: 'Order Rank',
      type: 'string',
      hidden: true  // Géré automatiquement par le plugin drag-and-drop
    },
    {
      name: 'hidden',
      title: 'Masquer',
      type: 'boolean',
      description: 'Cocher pour cacher cette série du site (sans la supprimer)',
      initialValue: false
    },
    {
      name: 'gridCount',
      title: 'Images sur la grille',
      type: 'number',
      description: 'Combien d\'images de cette série afficher sur la homepage',
      validation: Rule => Rule.required().min(1)
    },
    {
      name: 'images',
      title: 'Images',
      type: 'array',
      description: 'Glisser-déposer pour réordonner (progression narrative)',
      of: [{
        type: 'image',
        options: { hotspot: true },
        fields: [
          {
            name: 'alt',
            title: 'Texte alternatif',
            type: 'string',
            description: 'Description pour l\'accessibilité et le SEO'
          }
        ]
      }],
      validation: Rule => Rule.required().min(1)
    },
    // Description rich text localisée
    localizedRichText('description', 'Description'),
    // Description courte localisée
    localizedString('shortDescription', 'Description courte'),
    // Client localisé
    localizedString('client', 'Client'),
    {
      name: 'backgroundColor',
      title: 'Couleur de fond',
      type: 'color',
      description: 'Couleur de fond pour la visionneuse (optionnel, défaut: blanc)',
      options: {
        disableAlpha: true
      }
    }
  ],
  // Tri par défaut dans le Studio
  orderings: [
    {
      title: 'Ordre manuel',
      name: 'orderRankAsc',
      by: [{ field: 'orderRank', direction: 'asc' }]
    }
  ],
  // Aperçu dans la liste du Studio
  preview: {
    select: {
      title: 'title.fr',
      subtitle: 'client.fr',
      media: 'images.0'
    }
  }
}
