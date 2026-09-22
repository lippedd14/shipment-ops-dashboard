/** Shared control surfaces, so board and table cannot drift apart. */

export const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-md bg-signal px-3 py-1.5 text-body font-medium text-white hover:opacity-90 disabled:opacity-50";

export const BTN_QUIET =
  "inline-flex items-center justify-center rounded-md border border-line bg-surface px-3 py-1.5 text-body font-medium text-ink hover:border-muted disabled:opacity-50";

export const BTN_SMALL =
  "inline-flex items-center justify-center rounded-md border border-line bg-surface px-2 py-1 text-meta font-medium text-ink hover:border-muted disabled:opacity-50";

export const BTN_DANGER =
  "inline-flex items-center justify-center rounded-md bg-delayed px-2 py-1 text-meta font-medium text-white hover:opacity-90 disabled:opacity-50";

export const INPUT =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-body text-ink placeholder:text-muted";

export const PANEL = "rounded-lg border border-line bg-surface";

export const LABEL = "text-body font-medium text-ink";
