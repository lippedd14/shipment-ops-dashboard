/**
 * Seeds the shipments table with plausible Brazilian logistics data.
 *
 * Run it with `npm run seed` (see README). The target user is never hardcoded:
 * it comes from SEED_USER_ID / --user-id, or from the session when signing in
 * with SEED_EMAIL and SEED_PASSWORD.
 *
 * Run with --reset to delete that user's existing shipments first, since
 * tracking codes are unique per user and a second run would otherwise fail.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Type-only, so Node's type stripping erases it and the extension is moot.
import type { Database } from "../src/lib/database.types";

type Stage = "pending" | "in_transit" | "delivered";
type ShipmentInsert = Database["public"]["Tables"]["shipments"]["Insert"];

type SeedRow = {
  tracking_code: string;
  origin: string;
  destination: string;
  carrier: string;
  status: Stage;
  /** Exception flag, independent of the stage. */
  delayed?: boolean;
  /** How long ago the shipment was created, used to spread the list out. */
  daysAgo: number;
};

// Real corridors between Brazilian capitals and the ports of Santos,
// Paranaguá, Itajaí and Suape. 30 rows: 10 in transit, 11 delivered,
// 6 pending, 3 delayed.
const SEED_ROWS: SeedRow[] = [
  // Em trânsito
  { tracking_code: "PB472910385BR", origin: "São Paulo, SP", destination: "Santos, SP", carrier: "Braspress Transportes", status: "in_transit", daysAgo: 2 },
  { tracking_code: "PB472910386BR", origin: "Curitiba, PR", destination: "Paranaguá, PR", carrier: "Translovato Transportes", status: "in_transit", daysAgo: 3 },
  { tracking_code: "PB472910387BR", origin: "Joinville, SC", destination: "Itajaí, SC", carrier: "Binotto Logística", status: "in_transit", daysAgo: 1 },
  { tracking_code: "PB472910388BR", origin: "Recife, PE", destination: "Suape, PE", carrier: "Jamef Encomendas Urgentes", status: "in_transit", daysAgo: 4 },
  { tracking_code: "PB472910389BR", origin: "Belo Horizonte, MG", destination: "Rio de Janeiro, RJ", carrier: "Patrus Transportes", status: "in_transit", daysAgo: 2 },
  { tracking_code: "PB472910390BR", origin: "Campinas, SP", destination: "Santos, SP", carrier: "Transportadora Americana", status: "in_transit", daysAgo: 5 },
  { tracking_code: "PB472910391BR", origin: "Porto Alegre, RS", destination: "Itajaí, SC", carrier: "Expresso São Miguel", status: "in_transit", daysAgo: 3 },
  { tracking_code: "PB472910392BR", origin: "Goiânia, GO", destination: "Brasília, DF", carrier: "Rodonaves Transportes", status: "in_transit", daysAgo: 1 },
  { tracking_code: "PB472910393BR", origin: "Salvador, BA", destination: "Suape, PE", carrier: "TNT Mercúrio", status: "in_transit", daysAgo: 6 },
  { tracking_code: "PB472910394BR", origin: "Vitória, ES", destination: "Belo Horizonte, MG", carrier: "Sequoia Logística", status: "in_transit", daysAgo: 2 },

  // Entregues
  { tracking_code: "PB472910395BR", origin: "São Paulo, SP", destination: "Curitiba, PR", carrier: "Braspress Transportes", status: "delivered", daysAgo: 21 },
  { tracking_code: "PB472910396BR", origin: "Santos, SP", destination: "Ribeirão Preto, SP", carrier: "Transportadora Americana", status: "delivered", daysAgo: 25 },
  { tracking_code: "PB472910397BR", origin: "Paranaguá, PR", destination: "Londrina, PR", carrier: "Translovato Transportes", status: "delivered", daysAgo: 18 },
  { tracking_code: "PB472910398BR", origin: "Itajaí, SC", destination: "Florianópolis, SC", carrier: "Binotto Logística", status: "delivered", daysAgo: 30 },
  { tracking_code: "PB472910399BR", origin: "Suape, PE", destination: "João Pessoa, PB", carrier: "Jamef Encomendas Urgentes", status: "delivered", daysAgo: 27 },
  { tracking_code: "PB472910400BR", origin: "Rio de Janeiro, RJ", destination: "Juiz de Fora, MG", carrier: "Patrus Transportes", status: "delivered", daysAgo: 16 },
  { tracking_code: "PB472910401BR", origin: "Fortaleza, CE", destination: "Natal, RN", carrier: "TNT Mercúrio", status: "delivered", daysAgo: 23 },
  { tracking_code: "PB472910402BR", origin: "Manaus, AM", destination: "Belém, PA", carrier: "Rodonaves Transportes", status: "delivered", daysAgo: 34 },
  { tracking_code: "PB472910403BR", origin: "Brasília, DF", destination: "Goiânia, GO", carrier: "Rápido 900 Transportes", status: "delivered", daysAgo: 19 },
  { tracking_code: "PB472910404BR", origin: "Caxias do Sul, RS", destination: "Porto Alegre, RS", carrier: "Expresso São Miguel", status: "delivered", daysAgo: 28 },
  { tracking_code: "PB472910405BR", origin: "Belo Horizonte, MG", destination: "Vitória, ES", carrier: "Atlas Transportes", status: "delivered", daysAgo: 15 },

  // Pendentes
  { tracking_code: "PB472910406BR", origin: "São Paulo, SP", destination: "Paranaguá, PR", carrier: "Braspress Transportes", status: "pending", daysAgo: 0 },
  { tracking_code: "PB472910407BR", origin: "Campinas, SP", destination: "Itajaí, SC", carrier: "Sequoia Logística", status: "pending", daysAgo: 0 },
  { tracking_code: "PB472910408BR", origin: "Recife, PE", destination: "Fortaleza, CE", carrier: "Jamef Encomendas Urgentes", status: "pending", daysAgo: 1 },
  { tracking_code: "PB472910409BR", origin: "Curitiba, PR", destination: "Santos, SP", carrier: "Translovato Transportes", status: "pending", daysAgo: 1 },
  { tracking_code: "PB472910410BR", origin: "Salvador, BA", destination: "Aracaju, SE", carrier: "TNT Mercúrio", status: "pending", daysAgo: 0 },
  { tracking_code: "PB472910411BR", origin: "Porto Alegre, RS", destination: "Rio Grande, RS", carrier: "Binotto Logística", status: "pending", daysAgo: 2 },

  // Atrasadas: em trânsito, sinalizadas pela flag
  { tracking_code: "PB472910412BR", origin: "Manaus, AM", destination: "São Paulo, SP", carrier: "Rodonaves Transportes", status: "in_transit", delayed: true, daysAgo: 12 },
  { tracking_code: "PB472910413BR", origin: "Belém, PA", destination: "Suape, PE", carrier: "Atlas Transportes", status: "in_transit", delayed: true, daysAgo: 9 },
  { tracking_code: "PB472910414BR", origin: "Cuiabá, MT", destination: "Paranaguá, PR", carrier: "Rápido 900 Transportes", status: "in_transit", delayed: true, daysAgo: 14 },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  if (match) {
    return match.slice(prefix.length);
  }
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`Variável de ambiente ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

type Client = SupabaseClient<Database>;

/**
 * Resolves which user the rows belong to.
 *
 * With a service role key the id is taken as given. Otherwise the script signs
 * in and uses the session's id, which is the only id RLS would accept anyway.
 */
async function resolveTarget(): Promise<{ supabase: Client; userId: string }> {
  const url = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const requestedId = readArg("user-id") ?? process.env.SEED_USER_ID;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceKey) {
    if (!requestedId) {
      console.error(
        "Com SUPABASE_SERVICE_ROLE_KEY é obrigatório informar SEED_USER_ID ou --user-id.",
      );
      process.exit(1);
    }
    const supabase = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false },
    });
    return { supabase, userId: requestedId };
  }

  const anonKey = required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const email = required("SEED_EMAIL", process.env.SEED_EMAIL);
  const password = required("SEED_PASSWORD", process.env.SEED_PASSWORD);

  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    console.error(`Falha ao autenticar: ${error.message}`);
    process.exit(1);
  }
  const userId = data.user.id;

  if (requestedId && requestedId !== userId) {
    console.error(
      `O usuário autenticado (${userId}) não é o informado (${requestedId}).`,
    );
    process.exit(1);
  }

  return { supabase, userId };
}

async function main() {
  const reset = process.argv.includes("--reset");
  const { supabase, userId } = await resolveTarget();

  if (reset) {
    const { error } = await supabase
      .from("shipments")
      .delete()
      .eq("user_id", userId);
    if (error) {
      console.error(`Falha ao limpar as remessas: ${error.message}`);
      process.exit(1);
    }
    console.log("Remessas anteriores removidas.");
  }

  const now = Date.now();
  const rows: ShipmentInsert[] = SEED_ROWS.map((row) => {
    const createdAt = new Date(now - row.daysAgo * DAY_MS);
    // Delivered and delayed shipments have moved since they were created.
    const touched =
      row.status === "delivered" || row.delayed === true
        ? new Date(createdAt.getTime() + DAY_MS)
        : createdAt;

    return {
      user_id: userId,
      tracking_code: row.tracking_code,
      origin: row.origin,
      destination: row.destination,
      carrier: row.carrier,
      status: row.status,
      is_delayed: row.delayed ?? false,
      created_at: createdAt.toISOString(),
      updated_at: touched.toISOString(),
    };
  });

  const { data, error } = await supabase
    .from("shipments")
    .insert(rows)
    .select("id");

  if (error) {
    console.error(`Falha ao inserir as remessas: ${error.message}`);
    if (error.code === "23505") {
      console.error("Códigos de rastreio já existem. Use --reset para recomeçar.");
    }
    process.exit(1);
  }

  const byStatus = SEED_ROWS.reduce<Record<string, number>>((acc, row) => {
    const key = row.delayed ? row.status + " (atrasada)" : row.status;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`${data?.length ?? 0} remessas inseridas para ${userId}.`);
  console.table(byStatus);
}

// Not top-level await: tsc checks this file under the project's tsconfig, which
// targets a level that does not allow it.
main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
