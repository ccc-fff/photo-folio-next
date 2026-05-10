import type { MetadataRoute } from 'next'
import { getSiteData } from '@/lib/data'

export const dynamic = 'force-static'

const BASE_URL = 'https://fredericfornini.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { series } = await getSiteData()
  const today = new Date()

  const routes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 1.0,
    }
  ]

  for (const s of series) {
    if (!s.slug) continue
    routes.push({
      url: `${BASE_URL}/${s.slug}`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.8,
    })
  }

  return routes
}
