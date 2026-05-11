/**
 * Schéma Sanity : Paramètres du site
 *
 * Document singleton contenant les paramètres globaux du site.
 */
export default {
  name: 'siteSettings',
  title: 'Paramètres du site',
  type: 'document',
  fields: [
    {
      name: 'defaultBackgroundColor',
      title: 'Couleur de fond par défaut',
      type: 'color',
      description: 'Utilisée quand une série n\'a pas de couleur définie',
      options: { disableAlpha: true },
      validation: Rule => Rule.required()
    }
  ],
  preview: {
    prepare() {
      return {
        title: 'Paramètres du site',
        subtitle: 'Couleur de fond par défaut'
      }
    }
  }
}
