"use client";

import React, { useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/layout";
import { MultiSelectInput } from "@/components/multi-select-input/MultiSelectInput";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import {
  STATUS_TONES,
  breakEvenRowClassName,
  buildBreakEvenColumns,
} from "@/features/breakeven/breakEvenColumns";
import { ApplyFiltersButton } from "@/features/profit/dashboard/components/ApplyFiltersButton";
import { TableSearchInput } from "@/features/profit/dashboard/components/TableSearchInput";
import { RowActionsMenu } from "@/components/row-actions-menu/RowActionsMenu";
import { useReportExport } from "@/hooks/useReportExport";
import { SellerboardProductsTable } from "@/features/profit/dashboard/SellerboardProductsTable";
import {
  useGetBreakEvenDataQuery,
  type BreakEvenItem,
  type BreakEvenStatus,
} from "@/services/api/breakEven.api";
import { useDebounce } from "@/utils/debounce";
import { formatCurrency, formatPercentage } from "@/utils/format";
import { MARKETPLACES } from "@/utils/marketplaces";
import {
  REPORT_CURRENCY_OPTIONS,
  currencyForMarketplaceSelection,
} from "@/utils/marketplaceCurrency";

/**
 * Break-even Analysis: the profit dashboard's products table, one row per SKU (same sales, promo, ads, Amazon fees, COGS
 * and profit) plus each SKU's break-even price and the price it needs for a target margin.
 */

const CURRENCY_OPTIONS = REPORT_CURRENCY_OPTIONS.map(({ value, label }) => ({
  id: value,
  name: label,
}));
const DEFAULT_MARGIN = 10;
const STATUS_OPTIONS: { id: BreakEvenStatus; name: string }[] = [
  { id: "Below target", name: "Below target" },
  { id: "Meets target", name: "Meets target" },
  { id: "Above target", name: "Above target" },
  { id: "No sales", name: "No sales" },
];
const PAGE_SIZE = 20;

interface DateRangeValue {
  startDate: string | null;
  endDate: string | null;
  presetId?: string | null;
}

/** The filter bar's values: edited as a draft, used once Apply Filters is pressed (search applies as you type). */
interface FilterState {
  dateRange: DateRangeValue;
  currency: string;
  marketplaces: string[];
  margin: string;
  /** Target statuses shown in the table; empty for all. */
  statuses: BreakEvenStatus[];
}

const INITIAL_FILTERS: FilterState = {
  dateRange: {
    startDate: format(subDays(new Date(), 29), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    presetId: "last30",
  },
  currency: "CAD",
  marketplaces: ["Amazon.ca"],
  margin: String(DEFAULT_MARGIN),
  statuses: [],
};

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value) => b.includes(value));

const sameFilters = (a: FilterState, b: FilterState) =>
  a.dateRange.startDate === b.dateRange.startDate &&
  a.dateRange.endDate === b.dateRange.endDate &&
  a.currency === b.currency &&
  a.margin === b.margin &&
  sameSet(a.marketplaces, b.marketplaces) &&
  sameSet(a.statuses, b.statuses);

/** A target margin the API accepts (1 to 99 %), else the default. */
const validMargin = (value: string) => {
  const margin = parseFloat(value);
  return Number.isFinite(margin) && margin >= 1 && margin < 100
    ? margin
    : DEFAULT_MARGIN;
};

