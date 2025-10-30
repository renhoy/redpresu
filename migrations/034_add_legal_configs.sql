-- ============================================
-- MIGRACIÓN 034: Añadir configuraciones de información legal
-- ============================================
-- Fecha: 2025-01-30
-- Descripción: Añade forms_legal_notice y legal_page_content para textos legales
-- ============================================

BEGIN;

-- 1. Añadir forms_legal_notice (información legal para formularios)
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'forms_legal_notice',
  '"<p><strong>Información legal</strong></p><ul class=\"list-disc pl-4\"><li class=\"ml-2\"><p><strong>Responsable de los datos</strong>: REDPRESU.</p></li><li class=\"ml-2\"><p><strong>Finalidad de los datos</strong>: recabar información sobre nuestros servicios, gestionar el envío de información y prospección comercial.</p></li><li class=\"ml-2\"><p><strong>Destinatarios</strong>: Empresas proveedoras nacionales y encargados de tratamiento acogidos a privacy shield y personal de Jeyca.</p></li><li class=\"ml-2\"><p><strong>Información adicional</strong>: En la política de privacidad de <a target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-cyan-600 underline cursor-pointer hover:text-cyan-700\" href=\"http://JEYCA.NET\">JEYCA.NET</a> encontrarás información adicional sobre la recopilación y el uso de su información personal por parte de <a target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-cyan-600 underline cursor-pointer hover:text-cyan-700\" href=\"http://JEYCA.NET\">JEYCA.NET</a>, incluida información sobre acceso, conservación, rectificación, eliminación, seguridad y otros temas.</p></li></ul><p></p>"'::jsonb,
  'Información legal que aparece al final de los formularios públicos (contacto, registro). Se muestra en formato HTML.',
  'general',
  true
);

-- 2. Añadir legal_page_content (contenido página /legal)
INSERT INTO public.redpresu_config (key, value, description, category, is_system)
VALUES (
  'legal_page_content',
  '"<h1>Aviso Legal</h1><p>En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), REDPRESU informa que es titular del sitio web. De acuerdo con la exigencia del artículo 10 de la citada Ley, REDPRESU informa de los siguientes datos:</p><h2>1. Datos Identificativos</h2><ul class=\"list-disc pl-4\"><li class=\"ml-2\"><p><strong>Titular</strong>: REDPRESU</p></li><li class=\"ml-2\"><p><strong>NIF</strong>: [Completar]</p></li><li class=\"ml-2\"><p><strong>Domicilio</strong>: [Completar]</p></li><li class=\"ml-2\"><p><strong>Correo electrónico</strong>: [Completar]</p></li><li class=\"ml-2\"><p><strong>Teléfono</strong>: [Completar]</p></li></ul><h2>2. Objeto</h2><p>REDPRESU, es una plataforma SaaS que proporciona herramientas para la creación, gestión y envío de presupuestos profesionales para empresas y autónomos.</p><h2>3. Condiciones de Uso</h2><p>La utilización del sitio web atribuye la condición de usuario del mismo e implica la aceptación plena y sin reservas de todas y cada una de las disposiciones incluidas en este Aviso Legal.</p><h3>3.1 Uso permitido</h3><p>El usuario se compromete a utilizar el sitio web, sus servicios y contenidos de conformidad con la legislación vigente, el presente Aviso Legal, y demás avisos, reglamentos de uso e instrucciones puestos en su conocimiento.</p><h3>3.2 Prohibiciones</h3><p>Queda prohibido:</p><ul class=\"list-disc pl-4\"><li class=\"ml-2\"><p>Utilizar el sitio web con fines ilícitos o lesivos contra REDPRESU o terceros</p></li><li class=\"ml-2\"><p>Provocar daños en los sistemas físicos y lógicos del sitio web</p></li><li class=\"ml-2\"><p>Introducir o difundir virus informáticos o sistemas que puedan causar daños</p></li><li class=\"ml-2\"><p>Intentar acceder y, en su caso, utilizar las cuentas de correo electrónico de otros usuarios</p></li></ul><h2>4. Propiedad Intelectual e Industrial</h2><p>Todos los contenidos del sitio web, incluyendo, sin carácter limitativo, textos, fotografías, gráficos, imágenes, iconos, tecnología, software, así como su diseño gráfico y códigos fuente, constituyen una obra cuya propiedad pertenece a REDPRESU, sin que puedan entenderse cedidos al usuario ninguno de los derechos de explotación sobre los mismos.</p><h2>5. Protección de Datos</h2><p>REDPRESU cumple con el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que respecta al tratamiento de datos personales (RGPD) y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).</p><p>Para más información, consulte nuestra Política de Privacidad.</p><h2>6. Responsabilidad</h2><p>REDPRESU no se hace responsable de los daños y perjuicios de cualquier naturaleza que pudieran derivarse de:</p><ul class=\"list-disc pl-4\"><li class=\"ml-2\"><p>La falta de disponibilidad o continuidad del sitio web</p></li><li class=\"ml-2\"><p>El uso inadecuado del sitio web por parte de los usuarios</p></li><li class=\"ml-2\"><p>La presencia de virus o elementos lesivos en los contenidos</p></li></ul><h2>7. Enlaces</h2><p>El sitio web puede contener enlaces a otros sitios web de terceros. REDPRESU no controla ni es responsable del contenido de dichos sitios web.</p><h2>8. Modificaciones</h2><p>REDPRESU se reserva el derecho de efectuar sin previo aviso las modificaciones que considere oportunas en su sitio web, pudiendo cambiar, suprimir o añadir tanto los contenidos y servicios que se presten a través de la misma como la forma en la que éstos aparezcan presentados o localizados.</p><h2>9. Legislación Aplicable y Jurisdicción</h2><p>Las presentes condiciones se rigen por la legislación española. Para la resolución de cualquier conflicto que pueda surgir con ocasión de la visita al sitio web o del uso de los servicios que en él se puedan ofertar, REDPRESU y el usuario acuerdan someterse a los Juzgados y Tribunales de [Ciudad], con renuncia expresa a cualquier otro fuero que pudiera corresponderles.</p><p><br></p><p><strong>Última actualización</strong>: Enero 2025</p>"'::jsonb,
  'Contenido completo de la página de información legal (/legal). Se muestra en formato HTML.',
  'general',
  true
);

-- Verificar inserción
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.redpresu_config
    WHERE key = 'forms_legal_notice'
  ) AND EXISTS (
    SELECT 1 FROM public.redpresu_config
    WHERE key = 'legal_page_content'
  ) THEN
    RAISE NOTICE '✅ Configuraciones de información legal añadidas correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudieron añadir las configuraciones';
  END IF;
END $$;

COMMIT;

-- ============================================
-- ROLLBACK (documentado, no ejecutar)
-- ============================================
-- DELETE FROM public.redpresu_config WHERE key IN ('forms_legal_notice', 'legal_page_content');
