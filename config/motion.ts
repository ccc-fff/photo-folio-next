/**
 * Configuration du mouvement
 *
 * Système de "physique" unifié pour tous les mouvements de la grille.
 */

export const MOTION_CONFIG = {
  // PHYSIQUE GLOBALE
  PHYSICS: {
    lerp: {
      desktop: 0.04,
      mobile: 0.08,
      transition: 0.02,
    },
    friction: 0.92,
    transitionFriction: 0.96,
    threshold: 0.1,
  },

  // SOURCES DE VÉLOCITÉ
  SOURCES: {
    mouse: {
      maxSpeed: 24,
      deadZone: 0.15,
      curve: 2,
    },
    autoScroll: {
      minSpeed: 0.5,
      maxSpeed: 8,
      decay: 0.998,
    },
    wheel: {
      multiplier: 0.45,
    },
    drag: {
      threshold: 5,
      maxVelocity: 70,
    },
  },

  // STAGGER (animations)
  STAGGER_OFFSET: 45,
  STAGGER_ITEM_FADE: 1200,
  STAGGER_EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // PROXIMITY SCALE
  PROXIMITY: {
    scaleMin: 1.0,
    scaleMax: 1.5,
    radiusRatio: 0.5,
    falloff: 2,
    lerp: 0.10,
  },

  // HIGHLIGHT SERIES
  HIGHLIGHT: {
    appear: 450,
    switch: 650,
    disappear: 450,
  },

  // TRANSITIONS
  TRANSITIONS: {
    viewer: { duration: 0.25, ease: 'easeOut' },
    viewerBackground: { duration: 0.3, ease: 'easeOut' },
    viewerImage: { duration: 0.2, ease: 'easeInOut' },
    description: { duration: 0.2, ease: 'easeOut' },
  },

  // LEGACY
  FRICTION: 0.92,
  VELOCITY_THRESHOLD: 0.1,
  WHEEL_MULTIPLIER: 0.45,
  MOUSE_MAX_SPEED: 24,
  DEAD_ZONE_RATIO: 0.15,
  MOUSE_CURVE_POWER: 2,
  MOUSE_RAMP_UP_TIME: 500,
  AUTO_SCROLL_MIN_SPEED: 0.5,
  AUTO_SCROLL_MAX_SPEED: 8,
  AUTO_SCROLL_DECAY: 0.998,
  DRAG_THRESHOLD: 5,
  DRAG_VELOCITY_MAX: 70,
  PROXIMITY_SCALE_MIN: 1.0,
  PROXIMITY_SCALE_MAX: 1.5,
  PROXIMITY_RADIUS_RATIO: 0.5,
  PROXIMITY_FALLOFF: 2,
  PROXIMITY_LERP_FACTOR: 0.06,
}
