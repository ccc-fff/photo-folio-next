'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { MOTION_CONFIG } from '@/config/motion'

interface AnimState {
  state: string
  duration: number
  ease: string
}

interface SequenceStep {
  at: number | string
  set: Record<string, unknown>
}

type Sequence = SequenceStep[]

export const SEQUENCES: Record<string, Sequence> = {
  'open-viewer': [
    { at: 0, set: { header: false, grid: 'fading-out', motion: 'decelerating' } },
    { at: 'stagger-end', set: { grid: 'hidden', motion: 'paused', viewerBackground: { state: 'visible', duration: 300, ease: 'ease-out' } } },
    { at: 'stagger-end+300', set: { viewerImage: { state: 'visible', duration: 500, ease: 'ease-out' } } },
    { at: 'stagger-end+500', set: { viewerUI: { state: 'visible', duration: 200, ease: 'ease-out' } } },
  ],
  'close-viewer': [
    { at: 0, set: { viewerUI: { state: 'hidden', duration: 200, ease: 'ease-in' }, viewerImage: { state: 'hidden', duration: 500, ease: 'ease-in' } } },
    { at: 300, set: { viewerBackground: { state: 'hidden', duration: 300, ease: 'ease-in' } } },
    { at: 600, set: { viewer: null, grid: 'fading-in', motion: 'accelerating' } },
    { at: 'stagger-end', set: { header: true, grid: 'visible', motion: 'active' } },
  ],
  'open-menu': [
    { at: 0, set: { header: false, grid: 'fading-out', motion: 'decelerating' } },
    { at: 'stagger-end', set: { menu: true, grid: 'menu-mode', motion: 'scroll-only', highlightTransitionDuration: 0 } },
  ],
  'close-menu': [
    { at: 0, set: { menu: false, highlightedSeriesId: null, grid: 'fading-in', motion: 'accelerating' } },
    { at: 'stagger-end', set: { header: true, grid: 'visible', motion: 'active' } },
  ],
  'initial-load': [
    { at: 0, set: { grid: 'fading-in', motion: 'active' } },
    { at: 'stagger-end', set: { header: true, grid: 'visible' } },
  ],
  'show-infos': [
    { at: 0, set: { viewerBlur: { state: 'active', duration: 600, ease: 'ease-out' } } },
    { at: 400, set: { viewerInfos: { state: 'visible', duration: 450, ease: 'ease-out' } } },
  ],
  'hide-infos': [
    { at: 0, set: { viewerInfos: { state: 'hidden', duration: 450, ease: 'ease-in' } } },
    { at: 450, set: { viewerBlur: { state: 'inactive', duration: 600, ease: 'ease-out' } } },
  ],
}

export interface SequencerState {
  header: boolean
  grid: string
  motion: string
  viewer: unknown
  menu: boolean
  highlightedSeriesId: string | null
  highlightTransitionDuration: number
  viewerBackground: AnimState
  viewerImage: AnimState
  viewerUI: AnimState
  viewerBlur: AnimState
  viewerInfos: AnimState
}

export const INITIAL_STATE: SequencerState = {
  header: false,
  grid: 'initial-hidden',
  motion: 'active',
  viewer: null,
  menu: false,
  highlightedSeriesId: null,
  highlightTransitionDuration: MOTION_CONFIG.HIGHLIGHT.appear,
  viewerBackground: { state: 'hidden', duration: 300, ease: 'ease-out' },
  viewerImage: { state: 'hidden', duration: 500, ease: 'ease-out' },
  viewerUI: { state: 'hidden', duration: 200, ease: 'ease-out' },
  viewerBlur: { state: 'inactive', duration: 200, ease: 'ease-out' },
  viewerInfos: { state: 'hidden', duration: 200, ease: 'ease-out' },
}

interface PlayParams {
  staggerDuration?: number
  data?: Record<string, unknown>
}

export function useSequencer(initialState: SequencerState) {
  const [state, setState] = useState(initialState)
  const [isPlaying, setIsPlaying] = useState(false)
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])
  const currentSequenceRef = useRef<string | null>(null)

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  useEffect(() => {
    return () => {
      clearTimeouts()
    }
  }, [clearTimeouts])

  const play = useCallback((sequenceName: string, params: PlayParams = {}) => {
    const sequence = SEQUENCES[sequenceName]
    if (!sequence) {
      console.warn(`[useSequencer] Séquence inconnue : ${sequenceName}`)
      return
    }

    clearTimeouts()
    currentSequenceRef.current = sequenceName
    setIsPlaying(true)

    const { staggerDuration = 0, data = {} } = params

    let maxDelay = 0

    sequence.forEach(step => {
      let delay = 0
      if (step.at === 'stagger-end') {
        delay = staggerDuration
      } else if (typeof step.at === 'string' && step.at.startsWith('stagger-end+')) {
        const offset = parseInt(step.at.replace('stagger-end+', ''), 10)
        delay = staggerDuration + offset
      } else if (typeof step.at === 'number') {
        delay = step.at
      }

      maxDelay = Math.max(maxDelay, delay)

      const timeout = setTimeout(() => {
        setState(prev => ({
          ...prev,
          ...step.set,
          ...(delay === 0 ? data : {}),
        }))
      }, delay)

      timeoutsRef.current.push(timeout)
    })

    const endTimeout = setTimeout(() => {
      setIsPlaying(false)
      currentSequenceRef.current = null
    }, maxDelay + 50)

    timeoutsRef.current.push(endTimeout)
  }, [clearTimeouts])

  const set = useCallback((newState: Partial<SequencerState>) => {
    setState(prev => ({ ...prev, ...newState }))
  }, [])

  return {
    state,
    play,
    set,
    isPlaying,
    currentSequence: currentSequenceRef.current,
  }
}
