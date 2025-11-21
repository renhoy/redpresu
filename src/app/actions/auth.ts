'use server'
import { log } from '@/lib/logger'
import { sanitizeError } from '@/lib/helpers/error-helpers'
import { getAppUrl } from '@/lib/helpers/url-helpers-server'
import { getRegistrationRequiresApproval } from '@/lib/helpers/config-helpers'
import { notifySuperadminNewRegistration } from '@/lib/helpers/notification-helpers'

import { createServerActionClient } from "@/lib/supabase/helpers"
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'

export interface SignInResult {
  success: boolean
  error?: string
  redirectTo?: string
}

// Función de prueba para verificar que las Server Actions funcionan
export async function testServerAction(): Promise<{ message: string }> {
  console.log('🔥🔥🔥 TEST SERVER ACTION EJECUTADA 🔥🔥🔥')
  return { message: 'Server Action funciona correctamente' }
}

export async function signInAction(email: string, password: string): Promise<SignInResult> {
  console.log('=====================================')
  console.log('[signInAction] *** SERVER ACTION EJECUTADA ***')
  console.log('[signInAction] Email:', email)
  console.log('=====================================')

  try {
    console.log('[signInAction] Iniciando login para:', email)
        const supabase = await createServerActionClient()

    console.log('[signInAction] Cliente creado, llamando a signInWithPassword...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    console.log('[signInAction] Respuesta de Supabase:', { hasData: !!data, hasError: !!error, errorMsg: error?.message })

    if (error) {
      log.error('[Server Action] Login error:', error)
      console.error('[signInAction] Error de autenticación:', error.message)

      // Mapear errores comunes a mensajes en español
      let errorMessage = error.message

      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Credenciales de acceso incorrectas'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Email no confirmado'
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Demasiados intentos de login. Intenta de nuevo más tarde'
      }

      return { success: false, error: errorMessage }
    }

    if (!data.session || !data.user) {
      return { success: false, error: 'Error en la autenticación' }
    }

    // CRÍTICO: Forzar que Supabase guarde la sesión en cookies
    console.log('[signInAction] Estableciendo sesión manualmente...')
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    })

    if (sessionError) {
      console.error('[signInAction] Error al establecer sesión:', sessionError)
      return { success: false, error: 'Error al guardar la sesión' }
    }

    console.log('[signInAction] Sesión establecida correctamente')

    // Obtener datos completos del usuario (usar supabaseAdmin para garantizar schema correcto)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (userError) {
      log.error('[Server Action] User data error:', userError)
      return { success: false, error: 'Error al obtener datos del usuario' }
    }

    if (!userData) {
      return { success: false, error: 'Usuario no encontrado en la base de datos' }
    }

    // CRÍTICO: Verificar si el usuario está inactivo
    if (userData.status === 'inactive') {
      log.warn(`[Server Action] Intento de login con usuario inactivo: ${data.user.email}`)

      // Cerrar sesión inmediatamente
      await supabase.auth.signOut()

      // Retornar error específico para mostrar diálogo
      return {
        success: false,
        error: 'INACTIVE_USER' // Flag especial para mostrar diálogo
      }
    }

    // CRÍTICO: Verificar si el usuario está esperando aprobación
    if (userData.status === 'pendiente') {
      log.warn(`[Server Action] Intento de login con usuario pendiente de aprobación: ${data.user.email}`)

      // Cerrar sesión inmediatamente
      await supabase.auth.signOut()

      // Retornar error específico para mostrar mensaje de aprobación pendiente
      return {
        success: false,
        error: 'PENDIENTE' // Flag especial para mostrar mensaje de aprobación
      }
    }

    // REGLA SUPERADMIN: Forzar company_id = 1 (Demo) en cada login
    const updateData: any = { last_login: new Date().toISOString() }

    if (userData.role === 'superadmin' && userData.company_id !== 1) {
      log.info(`[Server Action] Forzando superadmin ${data.user.email} a empresa Demo (id = 1)`)
      updateData.company_id = 1
    }

    // Actualizar last_login (y company_id si es superadmin) - usar supabaseAdmin para schema correcto
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', data.user.id)

    if (updateError) {
      log.error('[Server Action] Error actualizando last_login:', updateError)
      // No es crítico, continuar con el login
    } else {
      log.info(`[Server Action] last_login actualizado para ${data.user.email}`)
    }

    log.info(`[Server Action] Login exitoso: ${data.user.email}, Rol: ${userData.role}`)

    console.log('[signInAction] Login completado exitosamente, retornando success=true')

    // NO usar redirect() aquí - dejar que el cliente maneje la navegación
    // para asegurar que las cookies se establezcan correctamente
    return {
      success: true,
      // Indicar al cliente dónde debe redirigir según el rol
      redirectTo: userData.role === 'comercial' ? '/budgets' : '/dashboard'
    }

  } catch (error) {
    // Si es un redirect, Next.js lo maneja automáticamente
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    // SECURITY (VULN-013): Sanitizar error para producción
    const sanitized = sanitizeError(error, {
      context: 'signInAction',
      category: 'authentication',
      metadata: { email }
    })

    return {
      success: false,
      error: sanitized.userMessage
    }
  }
}

export async function signOutAction(): Promise<SignInResult> {
  try {
        const supabase = await createServerActionClient()

    // Verificar si hay una sesión activa antes de intentar cerrar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      log.error('[Server Action] Session check error:', sessionError)
      // Aún así intentar cerrar sesión por si acaso
    }

    if (!session) {
      log.info('[Server Action] No hay sesión activa, redirigiendo a inicio')
      redirect('/')
      return { success: true }
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      log.error('[Server Action] Logout error:', error)
      return { success: false, error: `Error al cerrar sesión: ${error.message}` }
    }

    log.info('[Server Action] Logout exitoso')
    redirect('/')

  } catch (error) {
    log.error('[Server Action] Error crítico en logout:', error)

    // Si es un redirect, Next.js lo maneja automáticamente
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al cerrar sesión'
    }
  }
}

/**
 * Server Action para cerrar sesión y redirigir a /contact
 * Usado específicamente en InactiveAccountPopup cuando cuenta está desactivada
 */
