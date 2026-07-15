import { formatCurrency, formatNumber, formatPercentage } from "@/utils"

interface SummaryTilesProps {
    period: any
    netProfitMargin: any
    totalCosts: any
    setSelectedPeriodForDetails: (val: any) => void
}
const SummaryTiles = ({ period, netProfitMargin, totalCosts, setSelectedPeriodForDetails}) => {
    return (
         <div className="space-y-3 flex-1 flex flex-col">
        {/* Header */}
        <div>
        <h3 className="text-lg font-semibold text-text-primary break-words">{period.label}</h3>
        <p className="text-xs text-text-muted break-words">{period.dateRange}</p>
        </div>

        {/* Sales */}
        <div>
        <div className="text-xs text-text-muted">Sales</div>
        <div className="text-2xl font-bold text-text-primary break-words">
            {formatCurrency(period.salesRevenue)}
        </div>
        <div className={`text-xs mt-1 break-words ${netProfitMargin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {netProfitMargin >= 0 ? '+' : ''}{formatPercentage(netProfitMargin)}
        </div>
        </div>

        {/* Orders / Refunds */}
        <div className="grid grid-cols-2 gap-3 text-xs min-w-0">
        <div className="min-w-0">
            <div className="text-text-muted break-words">Orders / Units</div>
            <div className="font-semibold text-text-primary break-words">
            {period.salesCount} / {period.ordersUnitCount}
            </div>
        </div>
        <div className="min-w-0">
            <div className="text-text-muted break-words">Refunds</div>
            <div className="font-semibold text-text-primary break-words">
            {formatNumber(period.totalRefunds)}
            </div>
        </div>
        </div>

        {/* Adv cost / Est payout */}
        <div className="grid grid-cols-2 gap-3 text-xs min-w-0">
        <div className="min-w-0">
            <div className="text-text-muted break-words">Adv. cost</div>
            <div className="font-semibold text-danger-600 break-words">
            -{formatCurrency(period.totalExpenses)}
            </div>
        </div>
        <div className="min-w-0">
            <div className="text-text-muted break-words">Est. payout</div>
            <div className="font-semibold text-text-primary break-words">
            {formatCurrency(period.salesRevenue - totalCosts)}
            </div>
        </div>
        </div>

        {/* Net profit */}
        <div className="pt-3 border-t border-border">
        <div className="text-text-muted text-xs break-words">Net profit</div>
        <div className="flex items-center justify-between min-w-0">
            <div className={`text-xl font-bold break-words ${period.netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {formatCurrency(period.netProfit)}
            </div>
            <div className={`text-sm break-words ${netProfitMargin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {netProfitMargin >= 0 ? '+' : ''}{formatPercentage(netProfitMargin)}
            </div>
        </div>
        </div>

        {/* Spacer pushes "More" to bottom */}
        <div className="flex-1" />

        {/* More button */}
        <div className="text-center">
        <button
            onClick={(e) => {
            e.stopPropagation()
            setSelectedPeriodForDetails(period.id)
            }}
            className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
        >
            More
        </button>
        </div>
    </div>
    )
}

export default SummaryTiles;