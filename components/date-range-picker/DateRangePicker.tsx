// DateRangePicker.tsx
// A reusable, dynamic date range picker with presets and dual-calendar view

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  format,
  parseISO,
  addMonths,
  getYear,
  getMonth,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isToday,
  isBefore,
  isAfter,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
} from 'date-fns';
import { cn } from '@/utils/cn';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Periodicity = 'day' | 'week' | 'month';

export interface DateRangePreset {
  id: string;
  label: string;
  getRange: () => { startDate: string; endDate: string };
}

export interface DateRangeValue {
  startDate: string | null; // ISO date string YYYY-MM-DD
  endDate: string | null;   // ISO date string YYYY-MM-DD
  presetId?: string | null;
  periodicity?: string | null;
}

export interface DateRangePickerProps {
  /** Called when user clicks Apply or selects a preset */
  onChange: (range: DateRangeValue) => void;
  /** Optional initial value */
  value?: DateRangeValue;
  /** Optional custom presets (defaults to built-ins) */
  presets?: DateRangePreset[];
  /** Show preset sidebar (default: true) */
  showPresets?: boolean;
  /** Custom className for the dropdown container */
  className?: string;
  /** Placement of the dropdown relative to trigger */
  placement?: 'left' | 'right';
  /** Trigger element (defaults to a button showing current range) */
  trigger?: React.ReactNode;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Disable dates matching this predicate */
  disabledDate?: (date: Date) => boolean;
  /** Format string for display (default: "MMM d, yyyy") */
  displayFormat?: string;
  /** Placeholder text when no range selected */
  placeholder?: string;

  keepOpenPresetIds?: string[];
}

// ─── Default Presets ─────────────────────────────────────────────────────────

