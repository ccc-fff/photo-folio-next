/**
 * Bloc Rich Text pour descriptions
 *
 * Formatage disponible :
 * - Gras (strong) → font-weight: 600
 * - Medium → font-weight: 500
 * - Italique (em) → font-style: italic
 * - Liens → pour crédits collaborateurs
 */
export default {
  name: 'richTextBlock',
  title: 'Rich Text Block',
  type: 'block',
  styles: [
    { title: 'Normal', value: 'normal' }
  ],
  lists: [],
  marks: {
    decorators: [
      { title: 'Gras', value: 'strong' },
      { title: 'Medium', value: 'medium' },
      { title: 'Italique', value: 'em' }
    ],
    annotations: [
      {
        name: 'link',
        title: 'Lien',
        type: 'object',
        fields: [
          {
            name: 'href',
            title: 'URL',
            type: 'url',
            validation: Rule => Rule.required()
          }
        ]
      }
    ]
  }
}
