/**
 * Format a date string (YYYY-MM-DD) to "Oct 6, 2025"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00'); // Treat as local date
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format an ISO datetime string to "Oct 6, 2025, 2:45 PM"
 */
export function formatDateTime(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}


