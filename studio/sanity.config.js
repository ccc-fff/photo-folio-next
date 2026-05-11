import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {colorInput} from '@sanity/color-input'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'fffolio',

  projectId: 'nbpf7c4u',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S, context) =>
        S.list()
          .title('Contenu')
          .items([
            // Séries avec drag-and-drop pour l'ordre
            orderableDocumentListDeskItem({
              type: 'series',
              title: 'Séries (ordre)',
              S,
              context
            }),
            // Séries en édition normale
            S.documentTypeListItem('series').title('Séries (édition)'),
            // À propos
            S.documentTypeListItem('about').title('À propos'),
            S.divider(),
            // Paramètres du site (singleton)
            S.listItem()
              .title('Paramètres du site')
              .child(
                S.document()
                  .schemaType('siteSettings')
                  .documentId('9c0f5fd2-94e7-466b-95e4-3eb734034dce')
              ),
          ])
    }),
    visionTool(),
    colorInput()
  ],

  schema: {
    types: schemaTypes,
  },
})
