import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'

export default function BudgetsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
            <p className="text-muted-foreground">
              Gestiona y crea presupuestos para tus clientes
            </p>
          </div>
          <Link href="/budgets/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Crear Presupuesto
            </Button>
          </Link>
        </div>

        {/* Placeholder content */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Presupuestos</CardTitle>
            <CardDescription>
              Aquí aparecerán todos los presupuestos creados
            </CardDescription>
          </CardHeader>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Plus className="h-8 w-8" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">
                Próximamente: listado de presupuestos
              </h3>
              <p className="text-sm mb-4">
                El listado completo de presupuestos estará disponible en la próxima actualización
              </p>
              <Link href="/budgets/create">
                <Button>
                  Crear tu primer presupuesto
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}