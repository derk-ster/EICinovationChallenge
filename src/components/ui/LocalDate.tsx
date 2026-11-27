"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Formats a date in the visitor's own time zone. Renders nothing on the
 * server (time zones differ), then fills in on the client.
 */
export function LocalDate({ iso, withTime = true, fallback = "" }: { iso: string; withTime?: boolean; fallback?: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () =>
      new Date(iso).toLocaleString(undefined, {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" } : {}),
      }),
    () => fallback,
  );
  return <time dateTime={iso}>{text}</time>;
}
