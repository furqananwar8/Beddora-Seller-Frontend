'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { PageHeader } from '@/components/layout';
import { EmptyState } from '@/components/data-display/EmptyState';
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput';
import { MARKETPLACES } from '@/utils/marketplaces';
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter';
import DateRangePicker from '@/components/date-range-picker/DateRangePicker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables';
import { Button } from '@/design-system/buttons';
import { TableSkeleton } from '@/design-system/loaders';
import { formatCurrency, formatPercentage } from '@/utils/format';
import { useGetBreakEvenDataQuery } from '@/services/api/breakEven.api';
import { Select } from '@/design-system/inputs'; // Adjust import path as needed

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
  netAfterAmazon: number;
  netAfterAmazonMarketing: number;
  amazonMarginPct: number;
  marginAfterMarketingPct: number;
  marginAfterAllPct: number;
  targetProfitAtB6Pct: number;
  targetGap: number;
  status: string;
  breakevenPrice: number;
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
  | 'netAfterAmazon'
  | 'netAfterAmazonMarketing'
  | 'amazonMarginPct'
  | 'marginAfterMarketingPct'
  | 'marginAfterAllPct'
  | 'targetProfitAtB6Pct'
  | 'targetGap'
  | 'status'
  | 'breakevenPrice'
  | 'avgSellingPrice'
  | 'adsPerUnit'
  | 'allocatedOpex'
  | 'trueNetProfit';

type SortDirection = 'asc' | 'desc';

// ─── Column Definitions ──────────────────────────────────
interface ColumnDef {
  key: SortColumn;
  label: string;
  align: 'left' | 'right';
  format?: 'currency' | 'pct' | 'number';
  heatmap?: 'green' | 'red' | 'neutral';
  minWidth?: string;
}

