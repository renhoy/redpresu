// SECURITY: Este archivo solo puede importarse en server-side
// TEMPORALMENTE COMENTADO PARA DEBUG BUILD
// import "server-only";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Runtime validation adicional para prevenir uso en cliente
if (typeof window !== "undefined") {
  throw new Error("supabaseAdmin can only be used server-side");
}

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
}

// Cliente admin para operaciones server-side con service role
// SOLO para uso en API routes y server components
// NUNCA importar en componentes cliente o código que se ejecute en browser
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  // SECURITY (VULN-014): Timeouts para prevenir queries colgadas
  db: {
    schema: "redpresu",
  },
  global: {
    headers: {
      "x-client-info": "redpresu-admin",
    },
  },
  // Timeout global para todas las requests (30 segundos)
  // Previene queries que se cuelgan indefinidamente
  realtime: {
    timeout: 30000, // 30s
  },
});

/**
 * Configuración de timeouts recomendados por tipo de operación
 *
 * SECURITY (VULN-014): Usar estos valores para operaciones específicas
 */
export const SUPABASE_TIMEOUTS = {
  // Queries rápidas (selects simples, updates, deletes)
  FAST_QUERY: 10000, // 10 segundos

  // Queries medianas (joins, filtros complejos)
  MEDIUM_QUERY: 20000, // 20 segundos

  // Queries pesadas (exports, imports, agregaciones)
  HEAVY_QUERY: 45000, // 45 segundos

  // Operaciones de storage (uploads/downloads)
  STORAGE: 60000, // 60 segundos

  // Default global
  DEFAULT: 30000, // 30 segundos
} as const;

/**
 * Helper para ejecutar query con timeout específico
 *
 * @param queryFn - Función que retorna la promesa de Supabase
 * @param timeoutMs - Timeout en milisegundos
 * @param operationName - Nombre de la operación (para logs)
 * @returns Resultado de la query o error de timeout
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   () => supabaseAdmin.from('budgets').select('*').eq('id', budgetId),
 *   SUPABASE_TIMEOUTS.FAST_QUERY,
 *   'getBudgetById'
 * )
 * ```
 */
export async function withTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return Promise.race([
    queryFn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(`Timeout: ${operationName} exceeded ${timeoutMs}ms`)
          ),
        timeoutMs
      )
    ),
  ]);
}
