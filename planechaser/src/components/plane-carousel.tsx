'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import { CardZoomModal } from './card-zoom-modal'

export interface PlaneSlide {
  name: string
  imageUrl: string
  subtitle?: string
}

interface PlaneCarouselProps {
  slides: PlaneSlide[]
  emptyMessage: string
}

export function PlaneCarousel({ slides, emptyMessage }: PlaneCarouselProps) {
  const [emblaRef] = useEmblaCarousel({ loop: true, align: 'center' })
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)
  const [zoomAlt, setZoomAlt] = useState('')

  const handleTap = useCallback((slide: PlaneSlide) => {
    setZoomSrc(slide.imageUrl)
    setZoomAlt(slide.name)
  }, [])

  if (slides.length === 0) {
    return (
      <p className="text-center text-[12px] text-[var(--color-text-muted)] py-6" style={{ fontFamily: 'var(--font-body)' }}>
        {emptyMessage}
      </p>
    )
  }

  return (
    <>
      <div className="overflow-hidden -mx-4" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, i) => (
            <div
              key={`${slide.name}-${i}`}
              className="flex-[0_0_80%] min-w-0 px-2"
            >
              <button
                onClick={() => handleTap(slide)}
                className="w-full rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]/80 text-left cursor-pointer"
              >
                <div className="relative w-full aspect-[7/5] overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative h-[140%] aspect-[5/7] rotate-90">
                      <Image
                        src={slide.imageUrl}
                        alt={slide.name}
                        fill
                        className="object-contain"
                        sizes="(max-width: 480px) 80vw, 400px"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-end justify-between px-3 py-2">
                  <span className="text-[13px] font-semibold text-[var(--color-text)] truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                    {slide.name}
                  </span>
                  {slide.subtitle && (
                    <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 ml-2" style={{ fontFamily: 'var(--font-body)' }}>
                      {slide.subtitle}
                    </span>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      <CardZoomModal src={zoomSrc} alt={zoomAlt} onClose={() => setZoomSrc(null)} />
    </>
  )
}
