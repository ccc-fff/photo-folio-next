'use client'

import { useRef, useEffect } from 'react'
import { MOTION_CONFIG } from '@/config/motion'

interface Velocity {
  x: number
  y: number
}

interface UseDragOptions {
  onDrag?: (dx: number, dy: number, isDragging: boolean, finalVelocity: Velocity | null) => void
  threshold?: number
  velocityMax?: number
}

export function useDrag(options: UseDragOptions = {}) {
  const {
    onDrag,
    threshold = MOTION_CONFIG.SOURCES.drag.threshold,
    velocityMax = MOTION_CONFIG.SOURCES.drag.maxVelocity
  } = options

  const containerRef = useRef<HTMLDivElement | null>(null)
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const lastPos = useRef({ x: 0, y: 0 })
  const lastTime = useRef(0)
  const hasMoved = useRef(false)
  const velocity = useRef({ x: 0, y: 0 })

  const onDragRef = useRef(onDrag)
  onDragRef.current = onDrag

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') return

      isDragging.current = true
      hasMoved.current = false
      startPos.current = { x: e.pageX, y: e.pageY }
      lastPos.current = { x: e.pageX, y: e.pageY }
      lastTime.current = Date.now()
      velocity.current = { x: 0, y: 0 }
      container.style.userSelect = 'none'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return

      const dx = e.pageX - lastPos.current.x
      const dy = e.pageY - lastPos.current.y
      const totalDx = e.pageX - startPos.current.x
      const totalDy = e.pageY - startPos.current.y

      if (!hasMoved.current && (Math.abs(totalDx) > threshold || Math.abs(totalDy) > threshold)) {
        hasMoved.current = true
      }

      if (hasMoved.current) {
        onDragRef.current?.(-dx, -dy, true, null)

        const now = Date.now()
        const dt = now - lastTime.current

        if (dt > 0) {
          const vx = -dx / dt * 16
          const vy = -dy / dt * 16
          velocity.current.x = Math.max(-velocityMax, Math.min(velocityMax, vx))
          velocity.current.y = Math.max(-velocityMax, Math.min(velocityMax, vy))
        }

        lastPos.current = { x: e.pageX, y: e.pageY }
        lastTime.current = now
      }
    }

    const handleMouseUp = () => {
      if (isDragging.current && hasMoved.current) {
        onDragRef.current?.(0, 0, false, { x: velocity.current.x, y: velocity.current.y })
      } else if (isDragging.current) {
        onDragRef.current?.(0, 0, false, null)
      }

      isDragging.current = false
      hasMoved.current = false
      container.style.userSelect = ''
    }

    const handleMouseLeave = () => {
      if (isDragging.current) {
        if (hasMoved.current) {
          onDragRef.current?.(0, 0, false, { x: velocity.current.x, y: velocity.current.y })
        } else {
          onDragRef.current?.(0, 0, false, null)
        }
        isDragging.current = false
        hasMoved.current = false
        container.style.userSelect = ''
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      const scrollableParent = target.closest('.menu-content-mobile, .viewer-description, [data-scrollable]')
      if (scrollableParent) {
        isDragging.current = false
        return
      }

      const touch = e.touches[0]
      isDragging.current = true
      hasMoved.current = false
      startPos.current = { x: touch.pageX, y: touch.pageY }
      lastPos.current = { x: touch.pageX, y: touch.pageY }
      lastTime.current = Date.now()
      velocity.current = { x: 0, y: 0 }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return

      const touch = e.touches[0]
      const dx = touch.pageX - lastPos.current.x
      const dy = touch.pageY - lastPos.current.y
      const totalDx = touch.pageX - startPos.current.x
      const totalDy = touch.pageY - startPos.current.y

      if (!hasMoved.current && (Math.abs(totalDx) > threshold || Math.abs(totalDy) > threshold)) {
        hasMoved.current = true
      }

      if (hasMoved.current) {
        e.preventDefault()
        onDragRef.current?.(-dx, -dy, true, null)

        const now = Date.now()
        const dt = now - lastTime.current

        if (dt > 0) {
          const vx = -dx / dt * 16
          const vy = -dy / dt * 16
          velocity.current.x = Math.max(-velocityMax, Math.min(velocityMax, vx))
          velocity.current.y = Math.max(-velocityMax, Math.min(velocityMax, vy))
        }

        lastPos.current = { x: touch.pageX, y: touch.pageY }
        lastTime.current = now
      }
    }

    const handleTouchEnd = () => {
      if (isDragging.current && hasMoved.current) {
        onDragRef.current?.(0, 0, false, { x: velocity.current.x, y: velocity.current.y })
      } else if (isDragging.current) {
        onDragRef.current?.(0, 0, false, null)
      }

      isDragging.current = false
      hasMoved.current = false
    }

    container.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('mouseleave', handleMouseLeave)
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    container.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('mouseleave', handleMouseLeave)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [threshold, velocityMax])

  return containerRef
}
