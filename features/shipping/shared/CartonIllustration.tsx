import React from 'react'

interface CartonIllustrationProps {
  /** As typed; blank or invalid shows "—" and a neutral proportion. */
  length: number | null
  width: number | null
  height: number | null
  unit: string
  /** Drop the dimension labels (small review thumbnail). */
  bare?: boolean
  className?: string
}

const SLOPE = 0.34

/** Pixel size of one edge: proportional to the longest side, kept within a range so a flat box still reads as a box. */
function edges(length: number | null, width: number | null, height: number | null) {
  const longest = Math.max(length ?? 0, width ?? 0, height ?? 0)
  const scale = (value: number | null, min: number, span: number) => (longest > 0 && value && value > 0 ? min + span * (value / longest) : min + span * 0.7)
  return { l: scale(length, 40, 65), w: scale(width, 40, 65), h: scale(height, 35, 60) }
}

const points = (...pairs: Array<[number, number]>) => pairs.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
const label = (prefix: string, value: number | null, unit: string) => `${prefix} ${value && value > 0 ? `${value} ${unit}` : '—'}`

/** An isometric carton whose proportions and L / W / H labels follow the package fields as they are typed. */
export const CartonIllustration: React.FC<CartonIllustrationProps> = ({ length, width, height, unit, bare, className }) => {
  const { l, w, h } = edges(length, width, height)
  // Front-bottom corner; the box grows back-left (length), back-right (width) and up (height)
  const x = 25 + l
  const y = 180
  const front: [number, number] = [x, y]
  const frontTop: [number, number] = [x, y - h]
  const left: [number, number] = [x - l, y - SLOPE * l]
  const leftTop: [number, number] = [x - l, y - SLOPE * l - h]
  const right: [number, number] = [x + w, y - SLOPE * w]
  const rightTop: [number, number] = [x + w, y - SLOPE * w - h]
  const back: [number, number] = [x - l + w, y - SLOPE * (l + w) - h]
  // Tape across the top, from the middle of the left-top edge to the middle of the right-top edge's opposite
  const tapeFrom: [number, number] = [(leftTop[0] + frontTop[0]) / 2, (leftTop[1] + frontTop[1]) / 2]
  const tapeTo: [number, number] = [(back[0] + rightTop[0]) / 2, (back[1] + rightTop[1]) / 2]

  return (
    <svg viewBox="0 0 290 200" className={className} role="img" aria-label={`Carton ${label('L', length, unit)}, ${label('W', width, unit)}, ${label('H', height, unit)}`}>
      <polygon points={points(frontTop, leftTop, back, rightTop)} fill="#e2bb83" stroke="#9a6b2f" strokeWidth={1.5} />
      <polygon points={points(frontTop, leftTop, left, front)} fill="#d19a52" stroke="#9a6b2f" strokeWidth={1.5} />
      <polygon points={points(frontTop, rightTop, right, front)} fill="#c08440" stroke="#9a6b2f" strokeWidth={1.5} />
      <line x1={tapeFrom[0]} y1={tapeFrom[1]} x2={tapeTo[0]} y2={tapeTo[1]} stroke="#a87436" strokeWidth={5} opacity={0.55} />
      {!bare && (
        <g className="fill-text-primary text-[12px] font-bold" stroke="none">
          <line x1={left[0]} y1={left[1] + 8} x2={front[0] - 2} y2={front[1] + 8} stroke="currentColor" strokeWidth={1.2} className="text-text-primary" />
          <text x={(left[0] + front[0]) / 2 - 30} y={Math.min(198, (left[1] + front[1]) / 2 + 22)}>
            {label('L', length, unit)}
          </text>
          <line x1={front[0] + 2} y1={front[1] + 8} x2={right[0]} y2={right[1] + 8} stroke="currentColor" strokeWidth={1.2} className="text-text-primary" />
          <text x={(front[0] + right[0]) / 2 - 10} y={Math.min(198, (front[1] + right[1]) / 2 + 22)}>
            {label('W', width, unit)}
          </text>
          <line x1={right[0] + 8} y1={right[1]} x2={rightTop[0] + 8} y2={rightTop[1]} stroke="currentColor" strokeWidth={1.2} className="text-text-primary" />
          <text x={Math.min(rightTop[0] - 20, 230)} y={Math.max(14, rightTop[1] - 8)}>
            {label('H', height, unit)}
          </text>
        </g>
      )}
    </svg>
  )
}
