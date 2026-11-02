import { useEffect, useRef } from 'react';
/**
 * Data drawings for the hero and the topic pages. Each one is computed from the
 * figure it represents, so the picture is never out of step with the number.
 */

/** Build-in for the hero drawings: piece `i` of `n` starts so the last one lands at 3 s (each piece animates for .8 s). */
const BUILD = 2.2;
const stagger = (i: number, n: number) => ({ ['--d' as string]: `${(i / Math.max(1, n - 1)) * BUILD}s` });

export function DotMatrix({ total, lit, on, off, label, cols = 10 }: { total: number; lit: number; on: string; off: string; label: string; cols?: number }) {
  const r = 12, step = 32;
  const rows = Math.ceil(total / cols);
  const dots = Array.from({ length: total }, (_, i) => ({ x: r + (i % cols) * step, y: r + Math.floor(i / cols) * step, lit: i < lit }));
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${cols * step - (step - 2 * r)} ${rows * step - (step - 2 * r)}`}>
      {dots.map((d, i) => <circle key={i} className="g-in" style={stagger(i, total)} cx={d.x} cy={d.y} r={r} fill={d.lit ? on : off} />)}
    </svg>
  );
}

export function BarWave({ bars, highlight, base, accent, label }: { bars: number; highlight: number; base: string; accent: string; label: string }) {
  const w = 12, gap = 5, h = 300;
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${bars * (w + gap)} ${h}`}>
      {Array.from({ length: bars }, (_, i) => {
        const hi = i >= bars - highlight;
        return <rect key={i} className="g-in g-grow" style={stagger(i, bars)} x={i * (w + gap)} y={hi ? 0 : 40} width={w} height={hi ? h : h - 40} fill={hi ? accent : base} />;
      })}
    </svg>
  );
}

export function Houses({ total, filled, color, label, cols = 4 }: { total: number; filled: number; color: string; label: string; cols?: number }) {
  const cw = 110, ch = 100;
  const rows = Math.ceil(total / cols);
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${cols * cw} ${rows * ch}`}>
      {Array.from({ length: total }, (_, i) => {
        const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
        const d = `M${x + 10} ${y + 50} L${x + 55} ${y + 10} L${x + 100} ${y + 50} V${y + 95} H${x + 10}Z`;
        return i < filled ? <path key={i} className="g-in g-drop" style={stagger(i, total)} d={d} fill={color} /> : <path key={i} className="g-in g-drop" style={stagger(i, total)} d={d} fill="none" stroke={color} strokeWidth="4" />;
      })}
    </svg>
  );
}

export function Pile({ layers, color, accent, label }: { layers: number; color: string; accent: string; label: string }) {
  const H = 20, G = 8, W = 420;
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${W} ${layers * (H + G)}`}>
      {Array.from({ length: layers }, (_, i) => {
        const inset = (layers - 1 - i) * 10;
        const y = i * (H + G);
        return <rect key={i} className="g-in g-drop" style={stagger(layers - 1 - i, layers + 1)} x={inset} y={y} width={W - inset * 2} height={H} fill={color} />;
      })}
      <rect className="g-in g-pop" style={stagger(layers, layers + 1)} x={W - 100} y={(layers - 1) * (H + G)} width={100} height={H} fill={accent} />
    </svg>
  );
}

export function RainHill({ color, light, label }: { color: string; light: string; label: string }) {
  return (
    <svg role="img" aria-label={label} viewBox="0 0 440 320">
      <g fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
        {[40, 80, 120].map((y, i) => <path key={y} className="g-in g-drop" style={stagger(6 + i, 9)} d={`M0 ${y} q30 -20 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0`} />)}
      </g>
      <path className="g-in g-grow" style={stagger(0, 9)} d="M0 320 L0 240 L440 160 L440 320Z" fill={color} />
      <g fill={light}>{[60, 140, 220, 300, 380].map((x, i) => <rect key={x} className="g-in g-pop" style={stagger(1 + i, 9)} x={x} y={212 - i * 14} width="30" height="20" />)}</g>
    </svg>
  );
}

/** A thin inline chart for the topic page: `pct` of the row lit. */
export function MiniDots({ pct, on, off }: { pct: number; on: string; off: string }) {
  const n = 15, lit = Math.round((pct / 100) * n);
  return (
    <svg aria-hidden="true" viewBox="0 0 300 30">
      {Array.from({ length: n }, (_, i) => <circle key={i} cx={8 + i * 20} cy="15" r="7" fill={i < lit ? on : off} />)}
    </svg>
  );
}
export function MiniBar({ pct, on, off }: { pct: number; on: string; off: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 300 30">
      <rect x="0" y="10" width="300" height="10" fill={off} />
      <rect x="0" y="10" width={3 * Math.max(0, Math.min(100, pct))} height="10" fill={on} />
    </svg>
  );
}

/** Ten-by-ten grid: lights exactly `pct` of 100 dots, so 3 % shows three dots. */
export function Dots100({ pct, on, off, label }: { pct: number; on: string; off: string; label: string }) {
  const lit = Math.max(pct > 0 ? 1 : 0, Math.round(pct));
  return (
    <svg role="img" aria-label={label} viewBox="0 0 100 100">
      {Array.from({ length: 100 }, (_, i) => <circle key={i} cx={(i % 10) * 10 + 5} cy={Math.floor(i / 10) * 10 + 5} r="3.6" fill={i < lit ? on : off} />)}
    </svg>
  );
}

