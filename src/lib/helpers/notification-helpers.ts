'use server'

import { supabaseAdmin } from '@/lib/supabase/server'
import { log } from '@/lib/logger'
import { sendEmail } from '@/lib/helpers/email-helpers'
import { getEmailNotificationsEnabled } from '@/lib/helpers/config-helpers'
import { getAppUrl } from '@/lib/helpers/url-helpers-server'

/**
 * Notifica al superadmin sobre una nueva solicitud de registro pendiente de aprobación
 * - Crea un mensaje en contact_messages
 * - Envía email si está habilitado
 */
export async function notifySuperadminNewRegistration(
  userName: string,
  userLastName: string,
  userEmail: string
): Promise<void> {
  try {
    const isLocalhost = process.env.NODE_ENV !== 'production'

    console.log('\n')
    console.log('🔔════════════════════════════════════════════════════════════════')
    console.log('   NOTIFICACIÓN: NUEVA SOLICITUD DE REGISTRO')
    console.log('═════════════════════════════════════════════════════════════════')
    console.log(`👤 Usuario:  ${userName} ${userLastName}`)
    console.log(`📧 Email:    ${userEmail}`)
    console.log(`⏰ Momento:  ${new Date().toISOString()}`)
    console.log('─────────────────────────────────────────────────────────────────')

    // 1. Crear mensaje en contact_messages
    const { error: messageError } = await supabaseAdmin
      .from('contact_messages')
      .insert({
        first_name: userName,
        last_name: userLastName,
        email: userEmail,
        subject: '🔔 Nueva solicitud de registro pendiente de aprobación',
        message: `El usuario ${userName} ${userLastName} (${userEmail}) se ha registrado y está pendiente de aprobación. Por favor, revisa su solicitud en el panel de administración.`,
        status: 'nuevo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (messageError) {
      console.error('❌ Error creando mensaje en contact_messages:', messageError)
      // No lanzar error - no queremos que falle el registro por esto
    } else {
      console.log('✅ Mensaje creado en contact_messages exitosamente')
    }

    // 2. Enviar email al superadmin si está habilitado
    const emailEnabled = await getEmailNotificationsEnabled()
    console.log(`📬 Email notifications enabled: ${emailEnabled}`)

    if (emailEnabled) {
      try {
        // Obtener emails de superadmins desde config
        const { data: configData } = await supabaseAdmin
          .from('config')
          .select('value')
          .eq('key', 'superadmin_notification_emails')
          .single()

        let superadminEmails: string[] = []

        if (configData?.value) {
          // Si hay emails configurados, usarlos
          superadminEmails = Array.isArray(configData.value)
            ? configData.value
            : [configData.value as string]
          console.log(`📋 Emails de config: ${superadminEmails.join(', ')}`)
        } else {
          // Si no hay configuración, obtener emails de todos los superadmins
          const { data: superadmins } = await supabaseAdmin
            .from('users')
            .select('email')
            .eq('role', 'superadmin')
            .eq('status', 'active')

          if (superadmins && superadmins.length > 0) {
            superadminEmails = superadmins.map(u => u.email)
            console.log(`👥 Emails de superadmins activos: ${superadminEmails.join(', ')}`)
          }
        }

        // Enviar email a cada superadmin
        if (superadminEmails.length > 0) {
          const appUrl = await getAppUrl()
          const dashboardUrl = `${appUrl}/users/pending-registrations`

          console.log(`📤 Enviando notificación a ${superadminEmails.length} superadmin(s)...`)

          for (const adminEmail of superadminEmails) {
            await sendSuperadminNotificationEmail(
              adminEmail,
              userName,
              userLastName,
              userEmail,
              dashboardUrl
            )
          }

          console.log(`✅ Notificaciones enviadas exitosamente`)
        } else {
          console.log('⚠️  No se encontraron emails de superadmin configurados')
        }
      } catch (emailError) {
        console.error('❌ Error al enviar emails:', emailError)
        // No lanzar error - no queremos que falle el registro por esto
      }
    } else {
      console.log('ℹ️  Notificaciones por email deshabilitadas')
    }

    console.log('═════════════════════════════════════════════════════════════════')
    console.log('\n')
  } catch (error) {
    console.error('[notifySuperadminNewRegistration] ❌ Error crítico:', error)
    // No lanzar error - no queremos que falle el registro por esto
  }
}

/**
 * Envía email de notificación al superadmin
 */
async function sendSuperadminNotificationEmail(
  superadminEmail: string,
  userName: string,
  userLastName: string,
  userEmail: string,
  dashboardUrl: string
): Promise<void> {
  const subject = '🔔 Nueva solicitud de registro - Redpresu'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #84cc16;">Nueva solicitud de registro</h1>

      <p>Hola,</p>

      <p>Se ha recibido una nueva solicitud de registro que requiere tu aprobación:</p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Nombre:</strong> ${userName} ${userLastName}</p>
        <p style="margin: 10px 0 0 0;"><strong>Email:</strong> ${userEmail}</p>
        <p style="margin: 10px 0 0 0;"><strong>Estado:</strong> Pendiente de aprobación</p>
      </div>

      <p>Por favor, revisa la solicitud y apruébala o recházala desde el panel de administración:</p>

      <a href="${dashboardUrl}"
         style="display: inline-block;
                background-color: #84cc16;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;">
        Ver Solicitudes Pendientes
      </a>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 12px;">
        Sistema de notificaciones de Redpresu<br>
        <a href="${await getAppUrl()}" style="color: #84cc16;">redpresu.com</a>
      </p>
    </div>
  `

  const text = `
Nueva solicitud de registro - Redpresu

Se ha recibido una nueva solicitud de registro que requiere tu aprobación:

Nombre: ${userName} ${userLastName}
Email: ${userEmail}
Estado: Pendiente de aprobación

Por favor, revisa la solicitud y apruébala o recházala desde el panel de administración:
${dashboardUrl}

Sistema de notificaciones de Redpresu
${await getAppUrl()}
  `

  await sendEmail(superadminEmail, subject, html, text)
}
