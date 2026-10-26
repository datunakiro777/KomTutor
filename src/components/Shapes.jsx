// Static geometric pieces. Each shape is drawn twice: a solid ink copy offset as its hard shadow.
const INK = 'var(--dp-color-outline)';

function Piece({ children, dx = 6, dy = 6 }) {
  return (
    <g>
      <g className="shape-shadow" transform={`translate(${dx} ${dy})`}>
        {children}
      </g>
      {children}
    </g>
  );
}

export function HeroShapes() {
  return (
    <svg className="hero-shapes" viewBox="0 0 440 420" aria-hidden="true" focusable="false">
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <Piece dx={10} dy={10}>
          <rect x="70" y="150" width="250" height="210" rx="34" fill="var(--dp-color-accent-fresh)" />
        </Piece>
        <Piece dx={8} dy={8}>
          <path d="M120 150 A95 95 0 0 1 310 150 Z" fill="var(--dp-color-accent-warm)" />
        </Piece>
        <Piece>
          <circle cx="340" cy="92" r="58" fill="var(--dp-color-accent)" />
        </Piece>
        <Piece>
          <path d="M28 312 L112 210 L150 330 Z" fill="var(--dp-color-accent-secondary)" />
        </Piece>
        <Piece dx={5} dy={5}>
          <rect x="300" y="290" width="92" height="92" rx="17" fill="var(--dp-color-panel)" />
        </Piece>
        <Piece dx={4} dy={4}>
          <circle cx="56" cy="88" r="20" fill="var(--dp-color-accent-fresh)" />
        </Piece>
      </g>
      <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
        <path d="M170 220 h110" />
        <path d="M170 255 h80" />
        <path d="M170 290 h100" />
        <path d="M322 336 l14 14 l26 -30" />
      </g>
    </svg>
  );
}

const CONFETTI = [
  { corner: 'top-left', shape: <circle cx="20" cy="20" r="12" fill="var(--dp-color-accent-secondary)" /> },
  {
    corner: 'top-right',
    shape: <rect x="7" y="7" width="26" height="26" rx="6" fill="var(--dp-color-accent-warm)" transform="rotate(14 20 20)" />,
  },
  { corner: 'bottom-right', shape: <path d="M4 36 L22 4 L37 36 Z" fill="var(--dp-color-accent)" /> },
  { corner: 'bottom-left', shape: <path d="M2 30 a18 18 0 0 1 36 0 Z" fill="var(--dp-color-panel)" /> },
];

export function Confetti() {
  return CONFETTI.map(({ corner, shape }) => (
    <svg key={corner} className={`confetti confetti-${corner}`} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        {shape}
      </g>
    </svg>
  ));
}
