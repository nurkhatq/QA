'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/utils';

interface ClientDateProps {
  date: Date | string;
  fallback?: string;
}

export function ClientDate({ date, fallback = '—' }: ClientDateProps) {
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    if (date) {
      setFormattedDate(formatDateTime(date));
    }
  }, [date]);

  if (!date) return <>{fallback}</>;

  // Render a placeholder or the server-formatted date initially to avoid layout shift,
  // but be careful about hydration mismatch. Ideally, we render nothing or a skeleton
  // until the client takes over, OR we accept the mismatch if we render the server time.
  // A cleaner approach for dates is to render nothing until mounted.
  if (!formattedDate) return <span className="opacity-0">Loading...</span>;

  return <span>{formattedDate}</span>;
}
