'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  disabled = false,
  className = ''
}: RichTextEditorProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [originalLinkText, setOriginalLinkText] = useState('') // Guardar texto original para cancelar
  const [originalLinkUrl, setOriginalLinkUrl] = useState('') // Guardar URL original para cancelar
  const [editingLinkPosition, setEditingLinkPosition] = useState<{ from: number; to: number } | null>(null)
  const [hoveredLink, setHoveredLink] = useState<{ href: string; text: string; x: number; y: number; element: HTMLAnchorElement; position: { from: number; to: number } } | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)

  // Función para generar ID único
  const generateLinkId = () => `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: false, // Desactivar headings para simplificar
        code: false,
        codeBlock: false,
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-4',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-4',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'ml-2',
          },
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-cyan-600 underline cursor-pointer hover:text-cyan-700',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  const handleAddLink = () => {
    if (!editor) return

    // Si hay texto seleccionado, usarlo como texto del enlace
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, '')

    setLinkText(selectedText)
    setLinkUrl('')
    setShowLinkDialog(true)
  }

  const handleSaveLink = () => {
    if (!editor || !linkUrl) return

    if (editingLinkPosition) {
      // Estamos editando - insertar enlace actualizado en la posición guardada
      const { from } = editingLinkPosition

      editor
        .chain()
        .focus()
        .insertContentAt(from, `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`)
        .run()

      setEditingLinkPosition(null)
      setOriginalLinkText('')
      setOriginalLinkUrl('')
    } else {
      // Estamos creando un nuevo enlace
      if (linkText) {
        // Insertar nuevo enlace con texto
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`)
          .run()
      } else {
        // Convertir selección en enlace
        editor
          .chain()
          .focus()
          .setLink({ href: linkUrl })
          .run()
      }
    }

    setShowLinkDialog(false)
    setLinkText('')
    setLinkUrl('')
  }

  const handleEditLink = (href: string, text: string, position: { from: number; to: number }) => {
    if (!editor) return

    // Guardar datos originales
    setOriginalLinkText(text)
    setOriginalLinkUrl(href)
    setLinkText(text)
    setLinkUrl(href)
    setEditingLinkPosition(position)

    // Borrar el enlace y situar el foco ahí
    editor.chain().focus().deleteRange(position).run()

    // Abrir diálogo
    setShowLinkDialog(true)
    setHoveredLink(null)
  }

  const handleMouseEnterLink = (e: MouseEvent, link: HTMLAnchorElement) => {
    const href = link.getAttribute('href') || ''
    const text = link.textContent || ''

    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
    }

    const timeout = setTimeout(() => {
      if (!editor) return

      // Buscar la posición del enlace en el documento
      const { state } = editor
      let linkPosition: { from: number; to: number } | null = null

      state.doc.descendants((node, pos) => {
        if (linkPosition) return false

        const linkMark = node.marks.find(mark =>
          mark.type.name === 'link' &&
          mark.attrs.href === href &&
          node.text === text
        )

        if (linkMark) {
          linkPosition = { from: pos, to: pos + node.nodeSize }
          return false
        }
      })

      if (!linkPosition) return

      // Obtener posición del enlace relativa al viewport
      const linkRect = link.getBoundingClientRect()

      // Obtener el contenedor del editor (el div con relative)
      const editorContainer = link.closest('.border.rounded-md') as HTMLElement
      if (!editorContainer) return

      const containerRect = editorContainer.getBoundingClientRect()

      setHoveredLink({
        href,
        text,
        element: link,
        position: linkPosition,
        x: linkRect.left - containerRect.left + linkRect.width / 2,
        y: linkRect.bottom - containerRect.top + 8
      })
    }, 500) // Esperar 500ms antes de mostrar tooltip

    setHoverTimeout(timeout)
  }

  const handleMouseLeaveLink = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
    // Dar más tiempo para que el usuario pueda mover el mouse al tooltip
    const leaveTimeout = setTimeout(() => {
      setHoveredLink(null)
    }, 300)
    setHoverTimeout(leaveTimeout)
  }

  if (!editor) {
    return null
  }

  return (
    <div className={`border-0 bg-white relative ${className}`}>
      {/* Toolbar - FIJO */}
      <div className="flex items-center gap-1 px-6 py-2 border-b bg-gray-50 flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
            title="Negrita (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
            title="Cursiva (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
            title="Lista con viñetas"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
            title="Lista numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddLink}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
            title="Añadir enlace"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor content - SCROLLEABLE */}
        <div
          className="flex-1 overflow-y-auto"
          onMouseOver={(e) => {
            const target = e.target as HTMLElement
            if (target.tagName === 'A') {
              handleMouseEnterLink(e.nativeEvent, target as HTMLAnchorElement)
            }
          }}
          onMouseOut={(e) => {
            const target = e.target as HTMLElement
            if (target.tagName === 'A') {
              handleMouseLeaveLink()
            }
          }}
        >
          <EditorContent
            editor={editor}
            className="px-6 py-4 prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:ml-0"
          />
        </div>

        {/* Link Hover Tooltip */}
        {hoveredLink && (
          <div
            className="absolute z-50 bg-gray-800 text-white px-3 py-2 rounded-md shadow-lg pointer-events-auto"
            style={{
              left: `${hoveredLink.x}px`,
              top: `${hoveredLink.y}px`,
              transform: 'translateX(-50%)',
            }}
            onMouseEnter={() => {
              // Cancelar el timeout de cierre cuando el mouse entra al tooltip
              if (hoverTimeout) {
                clearTimeout(hoverTimeout)
                setHoverTimeout(null)
              }
            }}
            onMouseLeave={() => {
              // Cerrar el tooltip después de un delay cuando el mouse sale
              const leaveTimeout = setTimeout(() => {
                setHoveredLink(null)
              }, 300)
              setHoverTimeout(leaveTimeout)
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs max-w-[200px] truncate">{hoveredLink.href}</span>
              <Button
                type="button"
                size="sm"
                onClick={() => handleEditLink(hoveredLink.href, hoveredLink.text, hoveredLink.position)}
                className="h-6 px-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
              >
                Editar
              </Button>
            </div>
          </div>
        )}

        {/* Link Dialog */}
        {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Añadir enlace</h3>

            <div>
              <label className="block text-sm font-medium mb-1">
                Texto del enlace
              </label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Ej: Visitar sitio web"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                URL del enlace *
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://ejemplo.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (linkUrl) {
                      window.open(linkUrl, '_blank', 'noopener,noreferrer')
                    }
                  }}
                  disabled={!linkUrl}
                  className="px-3"
                  title="Probar enlace"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Si estábamos editando, restaurar el enlace original
                  if (editingLinkPosition && editor) {
                    const { from } = editingLinkPosition
                    editor
                      .chain()
                      .focus()
                      .insertContentAt(from, `<a href="${originalLinkUrl}" target="_blank" rel="noopener noreferrer">${originalLinkText}</a>`)
                      .run()
                  }

                  setShowLinkDialog(false)
                  setLinkText('')
                  setLinkUrl('')
                  setEditingLinkPosition(null)
                  setOriginalLinkText('')
                  setOriginalLinkUrl('')
                }}
                className="border-gray-600 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveLink}
                disabled={!linkUrl}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Añadir
              </Button>
            </div>
          </div>
        </div>
        )}
      </div>
  )
}
