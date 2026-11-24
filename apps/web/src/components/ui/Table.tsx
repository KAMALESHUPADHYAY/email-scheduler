import React from 'react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  rowKey: (item: T) => string;
}

export function Table<T>({
  columns,
  data,
  isLoading = false,
  emptyState,
  rowKey,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl overflow-hidden shadow-sm">
        <div className="divide-y divide-surface-200 dark:divide-surface-800">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 animate-pulse">
              <div className="h-4 bg-surface-200 dark:bg-surface-800 rounded w-1/4"></div>
              <div className="h-4 bg-surface-200 dark:bg-surface-800 rounded w-1/3"></div>
              <div className="h-4 bg-surface-200 dark:bg-surface-800 rounded w-1/5"></div>
              <div className="h-4 bg-surface-200 dark:bg-surface-800 rounded w-1/6"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <div className="w-full">{emptyState}</div>;
  }

  return (
    <div className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/50">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 ${
                    col.className || ''
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
            {data.map((item) => (
              <tr
                key={rowKey(item)}
                className="hover:bg-surface-50/80 dark:hover:bg-surface-800/50 transition-colors"
              >
                {columns.map((col, idx) => (
                  <td
                    key={idx}
                    className={`px-5 py-4 text-surface-900 dark:text-surface-100 ${
                      col.className || ''
                    }`}
                  >
                    {col.cell
                      ? col.cell(item)
                      : col.accessorKey
                      ? String(item[col.accessorKey] ?? '')
                      : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