export default function BreakevenAnalysis() {
  const [draft, setDraft] = useState<FilterState>(INITIAL_FILTERS);
  const [applied, setApplied] = useState<FilterState>(INITIAL_FILTERS);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);

  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const filterPending = !sameFilters(draft, applied);
  const applyFilters = () => {
    // An out-of-range margin falls back to the default, and the input shows the margin actually used
    const next = { ...draft, margin: String(validMargin(draft.margin)) };
    setDraft(next);
    setApplied(next);
  };

  /** Summary status chips: show only that status at once (a second click shows every status again). */
  const quickFilterStatus = (status: BreakEvenStatus) => {
    const statuses: BreakEvenStatus[] =
      applied.statuses.length === 1 && applied.statuses[0] === status
        ? []
        : [status];
    setDraft((current) => ({ ...current, statuses }));
    setApplied((current) => ({ ...current, statuses }));
  };

  const { dateRange, currency, marketplaces, statuses } = applied;
  const targetMargin = validMargin(applied.margin);

  const params =
    dateRange.startDate && dateRange.endDate
      ? {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          currency,
          targetMargin,
          ...(marketplaces.length > 0 && {
            marketplaces: marketplaces.join(","),
          }),
          ...(debouncedSearch && { search: debouncedSearch }),
        }
      : null;

  const { data, isLoading, isFetching, error } = useGetBreakEvenDataQuery(
    params ?? { startDate: "", endDate: "" },
    {
      skip: !params,
    },
  );

  // Excel export of every SKU for the applied filters (built by the export worker, offered for download when ready)
  const { start: startExport, isExporting } = useReportExport(
    "break-even-analysis",
  );

  const columns = useMemo(
    () => buildBreakEvenColumns(targetMargin),
    [targetMargin],
  );
  // The status filter narrows the rows already loaded; the summary still covers every SKU
  const rows = useMemo(
    () =>
      statuses.length
        ? data?.items.filter((item) => statuses.includes(item.breakEven.status))
        : data?.items,
    [data?.items, statuses],
  );
  const summary = data?.summary;
  const dateDisplay =
    dateRange.startDate && dateRange.endDate
      ? `${format(parseISO(dateRange.startDate), "MMM d, yyyy")} – ${format(parseISO(dateRange.endDate), "MMM d, yyyy")}`
      : "";

  return (
    <div className="p-6 flex flex-col gap-4">
      <PageHeader
        title="Breakeven Analysis"
        description={`Profitability and break-even price by SKU${dateDisplay ? ` • ${dateDisplay}` : ""}`}
      />

      {/* Filters: what to report on, then how to judge it */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search SKU, ASIN, title..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-border rounded-lg text-sm bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <DateRangePicker
            value={draft.dateRange}
            onChange={(range) => update("dateRange", range)}
            displayFormat="MMM d, yyyy"
            placeholder="Select date range"
          />

          {/* Same dropdowns, in the same order, as the profit dashboard's filter bar */}
          <div className="min-w-[160px] shrink-0">
            <MultiSelectInput
              title="Marketplace"
              options={MARKETPLACES}
              value={draft.marketplaces}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  marketplaces: value,
                  currency: currencyForMarketplaceSelection(
                    value,
                    current.currency,
                  ),
                }))
              }
              placeholder="All Marketplaces"
            />
          </div>

          <div className="min-w-[120px] shrink-0">
            <MultiSelectInput
              single
              title="Currency"
              options={CURRENCY_OPTIONS}
              value={[draft.currency]}
              onChange={(value) => value[0] && update("currency", value[0])}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center">
            <label
              htmlFor="target-margin"
              className="text-sm text-white px-3 py-2.5 bg-primary-500 rounded-l-lg whitespace-nowrap"
            >
              Target margin %
            </label>
            <input
              id="target-margin"
              type="text"
              inputMode="decimal"
              value={draft.margin}
              onChange={(event) =>
                update("margin", event.target.value.replace(/[^0-9.]/g, ""))
              }
              onKeyDown={(event) => event.key === "Enter" && applyFilters()}
              className="w-16 px-2 py-2.5 border border-border rounded-r-lg text-sm text-center bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="min-w-[170px] shrink-0">
            <MultiSelectInput
              title="Target status"
              options={STATUS_OPTIONS}
              value={draft.statuses}
              onChange={(value) =>
                update("statuses", value as BreakEvenStatus[])
              }
              placeholder="All statuses"
            />
          </div>

          <div className="flex-1" />

          <ApplyFiltersButton
            onClick={applyFilters}
            pending={filterPending}
            disabled={isFetching && !filterPending}
          />
        </div>
      </div>

      {/* Summary */}
      {isLoading || (isFetching && !summary) ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="bg-surface border border-border rounded-lg p-4 animate-pulse"
            >
              <div className="h-3 bg-border rounded w-20 mb-2" />
              <div className="h-6 bg-border rounded w-24" />
            </div>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <SummaryCard
            label="SKUs"
            value={summary.totalProducts.toLocaleString()}
          />
          <SummaryCard
            label="Sales"
            value={formatCurrency(summary.totalSales)}
          />
          <SummaryCard
            label="Units sold"
            value={summary.totalUnits.toLocaleString()}
          />
          <SummaryCard
            label="Net profit"
            value={formatCurrency(summary.totalNetProfit)}
          />
          <SummaryCard
            label="Net margin"
            value={formatPercentage(summary.avgMarginPct)}
          />
          <SummaryCard
            label={`vs ${summary.targetMargin}% target`}
            value={
              <div className="flex flex-wrap gap-1.5 text-sm">
                {(
                  [
                    ["Below target", summary.belowTarget, "below"],
                    ["Meets target", summary.meetsTarget, "meets"],
                    ["Above target", summary.aboveTarget, "above"],
                  ] as const
                ).map(([status, count, label]) => (
                  <StatusCount
                    key={status}
                    status={status}
                    count={count}
                    label={label}
                    active={statuses.length === 1 && statuses[0] === status}
                    onClick={() => quickFilterStatus(status)}
                  />
                ))}
              </div>
            }
          />
        </div>
      ) : null}

      {/* Products: header bar as on the profit dashboard (period, export menu, table search) */}
      <div className="bg-surface border border-border rounded-xl">
        <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-text-primary">
              {dateDisplay || "Period"}
            </h2>
            <span className="px-4 py-1.5 text-sm font-medium rounded bg-primary-600 text-white">
              Products
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <RowActionsMenu
              label="break-even table"
              items={[
                {
                  key: "export-excel",
                  label: "Export Excel",
                  onSelect: () =>
                    params &&
                    startExport("xlsx", {
                      ...params,
                      ...(statuses.length > 0 && {
                        statuses: statuses.join(","),
                      }),
                    }),
                  disabled: !params || isExporting,
                  disabledReason: isExporting
                    ? "An export is being prepared…"
                    : undefined,
                },
              ]}
            />
            <TableSearchInput value={search} onChange={setSearch} />
          </div>
        </div>

        <div className="p-6">
          <SellerboardProductsTable
            products={rows as any}
            isLoading={isLoading}
            isFetching={isFetching}
            error={error}
            columns={columns}
            getRowKey={(row: BreakEvenItem) =>
              `${row.marketplace ?? ""}:${row.sku}`
            }
            getRowClassName={breakEvenRowClassName}
            searchTerm={debouncedSearch}
            pageSize={PAGE_SIZE}
            emptyMessage={
              error
                ? "Failed to load break-even data. Please try again."
                : "No SKUs match these filters."
            }
            footerContent={({ to, total }) => (
              <>
                Showing {to} of {total} SKUs · red: margin below {targetMargin}%
                · amber: {targetMargin}% to{" "}
                {targetMargin + (summary?.aboveTargetPoints ?? 10)}% · green:
                above that · break-even and target prices use the period&apos;s
                costs per unit
              </>
            )}
          />
        </div>
      </div>
    </div>
  );
}

function StatusCount({
  status,
  count,
  label,
  active,
  onClick,
}: {
  status: BreakEvenStatus;
  count: number;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={
        active ? "Show every status" : `Show only SKUs ${label} the target`
      }
      className={`px-2 py-0.5 text-xs rounded border font-semibold uppercase tracking-wide whitespace-nowrap transition-shadow hover:shadow ${STATUS_TONES[status].badge} ${
        active ? "ring-2 ring-offset-1 ring-primary-500" : ""
      }`}
    >
      {count.toLocaleString()} {label}
    </button>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="text-xs text-text-muted uppercase tracking-wide">
        {label}
      </div>
      <div className="text-lg font-bold text-text-primary mt-1">{value}</div>
    </div>
  );
}
