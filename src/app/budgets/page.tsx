import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/Header'
import { Plus } from 'lucide-react'

export default function BudgetsPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
          <p className="text-muted-foreground">
            Gestiona tus presupuestos creados. Para crear un nuevo presupuesto, ve a <Link href="/tariffs" className="text-primary hover:underline">Tarifas</Link> y haz clic en "Crear Presupuesto" en la tarifa deseada.
          </p>
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
                El listado completo de presupuestos estará disponible en la próxima actualización.
                Para crear un presupuesto, ve a la sección de Tarifas.
              </p>
              <Link href="/tariffs">
                <Button>
                  Ver Tarifas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  )
}