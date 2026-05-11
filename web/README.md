# Photo-Folio Next

Portfolio photo de Frédéric Fornini — grille infinie avec navigation immersive.

**Site** : [fredericfornini.com](https://fredericfornini.com)

## Stack technique

- **Next.js 15** (App Router, SSG)
- **Sanity CMS** (contenu, images CDN)
- **TypeScript**
- **Vercel** (déploiement)

## Architecture

```
app/
  page.tsx          # Page principale (SSG)
  layout.tsx        # Layout global

components/
  Grid.tsx          # Orchestrateur principal
  GridCanvas.tsx    # Canvas infini avec virtualisation
  GridBlock.tsx     # Bloc image individuel
  Viewer.tsx        # Visionneuse plein écran
  ViewerUI.tsx      # UI overlay (titre, navigation)
  Menu.tsx          # Menu latéral (séries, about)
  Header.tsx        # En-tête fixe

hooks/
  useGridVirtualization.ts  # Virtualisation + animations proximité

utils/
  gridGenerator.ts  # Génération grille irrégulière

config/
  grid.ts           # Configuration grille

lib/
  data.ts           # Fetching Sanity
  sanity.ts         # Client Sanity
```

## Système de grille

La grille utilise un algorithme de placement avec **contrainte mâle-femelle** pour permettre un tiling infini sans chevauchement.

### Principe

Quand une image occupe un bord de la grille, la position opposée est interdite :

```
Image au bord gauche (x=0) → interdit bord droit (x=L-1)
Image en haut (y=0)        → interdit en bas (y=H-1)
Coin (0,0)                 → interdit coin (L-1,H-1)
```

Cela garantit que lors du tiling (répétition de la grille), les images ne se chevauchent jamais.

### Configuration

```typescript
// config/grid.ts
export const GRID_CONFIG = {
  BLOCK_HEIGHT_VH: 20,    // Hauteur bloc en vh
  BLOCK_WIDTH_VH: 20,     // Largeur bloc en vh
  BLOCKS_PER_IMAGE: 2,    // Taille image (2x2 blocs)
  FILL_RATIO: 0.45,       // Densité (0.3 = aéré, 0.6 = dense)
  SCALES: [...]           // Distribution des échelles
}
```

## Développement

```bash
# Installation
npm install

# Dev server
npm run dev

# Build production
npm run build

# Preview build
npm run start
```

## Déploiement

Le site est déployé automatiquement sur Vercel.

```bash
npx vercel --prod
```

## Sanity Studio

Le studio Sanity est dans `/studio` (projet séparé).

```bash
cd studio
npm run dev      # Dev studio
npx sanity deploy   # Déployer
```

## Roadmap

- [x] Migration React SPA → Next.js SSG
- [x] Fix overlap grille (contraintes diagonales)
- [x] Fix memory leaks (preloader, scales map)
- [ ] URLs pour séries (`/series/[slug]`)
- [ ] Rich text descriptions (Portable Text)
- [ ] Internationalisation (fr/en)

---

Lighthouse Score: **90+**
