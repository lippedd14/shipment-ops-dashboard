import {
  SHIPMENT_STATUSES,
  type Shipment,
  type ShipmentStatus,
} from "@/lib/validation/shipment";

export const STATUS_ALL = "all";
export type StatusFilter = ShipmentStatus | typeof STATUS_ALL;

export const PARAM_STATUS = "status";
export const PARAM_QUERY = "q";

export type ShipmentFilters = {
  status: StatusFilter;
  /** Trimmed search term; empty means "no search". */
  query: string;
};

export const NO_FILTERS: ShipmentFilters = { status: STATUS_ALL, query: "" };

export type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function isStatus(value: string): value is ShipmentStatus {
  return (SHIPMENT_STATUSES as readonly string[]).includes(value);
}

/** Unknown or malformed params fall back to "no filter" rather than erroring. */
export function parseFilters(searchParams: SearchParams): ShipmentFilters {
  const status = first(searchParams[PARAM_STATUS]);
  const query = first(searchParams[PARAM_QUERY]).trim();

  return {
    status: isStatus(status) ? status : STATUS_ALL,
    query,
  };
}

export function hasActiveFilters(filters: ShipmentFilters): boolean {
  return filters.status !== STATUS_ALL || filters.query !== "";
}

/** Only non-default values reach the URL, so a clean list has a clean address. */
export function buildSearchParams(filters: ShipmentFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== STATUS_ALL) {
    params.set(PARAM_STATUS, filters.status);
  }
  if (filters.query !== "") {
    params.set(PARAM_QUERY, filters.query);
  }
  return params.toString();
}

/**
 * Escapes the LIKE metacharacters so a term is matched literally.
 *
 * PostgREST also treats `*` as a wildcard alias for `%`, and that one cannot be
 * escaped in the pattern, so it is dropped instead.
 */
export function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (match) => `\\${match}`).replace(/\*/g, "");
}

/** Columns the free-text search covers. The realtime predicate uses the same list. */
export const SEARCH_FIELDS = [
  "tracking_code",
  "origin",
  "destination",
  "carrier",
] as const;

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
  if (filters.status !== STATUS_ALL && shipment.status !== filters.status) {
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