/** Flat skyline of Mexico City in layers that drift at different speeds as the page scrolls (parallax). */
export function SkylineCDMX({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      // 0 when the skyline enters at the bottom of the screen, 1 once it reaches the upper 40 %: layers rise into place at their own speed
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.6)));
      el.style.setProperty('--p', p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const base = 180; // buildings extend below the ground line so sinking layers never show a gap
  return (
    <svg ref={ref} className={`sky ${className ?? ''}`} role="img" aria-label="Silueta de la Ciudad de México con el Monumento a la Revolución, el Ángel y los volcanes al fondo" viewBox="0 0 360 160" preserveAspectRatio="xMidYMax meet">
      <g className="sky-l" style={{ ['--d' as string]: '46px' }}><g className="sky-in" style={{ animationDelay: '0ms' }}>
        <circle cx="292" cy="44" r="16" fill="#f5d547" />
      </g></g>
      <g className="sky-l" style={{ ['--d' as string]: '34px' }}><g className="sky-in" style={{ animationDelay: '60ms' }}>
        <path d="M190 180 L250 70 L262 66 L272 72 L330 180Z" fill="#d9d0ea" />
        <path d="M250 70 L262 66 L272 72 L266 84 L258 80 L254 86Z" fill="#fff" />
        <path d="M262 180 L300 98 L318 94 L338 104 L360 118 L360 180Z" fill="#c9b8ff" />
      </g></g>
      <g className="sky-l" style={{ ['--d' as string]: '22px' }}><g className="sky-in" style={{ animationDelay: '120ms' }} fill="#9b7bff">
        {[[0, 96, 22], [24, 108, 16], [42, 88, 18], [214, 110, 22], [238, 98, 18], [300, 106, 20], [322, 96, 16], [340, 112, 20]].map(([x, y, w], i) => <rect key={i} x={x} y={y} width={w} height={base - y} />)}
      </g></g>
      <g className="sky-l" style={{ ['--d' as string]: '12px' }}><g className="sky-in" style={{ animationDelay: '180ms' }}>
        {/* Torre Reforma */}
        <path d={`M64 ${base} V34 L74 30 L84 36 V${base}Z`} fill="#5b2bd6" />
        <path d={`M74 30 V${base}`} stroke="#3a1486" strokeWidth="2" />
        {/* Torre Mayor */}
        <path d={`M90 ${base} V46 Q99 40 108 46 V${base}Z`} fill="#3a1486" />
        {/* Torre Latinoamericana */}
        <path d={`M118 ${base} V62 H124 V56 H130 V62 H136 V${base}Z`} fill="#5b2bd6" />
        <rect x="126" y="40" width="2" height="16" fill="#5b2bd6" />
        {/* Monumento a la Revolución: four piers, arches, square drum, copper dome and lantern */}
        <g fill="#3a1486">
          <rect x="144" y="104" width="44" height="8" />
          <rect x="144" y="112" width="8" height={base - 112} />
          <rect x="180" y="112" width="8" height={base - 112} />
          <rect x="162" y="112" width="8" height={base - 112} />
          <path d="M152 112 h10 v12 a5 5 0 0 0 -10 0z M170 112 h10 v12 a5 5 0 0 0 -10 0z" />
          <rect x="150" y="96" width="32" height="8" />
          <path d="M150 96 Q166 70 182 96Z" fill="#2f6b6b" />
          <path d="M156 96 Q166 78 176 96" stroke="#7fd9cf" strokeWidth="1.2" fill="none" />
          <rect x="163" y="74" width="6" height="8" />
          <path d="M162 74 l4 -5 l4 5z" />
        </g>
        {/* Ángel de la Independencia */}
        <rect x="194" y="118" width="12" height={base - 118} fill="#1e0f33" />
        <rect x="198" y="64" width="4" height="56" fill="#1e0f33" />
        <path d="M195 64 h10 l-5 -8z" fill="#f5d547" />
        <path d="M196 56 l4 -6 l4 6 M193 54 l7 -3 l7 3" stroke="#f5d547" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Catedral */}
        <g fill="#1e0f33">
          <rect x="226" y="112" width="52" height={base - 112} />
          <rect x="226" y="96" width="12" height="18" /><path d="M226 96 Q232 86 238 96Z" />
          <rect x="266" y="96" width="12" height="18" /><path d="M266 96 Q272 86 278 96Z" />
          <path d="M244 112 Q252 98 260 112Z" />
        </g>
      </g></g>
      <g className="sky-in" style={{ animationDelay: '240ms' }} fill="#1e0f33">
        {[[0, 122, 30], [32, 130, 26], [284, 128, 26], [312, 120, 22], [336, 132, 24]].map(([x, y, w], i) => <rect key={i} x={x} y={y} width={w} height={base - y} />)}
        <rect x="0" y="150" width="360" height="10" />
      </g>
    </svg>
  );
}
