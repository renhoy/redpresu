"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createTestSubscription } from "@/app/actions/testing/subscriptions-testing";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface SubscriptionCreatorProps {
  companies: Array<{ id: number; name: string; nif: string }>;
}

export function SubscriptionCreator({ companies }: SubscriptionCreatorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [companyId, setCompanyId] = useState<string>("");
  const [plan, setPlan] = useState<"free" | "pro" | "enterprise">("pro");
  const [status, setStatus] = useState<"active" | "canceled" | "past_due" | "trialing">("active");
  const [durationDays, setDurationDays] = useState("30");
  const [startDaysAgo, setStartDaysAgo] = useState("0");

  async function handleCreate() {
    if (!companyId) {
      toast.error("Selecciona una empresa");
      return;
    }

    setLoading(true);

    try {
      const result = await createTestSubscription({
        companyId: parseInt(companyId),
        plan,
        status,
        durationDays: parseInt(durationDays),
        startDaysAgo: parseInt(startDaysAgo),
      });

      if (result.success) {
        toast.success("Suscripción de prueba creada");
        // Reset form
        setCompanyId("");
        setPlan("pro");
        setStatus("active");
        setDurationDays("30");
        setStartDaysAgo("0");
        router.refresh();
      } else {
        toast.error(result.error || "Error al crear suscripción");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Crear Suscripción de Prueba
        </CardTitle>
        <CardDescription>
          Crea suscripciones sin Stripe para testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector de Empresa */}
        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <Select value={companyId} onValueChange={setCompanyId} disabled={loading}>
            <SelectTrigger id="company">
              <SelectValue placeholder="Selecciona empresa..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={String(company.id)}>
                  {company.name} ({company.nif})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Plan */}
        <div className="space-y-2">
          <Label htmlFor="plan">Plan</Label>
          <Select value={plan} onValueChange={(v) => setPlan(v as typeof plan)} disabled={loading}>
            <SelectTrigger id="plan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)} disabled={loading}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
              <SelectItem value="trialing">Trialing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid de 2 columnas para duración */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Duración (días)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start-ago">Inicio (días atrás)</Label>
            <Input
              id="start-ago"
              type="number"
              min="0"
              value={startDaysAgo}
              onChange={(e) => setStartDaysAgo(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Botón crear */}
        <Button
          onClick={handleCreate}
          disabled={loading || !companyId}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          {loading ? "Creando..." : "Crear Suscripción"}
        </Button>

        {/* Ayuda */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
          <p className="font-semibold mb-1">💡 Ejemplos:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Duración 30, Inicio 0 = Expira en 30 días</li>
            <li>Duración 30, Inicio 35 = Expirada hace 5 días</li>
            <li>Duración 7, Inicio 5 = Expira en 2 días</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
