"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

import { signOut } from "@/app/auth/actions";
import { ShipmentBoard } from "@/components/shipment-board";
import { ShipmentFiltersBar } from "@/components/shipment-filters";
import { MetricCards } from "@/components/shipment-metrics";
import { ShipmentsTable } from "@/components/shipments-list";
import { BTN_PRIMARY, BTN_QUIET } from "@/components/ui";
import { applyRowDelta, type ShipmentCounts } from "@/lib/metrics";
import { createClient } from "@/lib/supabase/client";
import {
  buildSearchParams,
  hasActiveFilters,
  matchesFilters,
  NO_FILTERS,
  type ShipmentFilters,
  type StageFilter,
  type View,
} from "@/lib/validation/filters";
import type { Shipment } from "@/lib/validation/shipment";

const DEBOUNCE_MS = 300;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const FLASH_MS = 240;

type ConnectionState = "connecting" | "live" | "reconnecting";

function byCreatedAtDesc(a: Shipment, b: Shipment) {
  return Date.parse(b.created_at) - Date.parse(a.created_at);
}

/** Server ordering is created_at desc; keep it when rows arrive out of band. */
function sorted(rows: Shipment[]) {
  return [...rows].sort(byCreatedAtDesc);
}

function upsert(rows: Shipment[], incoming: Shipment) {
  const index = rows.findIndex((row) => row.id === incoming.id);
  if (index === -1) {
    return sorted([incoming, ...rows]);
  }
  const next = [...rows];
  next[index] = incoming;
  return sorted(next);
}

/**
 * Replica identity full means DELETE and UPDATE carry the whole previous row,
 * but the payload type only promises a Partial, so it is checked rather than
 * assumed.
 */
function isCompleteRow(row: Partial<Shipment>): row is Shipment {
  return (
    typeof row.id === "string" &&
    typeof row.status === "string" &&
    typeof row.tracking_code === "string" &&
    typeof row.origin === "string" &&
    typeof row.destination === "string" &&
    typeof row.carrier === "string" &&
    typeof row.is_delayed === "boolean"
  );
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === "live") {
    return (
      <span className="inline-flex items-center gap-2 text-meta text-muted">
        <span className="live-pulse size-2 rounded-full bg-signal" aria-hidden />
        Ao vivo
      </span>
    );
  }
  if (state === "reconnecting") {
    return (
      <span className="inline-flex items-center gap-2 text-meta text-muted">
        <span className="size-2 rounded-full bg-delayed" aria-hidden />
        Reconectando…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-meta text-muted">
      <span className="size-2 rounded-full bg-line" aria-hidden />
      Conectando…
    </span>
  );
}

function EmptyState({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  if (filtered) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
        <p className="text-body font-medium text-ink">
          Nada encontrado com esses filtros.
        </p>
        <p className="mt-1 text-body text-muted">
          Ajuste a busca ou volte a ver todas as remessas.
        </p>
        <button type="button" onClick={onClear} className={`${BTN_QUIET} mt-4`}>
          Limpar filtros
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="text-body font-medium text-ink">
        Cadastre sua primeira remessa.
      </p>
      <p className="mt-1 text-body text-muted">
        Ela aparece aqui e passa a ser acompanhada ao vivo.
      </p>
      <Link href="/dashboard/new" className={`${BTN_PRIMARY} mt-4`}>
        Cadastrar remessa
      </Link>
    </div>
  );
}

