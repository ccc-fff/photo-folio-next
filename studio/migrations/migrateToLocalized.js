/**
 * Migration : Convertir les champs string vers localisés (fr/en)
 *
 * Usage: cd studio && npx sanity exec migrations/migrateToLocalized.js --with-user-token
 */
import { getCliClient } from 'sanity/cli'

const client = getCliClient()

async function migrate() {
  console.log('🔄 Début de la migration...\n')

  // 1. Migrer les séries
  const series = await client.fetch('*[_type == "series"]')
  console.log(`📷 ${series.length} séries à migrer`)

  for (const doc of series) {
    const patches = {}
    let needsPatch = false

    // Title: string → { fr, en }
    if (doc.title && typeof doc.title === 'string') {
      patches.title = { fr: doc.title, en: doc.title }
      needsPatch = true
    }

    // Description: string/text → { fr: [portable text], en: [] }
    if (doc.description && typeof doc.description === 'string') {
      patches.description = {
        fr: [{
          _type: 'block',
          _key: 'migrated-fr',
          style: 'normal',
          children: [{ _type: 'span', _key: 'span1', text: doc.description }],
          markDefs: []
        }],
        en: []
      }
      needsPatch = true
    }

    // ShortDescription: string → { fr, en }
    if (doc.shortDescription && typeof doc.shortDescription === 'string') {
      patches.shortDescription = { fr: doc.shortDescription, en: '' }
      needsPatch = true
    }

    // Client: string → { fr, en }
    if (doc.client && typeof doc.client === 'string') {
      patches.client = { fr: doc.client, en: doc.client }
      needsPatch = true
    }

    if (needsPatch) {
      await client
        .patch(doc._id)
        .set(patches)
        .commit()
      console.log(`  ✅ Série migrée: ${patches.title?.fr || doc.title?.fr || doc._id}`)
    }
  }

  // 2. Migrer about
  const about = await client.fetch('*[_type == "about"][0]')
  if (about) {
    console.log(`\n📝 Migration de "À propos"`)
    const patches = {}
    let needsPatch = false

    // Bio: text → { fr, en }
    if (about.bio && typeof about.bio === 'string') {
      patches.bio = { fr: about.bio, en: '' }
      needsPatch = true
    }

    // Contacts: migrer les labels
    if (about.contacts && Array.isArray(about.contacts)) {
      const migratedContacts = about.contacts.map(contact => {
        if (contact.label && typeof contact.label === 'string') {
          return {
            ...contact,
            label: { fr: contact.label, en: contact.label }
          }
        }
        return contact
      })
      patches.contacts = migratedContacts
      needsPatch = true
    }

    if (needsPatch) {
      await client
        .patch(about._id)
        .set(patches)
        .commit()
      console.log(`  ✅ À propos migré`)
    }
  }

  console.log('\n✨ Migration terminée !')
}

migrate().catch(err => {
  console.error('❌ Erreur:', err)
  process.exit(1)
})
