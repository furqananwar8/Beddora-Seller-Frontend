"use client";

import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import DateRangePicker, {
  DateRangeValue,
} from "@/components/date-range-picker/DateRangePicker";
import { Spinner } from "@/design-system/loaders";
import type { RowSelectionState } from "@/hooks/use-sync-row-selection";

/**
 * Report Sync Management: a scrolling channel list on the left (Amazon, Walmart, ...), and the open channel's sync jobs
 * by type and mode on the right. Every group keeps its own selection; the page resets each group through its own API.
 */

export type SyncMode = "live" | "backfill";

export interface SyncTableRow {
  key: string;
  label: string;
  mode: SyncMode;
  /** Markets the sync covers, shown under its name (channel syncs). */
  markets?: string[];
  status: string;
  errorMessage?: string | null;
  currentStart: string | null;
  /** False for syncs that always read everything: a reset just runs them again. */
  hasStartDate: boolean;
}

export interface SyncTableGroup {
  id: string;
  title: string;
  rows: SyncTableRow[];
  selectionMap: Record<string, RowSelectionState>;
  onToggle: (key: string, defaultDate: string) => void;
  onDateChange: (key: string, range: DateRangeValue) => void;
  isLoading: boolean;
  emptyText?: string;
  /** Shown above the syncs when the channel is open (e.g. its connection card). */
  header?: React.ReactNode;
}

interface SyncManagementTableProps {
  groups: SyncTableGroup[];
  isBusy: boolean;
  busyText: string;
}

const getDefaultDateStr = (dateVal: string | null | undefined): string => {
  if (!dateVal) return "2026-09-01";
  return dateVal.split("T")[0];
};

const formatDisplayDateWithTimezone = (
  dateVal: string | null | undefined,
): string => {
  if (!dateVal) return "N/A";
  try {
    return format(parseISO(dateVal), "MMM dd, yyyy (z)");
  } catch {
    return dateVal;
  }
};

export const SyncManagementTable: React.FC<SyncManagementTableProps> = ({
  groups,
  isBusy,
  busyText,
}) => {
  const [activeId, setActiveId] = useState(groups[0]?.id);
  const group = groups.find((item) => item.id === activeId) ?? groups[0];
  if (!group) return null;

  const selectedIn = (item: SyncTableGroup) =>
    item.rows.filter((row) => item.selectionMap[row.key]?.selected).length;

  return (
    <div className="relative flex flex-col gap-4 md:flex-row md:items-start">
      {isBusy && (
        <div className="absolute inset-0 z-50 flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border bg-white">
          <Spinner size="lg" />
          <span className="text-sm font-semibold text-gray-800">
            {busyText}
          </span>
        </div>
      )}

      {/* Fixed width, fixed row height; the list scrolls on its own when the channels outgrow the screen */}
      <nav
        aria-label="Channels"
        className="max-h-[70vh] w-full shrink-0 overflow-y-auto rounded-lg border bg-white shadow-sm md:sticky md:top-4 md:w-56"
      >
        {groups.map((item) => {
          const isActive = item.id === group.id;
          const selected = selectedIn(item);
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive}
              onClick={() => setActiveId(item.id)}
              className={`flex h-14 w-full items-center gap-2 border-b px-3 text-left last:border-b-0 ${
                isActive
                  ? "bg-blue-50 shadow-[inset_3px_0_0_theme(colors.blue.600)]"
                  : "hover:bg-gray-50"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm font-semibold ${isActive ? "text-blue-700" : "text-gray-900"}`}
                >
                  {item.title}
                </span>
                <span className="block text-xs text-gray-500">
                  {item.isLoading
                    ? "Loading…"
                    : `${item.rows.length} sync${item.rows.length === 1 ? "" : "s"}`}
                </span>
              </span>
              {selected > 0 && (
                <span className="shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {selected} selected
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1">
        {group.header}
        {/* The date picker popup must overflow the card, so scrolling is only kept where the table does not fit */}
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="ds-scroll-x md:overflow-visible">
            <table className="w-full border-collapse overflow-visible text-left">
              <thead>
                <tr className="relative z-0 border-b bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <th className="w-12 rounded-tl-lg px-4 py-3 text-center">
                    Select
                  </th>
                  <th className="w-44 px-4 py-3">Sync Type</th>
                  <th className="w-28 px-4 py-3">Mode</th>
                  <th className="w-28 px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Current Start Date</th>
                  <th className="w-52 rounded-tr-lg px-4 py-3">
                    New Start Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 overflow-visible text-sm">
                {!group.isLoading && group.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-4 text-center text-gray-500"
                    >
                      {group.emptyText ?? "No syncs configured."}
                    </td>
                  </tr>
                )}
                {group.rows.map((row) => {
                  const defaultDateStr = getDefaultDateStr(row.currentStart);
                  const currentSelection = group.selectionMap[row.key];
                  const isChecked = !!currentSelection?.selected;
                  const selectedDateStr =
                    currentSelection?.startDate || defaultDateStr;
                  const datePickerValue: DateRangeValue = {
                    startDate: selectedDateStr,
                    endDate: selectedDateStr,
                  };

                  return (
                    <tr
                      key={row.key}
                      className={`transition-colors ${isChecked ? "bg-blue-50/40" : "hover:bg-gray-50"}`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isBusy}
                          onChange={() =>
                            group.onToggle(row.key, defaultDateStr)
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>

                      <td className="py-3 px-4 pl-8">
                        <div className="font-semibold text-gray-800">
                          {row.label}
                        </div>
                        {row.markets && row.markets.length > 0 && (
                          <div className="text-xs text-gray-500 uppercase">
                            {row.markets.join(" · ")}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase ${
                            row.mode === "live"
                              ? "bg-green-100 text-green-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {row.mode}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          title={row.errorMessage || undefined}
                          className={`font-mono text-xs uppercase font-semibold px-2 py-0.5 rounded ${
                            row.status === "error"
                              ? "text-red-700 bg-red-50"
                              : "text-gray-700 bg-gray-100"
                          }`}
                        >
                          {row.status || "idle"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center text-gray-600 font-medium whitespace-nowrap">
                        {row.hasStartDate
                          ? formatDisplayDateWithTimezone(row.currentStart)
                          : "Full sync"}
                      </td>

                      <td className="py-3 px-4 relative overflow-visible">
                        {row.hasStartDate ? (
                          <div
                            className={`inline-block relative ${isBusy ? "pointer-events-none opacity-50" : ""}`}
                          >
                            <DateRangePicker
                              selectionMode="single"
                              disableFutureDates={true}
                              showPresets={false}
                              value={datePickerValue}
                              onChange={(range) =>
                                group.onDateChange(row.key, range)
                              }
                              displayFormat="MMM d, yyyy"
                              placeholder="Select Date"
                              placement="right"
                              triggerClassName="w-44 [&>span]:flex-1 [&>span]:text-left"
                            />
                          </div>
                        ) : (
                          // Same height as the date picker, so every row lines up
                          <span className="flex h-11 items-center text-xs text-gray-500">
                            Select to run it again now
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
