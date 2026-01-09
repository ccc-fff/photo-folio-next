# Instructions Claude Code

## CHECKLIST OBLIGATOIRE AVANT TOUTE MODIFICATION

**AVANT de toucher au code :**

1. [ ] **Git status** - Y a-t-il des changements non commités ?
2. [ ] **Lire les fichiers concernés** - Comprendre l'existant AVANT de modifier
3. [ ] **Proposer un plan** - Décrire ce que je vais faire et ATTENDRE confirmation
4. [ ] **Commit de sauvegarde** - `git add . && git commit -m "avant modif X"`

**APRES modification :**

5. [ ] **Test local** - `npm run dev` avant deploy
6. [ ] **Commit** - `git add . && git commit -m "feat: description"`
7. [ ] **Deploy** - Seulement si test local OK et utilisateur demande

**Si l'utilisateur dit "fais X" :**
- Ne PAS foncer tete baissee
- D'ABORD lire l'existant
- ENSUITE proposer un plan
- ENFIN executer apres validation

---

## Methodologie de resolution de problemes

**Ne pas se precipiter sur la premiere solution.**

Avant de modifier du code :

1. **Diagnostiquer** - Comprendre POURQUOI ca fonctionne ailleurs avant de toucher au code qui ne fonctionne pas
2. **Comparer** - Identifier les differences structurelles entre ce qui marche et ce qui ne marche pas
3. **Considerer le contexte global** - Verifier comment la solution s'integre dans l'architecture existante
4. **Eviter les patches** - Si une solution necessite des hacks (isolation, z-index multiples, duplication), c'est probablement la mauvaise approche
5. **Poser la bonne question** - "Pourquoi X fonctionne et pas Y ?" plutot que "Comment faire marcher Y ?"

---

## Architecture du projet

### Stack
- **Next.js 16** avec App Router
- **Sanity CMS** pour le contenu (images, series, about, siteSettings)
- **TypeScript**

### Structure des layers (z-index)

```
html                    → fond unique anime (transition 850ms)
  body                  → transparent
    .grid-container     → transparent
      Header            → z-index: 100, mix-blend-mode: difference
      .grid-canvas      → images de la grille
      Menu              → z-index: 500 (desktop: transparent + blend, mobile: transparent)
      Viewer            → z-index: 1000 (image seule)
      ViewerUI          → z-index: 1001, mix-blend-mode: difference
```

### Gestion des couleurs
- **Source unique** : Sanity (`siteSettings.defaultBackgroundColor`, `series.backgroundColor`)
- **Propagation** : `useEffect` dans Grid.tsx → `document.documentElement.style.backgroundColor`
- **CSS variable** : `--background-color` pour les composants enfants
- **Transition** : 850ms ease sur `html`

### Composants cles
- **useSequencer** : gere les transitions comme des timelines
- **useGridVirtualization** : affiche uniquement les images visibles
- **Grid.tsx** : composant principal, orchestre tout

---

## Prochaines etapes (TODO)

### SEO & Routing
- [ ] Pages dediees par serie (`/series/[slug]`)
- [ ] Meta tags dynamiques (titre, description, og:image par serie)
- [ ] Sitemap.xml
- [ ] robots.txt

### Optionnel
- [ ] Favicon
- [ ] Page contact
- [ ] Traductions anglais (fichier TRADUCTIONS_ANGLAIS.md existe)
