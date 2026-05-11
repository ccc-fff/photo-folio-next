/**
 * Migration : Convertir bio text vers rich text
 *
 * Usage: cd studio && npx sanity exec migrations/migrateBioToRichText.js --with-user-token
 */
import { getCliClient } from 'sanity/cli'

const client = getCliClient()

async function migrate() {
  const about = await client.fetch('*[_type == "about"][0]')
  if (!about) return console.log('Pas de document about trouvé')

  // Si bio.fr est une string (pas encore rich text)
  if (about.bio?.fr && typeof about.bio.fr === 'string') {
    const bioText = about.bio.fr
    await client
      .patch(about._id)
      .set({
        bio: {
          fr: [{
            _type: 'block',
            _key: 'bio-fr',
            style: 'normal',
            children: [{ _type: 'span', _key: 'span1', text: bioText }],
            markDefs: []
          }],
          en: []
        }
      })
      .commit()
    console.log('✅ Bio convertie en rich text')
  } else {
    console.log('Bio déjà en rich text ou vide')
  }
}

migrate().catch(err => {
  console.error('❌ Erreur:', err)
  process.exit(1)
})