const COLUMNS: ColumnDef[] = [
  { key: 'sku', label: 'SKU', align: 'left', minWidth: 'min-w-[190px]' },
  { key: 'description', label: 'Description', align: 'left', minWidth: 'min-w-[310px]' },
  { key: 'units', label: 'Units', align: 'right', format: 'number', heatmap: 'green', minWidth: 'min-w-[120px]' },
  { key: 'productSales', label: 'Product Sales', align: 'right', format: 'currency', heatmap: 'green', minWidth: 'min-w-[160px]' },
  { key: 'promoRebates', label: 'Promo Rebates', align: 'right', format: 'currency', heatmap: 'red', minWidth: 'min-w-[160px]' },
  { key: 'sellingFees', label: 'Selling Fees', align: 'right', format: 'currency', heatmap: 'red', minWidth: 'min-w-[150px]' },
  { key: 'fbaFees', label: 'FBA Fees', align: 'right', format: 'currency', heatmap: 'red', minWidth: 'min-w-[140px]' },
  { key: 'otherAmazonAdj', label: 'Other Amazon Adj.', align: 'right', format: 'currency', heatmap: 'neutral', minWidth: 'min-w-[170px]' },
  { key: 'totalAmazonExpenses', label: 'Total Amazon Expenses', align: 'right', format: 'currency', heatmap: 'red', minWidth: 'min-w-[190px]' },
  { key: 'marketingExpense', label: 'Marketing Expense', align: 'right', format: 'currency', heatmap: 'red', minWidth: 'min-w-[180px]' },
  { key: 'allocatedNonSkuExpenses', label: 'Allocated Non-SKU Expenses', align: 'right', format: 'currency', heatmap: 'neutral', minWidth: 'min-w-[220px]' },
  { key: 'totalExpensesInclMarketing', label: `Total Expenses incl. Marketing`, align: 'right', format: 'currency', heatmap: 'red', minWidth: 'min-w-[220px]' },
  { key: 'totalCogs', label: 'Total COGS', align: 'right', format: 'currency', heatmap: 'red', minWidth: 'min-w-[150px]' },
  { key: 'totalExpensesInclMarketingCogs', label: 'Total Expenses incl. Marketing + COGS', align: 'right', format: 'currency', heatmap: 'red', minWidth: 'min-w-[270px]' },
  { key: 'netAfterAmazon', label: 'Net After Amazon', align: 'right', format: 'currency', heatmap: 'green', minWidth: 'min-w-[180px]' },
  { key: 'netAfterAmazonMarketing', label: 'Net After Amazon + Marketing', align: 'right', format: 'currency', heatmap: 'green', minWidth: 'min-w-[240px]' },
  { key: 'amazonMarginPct', label: 'Amazon Margin %', align: 'right', format: 'pct', heatmap: 'green', minWidth: 'min-w-[170px]' },
  { key: 'marginAfterMarketingPct', label: 'Margin After Marketing %', align: 'right', format: 'pct', heatmap: 'green', minWidth: 'min-w-[210px]' },
  { key: 'marginAfterAllPct', label: 'Margin After All %', align: 'right', format: 'pct', heatmap: 'neutral', minWidth: 'min-w-[180px]' },
  { key: 'targetProfitAtB6Pct', label: 'Target Profit @ B6', align: 'right', format: 'currency', heatmap: 'neutral', minWidth: 'min-w-[190px]' },
  { key: 'targetGap', label: 'Target Gap / (Surplus)', align: 'right', format: 'currency', heatmap: 'neutral', minWidth: 'min-w-[200px]' },
  { key: 'status', label: 'Status', align: 'left', minWidth: 'min-w-[130px]' },
  { key: 'breakevenPrice', label: 'Breakeven Price', align: 'right', format: 'currency', heatmap: 'neutral', minWidth: 'min-w-[170px]' },
  { key: 'avgSellingPrice', label: 'Avg Selling Price', align: 'right', format: 'currency', heatmap: 'neutral', minWidth: 'min-w-[180px]' },
  { key: 'adsPerUnit', label: 'Ads/Unit', align: 'right', format: 'currency', heatmap: 'red', minWidth: 'min-w-[130px]' },
  { key: 'allocatedOpex', label: 'Allocated OPEX', align: 'right', format: 'currency', heatmap: 'neutral', minWidth: 'min-w-[170px]' },
  { key: 'trueNetProfit', label: 'True Net Profit', align: 'right', format: 'currency', heatmap: 'green', minWidth: 'min-w-[180px]' },
];

// ─── Heatmap Helpers ─────────────────────────────────────
function getHeatmapColor(
  val: number,
  allValues: number[],
  type: 'green' | 'red' | 'neutral'
): string {
  if (type === 'neutral') return '';

  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  if (min === max) return '';

  const ratio = (val - min) / (max - min);

  if (type === 'green') {
    return `background-color: rgba(34, 197, 94, ${0.08 + ratio * 0.22})`;
  }

  if (type === 'red') {
    return `background-color: rgba(239, 68, 68, ${0.08 + (1 - ratio) * 0.22})`;
  }

  return '';
}

// ─── SVG Sort Icons ──────────────────────────────────────
const SortAscIcon = () => (
  <svg className="w-3 h-3 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
);

