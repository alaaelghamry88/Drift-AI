// src/components/dump/color-swatch.tsx
'use client'

interface ColorSwatchProps {
  color: string
  active: boolean
  onClick: () => void
}

export function ColorSwatch({ color, active, onClick }: ColorSwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: color }}
      className={`
        w-7 h-7 rounded-full transition-transform duration-150 shadow-md
        ${active
          ? 'scale-110 ring-2 ring-white/40 ring-offset-2 ring-offset-[#12131e]'
          : 'hover:scale-115'
        }
      `}
      aria-label={`Select color ${color}`}
    >
      {active && (
        <span className="flex items-center justify-center w-full h-full text-black/50 text-[11px] font-bold">
          ✓
        </span>
      )}
    </button>
  )
}
