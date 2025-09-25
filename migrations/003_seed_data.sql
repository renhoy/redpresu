-- =====================================================
-- MIGRACIÓN 003: Datos semilla (seed data) - DATOS REALES
-- =====================================================
-- Inserción de datos iniciales para desarrollo y testing
-- Fecha: 2024-09-25
-- Descripción: Usuarios iniciales y tarifa real de construcción

-- =====================================================
-- USUARIOS INICIALES
-- =====================================================

-- Definir UUIDs fijos para usuarios iniciales
-- Esto permite mantener consistencia entre auth.users y public.users
DO $$
DECLARE
    admin_uuid UUID := '00000000-0000-0000-0000-000000000001';
    vendedor_uuid UUID := '00000000-0000-0000-0000-000000000002';
BEGIN

-- =====================================================
-- USUARIO ADMIN INICIAL
-- =====================================================

-- Insertar en auth.users (tabla de autenticación de Supabase)
-- Email: admin@jeyca.net | Password: Admin123!
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    admin_uuid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@jeyca.net',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Administrador"}',
    false,
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Insertar en public.users (extensión con campos personalizados)
INSERT INTO public.users (
    id,
    role,
    empresa_id,
    name,
    email
) VALUES (
    admin_uuid,
    'admin',
    1,
    'Administrador',
    'admin@jeyca.net'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- USUARIO VENDEDOR INICIAL
-- =====================================================

-- Insertar en auth.users (tabla de autenticación de Supabase)
-- Email: vendedor@jeyca.net | Password: Vendedor123!
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    vendedor_uuid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'vendedor@jeyca.net',
    crypt('Vendedor123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Vendedor Test"}',
    false,
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Insertar en public.users (extensión con campos personalizados)
INSERT INTO public.users (
    id,
    role,
    empresa_id,
    name,
    email
) VALUES (
    vendedor_uuid,
    'vendedor',
    1,
    'Vendedor Test',
    'vendedor@jeyca.net'
) ON CONFLICT (id) DO NOTHING;

END $$;

-- =====================================================
-- TARIFA REAL DE CONSTRUCCIÓN
-- =====================================================

-- Insertar tarifa real con datos de empresa y estructura JSON completa
INSERT INTO public.tariffs (
    empresa_id,
    title,
    description,
    logo_url,
    name,
    nif,
    address,
    contact,
    summary_note,
    conditions_note,
    legal_note,
    template,
    primary_color,
    secondary_color,
    status,
    validity,
    json_tariff_data
) VALUES (
    1,
    'Tarifa Construcción 2025',
    'Tarifa completa para instalaciones eléctricas, fontanería y pintura',
    'https://jeyca.net/wp-content/uploads/2025/04/logo-tpvguay.svg',
    'Jeyca Tecnología y Medio Ambiente, S.L.',
    'B91707703',
    'C/ Pimienta, 6 - 41200, Alcalá del Río (Sevilla)',
    '955 650 626 - soporte@jeyca.net',
    'ACEPTACIÓN Y FORMAS DE PAGO: El presente presupuesto tiene una validez de 30 días desde su emisión. Los precios incluyen materiales y mano de obra especializada. Forma de pago: 50% al inicio de los trabajos y 50% a la finalización. Los gastos de desplazamiento están incluidos en un radio de 50km.',
    'CONDICIONES GENERALES DEL PRESUPUESTO: Los trabajos se realizarán conforme a la normativa vigente y buenas prácticas del sector. Los materiales empleados serán de primera calidad y homologados. El plazo de garantía es de 2 años en instalaciones y 1 año en pintura. Cualquier modificación sobre este presupuesto deberá ser autorizada por escrito.',
    'Notas legales estándar: Empresa inscrita en el Registro Mercantil de Sevilla. Datos protegidos conforme al RGPD. Todos los derechos reservados.',
    '41200-00001',
    '#e8951c',
    '#109c61',
    'Activa',
    30,
    '[
        {
            "level": "chapter",
            "id": "1",
            "name": "Instalaciones Eléctricas",
            "amount": "0.00"
        },
        {
            "level": "subchapter",
            "id": "1.1",
            "name": "Cableado Estructurado",
            "amount": "0.00"
        },
        {
            "level": "section",
            "id": "1.1.1",
            "name": "Cableado de Baja Tensión",
            "amount": "0.00"
        },
        {
            "level": "item",
            "id": "1.1.1.1",
            "name": "Instalación de Cable UTP Cat6",
            "amount": "0.00",
            "description": "Instalación de cable UTP categoría 6 para redes de datos incluye conectores y canalización.",
            "unit": "m",
            "quantity": "0.00",
            "iva_percentage": "5.00",
            "pvp": "15.00"
        },
        {
            "level": "chapter",
            "id": "2",
            "name": "Fontanería",
            "amount": "0.00"
        },
        {
            "level": "subchapter",
            "id": "2.1",
            "name": "Tuberías de Agua",
            "amount": "0.00"
        },
        {
            "level": "item",
            "id": "2.1.1",
            "name": "Instalación de Tubería PEX",
            "amount": "0.00",
            "description": "Instalación de tuberías PEX para suministro de agua potable incluye accesorios y mano de obra.",
            "unit": "m",
            "quantity": "0.00",
            "iva_percentage": "10.00",
            "pvp": "10.00"
        },
        {
            "level": "chapter",
            "id": "3",
            "name": "Pintura",
            "amount": "0.00"
        },
        {
            "level": "item",
            "id": "3.1",
            "name": "Pintura de Paredes Interiores",
            "amount": "0.00",
            "description": "Aplicación de pintura plástica en paredes interiores incluye preparación de superficie.",
            "unit": "m²",
            "quantity": "0.00",
            "iva_percentage": "21.00",
            "pvp": "6.00"
        }
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTARIOS SOBRE LOS DATOS REALES
-- =====================================================

-- USUARIOS CREADOS:
--
-- 1. ADMINISTRADOR:
--    - Email: admin@jeyca.net
--    - Password: Admin123!
--    - Rol: admin
--    - Permisos: Gestión completa de tarifas y presupuestos de empresa_id=1
--
-- 2. VENDEDOR:
--    - Email: vendedor@jeyca.net
--    - Password: Vendedor123!
--    - Rol: vendedor
--    - Permisos: Solo puede ver tarifas activas y gestionar sus propios presupuestos
--
-- TARIFA REAL CREADA:
--
-- - Tarifa Construcción 2025 con datos reales de Jeyca Tecnología
-- - Empresa: Jeyca Tecnología y Medio Ambiente, S.L.
-- - NIF: B91707703
-- - Dirección: C/ Pimienta, 6 - 41200, Alcalá del Río (Sevilla)
-- - Contacto: 955 650 626 - soporte@jeyca.net
-- - Template: 41200-00001
-- - Colores corporativos: #e8951c (naranja) y #109c61 (verde)
--
-- ESTRUCTURA JSON TARIFA:
--
-- La tarifa incluye estructura completa de 4 niveles:
-- - Chapter: Instalaciones Eléctricas, Fontanería, Pintura
-- - Subchapter: Cableado Estructurado, Tuberías de Agua
-- - Section: Cableado de Baja Tensión
-- - Item: Items específicos con description, unit, iva_percentage, pvp
--
-- Características técnicas importantes:
-- - Todos los items incluyen campo "description" como en datos reales
-- - Diferentes porcentajes de IVA: 5%, 10%, 21%
-- - Unidades variadas: m (metros), m² (metros cuadrados)
-- - Precios realistas para el sector construcción
--
-- NOTAS TÉCNICAS:
--
-- - Los UUIDs son fijos para mantener consistencia en desarrollo
-- - Las passwords están encriptadas usando bcrypt (gen_salt('bf'))
-- - La estructura JSON replica exactamente 01-tarifa-real.json
-- - Los datos de empresa provienen de 50-payload.json
-- - La tarifa está marcada como 'Activa' y válida por 30 días
-- - Todos los registros usan ON CONFLICT DO NOTHING para evitar duplicados

-- =====================================================
-- VERIFICACIÓN DE DATOS INSERTADOS
-- =====================================================

-- Para verificar que los usuarios se han creado correctamente:
-- SELECT id, email, role, name FROM public.users;
-- SELECT id, email FROM auth.users WHERE email IN ('admin@jeyca.net', 'vendedor@jeyca.net');

-- Para verificar la tarifa:
-- SELECT id, title, status, name, nif, primary_color, secondary_color FROM public.tariffs;
-- SELECT json_tariff_data FROM public.tariffs WHERE title = 'Tarifa Construcción 2025';

-- Para probar el login:
-- Los usuarios pueden hacer login con:
-- admin@jeyca.net / Admin123!
-- vendedor@jeyca.net / Vendedor123!