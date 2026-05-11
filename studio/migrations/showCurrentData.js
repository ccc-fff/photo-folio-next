import { getCliClient } from 'sanity/cli'
const client = getCliClient()

async function showData() {
  const series = await client.fetch('*[_type == "series"]{title, description, _id} | order(orderRank asc)')
  const about = await client.fetch('*[_type == "about"][0]{bio}')

  console.log("=== SÉRIES ===")
  for (const s of series) {
    const title = s.title?.fr || s.title || 'Sans titre'
    console.log(`\n📷 ${title} (${s._id}):`)

    if (s.description?.fr && Array.isArray(s.description.fr) && s.description.fr.length > 0) {
      const text = s.description.fr.map(block =>
        block.children?.map(c => c.text).join('') || ''
      ).join('\n')
      console.log(`  FR: ${text.substring(0, 150)}${text.length > 150 ? '...' : ''}`)
    } else {
      console.log(`  FR: (vide)`)
    }
  }

  console.log("\n=== ABOUT ===")
  if (about?.bio?.fr && Array.isArray(about.bio.fr)) {
    const bioText = about.bio.fr.map(block =>
      block.children?.map(c => c.text).join('') || ''
    ).join('\n')
    console.log(`FR: ${bioText}`)
  } else {
    console.log("Bio: (vide)")
  }
}

showData()
