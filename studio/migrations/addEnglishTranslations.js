/**
 * Migration : Ajouter les traductions anglaises
 *
 * Usage: npx sanity exec migrations/addEnglishTranslations.js --with-user-token
 */
import { getCliClient } from 'sanity/cli'

const client = getCliClient()

// Helper pour créer un bloc de texte Portable Text
function textToBlocks(text) {
  return text.split('\n\n').map((paragraph, i) => ({
    _type: 'block',
    _key: `en-${i}`,
    style: 'normal',
    children: [{ _type: 'span', _key: `span-${i}`, text: paragraph }],
    markDefs: []
  }))
}

const translations = {
  // Phusis
  '02016502-3b20-467a-a383-cba80dc8de7f': {
    description: `At night, under the flash, plants emerge. Torn from the indistinction of the landscape, they appear as they truly are: forms that think. Creatures without movement, without voice—yet they express themselves. Their language is one of shapes, textures, tensions. Each stem, each leaf, each thorn speaks of a strategy, an adaptation, a silent will.

In this series, I seek to capture what usually escapes us: the intelligence of plants. Not a human intelligence, but something older, more patient. An intelligence that unfolds over millennia, that negotiates with light, wind, and soil.

The flash isolates them, extracts them from their environment. Suddenly, we see them. Truly see them.`
  },

  // Fiat lux
  '0550cf9f-b803-4cd5-9c1f-3f113d87b998': {
    description: `God said: Let there be light! And there was light.

Since that first day when darkness was separated from brightness, humanity has never stopped pushing back the night. From the flame of the first torch to the neon glow of our cities, we have woven a luminous web around the world.

This series explores our relationship with artificial light. Not as mere illumination, but as a language, a territory marker, a promise. In the urban night, each light source tells a story: of welcome or exclusion, of work or leisure, of presence or absence.

Between shadows and glare, between intimacy and spectacle, these images question what we choose to reveal and what we prefer to leave in darkness.`
  },

  // Dans la rue
  '0837e52f-044b-4b22-b0d6-cc47fdcf1cec': {
    description: `"Hello! I photograph strangers on the street, would you agree to pose? I'll send you the images afterward."

This is more or less my approach when I stop someone whose face has caught my attention. A simple exchange, a few minutes stolen from the flow of the city, and sometimes, the beginning of a story.

Street portraiture is an exercise in trust. In a few seconds, we must establish a connection strong enough for the other person to give us something of themselves. No artifice, no preparation: just a face, a light, and the invisible thread that binds us for an instant.

These portraits are neither stolen nor staged. They are encounters.`
  },

  // U sudu
  '84098493-de8e-4848-8c2a-dd904a6dc406': {
    description: `This South is not a cardinal point; it is an invitation to lands where our polished humanity rediscovers the raw power of life.

Structures crack under the sun. Colors clash with a violence unknown in our temperate latitudes. Here, nature does not accommodate itself to human presence—it is humans who must negotiate their place within it.

Through these images, I seek to capture this tension between civilization and wilderness, between what we build and what resists us. The South as a state of being, where light reveals as much as it burns.`
  },

  // Entrailles
  'f7ac69c8-9991-40dd-9e12-263b9ef1a386': {
    description: `For a long time, I saw cars as nothing but trivial objects, visual pollution resulting from their omnipresence. It was an automobile at the end of its life, its hood open on a tangle of pipes and cables, that changed my perspective.

There is a strange beauty in these mechanical entrails. A complexity that echoes our own bodies, with their networks of vessels and nerves. These machines that carry us, that we inhabit daily, possess an anatomy that we never see.

This series explores this hidden territory. Under the polished bodywork, under the smooth design, lies another world: raw, functional, almost organic. A world of grease and metal, where each component tells the story of an engineering choice, a compromise between power and reliability.`
  }
}

// Bio About
const aboutBioEN = `Art director and photographer based in Paris, France.

Looking necessarily induces a set of questions; photographing is an invitation to meet them and to share with others this constantly renewed wonder at a world that does not go without saying.`

async function migrate() {
  console.log('🔄 Adding English translations...\n')

  // Migrate series
  for (const [id, data] of Object.entries(translations)) {
    const doc = await client.fetch(`*[_id == "${id}"][0]{title}`)
    if (!doc) {
      console.log(`⚠️  Document ${id} not found`)
      continue
    }

    await client
      .patch(id)
      .set({
        'description.en': textToBlocks(data.description)
      })
      .commit()

    console.log(`✅ ${doc.title?.fr}: English translation added`)
  }

  // Migrate about bio
  const about = await client.fetch('*[_type == "about"][0]')
  if (about) {
    await client
      .patch(about._id)
      .set({
        'bio.en': textToBlocks(aboutBioEN)
      })
      .commit()
    console.log(`✅ About bio: English translation added`)
  }

  console.log('\n✨ Done!')
}

migrate().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