const SortDescIcon = () => (
  <svg className="w-3 h-3 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const SortInactiveIcon = () => (
  <svg className="w-3 h-3 text-text-muted opacity-40" fill="currentColor" viewBox="0 0 20 20">
    <path d="M5 10l5-5 5 5H5z" />
    <path d="M5 10l5 5 5-5H5z" />
  </svg>
);

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
    <div className="grid grid-cols-5 gap-4">
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
    status: [],          // ← empty = no status filter, return ALL products
    marketplaces: [],
    fba: [],
  });

  // Default to "Last 30 Days" — DateRangePicker returns YYYY-MM-DD
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    presetId: 'last30',
  });

  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('trueNetProfit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // ─── NEW: Currency & Target Margin State ───────────────
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [targetMargin, setTargetMargin] = useState<string>('10');

  // ═══════════════════════════════════════════════════════════════
  // DB dates are PDT (Amazon timezone) — pass YYYY-MM-DD directly.
  // No timezone conversion needed. The backend appends 00:00:00 / 23:59:59
  // and queries the DB directly since all dates are already PDT.
  // ═══════════════════════════════════════════════════════════════
  // Build API params — typed to match the RTK Query hook's expected shape
  const apiParams = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return null;

    // Parse target margin as number, default to 10 if invalid
    const marginNum = parseFloat(targetMargin);
    const validatedMargin = !isNaN(marginNum) && marginNum >= 1 && marginNum <= 100
      ? marginNum
      : 10;

    return {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      currency: selectedCurrency,        // ← pass currency (API support only for now)
      targetMargin: validatedMargin,     // ← pass target margin %
      ...(filters.status.length > 0 && { status: filters.status.join(',') }),
    };
  }, [dateRange.startDate, dateRange.endDate, filters.status, selectedCurrency, targetMargin]);

  // Fetch data from API
  const {
    data: apiData,
    isLoading,
    isFetching,
    error,
  } = useGetBreakEvenDataQuery(
    apiParams ?? { startDate: '', endDate: '', currency: 'USD', targetMargin: 10 },
    { skip: !apiParams }
  );

  // Map API response to component's BreakevenItem shape
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
      netAfterAmazon: item.netAfterAmazon,
      netAfterAmazonMarketing: item.netAfterAmazonAndMarketing,
      amazonMarginPct: item.amazonMarginPct,
      marginAfterMarketingPct: item.marginAfterMarketingPct,
      marginAfterAllPct: item.marginAfterAllPct,
      targetProfitAtB6Pct: item.targetProfit,
      targetGap: item.targetGap,
      status: item.status.toUpperCase(),
      breakevenPrice: item.breakevenPrice,
      avgSellingPrice: item.avgSellingPrice,
      adsPerUnit: item.adsPerUnit,
      allocatedOpex: item.allocatedOpex,
      trueNetProfit: item.trueNetProfit,
    }));
  }, [apiData]);

  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
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

  // Pre-compute heatmap ranges per column
  const heatmapRanges = useMemo(() => {
    const ranges: Record<string, number[]> = {};
    for (const col of COLUMNS) {
      if (col.heatmap && col.heatmap !== 'neutral') {
        ranges[col.key] = filteredData.map((item) => (item as any)[col.key]);
      }
    }
    return ranges;
  }, [filteredData]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
    setPage(1);
  }, []);

  // ─── NEW: Target Margin Input Handler ──────────────────
  const handleTargetMarginChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Only allow numeric input
    if (raw === '') {
      setTargetMargin('');
      return;
    }
    // Reject non-numeric characters
    if (!/^\d*\.?\d*$/.test(raw)) return;
    
    const num = parseFloat(raw);
    if (num > 100) return; // Cap at 100
    setTargetMargin(raw);
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = COLUMNS.map((c) => c.label);
    const rows = filteredData.map((item) =>
      COLUMNS.map((col) => {
        const val = (item as any)[col.key];
        if (typeof val === 'string') return `\"${val.replace(/"/g, '""')}\"`;
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

  const SortIcon: React.FC<{ column: SortColumn }> = ({ column }) => {
    if (sortColumn !== column) return <SortInactiveIcon />;
    return sortDirection === 'asc' ? <SortAscIcon /> : <SortDescIcon />;
  };

  const formatCell = (item: BreakevenItem, col: ColumnDef): string => {
    const val = (item as any)[col.key];
    if (col.format === 'currency') return formatCurrency(Math.abs(val));
    if (col.format === 'pct') return formatPercentage(val);
    if (col.format === 'number') return val.toLocaleString();
    return String(val);
  };

  const cellClass = (item: BreakevenItem, col: ColumnDef): string => {
    const val = (item as any)[col.key];
    const base = 'text-center table-cell align-middle';

    if (col.key === 'sku') {
       return `${base} text-primary-600 font-medium break-all whitespace-normal max-w-[210px]`;
    }
    if (col.format === 'currency' && val < 0) {
      return `${base} text-danger-600`;
    }
    if (col.key === 'trueNetProfit') {
      return `${base} font-semibold ${val >= 0 ? 'text-success-600' : 'text-danger-600'}`;
    }
    if (col.key === 'targetGap') {
      return `${base} font-semibold ${val >= 0 ? 'text-success-600' : 'text-danger-600'}`;
    }
    return `${base} text-text-primary`;
  };

  const renderCell = (item: BreakevenItem, col: ColumnDef) => {
    const val = (item as any)[col.key];
    const formatted = formatCell(item, col);

    if (col.key === 'targetGap') {
      const prefix = val >= 0 ? '+' : '-';
      return `${prefix}${formatted}`;
    }
    if (col.format === 'currency' && val < 0) {
      return `-${formatted}`;
    }
    return formatted;
  };

  // Show date range in header for user clarity
  const dateDisplay = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return '';
    const start = parseISO(dateRange.startDate);
    const end = parseISO(dateRange.endDate);
    return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
  }, [dateRange]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Breakeven Analysis"
          description="Profitability breakdown by SKU"
        />
        <SummaryCardsSkeleton />
        <TableSkeleton rows={5} columns={COLUMNS.length} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Breakeven Analysis"
        description={`Profitability breakdown by SKU${dateDisplay ? ` • ${dateDisplay}` : ''}`}
      />

      {/* ─── Toolbar ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
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

        {/* 🗓️ Date Range Picker — RIGHT AFTER SEARCH */}
        <DateRangePicker
          value={dateRange}
          onChange={(range) => {
            setDateRange(range);
            setPage(1);
          }}
          displayFormat="MMM d, yyyy"
          placeholder="Select date range"
        />

        {/* ─── NEW: Currency Select ─────────────────────── */}
        <div className="min-w-[100px]">
          <Select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
            options={CURRENCY_OPTIONS}
          />
        </div>

        {/* Status Filter — WIRED TO API, empty = all products */}
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

        {/* Marketplace Filter */}
        <MultiSelectInput
          title="Marketplace"
          options={MARKETPLACES}
          value={filters.marketplaces}
          onChange={(val: string[]) =>
            setFilters((prev) => ({ ...prev, marketplaces: val }))
          }
          placeholder="All Marketplaces"
        />

        {/* FBA Filter */}
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

        {/* Export CSV */}
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
          {/* ─── NEW: Target SKU Margin % Input ───────────── */}
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
      {isFetching && !apiData?.summary ? (
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

      {/* ─── Table Card ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {isFetching && !tableData.length ? (
            <TableSkeleton rows={5} columns={COLUMNS.length} />
          ) : (
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((col) => (
                    <TableHead
                      key={col.key}
                      className={`cursor-pointer hover:bg-surface-secondary select-none break-words leading-tight ${col.minWidth || ''} ${
                        col.align === 'right' ? 'text-right' : ''
                      } ${col.key === 'trueNetProfit' ? 'bg-success-50' : ''}`}
                      onClick={() => handleSort(col.key)}
                    >
                        {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!paginatedData.length ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length} className="text-center py-12">
                      <EmptyState
                        title={error ? 'Failed to load data' : 'No products found'}
                        description={error ? 'Please try again later.' : 'Try adjusting your filters or search query.'}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow
                      key={item.sku}
                      className="hover:bg-surface-secondary transition-colors"
                    >
                      {COLUMNS.map((col) => {
                        const val = (item as any)[col.key];
                        const heatmapStyle = col.heatmap && col.heatmap !== 'neutral'
                          ? getHeatmapColor(val, heatmapRanges[col.key], col.heatmap)
                          : '';

                        return (
                          <TableCell
                            key={col.key}
                            className={`${cellClass(item, col)} ${col.minWidth || ''} py-6`}
                            style={heatmapStyle ? { backgroundColor: heatmapStyle.split('background-color: ')[1].replace(';', '') } : undefined}
                          >
                            {renderCell(item, col)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* ─── Pagination Footer ────────────────────────────── */}
      <PaginationFooter
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={setPage}
        itemLabel="products"
      />
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