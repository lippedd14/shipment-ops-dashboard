"use client";

import { STAGE_ALL, type StageFilter } from "@/lib/validation/filters";
import { STAGES, STAGE_LABELS, isStage } from "@/lib/validation/shipment";
import { INPUT, LABEL } from "@/components/ui";

/**
 * Presentational: the dashboard island owns the term, the debounce and the URL,
 * so the cards, the board and these inputs share one pending state.
 */
export function ShipmentFiltersBar({
  term,
  stage,
  delayedOnly,
  active,
  pending,
  onTermChange,
  onStageChange,
  onDelayedChange,
  onClear,
}: {
  term: string;
  stage: StageFilter;
  delayedOnly: boolean;
  active: boolean;
  pending: boolean;
  onTermChange: (value: string) => void;
  onStageChange: (value: StageFilter) => void;
  onDelayedChange: (value: boolean) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
        <label htmlFor="shipment-search" className={LABEL}>
          Buscar
        </label>
        <input
          id="shipment-search"
          type="search"
          value={term}
          onChange={(event) => onTermChange(event.target.value)}
          placeholder="Código, origem, destino ou transportadora"
          className={INPUT}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="shipment-stage" className={LABEL}>
          Etapa
        </label>
        <select
          id="shipment-stage"
          value={stage}
          onChange={(event) => {
            const value = event.target.value;
            onStageChange(isStage(value) ? value : STAGE_ALL);
          }}
          className={`${INPUT} w-auto`}
        >
          <option value={STAGE_ALL}>Todas</option>
          {STAGES.map((value) => (
            <option key={value} value={value}>
              {STAGE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 py-2 text-body text-ink">
        <input
          type="checkbox"
          checked={delayedOnly}
          onChange={(event) => onDelayedChange(event.target.checked)}
          className="size-4 accent-[color:var(--signal)]"
        />
        Só atrasadas
      </label>

      {active ? (
        <button
          type="button"
          onClick={onClear}
          className="py-2 text-body font-medium text-signal hover:underline"
        >
          Limpar
        </button>
      ) : null}

      <span
        role="status"
        aria-live="polite"
        className="py-2 text-meta text-muted"
      >
        {pending ? "Atualizando…" : ""}
      </span>
    </div>
  );
}