export async function signOutAndRedirectToContact(): Promise<SignInResult> {
  try {
        const supabase = await createServerActionClient()

    log.info('[signOutAndRedirectToContact] Iniciando logout...')

    // Verificar si hay una sesión activa antes de intentar cerrar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      log.error('[signOutAndRedirectToContact] Session check error:', sessionError)
      // Aún así intentar cerrar sesión por si acaso
    }

    if (!session) {
      log.info('[signOutAndRedirectToContact] No hay sesión activa, redirigiendo a /contact')
      redirect('/contact')
      return { success: true }
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      log.error('[signOutAndRedirectToContact] Logout error:', error)
      // Redirigir a /contact de todas formas
      redirect('/contact')
      return { success: false, error: `Error al cerrar sesión: ${error.message}` }
    }

    log.info('[signOutAndRedirectToContact] Logout exitoso, redirigiendo a /contact')
    redirect('/contact')

  } catch (error) {
    log.error('[signOutAndRedirectToContact] Error crítico en logout:', error)

    // Si es un redirect, Next.js lo maneja automáticamente
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al cerrar sesión'
    }
  }
}

/**
 * Server Action simplificado para registro con Supabase nativo
 * Usa supabase.auth.signUp() que maneja automáticamente el envío de email de confirmación
 *
 * @param data - Datos básicos del usuario (nombre, email, contraseña, tipo)
 * @returns Resultado con indicación de email enviado
 */
export async function simplifiedRegister(data: {
  name: string;
  email: string;
  password: string;
}): Promise<{
  success: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
}> {
  try {
    console.log('[simplifiedRegister] Iniciando registro simplificado...');
    console.log('[simplifiedRegister] Email:', data.email);

    // 1. Validar entrada
    if (!data.name || !data.email || !data.password) {
      return {
        success: false,
        error: 'Todos los campos son obligatorios',
      };
    }

    // Validar longitud de contraseña
    if (data.password.length < 6) {
      return {
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres',
      };
    }

    // Validar formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        success: false,
        error: 'El formato del email no es válido',
      };
    }

    // 2. Crear cliente de Supabase
    const supabase = await createServerActionClient();

    // 3. Usar signUp de Supabase (envía email de confirmación automáticamente)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email.toLowerCase().trim(),
      password: data.password,
      options: {
        data: {
          name: data.name,
        },
        emailRedirectTo: `${await getAppUrl()}/auth/callback`,
      },
    });

    if (signUpError) {
      console.error('[simplifiedRegister] Error en signUp:', signUpError);

      // Mapear errores comunes
      let errorMessage = signUpError.message;

      if (signUpError.message.includes('already registered')) {
        errorMessage = 'Este email ya está registrado';
      } else if (signUpError.message.includes('invalid email')) {
        errorMessage = 'Email inválido';
      } else if (signUpError.message.includes('password')) {
        errorMessage = 'La contraseña no cumple con los requisitos';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    if (!authData.user) {
      console.error('[simplifiedRegister] No se creó el usuario');
      return {
        success: false,
        error: 'Error al crear el usuario',
      };
    }

    console.log('[simplifiedRegister] Usuario creado exitosamente:', authData.user.id);
    console.log('[simplifiedRegister] Email de confirmación enviado a:', data.email);

    // 4. Supabase envía el email de confirmación automáticamente
    // El usuario recibirá un email con un link de confirmación
    // Cuando haga clic, su email será confirmado y podrá hacer login

    return {
      success: true,
      requiresEmailConfirmation: true,
    };
  } catch (error) {
    console.error('[simplifiedRegister] Error inesperado:', error);
    return {
      success: false,
      error: 'Error inesperado al crear el registro',
    };
  }
}

/**
 * Server Action para completar perfil de usuario ya logueado
 * Se ejecuta cuando el usuario hace login y tiene issuer_id IS NULL
 *
 * @param profileData - Datos fiscales y de contacto
 * @returns Resultado con indicación de si requiere aprobación
 */
