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
- **useGridVirtualization** : mur infini. React rend la liste des vignettes une fois par mise en page ; la boucle d'animation ecrit position / visibilite / echelle directement sur chaque element (`registerBlock`) et s'arrete quand rien ne bouge (`wake()` la relance). Ne JAMAIS remettre une position dans un state React : ca redessine toute la grille 60 fois par seconde.
- **Grid.tsx** : composant principal, orchestre tout. Vague d'apparition : `prepareStagger()` (seul endroit de ce calcul).
- **lib/localized.ts** : type `LocalizedString` + `resolveTitle()`, source unique ; dans les composants : `useI18n().title(...)`

### Hygiene (demande FF 10/11/2026)
- Avant d'ajouter un calcul : chercher s'il existe deja et l'appeler, pas le recopier.
- Apres une modification : retirer ce qu'elle rend inutile ; `npx eslint app components hooks lib utils config` doit rester a 0 alerte (0 le 10/11/2026).
- Hauteur d'ecran mobile : `100dvh` en CSS, pas de variable `--vh` calculee en JavaScript.

### iPhone : grille sous les barres Safari (mesure 11/11/2026, Safari iOS 26)
- Safari coupe tout element `fixed` ou `sticky` au-dessus de sa barre du bas et sous l'heure ; `viewport-fit=cover` seul ne change rien (marges a 0 mesurees) ; `100dvh`/`100lvh` ne suffisent pas.
- Seul le contenu d'une page **defilee** est peint partout. Montage retenu (mobile <= 768px) : document plus haut que l'ecran (`--bleed-top` 80px, `--bleed-bottom` 200px, `app/globals.css`), arrete a `--bleed-top` au chargement (`settleDocumentScroll`), `touch-action: none` sur `.grid-container` ; `.grid-stage` garde la geometrie de l'ecran pour tout le reste. Desktop : debords a 0.
- Le serveur de dev peut ne pas reprendre un fichier modifie (dossier Proton) : verifier le CSS servi avant de conclure a un echec, relancer `next dev` au besoin.

### Hebergement
- **Production : Vercel** (push sur `main` = deploiement), donnees Sanity.
- **Cloudflare : migration prevue** pour ouvrir un e-shop dans une autre section du site (offre gratuite Vercel = usage non commercial). Pilote : branche `pilote-cloudflare` (`wrangler.jsonc`, `cloudflare/worker.js`), adresse de test `*.workers.dev`, aucun domaine attache. Ne rien fusionner dans `main` sans decision de FF.

---

## Prochaines etapes (TODO)

Fait : pages par serie (`/[slug]`, `/[slug]/[n]`), meta dynamiques (`generateMetadata`), `sitemap.ts`, `robots.ts`, favicon, FR/EN (`lib/i18n.tsx`).

- [ ] Safari iPhone : la barre d'adresse ne se reduit pas (la page ne defile jamais ; elle se reduit sur une page qui defile vraiment, mesure 11/11)
- [ ] Mesure de vitesse : cle API PageSpeed a creer (quota a 0)
- [ ] Images via `/photos/` : jamais en cache Vercel (+40-60 ms par image, mesure 15/09/2026)
- [ ] E-shop + migration Cloudflare (voir Hebergement)
