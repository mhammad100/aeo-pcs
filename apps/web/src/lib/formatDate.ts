type FormattedRunDate = {
  primary: string;
  secondary: string;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Human-friendly date for visibility run rows. */
export function formatRunDate(iso: string): FormattedRunDate {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { primary: "Unknown date", secondary: "" };
  }

  const time = formatTime(date);
  const now = new Date();
  const today = startOfDay(now);
  const target = startOfDay(date);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return { primary: "Today", secondary: time };
  }
  if (diffDays === 1) {
    return { primary: "Yesterday", secondary: time };
  }
  if (diffDays > 1 && diffDays < 7) {
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
    const dayMonth = new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
    }).format(date);
    return { primary: `${weekday}, ${dayMonth}`, secondary: time };
  }

  const primary = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  }).format(date);

  return { primary, secondary: time };
}
