import React from 'react'
import { cn } from '@/utils/cn'
import { levelLabel } from './costCenterCode'

/**
 * One colour per level so a level reads the same wherever it shows. Own palette rather than the Badge variants:
 * the theme's `primary` scale is a single dark shade, which leaves `ds-badge-primary` text unreadable.
 */
const LEVEL_COLORS = [
  'bg-sky-50 text-sky-700 border-sky-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
]

/** "L2" in its level's colour. */
export const LevelBadge: React.FC<{ level: number }> = ({ level }) => (
  <span className={cn('ds-badge ds-badge-sm min-w-[2rem] justify-center rounded', LEVEL_COLORS[(level - 1) % LEVEL_COLORS.length])}>{levelLabel(level)}</span>
)
