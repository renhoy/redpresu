/**
 * HTML Sanitization Helpers
 * VULN-009: Prevención de XSS en contenido HTML generado por rich text editors
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Configuración de sanitización para contenido de Tiptap
 * Permite solo los tags y atributos que Tiptap puede generar de forma segura
 */
const TIPTAP_SAFE_CONFIG: DOMPurify.Config = {
  // Tags permitidos por Tiptap StarterKit + Link extension
  ALLOWED_TAGS: [
    // Texto básico
    'p', 'br',
    // Formato de texto
    'strong', 'em', 'b', 'i', 'u', 'mark', 'code',
    // Listas (permitidas en StarterKit)
    'ul', 'ol', 'li',
    // Enlaces (Link extension)
    'a',
    // Otros permitidos por StarterKit
    'blockquote', 'hr'
  ],

  // Atributos permitidos
  ALLOWED_ATTR: [
    'href',    // Para enlaces
    'target',  // Para abrir enlaces en nueva pestaña
    'rel',     // Para noopener noreferrer
    'class',   // Para estilos
  ],

  // NO permitir atributos data-*
  ALLOW_DATA_ATTR: false,

  // Tags explícitamente prohibidos (defensa en profundidad)
  FORBID_TAGS: [
    'script', 'style', 'iframe', 'object', 'embed', 'applet',
    'form', 'input', 'button', 'textarea', 'select',
    'img', 'video', 'audio', 'svg', 'canvas',
    'base', 'link', 'meta'
  ],

  // Atributos explícitamente prohibidos (event handlers)
  FORBID_ATTR: [
    'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
    'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown',
    'onkeyup', 'onkeypress', 'ondblclick', 'oncontextmenu',
    'style' // Prohibir estilos inline por seguridad
  ],

  // Configuraciones adicionales de seguridad
  KEEP_CONTENT: true,           // Mantener contenido de tags no permitidos
  IN_PLACE: false,               // No modificar el input original
  RETURN_DOM: false,             // Retornar string, no DOM
  RETURN_DOM_FRAGMENT: false,    // Retornar string, no fragment
  RETURN_TRUSTED_TYPE: false,    // Retornar string normal
  SANITIZE_DOM: true,            // Sanitizar DOM después de parsing
  FORCE_BODY: false,             // No forzar <body> wrapper
  WHOLE_DOCUMENT: false,         // Solo sanitizar fragment, no documento completo
}

/**
 * Sanitiza HTML generado por Tiptap
 * Uso: En componentes que renderizan contenido de rich text editor
 *
 * @param html - HTML generado por Tiptap
 * @returns HTML sanitizado seguro para renderizar
 *
 * @example
 * const cleanHtml = sanitizeTiptapHTML(editor.getHTML())
 * <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
 */
export function sanitizeTiptapHTML(html: string): string {
  if (!html || html.trim() === '') {
    return ''
  }

  return DOMPurify.sanitize(html, TIPTAP_SAFE_CONFIG)
}

/**
 * Sanitiza HTML con configuración más permisiva (para backward compatibility)
 * Usado para contenido ya guardado en BD que puede tener más variedad de tags
 *
 * @param html - HTML a sanitizar
 * @returns HTML sanitizado
 *
 * @example
 * const cleanHtml = sanitizeRichTextHTML(tariff.legal_note)
 * <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
 */
export function sanitizeRichTextHTML(html: string): string {
  if (!html || html.trim() === '') {
    return ''
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Text
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'mark', 'code', 'pre',
      'small', 'del', 'ins', 'sub', 'sup',
      // Lists
      'ul', 'ol', 'li',
      // Links
      'a',
      // Quotes
      'blockquote',
      // Other
      'hr', 'div', 'span'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [
      'script', 'style', 'iframe', 'object', 'embed', 'applet',
      'form', 'input', 'button', 'textarea', 'select',
      'img', 'video', 'audio', 'svg', 'canvas',
      'base', 'link', 'meta'
    ],
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
      'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown',
      'onkeyup', 'onkeypress', 'ondblclick', 'oncontextmenu',
      'style'
    ],
  })
}

/**
 * Valida que Tiptap esté configurado de forma segura
 * Uso: En tests o desarrollo para verificar configuración
 *
 * @param extensions - Array de extensiones de Tiptap
 * @returns { safe: boolean, warnings: string[] }
 */
export function validateTiptapSecurity(extensions: any[]): {
  safe: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  extensions.forEach((ext) => {
    const name = ext.name || ext.constructor?.name || 'Unknown'

    // Extensiones peligrosas
    const dangerousExtensions = [
      'CodeBlock', // Puede ejecutar código
      'Iframe',    // Puede cargar contenido externo
      'YouTube',   // Puede cargar contenido externo
      'Image',     // Puede cargar imágenes maliciosas (opcional)
    ]

    if (dangerousExtensions.includes(name)) {
      warnings.push(`Extensión potencialmente peligrosa detectada: ${name}`)
    }
  })

  return {
    safe: warnings.length === 0,
    warnings
  }
}

/**
 * Escapa HTML para prevenir inyección
 * Uso: Cuando necesitas mostrar HTML como texto plano
 *
 * @param unsafe - String potencialmente inseguro
 * @returns String escapado seguro
 */
export function escapeHTML(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