export async function completeUserProfile(profileData: {
  tipo_emisor: 'empresa' | 'autonomo';
  nif: string;
  razon_social: string;
  domicilio: string;
  codigo_postal: string;
  poblacion: string;
  provincia: string;
  irpf_percentage?: number;
  telefono: string;
  email_contacto: string;
  web?: string;
}): Promise<{
  success: boolean;
  error?: string;
  requiresApproval?: boolean;
}> {
  try {
    console.log('[completeUserProfile] Iniciando completar perfil...');

    // 1. Obtener usuario autenticado
    const supabase = await createServerActionClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[completeUserProfile] Error obteniendo usuario:', userError);
      return {
        success: false,
        error: 'Usuario no autenticado',
      };
    }

    console.log('[completeUserProfile] Usuario autenticado:', user.id);

    // 2. Validar datos de entrada
    if (!profileData.tipo_emisor || !profileData.nif || !profileData.razon_social) {
      return {
        success: false,
        error: 'Tipo de emisor, NIF y Razón Social son obligatorios',
      };
    }

    // 3. Obtener datos del usuario de la BD (para verificar estado y obtener company_id)
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      console.error('[completeUserProfile] Error obteniendo datos de usuario:', userDataError);
      return {
        success: false,
        error: 'Error al obtener datos del usuario',
      };
    }

    // 4. Verificar que el usuario no tenga ya un issuer creado
    const { data: existingIssuer } = await supabaseAdmin
      .from('issuers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingIssuer) {
      console.log('[completeUserProfile] Usuario ya tiene issuer:', existingIssuer.id);
      return {
        success: false,
        error: 'El perfil ya fue completado anteriormente',
      };
    }

    const tipo_emisor = profileData.tipo_emisor;
    console.log('[completeUserProfile] Tipo emisor:', tipo_emisor);

    // 6. Determinar company_id: usar el existente si hay, o crear uno nuevo
    let companyId = userData.company_id;

    if (!companyId) {
      // Crear nueva empresa
      console.log('[completeUserProfile] Creando nueva empresa...');
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          name: profileData.razon_social,
        })
        .select()
        .single();

      if (companyError || !company) {
        console.error('[completeUserProfile] Error creando empresa:', companyError);
        return {
          success: false,
          error: 'Error al crear la empresa',
        };
      }

      companyId = company.id;
      console.log('[completeUserProfile] Empresa creada:', companyId);

      // Actualizar user con company_id
      await supabaseAdmin
        .from('users')
        .update({ company_id: companyId })
        .eq('id', user.id);
    } else {
      console.log('[completeUserProfile] Usando company_id existente:', companyId);
    }

    // 7. Crear issuer
    console.log('[completeUserProfile] Creando issuer...');
    const { data: issuer, error: issuerError } = await supabaseAdmin
      .from('issuers')
      .insert({
        user_id: user.id,
        company_id: companyId,
        type: tipo_emisor,
        name: profileData.razon_social,
        nif: profileData.nif,
        address: profileData.domicilio,
        postal_code: profileData.codigo_postal,
        locality: profileData.poblacion,
        province: profileData.provincia,
        country: 'España',
        phone: profileData.telefono,
        email: profileData.email_contacto,
        web: profileData.web || null,
        irpf_percentage: profileData.irpf_percentage || null,
      })
      .select()
      .single();

    if (issuerError || !issuer) {
      console.error('[completeUserProfile] Error creando issuer:', issuerError);
      return {
        success: false,
        error: `Error al crear el emisor: ${issuerError?.message || 'Error desconocido'}`,
      };
    }

    console.log('[completeUserProfile] Issuer creado:', issuer.id);

    // 8. Verificar si requiere aprobación
    const requiresApproval = await getRegistrationRequiresApproval();
    console.log('[completeUserProfile] Requiere aprobación:', requiresApproval);

    // 9. Actualizar usuario con estado
    // NOTA: issuer_id se obtiene via JOIN con issuers.user_id, no se guarda en users
    const newStatus = requiresApproval ? 'pendiente' : 'active';

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[completeUserProfile] ACTUALIZANDO USUARIO');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📋 Issuer ID: ${issuer.id}`);
    console.log(`🔐 Nuevo Status: ${newStatus}`);
    console.log(`👤 Usuario: ${userData.name} (${userData.email})`);
    console.log('───────────────────────────────────────────────────────────────');

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        status: newStatus,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[completeUserProfile] Error actualizando usuario:', updateError);
      console.log('═══════════════════════════════════════════════════════════════\n');
      return {
        success: false,
        error: 'Error al actualizar el perfil',
      };
    }

    console.log('✅ Usuario actualizado exitosamente');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 10. Notificar al superadmin si requiere aprobación
    if (requiresApproval) {
      console.log('\n🔔 Usuario requiere aprobación - iniciando notificación...\n');
      notifySuperadminNewRegistration(
        userData.name,
        userData.last_name || '',
        userData.email
      ).catch(error => {
        console.error('[completeUserProfile] ❌ Error al notificar superadmin:', error);
      });
    } else {
      console.log('\n✅ Usuario NO requiere aprobación - activación inmediata\n');
    }

    return {
      success: true,
      requiresApproval,
    };
  } catch (error) {
    console.error('[completeUserProfile] Error inesperado:', error);
    return {
      success: false,
      error: 'Error inesperado al completar el perfil',
    };
  }
}

/**
 * Interfaz para datos de registro
 */
export interface RegisterData {
  name: string
  last_name: string
  email: string
  password: string
  tipo: 'empresa' | 'autonomo'
  nombreComercial: string
  nif: string
  direccionFiscal: string
  codigoPostal?: string
  ciudad?: string
  provincia?: string
  pais?: string
  telefono?: string
  emailContacto?: string
  web?: string
  irpfPercentage?: number | null
  issuer_id?: string  // ID del emisor existente (solo para superadmin)
  role?: 'admin' | 'comercial' | 'superadmin'  // Rol del nuevo usuario (solo para superadmin)
}

/**
 * Interfaz para resultado de registro
 */
export interface RegisterResult {
  success: boolean
  error?: string
  data?: {
    userId: string
    emisorId: string | null
    isDevelopment?: boolean
    requiresApproval?: boolean
  }
}

/**
 * Server Action para registrar nuevo usuario
 *
 * @param data - Datos de registro del usuario y emisor
 * @returns RegisterResult con userId y emisorId si tiene éxito
 */
