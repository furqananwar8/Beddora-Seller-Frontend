'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { PageHeader } from '@/components/layout';
import { EmptyState } from '@/components/data-display/EmptyState';
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput';
import { MARKETPLACES } from '@/utils/marketplaces';
import DateRangePicker from '@/components/date-range-picker/DateRangePicker';
import { Button } from '@/design-system/buttons';
import { TableSkeleton } from '@/design-system/loaders';
import { formatCurrency, formatPercentage } from '@/utils/format';
import { useGetBreakEvenDataQuery } from '@/services/api/breakEven.api';
import { Select } from '@/design-system/inputs';
import { SplitTable, ColumnDef, PaginationConfig, SortDirection } from '@/components/split-table/SplitTable';

// ─── Constants ─────────────────────────────────────────────
const FBA_OPTIONS = [
  { id: 'fba', name: 'FBA' },
  { id: 'fbm', name: 'FBM' },
  { id: 'fbaAndFbm', name: 'FBA And FBM' },
];

const STATUS_OPTIONS = [
  { id: 'active', name: 'Active' },
  { id: 'inactive', name: 'Inactive' },
  { id: 'discontinued', name: 'Discontinued' },
];

const CURRENCY_OPTIONS = [
  { value: 'CAD', label: 'CAD' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
];

const PAGE_SIZE = 50;

// ─── Types ───────────────────────────────────────────────
type CurrencyCode = 'CAD' | 'USD' | 'EUR';

interface Filters {
  search: string;
  status: string[];
  marketplaces: string[];
  fba: string[];
}

interface DateRangeValue {
  startDate: string | null;
  endDate: string | null;
  presetId?: string | null;
}

interface BreakevenItem {
  sku: string;
  description: string;
  units: number;
  productSales: number;
  promoRebates: number;
  sellingFees: number;
  fbaFees: number;
  otherAmazonAdj: number;
  totalAmazonExpenses: number;
  marketingExpense: number;
  allocatedNonSkuExpenses: number;
  totalExpensesInclMarketing: number;
  totalCogs: number;
  totalExpensesInclMarketingCogs: number;
  totalExpensesInclAmazonCogs: number;   // ← NEW
  netAfterAmazon: number;
  netAfterAmazonMarketing: number;
  amazonMarginPct: number;
  marginAfterMarketingPct: number;
  marginAfterAllPct: number;
  targetProfitAtB6Pct: number;
  targetGap: number;
  status: string;
  breakevenPrice: number;
  breakevenPriceExcMarketing: number;    // ← NEW
  avgSellingPrice: number;
  adsPerUnit: number;
  allocatedOpex: number;
  trueNetProfit: number;
}

type SortColumn =
  | 'sku'
  | 'description'
  | 'units'
  | 'productSales'
  | 'promoRebates'
  | 'sellingFees'
  | 'fbaFees'
  | 'otherAmazonAdj'
  | 'totalAmazonExpenses'
  | 'marketingExpense'
  | 'allocatedNonSkuExpenses'
  | 'totalExpensesInclMarketing'
  | 'totalCogs'
  | 'totalExpensesInclMarketingCogs'
  | 'totalExpensesInclAmazonCogs'      // ← NEW
  | 'netAfterAmazon'
  | 'netAfterAmazonMarketing'
  | 'amazonMarginPct'
  | 'marginAfterMarketingPct'
  | 'marginAfterAllPct'
  | 'targetProfitAtB6Pct'
  | 'targetGap'
  | 'status'
  | 'breakevenPrice'
  | 'breakevenPriceExcMarketing'       // ← NEW
  | 'avgSellingPrice'
  | 'adsPerUnit'
  | 'allocatedOpex'
  | 'trueNetProfit';

// ─── Declarative Column Definitions ──────────────────────
const COLUMNS: ColumnDef<BreakevenItem>[] = [
  {
    key: 'sku',
    header: 'SKU',
    align: 'left',
    width: 'min-w-[190px]',
    style: { minWidth: 190, width: 190 },
    sortable: true,
    sortKey: 'sku',
    cellClassName: 'break-all whitespace-normal max-w-[210px]',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'description',
    header: 'Description',
    align: 'left',
    width: 'min-w-[310px]',
    style: { minWidth: 310, width: 310 },
    sortable: true,
    sortKey: 'description',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'units',
    header: 'Units',
    align: 'right',
    width: 'min-w-[120px]',
    style: { minWidth: 120, width: 120 },
    sortable: true,
    sortKey: 'units',
    heatmap: 'green',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'productSales',
    header: 'Product Sales',
    align: 'right',
    width: 'min-w-[160px]',
    style: { minWidth: 160, width: 160 },
    sortable: true,
    sortKey: 'productSales',
    heatmap: 'green',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'promoRebates',
    header: 'Promo Rebates',
    align: 'right',
    width: 'min-w-[160px]',
    style: { minWidth: 160, width: 160 },
    sortable: true,
    sortKey: 'promoRebates',
    heatmap: 'red',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'sellingFees',
    header: 'Selling Fees',
    align: 'right',
    width: 'min-w-[150px]',
    style: { minWidth: 150, width: 150 },
    sortable: true,
    sortKey: 'sellingFees',
    heatmap: 'red',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'fbaFees',
    header: 'FBA Fees',
    align: 'right',
    width: 'min-w-[140px]',
    style: { minWidth: 140, width: 140 },
    sortable: true,
    sortKey: 'fbaFees',
    heatmap: 'red',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'otherAmazonAdj',
    header: 'Other Amazon Adj.',
    align: 'right',
    width: 'min-w-[170px]',
    style: { minWidth: 170, width: 170 },
    sortable: true,
    sortKey: 'otherAmazonAdj',
    heatmap: 'neutral',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'totalAmazonExpenses',
    header: 'Total Amazon Expenses',
    align: 'right',
    width: 'min-w-[190px]',
    style: { minWidth: 190, width: 190 },
    sortable: true,
    sortKey: 'totalAmazonExpenses',
    heatmap: 'red',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'marketingExpense',
    header: 'Marketing Expense',
    align: 'right',
    width: 'min-w-[180px]',
    style: { minWidth: 180, width: 180 },
    sortable: true,
    sortKey: 'marketingExpense',
    heatmap: 'red',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'allocatedNonSkuExpenses',
    header: 'Allocated Non-SKU Expenses',
    align: 'right',
    width: 'min-w-[220px]',
    style: { minWidth: 220, width: 220 },
    sortable: true,
    sortKey: 'allocatedNonSkuExpenses',
    heatmap: 'neutral',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'totalExpensesInclMarketing',
    header: 'Total Expenses incl. Marketing',
    align: 'right',
    width: 'min-w-[220px]',
    style: { minWidth: 220, width: 220 },
    sortable: true,
    sortKey: 'totalExpensesInclMarketing',
    heatmap: 'red',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'totalCogs',
    header: 'Total COGS',
    align: 'right',
    width: 'min-w-[150px]',
    style: { minWidth: 150, width: 150 },
    sortable: true,
    sortKey: 'totalCogs',
    heatmap: 'red',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'totalExpensesInclMarketingCogs',
    header: 'Total Expenses incl. Marketing + COGS',
    align: 'right',
    width: 'min-w-[270px]',
    style: { minWidth: 270, width: 270 },
    sortable: true,
    sortKey: 'totalExpensesInclMarketingCogs',
    heatmap: 'red',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'totalExpensesInclAmazonCogs',
    header: 'Total Expenses incl. Amazon + COGS',
    align: 'right',
    width: 'min-w-[270px]',
    style: { minWidth: 270, width: 270 },
    sortable: true,
    sortKey: 'totalExpensesInclAmazonCogs',
    heatmap: 'red',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'breakevenPrice',
    header: 'Breakeven Price',
    align: 'right',
    width: 'min-w-[170px]',
    style: { minWidth: 170, width: 170 },
    sortable: true,
    sortKey: 'breakevenPrice',
    heatmap: 'neutral',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'breakevenPriceExcMarketing',
    header: 'Breakeven Price Exc. Marketing',
    align: 'right',
    width: 'min-w-[210px]',
    style: { minWidth: 210, width: 210 },
    sortable: true,
    sortKey: 'breakevenPriceExcMarketing',
    heatmap: 'neutral',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'netAfterAmazon',
    header: 'Net After Amazon',
    align: 'right',
    width: 'min-w-[180px]',
    style: { minWidth: 180, width: 180 },
    sortable: true,
    sortKey: 'netAfterAmazon',
    heatmap: 'green',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'netAfterAmazonMarketing',
    header: 'Net After Amazon + Marketing',
    align: 'right',
    width: 'min-w-[240px]',
    style: { minWidth: 240, width: 240 },
    sortable: true,
    sortKey: 'netAfterAmazonMarketing',
    heatmap: 'green',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'amazonMarginPct',
    header: 'Amazon Margin %',
    align: 'right',
    width: 'min-w-[170px]',
    style: { minWidth: 170, width: 170 },
    sortable: true,
    sortKey: 'amazonMarginPct',
    heatmap: 'green',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'marginAfterMarketingPct',
    header: 'Margin After Marketing %',
    align: 'right',
    width: 'min-w-[210px]',
    style: { minWidth: 210, width: 210 },
    sortable: true,
    sortKey: 'marginAfterMarketingPct',
    heatmap: 'green',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'marginAfterAllPct',
    header: 'Margin After All %',
    align: 'right',
    width: 'min-w-[180px]',
    style: { minWidth: 180, width: 180 },
    sortable: true,
    sortKey: 'marginAfterAllPct',
    heatmap: 'neutral',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'targetProfitAtB6Pct',
    header: 'Target Profit @ B6',
    align: 'right',
    width: 'min-w-[190px]',
    style: { minWidth: 190, width: 190 },
    sortable: true,
    sortKey: 'targetProfitAtB6Pct',
    heatmap: 'neutral',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'targetGap',
    header: 'Target Gap / (Surplus)',
    align: 'right',
    width: 'min-w-[200px]',
    style: { minWidth: 200, width: 200 },
    sortable: true,
    sortKey: 'targetGap',
    heatmap: 'neutral',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'status',
    header: 'Status',
    align: 'left',
    width: 'min-w-[130px]',
    style: { minWidth: 130, width: 130 },
    sortable: true,
    sortKey: 'status',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'avgSellingPrice',
    header: 'Avg Selling Price',
    align: 'right',
    width: 'min-w-[180px]',
    style: { minWidth: 180, width: 180 },
    sortable: true,
    sortKey: 'avgSellingPrice',
    heatmap: 'neutral',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'adsPerUnit',
    header: 'Ads/Unit',
    align: 'right',
    width: 'min-w-[130px]',
    style: { minWidth: 130, width: 130 },
    sortable: true,
    sortKey: 'adsPerUnit',
    heatmap: 'red',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'allocatedOpex',
    header: 'Allocated OPEX',
    align: 'right',
    width: 'min-w-[170px]',
    style: { minWidth: 170, width: 170 },
    sortable: true,
    sortKey: 'allocatedOpex',
    heatmap: 'neutral',
    headerClassName: 'break-words leading-tight',
  },
  {
    key: 'trueNetProfit',
    header: 'True Net Profit',
    align: 'right',
    width: 'min-w-[180px]',
    style: { minWidth: 180, width: 180 },
    sortable: true,
    sortKey: 'trueNetProfit',
    heatmap: 'green',
    headerClassName: 'bg-success-50 break-words leading-tight',
  },
];

// ─── Cell Renderer ───────────────────────────────────────
const renderCell = (row: BreakevenItem, column: ColumnDef<BreakevenItem>): React.ReactNode => {
  const key = column.key as SortColumn;
  const val = (row as any)[key];

  if (key === 'sku') {
    return <span className="text-primary-600 font-medium">{val}</span>;
  }

  if (key === 'description' || key === 'status') {
    return String(val);
  }

  if (key === 'units') {
    return <span className="tabular-nums">{val.toLocaleString()}</span>;
  }

  if (key === 'amazonMarginPct' || key === 'marginAfterMarketingPct' || key === 'marginAfterAllPct') {
    return <span className="tabular-nums">{formatPercentage(val)}</span>;
  }

  if (key === 'targetGap') {
    const prefix = val >= 0 ? '+' : '-';
    return (
      <span className={`font-semibold tabular-nums ${val >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
        {prefix}{formatCurrency(Math.abs(val))}
      </span>
    );
  }

  if (key === 'trueNetProfit') {
    return (
      <span className={`font-semibold tabular-nums ${val >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
        {val < 0 ? '-' : ''}{formatCurrency(Math.abs(val))}
      </span>
    );
  }

  // Currency columns
  const currencyCols: SortColumn[] = [
    'productSales', 'promoRebates', 'sellingFees', 'fbaFees', 'otherAmazonAdj',
    'totalAmazonExpenses', 'marketingExpense', 'allocatedNonSkuExpenses',
    'totalExpensesInclMarketing', 'totalCogs', 'totalExpensesInclMarketingCogs',
    'totalExpensesInclAmazonCogs',        // ← NEW
    'netAfterAmazon', 'netAfterAmazonMarketing', 'targetProfitAtB6Pct',
    'breakevenPrice', 'breakevenPriceExcMarketing',   // ← NEW
    'avgSellingPrice', 'adsPerUnit', 'allocatedOpex',
  ];

  if (currencyCols.includes(key)) {
    const isNegative = val < 0;
    return (
      <span className={`tabular-nums ${isNegative ? 'text-danger-600' : ''}`}>
        {isNegative ? '-' : ''}{formatCurrency(Math.abs(val))}
      </span>
    );
  }

  return String(val);
};

// ─── Skeleton Components ─────────────────────────────────
function SummaryCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
      <div className="h-6 bg-gray-200 rounded w-24" />
    </div>
  );
}

function SummaryCardsSkeleton() {
  return (
    <div className="p-4 grid grid-cols-5 gap-4">
      <SummaryCardSkeleton />
      <SummaryCardSkeleton />
      <SummaryCardSkeleton />
      <SummaryCardSkeleton />
      <SummaryCardSkeleton />
    </div>
  );
}

// ─── Component ───────────────────────────────────────────
export default function BreakevenAnalysis() {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: [],
    marketplaces: [],
    fba: [],
  });

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    presetId: 'last30',
  });

  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('trueNetProfit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [targetMargin, setTargetMargin] = useState<string>('10');

  // ═══════════════════════════════════════════════════════════════
  // DB dates are PDT (Amazon timezone) — pass YYYY-MM-DD directly.
  // No timezone conversion needed. The backend appends 00:00:00 / 23:59:59
  // and queries the DB directly since all dates are already PDT.
  // ═══════════════════════════════════════════════════════════════
  const apiParams = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return null;

    const marginNum = parseFloat(targetMargin);
    const validatedMargin = !isNaN(marginNum) && marginNum >= 1 && marginNum <= 100
      ? marginNum
      : 10;

    return {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      currency: selectedCurrency,
      targetMargin: validatedMargin,
      ...(filters.status.length > 0 && { status: filters.status.join(',') }),
    };
  }, [dateRange.startDate, dateRange.endDate, filters.status, selectedCurrency, targetMargin]);

  const {
    data: apiData,
    isLoading,
    isFetching,
    error,
  } = useGetBreakEvenDataQuery(
    apiParams ?? { startDate: '', endDate: '', currency: 'USD', targetMargin: 10 },
    { skip: !apiParams }
  );

  const tableData: BreakevenItem[] = useMemo(() => {
    if (!apiData?.items) return [];
    return apiData.items.map((item: any) => ({
      sku: item.sku,
      description: item.title,
      units: item.unitsSold,
      productSales: item.productSales,
      promoRebates: item.promoRebates,
      sellingFees: item.sellingFee,
      fbaFees: item.fbaFees || 0,
      otherAmazonAdj: item.otherAmazonAdj,
      totalAmazonExpenses: item.totalAmazonExpense,
      marketingExpense: item.marketingExpense,
      allocatedNonSkuExpenses: item.allocatedNonSku,
      totalExpensesInclMarketing: item.totalExpenseInclMarketing,
      totalCogs: item.totalCogs,
      totalExpensesInclMarketingCogs: item.totalExpenseInclMarketingAndCogs,
      totalExpensesInclAmazonCogs: item.totalExpenseInclAmazonAndCogs,   // ← NEW
      netAfterAmazon: item.netAfterAmazon,
      netAfterAmazonMarketing: item.netAfterAmazonAndMarketing,
      amazonMarginPct: item.amazonMarginPct,
      marginAfterMarketingPct: item.marginAfterMarketingPct,
      marginAfterAllPct: item.marginAfterAllPct,
      targetProfitAtB6Pct: item.targetProfit,
      targetGap: item.targetGap,
      status: item.status.toUpperCase(),
      breakevenPrice: item.breakevenPrice,
      breakevenPriceExcMarketing: item.breakevenPriceExcMarketing,       // ← NEW
      avgSellingPrice: item.avgSellingPrice,
      adsPerUnit: item.adsPerUnit,
      allocatedOpex: item.allocatedOpex,
      trueNetProfit: item.trueNetProfit,
    }));
  }, [apiData]);

  const handleSort = useCallback((column: string) => {
    const col = column as SortColumn;
    if (sortColumn === col) {
      setSortDirection((prev: any) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('desc');
    }
    setPage(1);
  }, [sortColumn]);

  // Client-side filter + sort
  const filteredData = useMemo(() => {
    let result = [...tableData];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (item) =>
          item.sku.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const aVal = (a as any)[sortColumn];
      const bVal = (b as any)[sortColumn];

      if (typeof aVal === 'string') {
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tableData, filters.search, sortColumn, sortDirection]);

  // Pagination
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return filteredData.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredData, page]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
    setPage(1);
  }, []);

  const handleTargetMarginChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setTargetMargin('');
      return;
    }
    if (!/^\d*\.?\d*$/.test(raw)) return;

    const num = parseFloat(raw);
    if (num > 100) return;
    setTargetMargin(raw);
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = COLUMNS.map((c) => String(c.header));
    const rows = filteredData.map((item) =>
      COLUMNS.map((col) => {
        const val = (item as any)[col.key];
        if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
        return String(val);
      })
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breakeven-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredData]);

  const dateDisplay = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return '';
    const start = parseISO(dateRange.startDate);
    const end = parseISO(dateRange.endDate);
    return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
  }, [dateRange]);

  // Pagination config object for SplitTable
  const paginationConfig: PaginationConfig | undefined = useMemo(() => {
    if (totalItems === 0) return undefined;
    return {
      page,
      pageSize: PAGE_SIZE,
      totalItems,
      totalPages,
      onPageChange: setPage,
      itemLabel: 'products',
    };
  }, [page, totalItems, totalPages]);

  // Rich empty state passed to SplitTable
  const emptyState = useMemo(() => (
    <EmptyState
      title={error ? 'Failed to load data' : 'No products found'}
      description={error ? 'Please try again later.' : 'Try adjusting your filters or search query.'}
    />
  ), [error]);

  return (
    <div className="p-6 flex flex-col gap-4 h-[calc(100vh-64px)]">
      <PageHeader
        title="Breakeven Analysis"
        description={`Profitability breakdown by SKU${dateDisplay ? ` • ${dateDisplay}` : ''}`}
      />

      {/* ─── Toolbar ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-[320px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search SKU or Description..."
            value={filters.search}
            onChange={handleSearch}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm 
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       bg-surface-primary text-text-primary"
          />
        </div>

        <DateRangePicker
          value={dateRange}
          onChange={(range) => {
            setDateRange(range);
            setPage(1);
          }}
          displayFormat="MMM d, yyyy"
          placeholder="Select date range"
        />

        <div className="min-w-[100px]">
          <Select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
            options={CURRENCY_OPTIONS}
          />
        </div>

        <MultiSelectInput
          title="Status"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(val: string[]) => {
            setFilters((prev) => ({ ...prev, status: val }));
            setPage(1);
          }}
          placeholder="All Status"
        />

        <MultiSelectInput
          title="Marketplace"
          options={MARKETPLACES}
          value={filters.marketplaces}
          onChange={(val: string[]) =>
            setFilters((prev) => ({ ...prev, marketplaces: val }))
          }
          placeholder="All Marketplaces"
        />

        <MultiSelectInput
          title="FBA"
          options={FBA_OPTIONS}
          value={filters.fba}
          onChange={(val: string[]) =>
            setFilters((prev) => ({ ...prev, fba: val }))
          }
          placeholder="Select FBA"
        />

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={!filteredData.length}
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Export CSV
        </Button>
      </div>

      <div className="flex">
        <div className="flex items-center gap-2">
          <label className="text-sm text-white p-2.5 bg-primary-500 whitespace-nowrap">
            Target SKU Margin %
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={targetMargin}
            onChange={handleTargetMarginChange}
            placeholder="10"
            className="w-16 px-2 py-2.5 border border-gray-200 rounded-lg text-sm text-center
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       bg-surface-primary text-text-primary"
          />
        </div>
      </div>

      {/* ─── Summary Cards ──────────────────────────────── */}
      {(isLoading || (isFetching && !apiData?.summary)) ? (
        <SummaryCardsSkeleton />
      ) : apiData?.summary ? (
        <div className="grid grid-cols-5 gap-4">
          <SummaryCard label="Products" value={apiData.summary.totalProducts.toLocaleString()} />
          <SummaryCard label="Total Sales" value={formatCurrency(apiData.summary.totalSales)} />
          <SummaryCard label="Total Units" value={apiData.summary.totalUnits.toLocaleString()} />
          <SummaryCard label="Net Profit" value={formatCurrency(apiData.summary.totalNetProfit)} />
          <SummaryCard label="Avg Margin" value={formatPercentage(apiData.summary.avgMarginPct)} />
        </div>
      ) : null}

      {/* ─── SplitTable ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col" style={{ maxHeight: 'calc(100vh - 340px)' }}>
       <SplitTable
  columns={COLUMNS}
  data={paginatedData}
  rowKey="sku"
  renderCell={renderCell}
  isLoading={isLoading}
  emptyState={emptyState}
  pagination={paginationConfig}
  sortColumn={sortColumn}
  sortDirection={sortDirection}
  onSort={handleSort}
  wrapperClassName="flex-1 min-h-0"
/>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}