'use client'

import { useState } from 'react'
import { Database } from '@/lib/types/database.types'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { updateConfigValue } from '@/app/actions/config'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type ConfigRow = Database['public']['Tables']['config']['Row']

interface ConfigTableProps {
  config: ConfigRow[]
}

export function ConfigTable({ config }: ConfigTableProps) {
  const router = useRouter()
  const [editingConfig, setEditingConfig] = useState<ConfigRow | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleEdit = (item: ConfigRow) => {
    setEditingConfig(item)
    setEditValue(JSON.stringify(item.value, null, 2))
    setEditDescription(item.description || '')
  }

  const handleSave = async () => {
    if (!editingConfig) return

    setIsSaving(true)
    try {
      // Parsear el JSON
      const parsedValue = JSON.parse(editValue)

      const result = await updateConfigValue(
        editingConfig.key,
        parsedValue,
        editDescription
      )

      if (result.success) {
        toast.success('Configuración actualizada')
        setEditingConfig(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Error al actualizar')
      }
    } catch (error) {
      toast.error('Error: JSON inválido')
    } finally {
      setIsSaving(false)
    }
  }

  const formatValue = (value: unknown): string => {
    if (typeof value === 'string') return value
    return JSON.stringify(value, null, 2)
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Clave</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[400px]">Valor</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {config.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No hay configuración en esta categoría
                </TableCell>
              </TableRow>
            ) : (
              config.map((item) => (
                <TableRow key={item.key}>
                  <TableCell className="font-mono text-sm">{item.key}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.description || '-'}
                  </TableCell>
                  <TableCell>
                    <pre className="text-xs bg-muted p-2 rounded max-h-20 overflow-auto">
                      {formatValue(item.value)}
                    </pre>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(item)}
                      title="Editar configuración"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de edición */}
      <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Configuración</DialogTitle>
            <DialogDescription>
              Clave: <code className="font-mono">{editingConfig?.key}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor (JSON)</Label>
              <Textarea
                id="value"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                El valor debe ser JSON válido
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingConfig(null)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
