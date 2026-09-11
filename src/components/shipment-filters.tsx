"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  buildSearchParams,
  hasActiveFilters,
  NO_FILTERS,
  STATUS_ALL,
  type ShipmentFilters,
  type StatusFilter,
} from "@/lib/validation/filters";
import { SHIPMENT_STATUSES, STATUS_LABELS } from "@/lib/validation/shipment";

const DEBOUNCE_MS = 300;

const controlClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50";

export function ShipmentFiltersBar({ filters }: { filters: ShipmentFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // The input is uncontrolled by the URL while typing; the URL catches up after
  // the debounce. Without this the field would fight the user on every render.
  const [term, setTerm] = useState(filters.query);
  const pushedQuery = useRef(filters.query);

  // Current filters without making them a dependency of the debounce effect,
  // which must fire on the typed term alone.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const push = useCallback(
    (next: ShipmentFilters) => {
      pushedQuery.current = next.query;
      const search = buildSearchParams(next);
      startTransition(() => {
        // replace, not push: typing should not bury the previous page in history.
        router.replace(search ? `${pathname}?${search}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router],
  );

  // Adopt the URL when it changes from outside this component (back/forward,
  // or the clear button), but never clobber what is being typed.
  useEffect(() => {
    if (filters.query !== pushedQuery.current) {
      pushedQuery.current = filters.query;
      setTerm(filters.query);
    }
  }, [filters.query]);

  useEffect(() => {
    if (term === pushedQuery.current) {
      return;
    }
    const timer = setTimeout(() => {
      push({ ...filtersRef.current, query: term.trim() });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, push]);

  const onStatusChange = (value: string) => {
    const status: StatusFilter =
      value === STATUS_ALL ||
      (SHIPMENT_STATUSES as readonly string[]).includes(value)
        ? (value as StatusFilter)
        : STATUS_ALL;
    push({ ...filters, status, query: term.trim() });
  };

  const clear = () => {
    setTerm("");
    push(NO_FILTERS);
  };

  const active = hasActiveFilters(filters);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
        <label htmlFor="shipment-search" className="text-sm font-medium">
          Buscar
        </label>
        <input
          id="shipment-search"
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar por código, origem, destino ou transportadora"
          className={controlClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="shipment-status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="shipment-status"
          value={filters.status}
          onChange={(event) => onStatusChange(event.target.value)}
          className={controlClass}
        >
          <option value={STATUS_ALL}>Todos</option>
          {SHIPMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {active ? (
        <button
          type="button"
          onClick={clear}
          className="rounded-md border border-black/15 px-3 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Limpar filtros
        </button>
      ) : null}

      <span
        role="status"
        aria-live="polite"
        className="py-2 text-xs text-black/50 dark:text-white/50"
      >
        {isPending ? "Filtrando..." : ""}
      </span>
    </div>
  );
}
