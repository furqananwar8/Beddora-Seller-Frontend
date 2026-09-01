/* ──────────────────────────────────────────────────────
 * Marketplace Flag Component
 * ────────────────────────────────────────────────────── */

interface MarketplaceFlagProps {
  marketplace?: string
  className?: string
}

export const MarketplaceFlag: React.FC<MarketplaceFlagProps> = ({
  marketplace,
  className = '',
}) => {
  if (!marketplace) return null

  const code = marketplace.trim().toUpperCase()

  if (code === 'CA') {
    return (
      <svg
        className={`w-5 h-3.5 inline-block rounded-sm overflow-hidden flex-shrink-0 ${className}`}
        viewBox="0 0 640 480"
        // title="Canada"
      >
        <path fill="#ff0000" d="M0 0h160v480H0zM480 0h160v480H480z" />
        <path fill="#fff" d="M160 0h320v480H160z" />
        <path
          fill="#ff0000"
          d="M346.7 348l13.6 62.5-38.6-13.6-38.6 13.6 13.6-62.5-47.7-19 8.2-14.8 53.6 7.4 11.2-52.7 18.3 7 18.3-7 11.2 52.7 53.6-7.4 8.2 14.8-47.7 19z"
        />
      </svg>
    )
  }

  if (code === 'US' || code === 'USA') {
    return (
      <svg
        className={`w-5 h-3.5 inline-block rounded-sm overflow-hidden flex-shrink-0 ${className}`}
        viewBox="0 0 640 480"
        // title="United States"
      >
        <path fill="#bd3d44" d="M0 0h640v480H0z" />
        <path
          stroke="#fff"
          strokeWidth="37"
          d="M0 55.4h640M0 129.2h640M0 203h640M0 276.9h640M0 350.8h640M0 424.6h640"
        />
        <path fill="#192f5d" d="M0 0h256v258.5H0z" />
      </svg>
    )
  }

  return <span className="text-xs text-text-muted">{code}</span>
}