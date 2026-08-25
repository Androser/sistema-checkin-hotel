import { config } from "dotenv";
config({ path: ".env.local" });

import { WebSocket } from "ws";
(globalThis as any).WebSocket = WebSocket;

import { createClient } from "@supabase/supabase-js";
import { asignarConsejeros } from "../src/lib/companias";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌ Faltan variables de entorno. Verifica NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("🎯 Asignando consejeros a compañías...");
  await asignarConsejeros(supabase);
  console.log("✅ Proceso finalizado.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
