'use client'

/**
 * Événements personnalisés Umami.
 *
 * Le script (chargé en defer via /stats/script.js) expose `window.umami`.
 * L'URL courante est jointe automatiquement à chaque événement par Umami —
 * ne pas dupliquer série/index dans data, ils sont dans le path.
 * Si le script n'est pas encore prêt (événement très tôt après le load),
 * on retente brièvement puis on abandonne en silence (dev, bloqueurs).
 */
type TrackData = Record<string, string | number>

interface UmamiGlobal {
  track: (event: string, data?: TrackData) => void
}

export function track(event: string, data?: TrackData, attempt = 0) {
  const umami = (window as { umami?: UmamiGlobal }).umami
  if (umami?.track) {
    umami.track(event, data)
  } else if (attempt < 5) {
    setTimeout(() => track(event, data, attempt + 1), 500)
  }
}
