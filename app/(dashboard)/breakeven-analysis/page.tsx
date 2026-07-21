'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout';
import { EmptyState } from '@/components/data-display/EmptyState';
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput';
import { MARKETPLACES } from '@/utils/marketplaces';
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter';
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

// ─── Constants ─────────────────────────────────────────────
const FBA_OPTIONS = [
  { id: 'fba', name: 'FBA' },
  { id: 'fbm', name: 'FBM' },
  { id: 'sfp', name: 'SFP' },
];

const STATUS_OPTIONS = [
  { id: 'active', name: 'Active' },
  { id: 'inactive', name: 'Inactive' },
  { id: 'discontinued', name: 'Discontinued' },
];

const PAGE_SIZE = 50;

// ─── Types ───────────────────────────────────────────────
interface Filters {
  search: string;
  status: string[];
  marketplaces: string[];
  fba: string[];
}

interface BreakevenItem {
  skuId: string;
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
  | 'skuId'
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

// ─── 5 Dummy Records ─────────────────────────────────────
const DUMMY_DATA: BreakevenItem[] = [
  {
    skuId: 'BOMTSS4PCDQUEENWHIT1',
    description: 'Bedsure Queen Size 4 Piece Bed Sheet Set - White',
    units: 1247,
    productSales: 38657.53,
    promoRebates: -450.00,
    sellingFees: -5231.88,
    fbaFees: -8421.12,
    otherAmazonAdj: -120.50,
    totalAmazonExpenses: -14223.50,
    marketingExpense: -2100.00,
    allocatedNonSkuExpenses: -350.00,
    totalExpensesInclMarketing: -16673.50,
    totalCogs: -8750.00,
    totalExpensesInclMarketingCogs: -25423.50,
    netAfterAmazon: 24434.03,
    netAfterAmazonMarketing: 22334.03,
    amazonMarginPct: 63.2,
    marginAfterMarketingPct: 57.8,
    marginAfterAllPct: 29.2,
    targetProfitAtB6Pct: 25.0,
    targetGap: 3200.00,
    status: 'active',
    breakevenPrice: 18.50,
    avgSellingPrice: 31.00,
    adsPerUnit: 1.68,
    allocatedOpex: 0.28,
    trueNetProfit: 11305.00,
  },
  {
    skuId: 'BDR-PLASTICHANGERSOPC',
    description: 'Bedsure Plastic Hangers 50 Pack - Space Saving',
    units: 856,
    productSales: 15857.44,
    promoRebates: -200.00,
    sellingFees: -2147.78,
    fbaFees: -4102.33,
    otherAmazonAdj: -85.20,
    totalAmazonExpenses: -6535.31,
    marketingExpense: -1200.00,
    allocatedNonSkuExpenses: -180.00,
    totalExpensesInclMarketing: -7915.31,
    totalCogs: -6800.00,
    totalExpensesInclMarketingCogs: -14715.31,
    netAfterAmazon: 9322.13,
    netAfterAmazonMarketing: 8122.13,
    amazonMarginPct: 58.8,
    marginAfterMarketingPct: 51.2,
    marginAfterAllPct: -5.4,
    targetProfitAtB6Pct: 15.0,
    targetGap: -1500.00,
    status: 'active',
    breakevenPrice: 22.00,
    avgSellingPrice: 18.52,
    adsPerUnit: 1.40,
    allocatedOpex: 0.21,
    trueNetProfit: -3211.18,
  },
  {
    skuId: 'BEDDORA-PP-QUEENZPK',
    description: 'Bedsure 2 Pack Pillow Protectors - Queen Size',
    units: 534,
    productSales: 12276.66,
    promoRebates: -150.00,
    sellingFees: -1662.34,
    fbaFees: -2891.22,
    otherAmazonAdj: -45.00,
    totalAmazonExpenses: -4748.56,
    marketingExpense: -800.00,
    allocatedNonSkuExpenses: -120.00,
    totalExpensesInclMarketing: -5668.56,
    totalCogs: -5100.00,
    totalExpensesInclMarketingCogs: -10768.56,
    netAfterAmazon: 7528.10,
    netAfterAmazonMarketing: 6728.10,
    amazonMarginPct: 61.3,
    marginAfterMarketingPct: 54.8,
    marginAfterAllPct: 0.1,
    targetProfitAtB6Pct: 20.0,
    targetGap: 0.50,
    status: 'active',
    breakevenPrice: 22.95,
    avgSellingPrice: 22.99,
    adsPerUnit: 1.50,
    allocatedOpex: 0.22,
    trueNetProfit: 12.50,
  },
  {
    skuId: 'BDSH-THROW-BLANKET-GRY',
    description: 'Bedsure Fleece Throw Blanket - Grey 50x60',
    units: 2103,
    productSales: 45230.89,
    promoRebates: -600.00,
    sellingFees: -6123.18,
    fbaFees: -12500.00,
    otherAmazonAdj: -210.00,
    totalAmazonExpenses: -19433.18,
    marketingExpense: -3500.00,
    allocatedNonSkuExpenses: -580.00,
    totalExpensesInclMarketing: -23513.18,
    totalCogs: -9800.00,
    totalExpensesInclMarketingCogs: -33313.18,
    netAfterAmazon: 25797.71,
    netAfterAmazonMarketing: 22297.71,
    amazonMarginPct: 57.0,
    marginAfterMarketingPct: 49.3,
    marginAfterAllPct: 19.3,
    targetProfitAtB6Pct: 22.0,
    targetGap: 2100.00,
    status: 'active',
    breakevenPrice: 14.85,
    avgSellingPrice: 21.50,
    adsPerUnit: 1.66,
    allocatedOpex: 0.28,
    trueNetProfit: 8750.25,
  },
  {
    skuId: 'BDTW-MICROFIBER-KING-BLU',
    description: 'Bedsure Microfiber Duvet Cover King - Navy Blue',
    units: 678,
    productSales: 28450.00,
    promoRebates: -350.00,
    sellingFees: -3850.75,
    fbaFees: -6200.00,
    otherAmazonAdj: -95.00,
    totalAmazonExpenses: -10495.75,
    marketingExpense: -1800.00,
    allocatedNonSkuExpenses: -220.00,
    totalExpensesInclMarketing: -12515.75,
    totalCogs: -11200.00,
    totalExpensesInclMarketingCogs: -23715.75,
    netAfterAmazon: 17954.25,
    netAfterAmazonMarketing: 16154.25,
    amazonMarginPct: 63.1,
    marginAfterMarketingPct: 56.8,
    marginAfterAllPct: -3.0,
    targetProfitAtB6Pct: 18.0,
    targetGap: -425.00,
    status: 'inactive',
    breakevenPrice: 41.95,
    avgSellingPrice: 41.95,
    adsPerUnit: 2.65,
    allocatedOpex: 0.32,
    trueNetProfit: -850.00,
  },
];

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
  { key: 'skuId', label: 'SKU', align: 'left', minWidth: 'min-w-[210px]' },
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
  { key: 'totalExpensesInclMarketing', label: 'Total Expenses incl. Marketing', align: 'right', format: 'currency', heatmap: 'red', minWidth: 'min-w-[220px]' },
  { key: 'totalCogs', label: 'Total COGS', align: 'right', format: 'currency', heatmap: 'red', minWidth: 'min-w-[150px]' },
  { key: 'totalExpensesInclMarketingCogs', label: 'Total Expenses incl. Marketing + COGS', align: 'right', format: 'currency', heatmap: 'red', minWidth: 'min-w-[270px]' },
  { key: 'netAfterAmazon', label: 'Net After Amazon', align: 'right', format: 'currency', heatmap: 'green', minWidth: 'min-w-[180px]' },
  { key: 'netAfterAmazonMarketing', label: 'Net After Amazon + Marketing', align: 'right', format: 'currency', heatmap: 'green', minWidth: 'min-w-[240px]' },
  { key: 'amazonMarginPct', label: 'Amazon Margin %', align: 'right', format: 'pct', heatmap: 'green', minWidth: 'min-w-[170px]' },
  { key: 'marginAfterMarketingPct', label: 'Margin After Marketing %', align: 'right', format: 'pct', heatmap: 'green', minWidth: 'min-w-[210px]' },
  { key: 'marginAfterAllPct', label: 'Margin After All %', align: 'right', format: 'pct', heatmap: 'neutral', minWidth: 'min-w-[180px]' },
  { key: 'targetProfitAtB6Pct', label: 'Target Profit @ B6 %', align: 'right', format: 'pct', heatmap: 'neutral', minWidth: 'min-w-[190px]' },
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
    // Light green to dark green
    const intensity = Math.round(50 + ratio * 180);
    return `background-color: rgba(34, 197, 94, ${0.08 + ratio * 0.22})`;
  }

  if (type === 'red') {
    // For negative/expense columns: more negative = darker red
    const intensity = Math.round(50 + (1 - ratio) * 180);
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

// ─── Component ───────────────────────────────────────────
export default function BreakevenAnalysis() {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: [],
    marketplaces: [],
    fba: [],
  });
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('trueNetProfit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isLoading, setIsLoading] = useState(false);

  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setPage(1);
  }, [sortColumn]);

  // Filter + sort dummy data client-side
  const filteredData = useMemo(() => {
    let result = [...DUMMY_DATA];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (item) =>
          item.skuId.toLowerCase().includes(q) ||
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
  }, [filters.search, sortColumn, sortDirection]);

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

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setPage(1);
    setTimeout(() => setIsLoading(false), 800);
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = COLUMNS.map((c) => c.label);
    const rows = filteredData.map((item) =>
      COLUMNS.map((col) => {
        const val = (item as any)[col.key];
        if (typeof val === 'string') return `\"${val.replace(/"/g, '\"\"')}\"`;
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
    const base = col.align === 'right' ? 'text-right' : '';

    if (col.key === 'skuId') {
      return `${base} text-primary-600 font-medium whitespace-nowrap`;
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

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Breakeven Analysis"
          description="Profitability breakdown by SKU"
        />
        <TableSkeleton rows={5} columns={COLUMNS.length} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Breakeven Analysis"
        description="Profitability breakdown by SKU"
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

        {/* Status Filter */}
        <MultiSelectInput
          title="Status"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(val: string[]) =>
            setFilters((prev) => ({ ...prev, status: val }))
          }
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

        {/* Refresh */}
        <Button variant="primary" size="sm" onClick={handleRefresh}>
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </Button>
      </div>

      {/* ─── Table Card ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
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
                    <span className={`inline-flex flex-wrap items-center gap-1 ${col.align === 'right' ? 'justify-end w-full' : ''}`}>
                      {col.label}
                      <SortIcon column={col.key} />
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!paginatedData.length ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="text-center py-12">
                    <EmptyState
                      title="No products found"
                      description="Try adjusting your filters or search query."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow
                    key={item.skuId}
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