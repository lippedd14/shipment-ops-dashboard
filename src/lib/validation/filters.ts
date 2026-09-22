import {
  isStage,
  stageOf,
  type Shipment,
  type Stage,
} from "@/lib/validation/shipment";

export const STAGE_ALL = "all";
export type StageFilter = Stage | typeof STAGE_ALL;

export const PARAM_STAGE = "stage";
export const PARAM_QUERY = "q";
export const PARAM_DELAYED = "delayed";
export const PARAM_VIEW = "view";

export const VIEWS = ["board", "table"] as const;
export type View = (typeof VIEWS)[number];
export const DEFAULT_VIEW: View = "board";

export type ShipmentFilters = {
  stage: StageFilter;
  /** Trimmed search term; empty means "no search". */
  query: string;
  delayedOnly: boolean;
};

export const NO_FILTERS: ShipmentFilters = {
  stage: STAGE_ALL,
  query: "",
  delayedOnly: false,
};

export type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

/** Unknown or malformed params fall back to "no filter" rather than erroring. */
export function parseFilters(searchParams: SearchParams): ShipmentFilters {
  const stage = first(searchParams[PARAM_STAGE]);
  return {
    stage: isStage(stage) ? stage : STAGE_ALL,
    query: first(searchParams[PARAM_QUERY]).trim(),
    delayedOnly: first(searchParams[PARAM_DELAYED]) === "1",
  };
}

export function parseView(searchParams: SearchParams): View {
  const view = first(searchParams[PARAM_VIEW]);
  return (VIEWS as readonly string[]).includes(view)
    ? (view as View)
    : DEFAULT_VIEW;
}

export function hasActiveFilters(filters: ShipmentFilters): boolean {
  return (
    filters.stage !== STAGE_ALL || filters.query !== "" || filters.delayedOnly
  );
}

/** Only non-default values reach the URL, so a clean board has a clean address. */
export function buildSearchParams(
  filters: ShipmentFilters,
  view: View,
): string {
  const params = new URLSearchParams();
  if (filters.stage !== STAGE_ALL) {
    params.set(PARAM_STAGE, filters.stage);
  }
  if (filters.query !== "") {
    params.set(PARAM_QUERY, filters.query);
  }
  if (filters.delayedOnly) {
    params.set(PARAM_DELAYED, "1");
  }
  if (view !== DEFAULT_VIEW) {
    params.set(PARAM_VIEW, view);
  }
  return params.toString();
}

/** Columns the free-text search covers. The realtime predicate uses the same list. */
export const SEARCH_FIELDS = [
  "tracking_code",
  "origin",
  "destination",
  "carrier",
] as const;

/**
 * Escapes the LIKE metacharacters so a term is matched literally.
 *
 * PostgREST also treats `*` as a wildcard alias for `%`, and that one cannot be
 * escaped in the pattern, so it is dropped instead.
 */
export function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (match) => `\\${match}`).replace(/\*/g, "");
}

/**
 * Builds the PostgREST `or=(...)` filter matching the term against every
 * searchable column.
 *
 * The pattern is double-quoted because PostgREST splits the group on commas,
 * and a term containing one would otherwise be read as another condition.
 * Inside those quotes a backslash escapes the next character, so the backslashes
 * that escapeLikeTerm introduced have to be doubled to survive.
 */
export function buildSearchOrFilter(term: string): string {
  const pattern = `%${escapeLikeTerm(term)}%`;
  const quoted = `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return SEARCH_FIELDS.map((field) => `${field}.ilike.${quoted}`).join(",");
}

/**
 * Client-side mirror of the server query, used to decide whether a realtime
 * event belongs in the current view. Must stay in step with the Supabase
 * filters applied in the dashboard page.
 */
export function matchesFilters(
  shipment: Shipment,
  filters: ShipmentFilters,
): boolean {
  if (filters.stage !== STAGE_ALL && stageOf(shipment) !== filters.stage) {
    return false;
  }
  if (filters.delayedOnly && !shipment.is_delayed) {
    return false;
  }
  if (filters.query === "") {
    return true;
  }
  const needle = filters.query.toLowerCase();
  return SEARCH_FIELDS.some((field) =>
    shipment[field].toLowerCase().includes(needle),
  );
}
