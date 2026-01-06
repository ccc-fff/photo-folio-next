/**
 * Client Sanity pour Next.js
 *
 * Configuration pour le build statique (SSG)
 * Les requêtes sont faites au moment du build, pas à chaque visite
 */
import { createClient } from '@sanity/client'
import { createImageUrlBuilder } from '@sanity/image-url'

// Configuration du client
// En SSG, on utilise toujours le CDN car les données sont figées au build
export const client = createClient({
  projectId: 'nbpf7c4u',
  dataset: 'production',
  useCdn: true,           // Toujours CDN en SSG
  apiVersion: '2024-01-01'
})

// Helper pour les URLs d'images (named export au lieu de default)
const builder = createImageUrlBuilder({
  projectId: 'nbpf7c4u',
  dataset: 'production'
})

/**
 * Génère une URL d'image optimisée avec conversion WebP automatique
 */
export function urlFor(source: any) {
  return builder.image(source)
}
