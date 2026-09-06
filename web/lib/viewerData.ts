import { urlFor } from './sanity'
import { prettyImageUrl, imageFileName } from './prettyImageUrl'
import type { Series } from './data'

type LocalizedString = { fr: string; en: string } | string

function defaultTitle(title: LocalizedString | undefined): string {
  if (!title) return ''
  if (typeof title === 'string') return title
  return title.fr || title.en || ''
}

export function buildViewerData(
  series: Series,
  currentIndex: number = 0,
  titleResolver?: (title: LocalizedString | undefined) => string
) {
  const resolveTitle = titleResolver || defaultTitle
  const imgBuilder = (asset: unknown, w: number, name: string) =>
    prettyImageUrl(urlFor(asset).width(w).auto('format').url(), name)

  const seriesImages = series.images.map((img, i) => {
    const fileName = imageFileName(series.slug, i)
    return {
    id: img._key,
    url: imgBuilder(img.asset, 1800, fileName),
    srcSet: `${imgBuilder(img.asset, 1200, fileName)} 1200w, ${imgBuilder(img.asset, 1800, fileName)} 1800w, ${imgBuilder(img.asset, 2400, fileName)} 2400w`,
    alt: img.alt || resolveTitle(series.title),
    seriesTitle: series.title,
    indexInSeries: i,
    totalInSeries: series.images.length
  }})

  const safeIndex = Math.max(0, Math.min(currentIndex, Math.max(0, seriesImages.length - 1)))

  return {
    seriesId: series._id,
    seriesImages,
    currentIndex: safeIndex,
    viewerScale: series.viewerScale ?? 100,
    backgroundColor: series.backgroundColor || null,
    description: series.description || null,
    credits: series.credits || null
  }
}

export type ViewerData = ReturnType<typeof buildViewerData>
