// Generative guilloché geometry — pure math, zero assets.
//
// Produces SVG path `d` strings for the engine-turned line-work that replaced
// the legacy 409 KB Illustrator background/card SVGs. Three families:
//
//   • rosette — layered rhodonea (rose) curves with a high-frequency ripple,
//               i.e. the watch-dial / banknote engine-turning. Focal / premium.
//   • wave    — interwoven sinusoidal lattice (basket weave). Full-screen calm.
//   • rings   — off-centre concentric circles. Quiet, meditative.
//
// All functions are deterministic (same inputs → same output) and cheap
// (a few hundred sampled points total). No Math.random — variation comes from
// the optional `seed`, so renders are stable across mounts.

const TWO_PI = Math.PI * 2

// Sample an array of points into an SVG polyline `d` string.
function toPath(points: ReadonlyArray<readonly [number, number]>, close: boolean): string {
  if (points.length === 0) return ''
  let d = `M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`
  for (let i = 1; i < points.length; i++) {
    d += `L${points[i][0].toFixed(2)} ${points[i][1].toFixed(2)}`
  }
  return close ? `${d}Z` : d
}

export interface GuillocheOptions {
  width:  number
  height: number
  seed?:  number
}

// ── Rosette ───────────────────────────────────────────────────────────────────
// Concentric rhodonea curves: r(θ) = R₀·(1 + a₁·cos(p·θ + φ) + a₂·cos(q·θ)).
// The low-frequency term (p) forms the petals; the high-frequency term (q) adds
// the fine engine-turned shimmer. Rings are scaled + counter-rotated so their
// petals interleave like a guilloché dial. Always closes over [0, 2π].
export interface RosetteOptions extends GuillocheOptions {
  rings?:  number  // number of concentric curves
  petals?: number  // petal count of the outermost curve
}

export function rosettePaths({
  width,
  height,
  seed   = 0,
  rings  = 4,
  petals = 8,
}: RosetteOptions): string[] {
  const cx   = width / 2
  const cy   = height / 2
  const maxR = Math.min(width, height) / 2
  const out: string[] = []
  const steps = 240

  for (let k = 0; k < rings; k++) {
    const r0    = maxR * (0.94 - k * 0.15)
    if (r0 <= 0) break
    const p     = petals + k * 2
    const q     = p * 3 + (seed % 3)
    const a1    = 0.085 + k * 0.012
    const a2    = 0.03
    const phase = (k * Math.PI) / petals + seed * 0.07
    const spin  = k * 0.12 + seed * 0.03

    const pts: Array<[number, number]> = []
    for (let i = 0; i <= steps; i++) {
      const t  = (i / steps) * TWO_PI
      const rr = r0 * (1 + a1 * Math.cos(p * t + phase) + a2 * Math.cos(q * t))
      pts.push([cx + rr * Math.cos(t + spin), cy + rr * Math.sin(t + spin)])
    }
    out.push(toPath(pts, true))
  }
  return out
}

// ── Wave ────────────────────────────────────────────────────────────────────
// Two crossed families of phase-shifted sinusoids. Adjacent lines in a family
// are offset by π so crests meet troughs → the woven )( ( ) basket columns.
// The vertical family is lighter, giving a soft lattice rather than a grid.
export interface WaveOptions extends GuillocheOptions {
  rows?: number  // horizontal line count
  cols?: number  // vertical line count
}

export function wavePaths({
  width,
  height,
  seed = 0,
  rows = 20,
  cols = 12,
}: WaveOptions): string[] {
  const out: string[] = []
  const stepsX = 64
  const stepsY = 64

  // Horizontal family
  const rowGap = height / rows
  const ampH   = rowGap * 0.42
  const freqH  = (TWO_PI * 3.5) / width
  for (let j = 0; j < rows; j++) {
    const baseY = rowGap * (j + 0.5)
    const phase = (j % 2 === 0 ? 0 : Math.PI) + seed * 0.05
    const pts: Array<[number, number]> = []
    for (let i = 0; i <= stepsX; i++) {
      const x = (i / stepsX) * width
      pts.push([x, baseY + ampH * Math.sin(x * freqH + phase)])
    }
    out.push(toPath(pts, false))
  }

  // Vertical family (lighter — drives the lattice cross-weave)
  const colGap = width / cols
  const ampV   = colGap * 0.4
  const freqV  = (TWO_PI * 2.5) / height
  for (let j = 0; j < cols; j++) {
    const baseX = colGap * (j + 0.5)
    const phase = (j % 2 === 0 ? Math.PI : 0) + seed * 0.05
    const pts: Array<[number, number]> = []
    for (let i = 0; i <= stepsY; i++) {
      const y = (i / stepsY) * height
      pts.push([baseX + ampV * Math.sin(y * freqV + phase), y])
    }
    out.push(toPath(pts, false))
  }
  return out
}

// ── Rings ─────────────────────────────────────────────────────────────────────
// Off-centre concentric circles, sampled as polylines so they share the same
// stroke pipeline as the other families.
export interface RingOptions extends GuillocheOptions {
  count?: number
}

export function ringPaths({
  width,
  height,
  seed  = 0,
  count = 9,
}: RingOptions): string[] {
  const cx   = width * 0.62
  const cy   = height * 0.36
  // Reach the farthest corner so the rings always bleed past every edge.
  const maxR = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy))
  const out: string[] = []
  const steps = 72

  for (let k = 1; k <= count; k++) {
    const rad = (maxR * k) / count + (seed % 5)
    const pts: Array<[number, number]> = []
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * TWO_PI
      pts.push([cx + rad * Math.cos(t), cy + rad * Math.sin(t)])
    }
    out.push(toPath(pts, true))
  }
  return out
}
