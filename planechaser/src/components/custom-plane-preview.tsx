'use client'

import Image from 'next/image'

interface CustomPlanePreviewProps {
  name: string
  typeLine: string
  oracleText: string
  chaosText: string
  flavorText?: string
  imageUrl: string | null
}

export function CustomPlanePreview({
  name,
  typeLine,
  oracleText,
  chaosText,
  flavorText,
  imageUrl,
}: CustomPlanePreviewProps) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm overflow-hidden">
      {/* Card image */}
      <div className="relative w-full aspect-[16/9] bg-black/20">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name || 'Custom plane preview'}
            fill
            className="object-cover"
            sizes="(max-width: 520px) 100vw, 520px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-1">
              <span className="text-[28px]">🖼️</span>
              <p
                className="text-[10px] text-[var(--color-text-muted)]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Upload card art
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Card details */}
      <div className="p-4 space-y-2">
        {/* Name + type */}
        <div>
          <h3
            className="text-[16px] font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {name || 'Untitled Plane'}
          </h3>
          <p
            className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {typeLine || 'Plane — Custom'}
          </p>
        </div>

        {/* Oracle text */}
        {oracleText && (
          <p
            className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {oracleText}
          </p>
        )}

        {/* Chaos ability */}
        {chaosText && (
          <div className="flex items-start gap-1.5 pt-1 border-t border-[var(--color-border)]">
            <span className="text-[14px] mt-0.5">🌀</span>
            <p
              className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {chaosText}
            </p>
          </div>
        )}

        {/* Flavor text */}
        {flavorText && (
          <p
            className="text-[11px] italic text-[var(--color-text-muted)] leading-relaxed border-t border-[var(--color-border)] pt-2"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {flavorText}
          </p>
        )}
      </div>
    </div>
  )
}