export async function registerUser(data: RegisterData): Promise<RegisterResult> {
  try {
    log.info('[registerUser] Iniciando registro...', {
      email: data.email,
      tipo: data.tipo,
      hasIssuerId: !!data.issuer_id
    })

        const supabase = await createServerActionClient()

    // Usar el cliente admin global (importado de @/lib/supabase/server)
    // Este cliente ya tiene configurado el service_role_key y bypass de RLS

    // Variable para almacenar el ID de la empresa y el emisor
    let empresaId: number | null = null
    let emisorId: string | null = null

    // ==========================================
    // CASO 1: Superadmin asigna usuario a emisor existente
    // ==========================================
    if (data.issuer_id) {
      log.info('[registerUser] Asignando a emisor existente:', data.issuer_id)

      // Verificar que el usuario actual es superadmin
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return {
          success: false,
          error: 'No autenticado'
        }
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userError || !userData || userData.role !== 'superadmin') {
        return {
          success: false,
          error: 'Solo superadmin puede asignar usuarios a emisores existentes'
        }
      }

      // Obtener el emisor existente
      const { data: issuerData, error: issuerError } = await supabaseAdmin
        .from('issuers')
        .select('id, company_id')
        .eq('id', data.issuer_id)
        .single()

      if (issuerError || !issuerData) {
        log.error('[registerUser] Error al obtener emisor:', issuerError)
        return {
          success: false,
          error: 'Emisor no encontrado'
        }
      }

      empresaId = issuerData.company_id
      emisorId = issuerData.id
      log.info('[registerUser] Usando empresa existente:', empresaId)

    // ==========================================
    // CASO 2: Superadmin en empresa Demo (id = 1)
    // ==========================================
    } else if (data.role === 'superadmin') {
      log.info('[registerUser] Creando superadmin en empresa Demo (id = 1)')

      // Verificar que la empresa Demo (id = 1) existe
      const { data: demoCompany, error: demoError } = await supabaseAdmin
        .from('companies')
        .select('id, name')
        .eq('id', 1)
        .single()

      if (demoError || !demoCompany) {
        log.error('[registerUser] Empresa Demo (id = 1) no existe:', demoError)
        return {
          success: false,
          error: 'La empresa Demo (id = 1) no existe en el sistema. Por favor, créala primero.'
        }
      }

      log.info('[registerUser] Empresa Demo encontrada:', demoCompany.name)

      // Superadmins siempre se crean en empresa Demo (id = 1) por defecto
      empresaId = 1
      emisorId = null // Superadmins no tienen issuer

    // ==========================================
    // CASO 3: Registro normal (crear nueva empresa y emisor)
    // ==========================================
    } else {
      // 1. Validar que el NIF no esté ya registrado en TODA la base de datos
      const { data: existingIssuer, error: checkError } = await supabase
        .from('issuers')
        .select('id, nif')
        .eq('nif', data.nif.trim().toUpperCase())
        .maybeSingle()

      if (existingIssuer) {
        log.error('[registerUser] NIF ya registrado:', data.nif)
        return {
          success: false,
          error: 'El NIF/CIF ya está registrado en el sistema'
        }
      }

      // 2. Crear nueva empresa para este emisor
      const { data: empresaData, error: empresaError } = await supabaseAdmin
        .from('companies')
        .insert({
          name: data.nombreComercial,
          status: 'active'
        })
        .select('id')
        .single()

      if (empresaError || !empresaData) {
        log.error('[registerUser] Error al crear empresa:', empresaError)
        return {
          success: false,
          error: 'Error al crear la empresa'
        }
      }

      empresaId = empresaData.id
      log.info('[registerUser] Empresa creada:', empresaId)
    }

    // 4. Crear usuario en auth.users usando admin API
    // Determinar si debemos auto-confirmar email según entorno
    // DESARROLLO: auto-confirmar para facilitar testing
    // PRODUCCIÓN: Requiere confirmación de email (Supabase enviará email automáticamente)
    const isDevelopment = process.env.NODE_ENV === 'development'

    log.info('[registerUser] Entorno:', {
      NODE_ENV: process.env.NODE_ENV,
      isDevelopment,
      emailConfirm: isDevelopment
    })

    // IMPORTANTE: Solo incluir user_metadata si no es superadmin
    const createUserPayload: any = {
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: isDevelopment, // Auto-confirmar SOLO en desarrollo
    }

    // Solo añadir user_metadata si NO es superadmin y hay datos válidos
    if (data.role !== 'superadmin' && data.nombreComercial && data.tipo) {
      createUserPayload.user_metadata = {
        nombre_comercial: data.nombreComercial,
        tipo: data.tipo
      }
    }

    log.info('[registerUser] Creando usuario en auth.users:', {
      email: createUserPayload.email,
      hasMetadata: !!createUserPayload.user_metadata,
      role: data.role
    })

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser(createUserPayload)

    if (authError) {
      log.error('[registerUser] Error en signUp:', authError)

      let errorMessage = authError.message

      if (authError.message.includes('already registered')) {
        errorMessage = 'Este email ya está registrado'
      } else if (authError.message.includes('invalid email')) {
        errorMessage = 'Email inválido'
      } else if (authError.message.includes('password')) {
        errorMessage = 'La contraseña no cumple los requisitos mínimos'
      }

      return { success: false, error: errorMessage }
    }

    if (!authData.user) {
      log.error('[registerUser] No se obtuvo el usuario creado')
      return { success: false, error: 'Error al crear el usuario' }
    }

    const userId = authData.user.id

    log.info('[registerUser] Usuario auth creado:', userId)

    // Determinar el rol del usuario
    // - Si se proporciona role explícitamente (superadmin), usar ese
    // - Si no, y es el primer usuario de una nueva empresa: admin
    // - Si no, y es usuario asignado a emisor existente: comercial por defecto
    const userRole = data.role || (data.issuer_id ? 'comercial' : 'admin')

    // Determinar el estado del usuario según configuración
    // - Si registration_requires_approval está activado: pendiente
    // - Si no: pending (comportamiento actual)
    const requiresApproval = await getRegistrationRequiresApproval()
    const userStatus = requiresApproval ? 'pendiente' : 'pending'

    // 5. Crear registro en public.users
    // REGLA: Todos los superadmins deben tener company_id = 1
    const finalCompanyId = userRole === 'superadmin' ? 1 : empresaId

    // Usar supabaseAdmin para bypass RLS policies
    log.info('[registerUser] Intentando crear registro en users:', {
      userId,
      empresaId,
      userRole,
      finalCompanyId,
      isSuperadmin: userRole === 'superadmin',
      email: data.email.trim().toLowerCase(),
      status: userStatus,
      requiresApproval
    })

    const { data: insertedUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        name: data.name.trim(),
        last_name: data.last_name.trim(),
        email: data.email.trim().toLowerCase(),
        role: userRole,
        company_id: finalCompanyId,
        status: userStatus, // 'pendiente' si requiere aprobación, 'pending' si no
        invited_by: null // Se asignará cuando acepte la invitación
      })
      .select()
      .single()

    if (userError) {
      log.error('[registerUser] Error al crear registro en users:', {
        error: userError,
        errorString: JSON.stringify(userError),
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
        userId,
        empresaId,
        userRole,
        name: data.name,
        last_name: data.last_name,
        email: data.email
      })

      // Intentar eliminar el usuario de auth y la empresa si falla la creación en public.users
      await supabaseAdmin.auth.admin.deleteUser(userId)
      // Solo eliminar empresa si fue creada en este proceso (no existía issuer_id Y no es superadmin)
      if (!data.issuer_id && empresaId) {
        await supabaseAdmin.from('companies').delete().eq('id', empresaId)
      }

      return {
        success: false,
        error: `Database error creating new user: ${userError.message || userError.code || 'Unknown error'}`
      }
    }

    log.info('[registerUser] Registro en users creado con rol:', userRole)

    // Notificar al superadmin si el registro requiere aprobación
    if (userStatus === 'pendiente') {
      log.info('[registerUser] Notificando al superadmin sobre nuevo registro pendiente')
      // No esperar la notificación - ejecutar en background
      notifySuperadminNewRegistration(
        data.name.trim(),
        data.last_name.trim(),
        data.email.trim().toLowerCase()
      ).catch(error => {
        log.error('[registerUser] Error al notificar superadmin:', error)
        // No afectar el flujo de registro si falla la notificación
      })
    }

    // 6. Crear registro en public.issuers SOLO si:
    //    - No se proporcionó issuer_id Y
    //    - No es un superadmin (superadmins no tienen issuer)
    if (!data.issuer_id && userRole !== 'superadmin') {
      const { data: issuerData, error: issuerError } = await supabaseAdmin
        .from('issuers')
        .insert({
          user_id: userId,
          company_id: empresaId,
          type: data.tipo,
          name: data.nombreComercial.trim(),
          nif: data.nif.trim().toUpperCase(),
          address: data.direccionFiscal.trim(),
          postal_code: data.codigoPostal?.trim() || null,
          locality: data.ciudad?.trim() || null,
          province: data.provincia?.trim() || null,
          country: data.pais?.trim() || 'España',
          phone: data.telefono?.trim() || null,
          email: data.emailContacto?.trim() || data.email.trim().toLowerCase(),
          web: data.web?.trim() || null,
          irpf_percentage: data.tipo === 'autonomo' ? (data.irpfPercentage ?? 15) : null
        })
        .select('id')
        .single()

      if (issuerError) {
        log.error('[registerUser] Error al crear issuer:', issuerError)

        // Intentar rollback: eliminar usuario, auth y empresa (si existe)
        await supabaseAdmin.from('users').delete().eq('id', userId)
        await supabaseAdmin.auth.admin.deleteUser(userId)
        if (empresaId) {
          await supabaseAdmin.from('companies').delete().eq('id', empresaId)
        }

        return {
          success: false,
          error: 'Error al crear los datos del emisor'
        }
      }

      if (!issuerData) {
        log.error('[registerUser] No se obtuvo el issuer creado')

        // Rollback: eliminar usuario, auth y empresa (si existe)
        await supabaseAdmin.from('users').delete().eq('id', userId)
        await supabaseAdmin.auth.admin.deleteUser(userId)
        if (empresaId) {
          await supabaseAdmin.from('companies').delete().eq('id', empresaId)
        }

        return {
          success: false,
          error: 'Error al crear los datos del emisor'
        }
      }

      emisorId = issuerData.id
      log.info('[registerUser] Issuer creado:', issuerData.id)
    }

    log.info('[registerUser] Registro completado exitosamente')

    // 7. Determinar si hay usuario autenticado (admin creando usuario)
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    log.info('[registerUser] Usuario creado:', {
      hasCurrentUser: !!currentUser,
      hasIssuerId: !!data.issuer_id,
      newUserEmail: data.email,
      isDevelopment
    })

    // 8. Retornar resultado SIN hacer auto-login
    // El componente frontend manejará la UI de confirmación de email
    // Incluir isDevelopment para que el cliente sepa cómo mostrar la UI
    return {
      success: true,
      data: {
        userId,
        emisorId,
        isDevelopment, // Para que el cliente sepa si mostrar timer de 3s
        requiresApproval, // Para que el cliente sepa si mostrar mensaje de aprobación pendiente
      }
    }

  } catch (error) {
    log.error('[registerUser] Error crítico:', error)

    // Si es un redirect, Next.js lo maneja automáticamente
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado durante el registro'
    }
  }
}

