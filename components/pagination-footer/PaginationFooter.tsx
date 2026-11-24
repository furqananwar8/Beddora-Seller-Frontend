import { useSavePageSize } from '@/hooks/usePageSize';
import { PAGE_SIZE_OPTIONS } from '@/services/api/pagePreferences.api';

interface PaginationFooterProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Shows the rows-per-page picker and saves the choice for this user and screen. The screen reads it with usePageSize. */
  selectablePageSize?: boolean;
  itemLabel?: string; // e.g. "products", "orders" — defaults to "items"
}

export function PaginationFooter({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  itemLabel = 'items',
  selectablePageSize = false,
}: PaginationFooterProps) {
  const savePageSize = useSavePageSize();
  if (totalPages <= 1 && !(selectablePageSize && totalItems > 0)) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  // Build page numbers to show (first, last, current, neighbors)
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    // Always show first page
    pages.push(1);

    if (page > 3) pages.push('ellipsis');

    // Show neighbors around current
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }

    if (page < totalPages - 2) pages.push('ellipsis');

    // Always show last page
    if (!pages.includes(totalPages)) pages.push(totalPages);

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
      <span className="text-sm text-gray-500">
        Showing {startItem.toLocaleString()}–{endItem.toLocaleString()} of{' '}
        {totalItems.toLocaleString()} {itemLabel}
      </span>
      <div className="flex items-center gap-2">
        {selectablePageSize && (
          <label className="flex items-center gap-1.5 text-sm text-gray-500 mr-2">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => { savePageSize(Number(e.target.value)); onPageChange(1); }}
              className="border border-gray-200 rounded-md bg-white px-2 py-1 text-sm text-gray-700"
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm 
                     text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        {getPageNumbers().map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="text-gray-400 text-sm px-1">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 rounded-md text-sm min-w-[32px] transition-colors ${
                p === page
                  ? 'bg-blue-600 text-white border border-blue-600'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm 
                     text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}