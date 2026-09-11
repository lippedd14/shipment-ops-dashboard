"use client";

import { STATUS_ALL, type StatusFilter } from "@/lib/validation/filters";
import { SHIPMENT_STATUSES, STATUS_LABELS } from "@/lib/validation/shipment";

const controlClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50";

/**
 * Presentational: the dashboard island owns the term, the debounce and the URL,
 * so the metric cards and the table share one pending state with these inputs.
 */
export function ShipmentFiltersBar({
  term,
  status,
  active,
  pending,
  onTermChange,
  onStatusChange,
  onClear,
}: {
  term: string;
  status: StatusFilter;
  active: boolean;
  pending: boolean;
  onTermChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onClear: () => void;
}) {
  const handleStatus = (value: string) => {
    const next: StatusFilter =
      value === STATUS_ALL ||
      (SHIPMENT_STATUSES as readonly string[]).includes(value)
        ? (value as StatusFilter)
        : STATUS_ALL;
    onStatusChange(next);
  };

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
          onChange={(event) => onTermChange(event.target.value)}
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
          value={status}
          onChange={(event) => handleStatus(event.target.value)}
          className={controlClass}
        >
          <option value={STATUS_ALL}>Todos</option>
          {SHIPMENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      {active ? (
        <button
          type="button"
          onClick={onClear}
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
        {pending ? "Filtrando..." : ""}
      </span>
    </div>
  );
}
