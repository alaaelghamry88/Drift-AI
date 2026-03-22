// Particle positions: left%, sway direction, size, opacity, duration, delay
const PARTICLES: Array<{
  left: string; sway: string; size: number; opacity: number; duration: string; delay: string
}> = [
  { left:  '6%', sway:  '14px', size: 2, opacity: 0.45, duration: '19s', delay:  '0s' },
  { left: '15%', sway: '-10px', size: 3, opacity: 0.28, duration: '24s', delay:  '4s' },
  { left: '27%', sway:  '18px', size: 2, opacity: 0.35, duration: '21s', delay:  '8s' },
  { left: '38%', sway: '-14px', size: 4, opacity: 0.22, duration: '26s', delay:  '2s' },
  { left: '51%', sway:  '10px', size: 2, opacity: 0.30, duration: '18s', delay: '13s' },
  { left: '63%', sway: '-16px', size: 3, opacity: 0.25, duration: '23s', delay:  '6s' },
  { left: '76%', sway:  '12px', size: 2, opacity: 0.38, duration: '20s', delay: '17s' },
  { left: '87%', sway: '-12px', size: 3, opacity: 0.30, duration: '22s', delay: '10s' },
  { left: '44%', sway:  '20px', size: 2, opacity: 0.20, duration: '29s', delay: '15s' },
]

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="drift-bg min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden">

      {/* ── Bioluminescent particles ── */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.left,
              bottom: '-6px',
              width:  `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              background: 'var(--color-accent-primary)',
              boxShadow: `0 0 ${p.size * 3}px ${p.size}px rgba(77,217,192,0.35)`,
              opacity: 0,
              animationName: 'drift-float-up',
              animationDuration: p.duration,
              animationDelay: p.delay,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-in-out',
              ['--p-sway' as string]: p.sway,
            }}
          />
        ))}
      </div>

      {/* ── Animated horizon wave ── */}
      <div
        className="fixed pointer-events-none z-[1] overflow-hidden"
        style={{ bottom: 0, left: 0, right: 0, height: '90px' }}
      >
        {/* Fade overlay to blend wave into bg */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(10,37,53,0.7) 100%)' }}
        />
        <div
          style={{
            width: '200vw',
            height: '90px',
            animationName: 'drift-wave-scroll',
            animationDuration: '28s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          }}
        >
          <svg
            viewBox="0 0 2880 90"
            width="100%"
            height="90"
            fill="none"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Primary wave line */}
            <path
              d="M0,55 C240,22 480,88 720,55 C960,22 1200,88 1440,55 C1680,22 1920,88 2160,55 C2400,22 2640,88 2880,55"
              stroke="rgba(77,217,192,0.18)"
              strokeWidth="1.5"
              fill="none"
            />
            {/* Secondary wave — offset phase */}
            <path
              d="M0,65 C240,35 480,95 720,65 C960,35 1200,95 1440,65 C1680,35 1920,95 2160,65 C2400,35 2640,95 2880,65"
              stroke="rgba(77,217,192,0.07)"
              strokeWidth="1"
              fill="none"
            />
            {/* Tertiary subtle fill */}
            <path
              d="M0,55 C240,22 480,88 720,55 C960,22 1200,88 1440,55 C1680,22 1920,88 2160,55 C2400,22 2640,88 2880,55 L2880,90 L0,90 Z"
              fill="rgba(10,37,53,0.4)"
            />
          </svg>
        </div>
      </div>

      {/* ── Drift wordmark ── */}
      <div className="relative z-10 mb-16 flex flex-col items-center gap-2 select-none">
        <div className="flex items-baseline gap-2">
          <span
            className="text-drift-accent"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.5rem',
              lineHeight: 1,
              animationName: 'drift-glow-breathe',
              animationDuration: '3.5s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }}
          >
            ∿
          </span>
          <span
            className="text-drift-text-primary"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.04em' }}
          >
            Drift
          </span>
        </div>
        <p
          className="text-drift-text-tertiary"
          style={{ fontFamily: 'var(--font-body)', fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}
        >
          your daily AI signal
        </p>
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {children}
      </div>
    </div>
  )
}
