// Entrailles EN : « failings » → « quirks » (décision FF 12/11/2026 : « travers » = petits vices, pas des fautes morales).
// Lancer : npx sanity exec migrations/2026-11-12-entrailles-quirks.js --with-user-token  (DRY=1 pour simuler)
import {getCliClient} from 'sanity/cli'
import fs from 'node:fs'
const client = getCliClient({apiVersion: '2024-01-01'})
const ID = 'f7ac69c8-9991-40dd-9e12-263b9ef1a386'
async function main() {
  const doc = await client.getDocument(ID)
  const bak = 'migrations/backup-entrailles-description-2026-11-12.json'
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, JSON.stringify({description: doc.description, _rev: doc._rev}, null, 2))
  let n = 0
  const en = doc.description.en.map(b => ({...b, children: (b.children || []).map(s => {
    if (typeof s.text === 'string' && s.text.includes('failings')) { n++; return {...s, text: s.text.replace('failings', 'quirks')} }
    return s
  })}))
  console.log('occurrences « failings » dans EN :', n)
  if (n !== 1) { console.log('attendu 1 — rien écrit'); process.exit(1) }
  if (process.env.DRY) { console.log('DRY — rien écrit'); return }
  const res = await client.patch(ID).ifRevisionId(doc._rev).set({'description.en': en}).commit()
  console.log('publié, rev', res._rev)
}
main().catch(e => { console.error(e.message); process.exit(1) })