const getDefaultPresets = (): DateRangePreset[] => [
  {
    id: 'today',
    label: 'Today',
    getRange: () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return { startDate: today, endDate: today };
    },
  },
  {
    id: 'yesterday',
    label: 'Yesterday',
    getRange: () => {
      const yest = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      return { startDate: yest, endDate: yest };
    },
  },
  {
    id: 'last7',
    label: 'Last 7 Days',
    getRange: () => ({
      startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    id: 'last30',
    label: 'Last 30 Days',
    getRange: () => ({
      startDate: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    id: 'thisWeek',
    label: 'This Week',
    getRange: () => ({
      startDate: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      endDate: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    }),
  },
  {
    id: 'lastWeek',
    label: 'Last Week',
    getRange: () => {
      const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
      return {
        startDate: format(lastWeekStart, 'yyyy-MM-dd'),
        endDate: format(endOfWeek(lastWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    },
  },
  {
    id: 'thisMonth',
    label: 'This Month',
    getRange: () => ({
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    }),
  },
  {
    id: 'lastMonth',
    label: 'Last Month',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      };
    },
  },
  {
    id: 'thisYear',
    label: 'This Year',
    getRange: () => ({
      startDate: format(startOfYear(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfYear(new Date()), 'yyyy-MM-dd'),
    }),
  },
];

// ─── Calendar Grid Sub-component ─────────────────────────────────────────────

interface CalendarGridProps {
  year: number;
  month: number;
  selectedStart: string | null;
  selectedEnd: string | null;
  hoverDate: string | null;
  onDateClick: (dateStr: string) => void;
  onHover: (dateStr: string | null) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDate?: (date: Date) => boolean;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function CalendarGrid({
  year,
  month,
  selectedStart,
  selectedEnd,
  hoverDate,
  onDateClick,
  onHover,
  minDate,
  maxDate,
  disabledDate,
}: CalendarGridProps) {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const isInRange = (dateStr: string): boolean => {
    if (!selectedStart || !selectedEnd) return false;
    const d = parseISO(dateStr);
    const s = parseISO(selectedStart);
    const e = parseISO(selectedEnd);
    return (isAfter(d, s) || isSameDay(d, s)) && (isBefore(d, e) || isSameDay(d, e));
  };

  const isHoveredRange = (dateStr: string): boolean => {
    if (!selectedStart || selectedEnd || !hoverDate) return false;
    const d = parseISO(dateStr);
    const s = parseISO(selectedStart);
    const h = parseISO(hoverDate);
    const rangeStart = isBefore(s, h) ? s : h;
    const rangeEnd = isBefore(s, h) ? h : s;
    return (isAfter(d, rangeStart) || isSameDay(d, rangeStart)) && (isBefore(d, rangeEnd) || isSameDay(d, rangeEnd));
  };

  const getDayStatus = (dayNum: number) => {
    const date = new Date(year, month, dayNum);
    const dateStr = format(date, 'yyyy-MM-dd');
    const isSelectedStart = selectedStart === dateStr;
    const isSelectedEnd = selectedEnd === dateStr;
    const inRange = isInRange(dateStr);
    const hovered = isHoveredRange(dateStr);
    const isTodayDate = isToday(date);

    const isDisabled =
      (minDate && isBefore(date, minDate) && !isSameDay(date, minDate)) ||
      (maxDate && isAfter(date, maxDate) && !isSameDay(date, maxDate)) ||
      (disabledDate?.(date) ?? false);

    return { dateStr, isSelectedStart, isSelectedEnd, inRange, hovered, isTodayDate, isDisabled };
  };

  return (
    <div className="flex-1">
      <div className="text-center text-sm font-medium text-text-primary mb-2">
        {format(firstDayOfMonth, 'MMMM yyyy')}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-xs text-text-muted py-1">
            {wd}
          </div>
        ))}
        {days.map((dayNum, idx) => {
          if (dayNum === null) {
            return <div key={`empty-${idx}`} className="h-8" />;
          }
          const { dateStr, isSelectedStart, isSelectedEnd, inRange, hovered, isTodayDate, isDisabled } = getDayStatus(dayNum);

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onDateClick(dateStr)}
              onMouseEnter={() => !isDisabled && onHover(dateStr)}
              onMouseLeave={() => onHover(null)}
              className={cn(
                'h-8 w-full text-sm flex items-center justify-center transition-colors relative',
                isDisabled && 'text-text-muted cursor-not-allowed opacity-40',
                !isDisabled && 'cursor-pointer hover:bg-primary-100',
                isSelectedStart && 'bg-primary-700 text-white rounded-l-md hover:bg-primary-700',
                isSelectedEnd && 'bg-primary-700 text-white rounded-r-md hover:bg-primary-700',
                !isSelectedStart && !isSelectedEnd && (inRange || hovered) && 'bg-primary-100 text-secondary-600',
                isTodayDate && !isSelectedStart && !isSelectedEnd && !inRange && !hovered && 'text-primary-600 font-semibold',
                !isSelectedStart && !isSelectedEnd && !inRange && !hovered && !isTodayDate && !isDisabled && 'text-text-primary'
              )}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DateRangePicker({
  onChange,
  value,
  presets,
  showPresets = true,
  className,
  placement = 'right',
  trigger,
  minDate,
  maxDate,
  disabledDate,
  displayFormat = 'MMM d, yyyy',
  placeholder = 'Select date range',
  keepOpenPresetIds = [],
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(value?.presetId ?? null);

  const [tempStartDate, setTempStartDate] = useState<string | null>(value?.startDate ?? null);
  const [tempEndDate, setTempEndDate] = useState<string | null>(value?.endDate ?? null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const activePresets = presets ?? getDefaultPresets();

  const month1 = calendarViewDate;
  const month2 = addMonths(calendarViewDate, 1);

  // Sync with external value
  useEffect(() => {
    if (value) {
      setTempStartDate(value.startDate);
      setTempEndDate(value.endDate);
      setSelectedPreset(value.presetId ?? null);
      if (value.startDate) {
        setCalendarViewDate(parseISO(value.startDate));
      }
    }
  }, [value?.startDate, value?.endDate, value?.presetId]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleDateClick = useCallback(
    (dateStr: string) => {
      if (!tempStartDate || (tempStartDate && tempEndDate)) {
        setTempStartDate(dateStr);
        setTempEndDate(null);
        setSelectedPreset(null);
      } else {
        const start = parseISO(tempStartDate);
        const clicked = parseISO(dateStr);
        if (isBefore(clicked, start)) {
          setTempStartDate(dateStr);
          setTempEndDate(tempStartDate);
        } else {
          setTempEndDate(dateStr);
        }
      }
    },
    [tempStartDate, tempEndDate]
  );

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = activePresets.find((p) => p.id === presetId);
      if (!preset) return;
      const { startDate, endDate } = preset.getRange();
      setSelectedPreset(presetId);
      setTempStartDate(startDate);
      setTempEndDate(endDate);
      onChange({ startDate, endDate, presetId });

      // Only close for non-custom presets
      if (!keepOpenPresetIds.includes(presetId)) {
        setIsOpen(false);
      }
    },
    [activePresets, onChange, keepOpenPresetIds]
  );

  const applyCustomRange = useCallback(() => {
    if (tempStartDate && tempEndDate) {
      onChange({ startDate: tempStartDate, endDate: tempEndDate, presetId: null });
      setIsOpen(false);
    }
  }, [tempStartDate, tempEndDate, onChange]);

  const displayText = () => {
    if (selectedPreset) {
      const preset = activePresets.find((p) => p.id === selectedPreset);
      if (preset) return preset.label;
    }
    if (tempStartDate && tempEndDate) {
      return `${format(parseISO(tempStartDate), displayFormat)} - ${format(parseISO(tempEndDate), displayFormat)}`;
    }
    if (tempStartDate) {
      return `${format(parseISO(tempStartDate), displayFormat)} - ...`;
    }
    return placeholder;
  };

  const defaultTrigger = (
    <button
      type="button"
      onClick={() => setIsOpen((o) => !o)}
      className={cn(
        'flex items-center gap-2 px-3 py-3 text-sm border border-border rounded-lg bg-surface hover:bg-surface-secondary transition-colors',
        isOpen && 'ring-2 ring-primary-500 border-primary-500'
      )}
    >
      <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span className={cn('text-text-primary', !tempStartDate && 'text-text-muted')}>
        {displayText()}
      </span>
      <svg
        className={cn('w-4 h-4 text-text-muted transition-transform', isOpen && 'rotate-180')}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      {trigger ?? defaultTrigger}

      {isOpen && (
        <div
          className={cn(
            'absolute mt-2 bg-surface border border-border rounded-lg shadow-lg z-50 overflow-hidden flex',
            placement === 'left' ? 'left-0' : 'right-0',
            showPresets ? 'w-[640px]' : 'w-[420px]',
            className
          )}
        >
          {/* Presets Sidebar */}
          {showPresets && (
            <div className="w-[38%] border-r border-border p-2">
              <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                Presets
              </div>
              {activePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 text-sm rounded transition-colors flex items-center justify-between',
                    selectedPreset === preset.id
                      ? 'bg-primary-700 text-white font-medium'
                      : 'text-text-primary hover:bg-surface-secondary'
                  )}
                >
                  <span>{preset.label}</span>
                  {selectedPreset === preset.id && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Calendar Panel */}
          <div className={cn('p-4', showPresets ? 'w-[62%]' : 'w-full')}>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setCalendarViewDate((d) => addMonths(d, -1))}
                className="p-1 hover:bg-surface-secondary rounded text-text-muted hover:text-text-primary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex gap-8 text-sm font-medium text-text-primary">
                <span>{format(month1, 'MMM yyyy')}</span>
                <span>{format(month2, 'MMM yyyy')}</span>
              </div>
              <button
                type="button"
                onClick={() => setCalendarViewDate((d) => addMonths(d, 1))}
                className="p-1 hover:bg-surface-secondary rounded text-text-muted hover:text-text-primary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Dual Calendar Grids */}
            <div className="flex gap-4">
              <CalendarGrid
                year={getYear(month1)}
                month={getMonth(month1)}
                selectedStart={tempStartDate}
                selectedEnd={tempEndDate}
                hoverDate={hoverDate}
                onDateClick={handleDateClick}
                onHover={setHoverDate}
                minDate={minDate}
                maxDate={maxDate}
                disabledDate={disabledDate}
              />
              <CalendarGrid
                year={getYear(month2)}
                month={getMonth(month2)}
                selectedStart={tempStartDate}
                selectedEnd={tempEndDate}
                hoverDate={hoverDate}
                onDateClick={handleDateClick}
                onHover={setHoverDate}
                minDate={minDate}
                maxDate={maxDate}
                disabledDate={disabledDate}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="text-sm text-text-secondary">
                {tempStartDate && tempEndDate
                  ? `${format(parseISO(tempStartDate), displayFormat)} - ${format(parseISO(tempEndDate), displayFormat)}`
                  : tempStartDate
                    ? `${format(parseISO(tempStartDate), displayFormat)} - Select end date`
                    : 'Select a date range'}
              </div>
              <button
                type="button"
                onClick={applyCustomRange}
                disabled={!tempStartDate || !tempEndDate}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                  tempStartDate && tempEndDate
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}