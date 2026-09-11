"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

import { ShipmentFiltersBar } from "@/components/shipment-filters";
import { MetricCards } from "@/components/shipment-metrics";
import { ShipmentsList } from "@/components/shipments-list";
import { applyCountDelta, type ShipmentCounts } from "@/lib/metrics";
import { createClient } from "@/lib/supabase/client";
import {
  buildSearchParams,
  hasActiveFilters,
  matchesFilters,
  NO_FILTERS,
  type ShipmentFilters,
  type StatusFilter,
} from "@/lib/validation/filters";
import type { Shipment } from "@/lib/validation/shipment";

const DEBOUNCE_MS = 300;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

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
    typeof row.carrier === "string"
  );
}

const CONNECTION_LABELS: Record<
  ConnectionState,
  { label: string; dot: string }
> = {
  connecting: { label: "Conectando...", dot: "bg-black/30 dark:bg-white/30" },
  live: { label: "Ao vivo", dot: "bg-green-500" },
  reconnecting: { label: "Reconectando...", dot: "bg-amber-500" },
};

function ConnectionBadge({ state }: { state: ConnectionState }) {
  const { label, dot } = CONNECTION_LABELS[state];

  return (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 text-xs text-black/60 dark:text-white/60"
    >
      <span className={`size-2 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}

export function ShipmentsDashboard({
  initialShipments,
  initialCounts,
  userId,
  filters,
}: {
  initialShipments: Shipment[];
  initialCounts: ShipmentCounts;
  userId: string;
  filters: ShipmentFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [counts, setCounts] = useState<ShipmentCounts>(initialCounts);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [term, setTerm] = useState(filters.query);

  const supabase = useMemo(() => createClient(), []);

  // Read inside the realtime handler without making them dependencies: the
  // channel is per user, the filtering and counting are per event.
  const filtersRef = useRef(filters);
  const shipmentsRef = useRef(shipments);
  const pushedQuery = useRef(filters.query);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    shipmentsRef.current = shipments;
  }, [shipments]);

  // Server data wins whenever the Server Component re-renders: a mutation's
  // revalidatePath, a filter change, or the resync after a reconnect.
  useEffect(() => {
    setShipments(initialShipments);
  }, [initialShipments]);

  useEffect(() => {
    setCounts(initialCounts);
  }, [initialCounts]);

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
      push({ ...filtersRef.current, query: term.trim() });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, push]);

  const onStatusChange = useCallback(
    (status: StatusFilter) => {
      push({ ...filtersRef.current, status, query: term.trim() });
    },
    [push, term],
  );

  const onClear = useCallback(() => {
    setTerm("");
    push(NO_FILTERS);
  }, [push]);

  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Shipment>) => {
      const active = filtersRef.current;

      if (payload.eventType === "INSERT") {
        const row = payload.new;
        if (!matchesFilters(row, active)) {
          return;
        }
        setShipments((current) => upsert(current, row));
        setCounts((current) => applyCountDelta(current, row.status, 1));
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
            return applyCountDelta(current, previous?.status ?? row.status, -1);
          }
          if (!wasVisible && isVisible) {
            return applyCountDelta(current, row.status, 1);
          }
          if (wasVisible && isVisible && previous && previous.status !== row.status) {
            return applyCountDelta(
              applyCountDelta(current, previous.status, -1),
              row.status,
              1,
            );
          }
          return current;
        });
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
        setCounts((current) => applyCountDelta(current, previous.status, -1));
      }
      setShipments((current) => current.filter((item) => item.id !== removedId));
    },
    [],
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
      <MetricCards counts={counts} pending={isPending} />

      <ShipmentFiltersBar
        term={term}
        status={filters.status}
        active={active}
        pending={isPending}
        onTermChange={setTerm}
        onStatusChange={onStatusChange}
        onClear={onClear}
      />

      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <ConnectionBadge state={connection} />
        </div>
        <ShipmentsList shipments={shipments} filtered={active} />
      </div>
    </div>
  );
}