/**
 * Interfaz para resultado de operaciones de password
 */
export interface PasswordResetResult {
  success: boolean
  error?: string
  message?: string
}

/**
 * Server Action para solicitar recuperación de contraseña
 *
 * Envía un email con link mágico al usuario para resetear su contraseña
 *
 * @param email - Email del usuario que solicita recuperación
 * @returns PasswordResetResult indicando éxito o error
 */
export async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
  try {
    log.info('[requestPasswordReset] Iniciando...', { email })

    // Validar email
    if (!email || !email.trim()) {
      return {
        success: false,
        error: 'El email es requerido'
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return {
        success: false,
        error: 'Email inválido'
      }
    }

        const supabase = await createServerActionClient()

    // Obtener URL base de la aplicación
    const baseUrl = await getAppUrl()

    // Enviar email de recuperación usando Supabase Auth
    // El link de reset apuntará a /reset-password
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${baseUrl}/reset-password`
    })

    if (error) {
      log.error('[requestPasswordReset] Error al enviar email:', error)

      let errorMessage = error.message

      if (error.message.includes('Email not found')) {
        // Por seguridad, no revelamos si el email existe o no
        // Mostramos mensaje genérico de éxito
        return {
          success: true,
          message: 'Si el email está registrado, recibirás un enlace de recuperación'
        }
      }

      return {
        success: false,
        error: errorMessage
      }
    }

    log.info('[requestPasswordReset] Email enviado exitosamente')

    return {
      success: true,
      message: 'Si el email está registrado, recibirás un enlace de recuperación'
    }
  } catch (error) {
    log.error('[requestPasswordReset] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al solicitar recuperación'
    }
  }
}

/**
 * Server Action para resetear contraseña con token
 *
 * @param newPassword - Nueva contraseña del usuario
 * @returns PasswordResetResult indicando éxito o error
 */
export async function resetPassword(newPassword: string): Promise<PasswordResetResult> {
  try {
    log.info('[resetPassword] Iniciando...')

    // Validar contraseña
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres'
      }
    }

    // Validar complejidad de contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
    if (!passwordRegex.test(newPassword)) {
      return {
        success: false,
        error: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
      }
    }

        const supabase = await createServerActionClient()

    // Verificar que hay una sesión activa (del link de reset)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      log.error('[resetPassword] No hay sesión activa:', sessionError)
      return {
        success: false,
        error: 'Token de recuperación inválido o expirado. Solicita un nuevo enlace de recuperación.'
      }
    }

    // Actualizar contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      log.error('[resetPassword] Error al actualizar contraseña:', updateError)

      let errorMessage = updateError.message

      if (updateError.message.includes('same as the old password')) {
        errorMessage = 'La nueva contraseña no puede ser igual a la anterior'
      }

      return {
        success: false,
        error: errorMessage
      }
    }

    log.info('[resetPassword] Contraseña actualizada exitosamente')

    // Cerrar sesión después de resetear (usuario deberá hacer login con nueva contraseña)
    await supabase.auth.signOut()

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.'
    }
  } catch (error) {
    log.error('[resetPassword] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al resetear contraseña'
    }
  }
}

/**
 * Interfaz para datos de perfil de usuario
 */
export interface UserProfile {
  // Datos usuario
  id: string
  name: string
  email: string
  role: string
  company_id: number
  company_name?: string // Nombre de la empresa a la que pertenece

  // Datos emisor
  emisor?: {
    id: string
    tipo: 'empresa' | 'autonomo'
    nombre_comercial: string
    nif: string
    direccion_fiscal: string
    codigo_postal?: string
    ciudad?: string
    provincia?: string
    pais?: string
    telefono?: string
    email?: string
    web?: string
    irpf_percentage?: number
    logo_url?: string
  }
}

/**
 * Interfaz para datos de actualización de perfil
 */
export interface UpdateProfileData {
  // Datos emisor (editables)
  nombre_comercial?: string
  nif?: string
  direccion_fiscal?: string
  codigo_postal?: string
  ciudad?: string
  provincia?: string
  pais?: string
  telefono?: string
  emailContacto?: string
  web?: string
  irpf_percentage?: number

  // Cambio de contraseña (opcional)
  currentPassword?: string
  newPassword?: string
}

/**
 * Interfaz para resultado de operaciones de perfil
 */
export interface ProfileResult {
  success: boolean
  error?: string
  data?: UserProfile
}

/**
 * Server Action para obtener el perfil del usuario actual
 *
 * @returns ProfileResult con datos del usuario y emisor
 */
export async function getUserProfile(): Promise<ProfileResult> {
  try {
    log.info('[getUserProfile] Iniciando...')

        const supabase = await createServerActionClient()

    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      log.error('[getUserProfile] No autenticado:', authError)
      return {
        success: false,
        error: 'No estás autenticado'
      }
    }

    // Obtener datos del usuario usando supabaseAdmin para evitar problemas de schema
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      log.error('[getUserProfile] Error al obtener usuario:', userError)
      return {
        success: false,
        error: 'Error al obtener datos del usuario'
      }
    }

    // Obtener nombre de empresa
    let companyName: string | null = null
    if (userData.company_id) {
      const { data: companyData } = await supabaseAdmin
        .from('companies')
        .select('name')
        .eq('id', userData.company_id)
        .single()

      companyName = companyData?.name || null
    }

    // Obtener datos del issuer usando supabaseAdmin para bypass RLS
    const { data: issuerData, error: issuerError } = await supabaseAdmin
      .from('issuers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (issuerError) {
      log.info('[getUserProfile] No se encontró issuer para el usuario (puede ser normal para usuarios antiguos)')
      // No es crítico si no existe issuer (usuarios antiguos pueden no tenerlo)
    }

    const profile: UserProfile = {
      ...userData,
      company_name: companyName,
      emisor: issuerData ? {
        id: issuerData.id,
        tipo: issuerData.type,
        nombre_comercial: issuerData.name,
        nif: issuerData.nif,
        direccion_fiscal: issuerData.address,
        codigo_postal: issuerData.postal_code,
        ciudad: issuerData.locality,
        provincia: issuerData.province,
        pais: issuerData.country,
        telefono: issuerData.phone,
        email: issuerData.email,
        web: issuerData.web,
        irpf_percentage: issuerData.irpf_percentage,
        logo_url: issuerData.logo_url
      } : undefined
    }

    log.info('[getUserProfile] Perfil obtenido exitosamente')

    return {
      success: true,
      data: profile
    }
  } catch (error) {
    log.error('[getUserProfile] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al obtener perfil'
    }
  }
}

/**
 * Server Action para actualizar el perfil del usuario
 *
 * @param data - Datos a actualizar (emisor y/o contraseña)
 * @returns ProfileResult indicando éxito o error
 */
export async function updateUserProfile(data: UpdateProfileData): Promise<ProfileResult> {
  try {
    log.info('[updateUserProfile] Iniciando...', { hasPasswordChange: !!data.currentPassword })

        const supabase = await createServerActionClient()

    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      log.error('[updateUserProfile] No autenticado:', authError)
      return {
        success: false,
        error: 'No estás autenticado'
      }
    }

    // Si hay cambio de contraseña, validar y actualizar
    if (data.currentPassword && data.newPassword) {
      log.info('[updateUserProfile] Cambiando contraseña...')

      // Validar contraseña nueva
      if (data.newPassword.length < 8) {
        return {
          success: false,
          error: 'La nueva contraseña debe tener al menos 8 caracteres'
        }
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
      if (!passwordRegex.test(data.newPassword)) {
        return {
          success: false,
          error: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
        }
      }

      // Verificar contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: data.currentPassword
      })

      if (signInError) {
        log.error('[updateUserProfile] Contraseña actual incorrecta:', signInError)
        return {
          success: false,
          error: 'La contraseña actual es incorrecta'
        }
      }

      // Actualizar contraseña
      const { error: updatePasswordError } = await supabase.auth.updateUser({
        password: data.newPassword
      })

      if (updatePasswordError) {
        log.error('[updateUserProfile] Error al actualizar contraseña:', updatePasswordError)
        return {
          success: false,
          error: 'Error al actualizar la contraseña'
        }
      }

      log.info('[updateUserProfile] Contraseña actualizada exitosamente')
    }

    // Actualizar datos del emisor si se proporcionaron
    const hasEmisorData = data.nombre_comercial || data.nif || data.direccion_fiscal ||
                          data.codigo_postal || data.ciudad || data.provincia ||
                          data.telefono || data.emailContacto || data.web ||
                          data.irpf_percentage !== undefined

    if (hasEmisorData) {
      log.info('[updateUserProfile] Actualizando datos emisor...')

      // Construir objeto de actualización solo con campos proporcionados
      const updateData: any = {}

      if (data.nombre_comercial) updateData.name = data.nombre_comercial.trim()
      if (data.nif) updateData.nif = data.nif.trim().toUpperCase()
      if (data.direccion_fiscal) updateData.address = data.direccion_fiscal.trim()
      if (data.codigo_postal !== undefined) updateData.postal_code = data.codigo_postal?.trim() || null
      if (data.ciudad !== undefined) updateData.locality = data.ciudad?.trim() || null
      if (data.provincia !== undefined) updateData.province = data.provincia?.trim() || null
      if (data.pais !== undefined) updateData.country = data.pais?.trim() || null
      if (data.telefono !== undefined) updateData.phone = data.telefono?.trim() || null
      if (data.emailContacto !== undefined) updateData.email = data.emailContacto?.trim() || null
      if (data.web !== undefined) updateData.web = data.web?.trim() || null
      if (data.irpf_percentage !== undefined) updateData.irpf_percentage = data.irpf_percentage

      // Añadir updated_at
      updateData.updated_at = new Date().toISOString()

      // Actualizar issuer
      const { error: issuerError } = await supabase
        .from('issuers')
        .update(updateData)
        .eq('user_id', user.id)

      if (issuerError) {
        log.error('[updateUserProfile] Error al actualizar issuer:', issuerError)
        return {
          success: false,
          error: 'Error al actualizar los datos del emisor'
        }
      }

      log.info('[updateUserProfile] Datos issuer actualizados exitosamente')
    }

    // Obtener perfil actualizado
    const profileResult = await getUserProfile()

    if (!profileResult.success) {
      return {
        success: false,
        error: 'Error al obtener el perfil actualizado'
      }
    }

    log.info('[updateUserProfile] Perfil actualizado exitosamente')

    return {
      success: true,
      data: profileResult.data
    }
  } catch (error) {
    log.error('[updateUserProfile] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al actualizar perfil'
    }
  }
}

/**
 * Interfaz para datos de emisor
 */
export interface IssuerData {
  id: string
  company_id: number
  type: 'empresa' | 'autonomo'
  name: string
  nif: string
  address: string
  postal_code: string | null
  locality: string | null
  province: string | null
  phone: string | null
  email: string | null
  web: string | null
}

/**
 * Server Action para obtener lista de emisores (solo para superadmin)
 *
 * @returns Lista de emisores con sus datos básicos
 */
export async function getIssuers(): Promise<{
  success: boolean
  data?: IssuerData[]
  error?: string
}> {
  try {
    log.info('[getIssuers] Obteniendo lista de emisores...')

        const supabase = await createServerActionClient()

    // Verificar que el usuario es superadmin
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'No autenticado'
      }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'superadmin') {
      return {
        success: false,
        error: 'Solo superadmin puede acceder a esta función'
      }
    }

    // Obtener lista de emisores ACTIVOS (excluir empresas eliminadas)
    const { data: issuers, error: issuersError } = await supabase
      .from('issuers')
      .select('id, company_id, type, name, nif, address, postal_code, locality, province, phone, email, web')
      .is('deleted_at', null)
      .order('name')

    if (issuersError) {
      log.error('[getIssuers] Error obteniendo emisores:', issuersError)
      return {
        success: false,
        error: 'Error al obtener lista de emisores'
      }
    }

    log.info('[getIssuers] Emisores obtenidos:', issuers?.length || 0)

    return {
      success: true,
      data: issuers as IssuerData[]
    }

  } catch (error) {
    log.error('[getIssuers] Error crítico:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al obtener emisores'
    }
  }
}

/**
 * Server Action para obtener el perfil de otro usuario (solo superadmin/admin)
 *
 * @param userId - ID del usuario cuyo perfil se quiere obtener
 * @returns ProfileResult con el perfil del usuario o error
 */
export async function getUserProfileById(userId: string): Promise<ProfileResult> {
  try {
    log.info('[getUserProfileById] Iniciando...', { userId })

        const supabase = await createServerActionClient()

    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      log.error('[getUserProfileById] No autenticado:', authError)
      return {
        success: false,
        error: 'No estás autenticado'
      }
    }

    // Obtener datos del usuario autenticado usando supabaseAdmin
    const { data: currentUserData, error: currentUserError } = await supabaseAdmin
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (currentUserError || !currentUserData) {
      log.error('[getUserProfileById] Error al obtener usuario actual:', currentUserError)
      return {
        success: false,
        error: 'Error al verificar permisos'
      }
    }

    // Obtener datos del usuario a editar usando supabaseAdmin
    const { data: targetUserData, error: targetUserError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUserData) {
      log.error('[getUserProfileById] Error al obtener usuario:', targetUserError)
      return {
        success: false,
        error: 'Usuario no encontrado'
      }
    }

    // Verificar permisos:
    // - Superadmin puede editar cualquier usuario
    // - Admin solo puede editar usuarios de su empresa
    // - Comercial no tiene acceso (verificado en UI pero también aquí)
    if (currentUserData.role === 'comercial') {
      return {
        success: false,
        error: 'No tienes permisos para acceder a esta funcionalidad'
      }
    }

    if (
      currentUserData.role === 'admin' &&
      targetUserData.company_id !== currentUserData.company_id
    ) {
      return {
        success: false,
        error: 'No tienes permisos para editar usuarios de otra empresa'
      }
    }

    // Obtener nombre de empresa usando supabaseAdmin
    let companyName: string | null = null
    if (targetUserData.company_id) {
      const { data: companyData } = await supabaseAdmin
        .from('companies')
        .select('name')
        .eq('id', targetUserData.company_id)
        .single()

      companyName = companyData?.name || null
    }

    // Obtener datos del issuer usando supabaseAdmin para bypass RLS
    const { data: issuerData, error: issuerError } = await supabaseAdmin
      .from('issuers')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (issuerError) {
      log.info('[getUserProfileById] No se encontró issuer para el usuario')
    }

    const profile: UserProfile = {
      ...targetUserData,
      company_name: companyName,
      emisor: issuerData ? {
        id: issuerData.id,
        tipo: issuerData.type,
        nombre_comercial: issuerData.name,
        nif: issuerData.nif,
        direccion_fiscal: issuerData.address,
        codigo_postal: issuerData.postal_code,
        ciudad: issuerData.locality,
        provincia: issuerData.province,
        pais: issuerData.country,
        telefono: issuerData.phone,
        email: issuerData.email,
        web: issuerData.web,
        irpf_percentage: issuerData.irpf_percentage,
        created_at: issuerData.created_at,
        updated_at: issuerData.updated_at
      } : null
    }

    log.info('[getUserProfileById] Perfil obtenido exitosamente')

    return {
      success: true,
      data: profile
    }
  } catch (error) {
    log.error('[getUserProfileById] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al obtener perfil'
    }
  }
}

/**
 * Server Action para actualizar el perfil de otro usuario (solo superadmin/admin)
 *
 * @param userId - ID del usuario a actualizar
 * @param data - Datos a actualizar (emisor y/o contraseña)
 * @returns ProfileResult indicando éxito o error
 */
export async function updateUserProfileById(
  userId: string,
  data: UpdateProfileData
): Promise<ProfileResult> {
  try {
    log.info('[updateUserProfileById] Iniciando...', {
      userId,
      hasPasswordChange: !!data.newPassword
    })

        const supabase = await createServerActionClient()

    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      log.error('[updateUserProfileById] No autenticado:', authError)
      return {
        success: false,
        error: 'No estás autenticado'
      }
    }

    // Obtener datos del usuario autenticado
    const { data: currentUserData, error: currentUserError } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (currentUserError || !currentUserData) {
      log.error('[updateUserProfileById] Error al obtener usuario actual:', currentUserError)
      return {
        success: false,
        error: 'Error al verificar permisos'
      }
    }

    // Obtener datos del usuario a editar
    const { data: targetUserData, error: targetUserError } = await supabase
      .from('users')
      .select('email, company_id')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUserData) {
      log.error('[updateUserProfileById] Error al obtener usuario:', targetUserError)
      return {
        success: false,
        error: 'Usuario no encontrado'
      }
    }

    // Verificar permisos
    if (currentUserData.role === 'comercial') {
      return {
        success: false,
        error: 'No tienes permisos para modificar perfiles de otros usuarios'
      }
    }

    if (
      currentUserData.role === 'admin' &&
      targetUserData.company_id !== currentUserData.company_id
    ) {
      return {
        success: false,
        error: 'No tienes permisos para editar usuarios de otra empresa'
      }
    }

    // Si hay cambio de contraseña, usar supabaseAdmin para actualizar
    if (data.newPassword) {
      log.info('[updateUserProfileById] Cambiando contraseña...')

      // Validar contraseña nueva
      if (data.newPassword.length < 8) {
        return {
          success: false,
          error: 'La nueva contraseña debe tener al menos 8 caracteres'
        }
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
      if (!passwordRegex.test(data.newPassword)) {
        return {
          success: false,
          error: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
        }
      }

      // Actualizar contraseña usando supabaseAdmin (admin bypass)
      const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: data.newPassword }
      )

      if (updatePasswordError) {
        log.error('[updateUserProfileById] Error al actualizar contraseña:', updatePasswordError)
        return {
          success: false,
          error: 'Error al actualizar la contraseña'
        }
      }

      log.info('[updateUserProfileById] Contraseña actualizada exitosamente')
    }

    // Actualizar datos del emisor si se proporcionaron
    const hasEmisorData = data.nombre_comercial || data.nif || data.direccion_fiscal ||
                          data.codigo_postal || data.ciudad || data.provincia ||
                          data.telefono || data.emailContacto || data.web ||
                          data.irpf_percentage !== undefined

    if (hasEmisorData) {
      log.info('[updateUserProfileById] Actualizando datos emisor...')

      // Construir objeto de actualización solo con campos proporcionados
      const updateData: any = {}

      if (data.nombre_comercial) updateData.name = data.nombre_comercial.trim()
      if (data.nif) updateData.nif = data.nif.trim().toUpperCase()
      if (data.direccion_fiscal) updateData.address = data.direccion_fiscal.trim()
      if (data.codigo_postal !== undefined) updateData.postal_code = data.codigo_postal?.trim() || null
      if (data.ciudad !== undefined) updateData.locality = data.ciudad?.trim() || null
      if (data.provincia !== undefined) updateData.province = data.provincia?.trim() || null
      if (data.pais !== undefined) updateData.country = data.pais?.trim() || null
      if (data.telefono !== undefined) updateData.phone = data.telefono?.trim() || null
      if (data.emailContacto !== undefined) updateData.email = data.emailContacto?.trim() || null
      if (data.web !== undefined) updateData.web = data.web?.trim() || null
      if (data.irpf_percentage !== undefined) updateData.irpf_percentage = data.irpf_percentage

      // Añadir updated_at
      updateData.updated_at = new Date().toISOString()

      // Actualizar issuer usando supabaseAdmin para bypass RLS
      const { error: issuerError } = await supabaseAdmin
        .from('issuers')
        .update(updateData)
        .eq('user_id', userId)

      if (issuerError) {
        log.error('[updateUserProfileById] Error al actualizar issuer:', issuerError)
        return {
          success: false,
          error: 'Error al actualizar los datos del emisor'
        }
      }

      log.info('[updateUserProfileById] Datos issuer actualizados exitosamente')
    }

    // Obtener perfil actualizado
    const profileResult = await getUserProfileById(userId)

    if (!profileResult.success) {
      return {
        success: false,
        error: 'Error al obtener el perfil actualizado'
      }
    }

    log.info('[updateUserProfileById] Perfil actualizado exitosamente')

    return {
      success: true,
      data: profileResult.data
    }
  } catch (error) {
    log.error('[updateUserProfileById] Error crítico:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al actualizar perfil'
    }
  }
}