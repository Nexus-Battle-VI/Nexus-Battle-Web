import { useEffect, useRef, useState } from 'react'

/** Measure the panel, including when it is narrower than the browser window. */
export const useBracketWidth = () => {
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1024)
  useEffect(() => {
    const element = container.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry && Number.isFinite(entry.contentRect.width) && entry.contentRect.width > 0) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])
  return { container, width }
}