export function ShipmentsDashboard({
  initialShipments,
  initialCounts,
  userId,
  userEmail,
  filters,
  view,
}: {
  initialShipments: Shipment[];
  initialCounts: ShipmentCounts;
  userId: string;
  userEmail: string;
  filters: ShipmentFilters;
  view: View;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [counts, setCounts] = useState<ShipmentCounts>(initialCounts);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [term, setTerm] = useState(filters.query);
  const [flashedIds, setFlashedIds] = useState<ReadonlySet<string>>(new Set());

  const supabase = useMemo(() => createClient(), []);

  // Read inside the realtime handler without making them dependencies: the
  // channel is per user, the filtering and counting are per event.
  const filtersRef = useRef(filters);
  const shipmentsRef = useRef(shipments);
  const viewRef = useRef(view);
  const pushedQuery = useRef(filters.query);
  const flashTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  useEffect(() => {
    shipmentsRef.current = shipments;
  }, [shipments]);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Server data wins whenever the Server Component re-renders: a mutation's
  // revalidatePath, a filter change, or the resync after a reconnect.
  useEffect(() => {
    setShipments(initialShipments);
  }, [initialShipments]);
  useEffect(() => {
    setCounts(initialCounts);
  }, [initialCounts]);

  useEffect(() => {
    const timers = flashTimers.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  /** Marks a row as just-changed so it can flash once, briefly. */
  const flash = useCallback((id: string) => {
    setFlashedIds((current) => new Set(current).add(id));
    const timer = setTimeout(() => {
      flashTimers.current.delete(timer);
      setFlashedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }, FLASH_MS);
    flashTimers.current.add(timer);
  }, []);

  const push = useCallback(
    (next: ShipmentFilters, nextView: View) => {
      pushedQuery.current = next.query;
      const search = buildSearchParams(next, nextView);
      startTransition(() => {
        // replace, not push: typing should not bury the previous page in history.
        router.replace(search ? `${pathname}?${search}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router],
  );

  // Adopt the URL when it changes from outside (back/forward, clear button),
  // but never clobber what is being typed.
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
      push({ ...filtersRef.current, query: term.trim() }, viewRef.current);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, push]);

  const onStageChange = useCallback(
    (stage: StageFilter) => {
      push(
        { ...filtersRef.current, stage, query: term.trim() },
        viewRef.current,
      );
    },
    [push, term],
  );

  const onDelayedChange = useCallback(
    (delayedOnly: boolean) => {
      push(
        { ...filtersRef.current, delayedOnly, query: term.trim() },
        viewRef.current,
      );
    },
    [push, term],
  );

  const onClear = useCallback(() => {
    setTerm("");
    push(NO_FILTERS, viewRef.current);
  }, [push]);

  const onViewChange = useCallback(
    (nextView: View) => {
      push({ ...filtersRef.current, query: term.trim() }, nextView);
    },
    [push, term],
  );

  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Shipment>) => {
      const active = filtersRef.current;

      if (payload.eventType === "INSERT") {
        const row = payload.new;
        if (!matchesFilters(row, active)) {
          return;
        }
        setShipments((current) => upsert(current, row));
        setCounts((current) => applyRowDelta(current, row, 1));
        flash(row.id);
        return;
      }

      if (payload.eventType === "UPDATE") {
        const row = payload.new;
        const previous = isCompleteRow(payload.old)
          ? payload.old
          : shipmentsRef.current.find((item) => item.id === row.id);

        const wasVisible = previous
          ? matchesFilters(previous, active)
          : shipmentsRef.current.some((item) => item.id === row.id);
        const isVisible = matchesFilters(row, active);

        // An update can move a row out of the current view, not just into it.
        setShipments((current) =>
          isVisible
            ? upsert(current, row)
            : current.filter((item) => item.id !== row.id),
        );

        setCounts((current) => {
          if (wasVisible && !isVisible) {
            return applyRowDelta(current, previous ?? row, -1);
          }
          if (!wasVisible && isVisible) {
            return applyRowDelta(current, row, 1);
          }
          if (wasVisible && isVisible && previous) {
            return applyRowDelta(applyRowDelta(current, previous, -1), row, 1);
          }
          return current;
        });

        if (isVisible) {
          flash(row.id);
        }
        return;
      }

      // DELETE
      const removedId = payload.old.id;
      if (removedId === undefined) {
        return;
      }
      const previous = isCompleteRow(payload.old)
        ? payload.old
        : shipmentsRef.current.find((item) => item.id === removedId);

      if (previous && matchesFilters(previous, active)) {
        setCounts((current) => applyRowDelta(current, previous, -1));
      }
      setShipments((current) => current.filter((item) => item.id !== removedId));
    },
    [flash],
  );

  useEffect(() => {
    let disposed = false;
    let channel: RealtimeChannel | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    // Events that land while the socket is down are gone for good, so the first
    // successful resubscribe after a failure has to resync from the server.
    let needsResync = false;

    const clearTimer = () => {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer !== null) {
        return;
      }
      needsResync = true;
      setConnection("reconnecting");
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void subscribe();
      }, delay);
    };

    const subscribe = async () => {
      if (disposed) {
        return;
      }

      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      // Realtime applies RLS with this token. Without it the server has no
      // reason to send rows from a protected table.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (disposed) {
        return;
      }
      await supabase.realtime.setAuth(session?.access_token ?? null);
      if (disposed) {
        return;
      }

      const filter = `user_id=eq.${userId}`;
      channel = supabase
        .channel(`shipments:${userId}`)
        .on<Shipment>(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "shipments", filter },
          handleChange,
        )
        .on<Shipment>(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "shipments", filter },
          handleChange,
        )
        .on<Shipment>(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "shipments", filter },
          handleChange,
        )
        .subscribe((status) => {
          if (disposed) {
            return;
          }
          if (status === "SUBSCRIBED") {
            attempt = 0;
            clearTimer();
            setConnection("live");
            if (needsResync) {
              needsResync = false;
              // Refetch through the Server Component, not with a client query.
              router.refresh();
            }
            return;
          }
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            scheduleReconnect();
          }
        });
    };

    void subscribe();

    return () => {
      disposed = true;
      clearTimer();
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [supabase, userId, handleChange, router]);

  const active = hasActiveFilters(filters);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-title font-semibold text-ink">Remessas</h1>
          <p className="text-meta text-muted">{userEmail}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ConnectionBadge state={connection} />

          <div
            role="group"
            aria-label="Modo de visualização"
            className="flex overflow-hidden rounded-md border border-line"
          >
            {(
              [
                ["board", "Quadro"],
                ["table", "Tabela"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => onViewChange(value)}
                className={`px-3 py-1.5 text-body font-medium ${
                  view === value
                    ? "bg-signal text-white"
                    : "bg-surface text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Link href="/dashboard/new" className={BTN_PRIMARY}>
            Nova remessa
          </Link>
          <form action={signOut}>
            <button type="submit" className={BTN_QUIET}>
              Sair
            </button>
          </form>
        </div>
      </header>

      <MetricCards counts={counts} pending={isPending} />

      <ShipmentFiltersBar
        term={term}
        stage={filters.stage}
        delayedOnly={filters.delayedOnly}
        active={active}
        pending={isPending}
        onTermChange={setTerm}
        onStageChange={onStageChange}
        onDelayedChange={onDelayedChange}
        onClear={onClear}
      />

      {shipments.length === 0 ? (
        <EmptyState filtered={active} onClear={onClear} />
      ) : view === "board" ? (
        <ShipmentBoard shipments={shipments} flashedIds={flashedIds} />
      ) : (
        <ShipmentsTable shipments={shipments} flashedIds={flashedIds} />
      )}
    </div>
  );
}
