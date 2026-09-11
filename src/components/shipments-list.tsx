"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

import { DeleteShipmentButton } from "@/components/delete-shipment-button";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABELS, type Shipment } from "@/lib/validation/shipment";

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

const th =
  "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50";
const td = "px-3 py-2 align-middle";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-black/15 px-6 py-12 text-center dark:border-white/20">
      <p className="text-sm font-medium">Nenhuma remessa ainda.</p>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Cadastre a primeira para come&ccedil;ar a acompanhar.
      </p>
      <Link
        href="/dashboard/new"
        className="mt-4 inline-block rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Nova remessa
      </Link>
    </div>
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

export function ShipmentsList({
  initialShipments,
  userId,
}: {
  initialShipments: Shipment[];
  userId: string;
}) {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [connection, setConnection] = useState<ConnectionState>("connecting");

  // One client for the lifetime of the component. createClient() builds a new
  // instance per call, which would churn a socket on every render.
  const supabase = useMemo(() => createClient(), []);

  // Server data wins whenever the Server Component re-renders: revalidatePath
  // after a mutation, or the resync below.
  useEffect(() => {
    setShipments(initialShipments);
  }, [initialShipments]);

  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Shipment>) => {
      setShipments((current) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          return upsert(current, payload.new);
        }
        // DELETE carries the previous row; replica identity full puts id in it.
        const removedId = payload.old.id;
        if (removedId === undefined) {
          return current;
        }
        return current.filter((row) => row.id !== removedId);
      });
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ConnectionBadge state={connection} />
      </div>

      {shipments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead className="border-b border-black/10 dark:border-white/15">
              <tr>
                <th scope="col" className={th}>
                  C&oacute;digo
                </th>
                <th scope="col" className={th}>
                  Origem
                </th>
                <th scope="col" className={th}>
                  Destino
                </th>
                <th scope="col" className={th}>
                  Transportadora
                </th>
                <th scope="col" className={th}>
                  Status
                </th>
                <th scope="col" className={th}>
                  Criada em
                </th>
                <th scope="col" className={th}>
                  Atualizada em
                </th>
                <th scope="col" className={`${th} text-right`}>
                  A&ccedil;&otilde;es
                </th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr
                  key={shipment.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <td className={`${td} font-medium`}>
                    {shipment.tracking_code}
                  </td>
                  <td className={td}>{shipment.origin}</td>
                  <td className={td}>{shipment.destination}</td>
                  <td className={td}>{shipment.carrier}</td>
                  <td className={td}>{STATUS_LABELS[shipment.status]}</td>
                  <td
                    className={`${td} whitespace-nowrap text-black/60 dark:text-white/60`}
                  >
                    {dateFormatter.format(new Date(shipment.created_at))}
                  </td>
                  <td
                    className={`${td} whitespace-nowrap text-black/60 dark:text-white/60`}
                  >
                    {dateFormatter.format(new Date(shipment.updated_at))}
                  </td>
                  <td className={`${td} text-right`}>
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/${shipment.id}/edit`}
                        className="rounded-md border border-black/15 px-2 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                      >
                        Editar
                      </Link>
                      <DeleteShipmentButton
                        id={shipment.id}
                        trackingCode={shipment.tracking_code}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
