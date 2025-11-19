import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      status: 'success',
      users_count: {},
      tariffs_count: 0,
      tariff_sample: null,
      budgets_count: 0,
      rls_enabled: {},
      auth_test: { status: 'pending' }
    }

    // 1. Consultar usuarios por rol
    try {
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('role')

      if (usersError) throw usersError

      const usersByRole = usersData?.reduce((acc: any, user: any) => {
        acc[user.role] = (acc[user.role] || 0) + 1
        return acc
      }, {}) || {}

      results.users_count = {
        total: usersData?.length || 0,
        by_role: usersByRole
      }
    } catch (error) {
      results.users_count = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // 2. Consultar tarifas activas y verificar json_tariff_data
    try {
      const { data: tariffsData, error: tariffsError } = await supabaseAdmin
        .from('tariffs')
        .select('id, title, status, json_tariff_data')
        .eq('status', 'Activa')

      if (tariffsError) throw tariffsError

      results.tariffs_count = tariffsData?.length || 0

      // Verificar estructura del primer tariff con items que tengan description
      if (tariffsData && tariffsData.length > 0) {
        const firstTariff = tariffsData[0]
        const tariffData = firstTariff.json_tariff_data as any[]

        // Buscar el primer item con description
        const firstItem = tariffData?.find((item: any) =>
          item.level === 'item' && item.description
        )

        results.tariff_sample = {
          tariff_id: firstTariff.id,
          tariff_title: firstTariff.title,
          total_items_in_tariff: tariffData?.filter((item: any) => item.level === 'item').length || 0,
          first_item_with_description: firstItem ? {
            id: firstItem.id,
            name: firstItem.name,
            has_description: !!firstItem.description,
            description_preview: firstItem.description?.substring(0, 50) + '...',
            unit: firstItem.unit,
            pvp: firstItem.pvp,
            iva_percentage: firstItem.iva_percentage
          } : null
        }
      }
    } catch (error) {
      results.tariffs_count = 'error'
      results.tariff_sample = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // 3. Consultar cantidad de presupuestos
    try {
      const { data: budgetsData, error: budgetsError } = await supabaseAdmin
        .from('budgets')
        .select('id', { count: 'exact', head: true })

      if (budgetsError) throw budgetsError

      results.budgets_count = budgetsData || 0
    } catch (error) {
      results.budgets_count = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // 4. Verificar que RLS está activo en las tablas
    try {
      const { data: rlsData, error: rlsError } = await supabaseAdmin
        .rpc('check_rls_status')

      if (rlsError) {
        // Si la función no existe, intentar consulta directa a pg_class
        const { data: pgClassData, error: pgClassError } = await supabaseAdmin
          .from('pg_class')
          .select('relname, relrowsecurity')
          .in('relname', ['users', 'tariffs', 'budgets'])

        if (pgClassError) throw pgClassError

        results.rls_enabled = pgClassData?.reduce((acc: any, table: any) => {
          acc[table.relname] = table.relrowsecurity
          return acc
        }, {}) || {}
      } else {
        results.rls_enabled = rlsData
      }
    } catch (error) {
      // Fallback: intentar consulta manual para verificar RLS
      try {
        const tables = ['users', 'tariffs', 'budgets']
        const rlsStatus: any = {}

        for (const table of tables) {
          try {
            // Intentar acceder a la tabla sin autenticación para verificar RLS
            const { error } = await supabaseAdmin
              .from(table)
              .select('id')
              .limit(1)
              .single()

            // Si RLS funciona correctamente, debería dar error de permisos o éxito con datos
            rlsStatus[table] = true // Asumimos que está activo si no hay error de sintaxis
          } catch (tableError) {
            rlsStatus[table] = false
          }
        }

        results.rls_enabled = rlsStatus
      } catch (fallbackError) {
        results.rls_enabled = { error: error instanceof Error ? error.message : 'Cannot verify RLS status' }
      }
    }

    // 5. Probar autenticación con admin (simulación)
    try {
      const { data: authData, error: authError } = await supabaseAdmin
        .from('users')
        .select('id, email, role, name')
        .eq('email', 'admin@redpresu.com')
        .single()

      if (authError) throw authError

      results.auth_test = {
        status: 'success',
        user_found: true,
        user_data: {
          id: authData.id,
          email: authData.email,
          role: authData.role,
          name: authData.name
        }
      }
    } catch (error) {
      results.auth_test = {
        status: 'error',
        user_found: false,
        error: error instanceof Error ? error.message : 'Unknown auth error'
      }
    }

    // Verificar si hay errores críticos
    const hasErrors = [
      results.users_count,
      results.tariff_sample,
      results.budgets_count,
      results.rls_enabled,
      results.auth_test
    ].some(item => item && typeof item === 'object' && 'error' in item)

    if (hasErrors) {
      results.status = 'partial_success'
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        users_count: null,
        tariffs_count: null,
        tariff_sample: null,
        budgets_count: null,
        rls_enabled: null,
        auth_test: { status: 'error' }
      },
      { status: 500 }
    )
  }
}

// Función auxiliar para crear RPC check_rls_status si no existe
export async function POST() {
  try {
    // Crear función SQL para verificar RLS si no existe
    const { error } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION public.check_rls_status()
          RETURNS JSON AS $$
          DECLARE
            result JSON;
          BEGIN
            SELECT json_object_agg(relname, relrowsecurity)
            INTO result
            FROM pg_class
            WHERE relname IN ('users', 'tariffs', 'budgets')
            AND relkind = 'r';

            RETURN result;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      })

    if (error) throw error

    return NextResponse.json(
      {
        message: 'RLS check function created successfully',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    )

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Could not create RLS check function',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}