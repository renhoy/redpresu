"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Plus } from "lucide-react";
import Link from "next/link";

interface Tariff {
  id: string;
  title: string;
  description: string | null;
}

interface TariffSelectorProps {
  tariffs: Tariff[];
}

export function TariffSelector({ tariffs }: TariffSelectorProps) {
  const router = useRouter();
  const [selectedTariffId, setSelectedTariffId] = useState(
    tariffs.length > 0 ? tariffs[0].id : ""
  );

  const handleContinue = () => {
    if (selectedTariffId) {
      router.push(`/budgets/create?tariff_id=${selectedTariffId}`);
    }
  };

  // Si no hay tarifas
  if (tariffs.length === 0) {
    return (
      <div className="min-h-screen bg-lime-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>No hay tarifas disponibles</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para crear un presupuesto, primero tiene que crear una tarifa. ¿Desea crearla?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/budgets">Cancelar</Link>
              </Button>
              <Button asChild className="flex-1 bg-lime-500 hover:bg-lime-600">
                <Link href="/tariffs/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Tarifa
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si hay tarifas, mostrar selector
  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Seleccione una tarifa</CardTitle>
            <p className="text-sm text-muted-foreground">
              Seleccione la tarifa a partir de la cual desea crear el presupuesto
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {tariffs.map((tariff) => (
                <label
                  key={tariff.id}
                  className="flex items-start space-x-3 cursor-pointer p-4 rounded-lg border hover:bg-lime-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="tariff-selection"
                    value={tariff.id}
                    checked={selectedTariffId === tariff.id}
                    onChange={(e) => setSelectedTariffId(e.target.value)}
                    className="h-4 w-4 mt-1 text-lime-600 focus:ring-lime-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{tariff.title}</div>
                    {tariff.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {tariff.description}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/budgets">Cancelar</Link>
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!selectedTariffId}
                className="flex-1 bg-lime-500 hover:bg-lime-600"
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
