"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkAndStartPendingTour } from "@/lib/helpers/tour-helpers";
import { CompleteProfileModal } from "@/components/auth/CompleteProfileModal";
import { AwaitingApprovalDialog } from "@/components/auth/AwaitingApprovalDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Euro,
  FileText,
  Home,
  Layers,
  PlusCircle,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { getDashboardStats } from "@/app/actions/dashboard";
import { Budget } from "@/lib/types/database";
import { formatCurrency } from "@/lib/helpers/format";
import type { HelpArticleMeta } from "@/lib/helpers/markdown-types";
import { TourButton } from "@/components/help/TourButton";

interface DashboardClientProps {
  initialStats: {
    countsByStatus: Record<string, number>;
    totalsByStatus: Record<string, string>;
    monthCount: number;
    conversionRate: number;
    recentBudgets: Budget[];
    expiringBudgets: Budget[];
    totalValue: string;
  };
  userRole: string;
  hasBudgets?: boolean;
  helpArticles?: HelpArticleMeta[];
  hasIncompleteProfile: boolean;
  userName: string;
  userEmail: string;
  legalNotice: string;
}

const statusColors = {
  borrador: "bg-black text-neutral-200",
  pendiente: "bg-orange-100 text-yellow-800",
  enviado: "bg-slate-100 text-lime-600",
  aprobado: "bg-lime-50 text-green-600",
  rechazado: "bg-pink-100 text-rose-600",
  caducado: "bg-neutral-200 text-black",
};

const statusIcons = {
  borrador: AlertCircle,
  pendiente: Clock,
  enviado: FileText,
  aprobado: CheckCircle,
  rechazado: XCircle,
  caducado: AlertCircle,
};

type Periodo = "hoy" | "semana" | "mes" | "año";

export function DashboardClient({
  initialStats,
  userRole,
  hasBudgets = true,
  helpArticles = [],
  hasIncompleteProfile,
  userName,
  userEmail,
  legalNotice,
}: DashboardClientProps) {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [loading, setLoading] = useState(false);

  // Estados para modales
  const [showCompleteProfile, setShowCompleteProfile] = useState(hasIncompleteProfile);
  const [showAwaitingApproval, setShowAwaitingApproval] = useState(false);

  // Detectar y ejecutar tour pendiente
  useEffect(() => {
    checkAndStartPendingTour();
  }, []);

  const handlePeriodoChange = async (newPeriodo: Periodo) => {
    setPeriodo(newPeriodo);
    setLoading(true);

    const newStats = await getDashboardStats(newPeriodo);
    if (newStats) {
      setStats(newStats);
    }

    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleProfileComplete = (requiresApproval: boolean) => {
    console.log('[DashboardClient] Perfil completado - requiresApproval:', requiresApproval);

    // Cerrar modal de completar perfil
    setShowCompleteProfile(false);

    if (requiresApproval) {
      // Mostrar diálogo de espera de aprobación
      console.log('[DashboardClient] Mostrando diálogo de aprobación pendiente');
      setShowAwaitingApproval(true);
    } else {
      // Recargar la página para refrescar el dashboard con los datos actualizados
      console.log('[DashboardClient] Recargando página - usuario activo');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Header con filtro de período */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left w-full md:w-auto">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <h1
                className="text-3xl font-bold flex items-center gap-2"
                data-tour="titulo-dashboard"
              >
                <Home className="h-6 w-6" /> Panel de control
              </h1>
              <TourButton tourId="dashboard-page" />
            </div>
            <p className="text-sm">Información, resumen y estadísticas</p>
          </div>

          <div
            className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end"
            data-tour="selector-periodo"
          >
            <Calendar className="w-4 h-4 text-gray-500" />
            <Select
              value={periodo}
              onValueChange={(value) => handlePeriodoChange(value as Periodo)}
            >
              <SelectTrigger className="w-[150px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="hoy">Hoy</SelectItem>
                <SelectItem value="semana">Esta semana</SelectItem>
                <SelectItem value="mes">Este mes</SelectItem>
                <SelectItem value="año">Este año</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Estadísticas principales - Grid 2x2 */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          data-tour="estadisticas-principales"
        >
          {/* Total presupuestos */}
          <Card>
            <CardContent>
              {loading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <div className="text-xl font-bold text-lime-600">
                  {Object.values(stats.countsByStatus).reduce(
                    (sum, count) => sum + count,
                    0
                  )}
                </div>
              )}
            </CardContent>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-lime-600">
                Total Presupuestos
              </CardTitle>
              <FileText className="h-6 w-6 text-lime-600" />
            </CardHeader>
          </Card>

          {/* Valor total */}
          <Card>
            <CardContent>
              {loading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <div className="text-xl font-bold text-lime-600">
                  {formatCurrency(stats.totalValue)}
                </div>
              )}
            </CardContent>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-lime-600">
                Valor Total
              </CardTitle>
              <Euro className="h-6 w-6 text-lime-600" />
            </CardHeader>
          </Card>

          {/* Presupuestos del mes */}
          <Card>
            <CardContent>
              {loading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <div className="text-xl font-bold">{stats.monthCount}</div>
              )}
            </CardContent>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Mes Actual</CardTitle>
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
          </Card>

          {/* Tasa de conversión */}
          <Card>
            <CardContent>
              {loading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <div className="text-xl font-bold">{stats.conversionRate}%</div>
              )}
            </CardContent>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Tasa de Conversión
              </CardTitle>
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
          </Card>
        </div>

        {/* Accesos rápidos */}
        <Card data-tour="accesos-rapidos" className="bg-lime-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Accesos Rápidos
            </CardTitle>

            <CardDescription>Acciones frecuentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Link href="/tariffs/create">
                <Button
                  className="w-full h-16 flex items-center gap-2 justify-center border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                  variant="outline"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Crear Tarifa</span>
                </Button>
              </Link>

              <Link href="/tariffs">
                <Button
                  className="w-full h-16 flex items-center gap-2 justify-center border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                  variant="outline"
                >
                  <Layers className="w-5 h-5" />
                  <span>Ver Tarifas</span>
                </Button>
              </Link>

              {hasBudgets ? (
                <Link href="/budgets">
                  <Button
                    className="w-full h-16 flex items-center gap-2 justify-center border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                    variant="outline"
                  >
                    <FileText className="w-5 h-5" />
                    <span>Ver Presupuestos</span>
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full h-16 flex items-center gap-2 justify-center opacity-60 cursor-not-allowed"
                  variant="outline"
                  disabled
                  title="No tienes presupuestos creados"
                >
                  <FileText className="w-5 h-5" />
                  <span>Ver Presupuestos</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Primeros Pasos - Solo si hay artículos */}
        {helpArticles.length > 0 && (
          <Card data-tour="primeros-pasos" className="bg-lime-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Primeros Pasos
              </CardTitle>
              <CardDescription>
                Guías para comenzar a usar la aplicación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {helpArticles.map((article) => (
                  <Link key={article.id} href={`/help/${article.id}`}>
                    <Button
                      className="w-full h-16 flex items-center gap-2 justify-center bg-lime-500 hover:bg-lime-600 text-white hover:text-white"
                      variant="outline"
                    >
                      <BookOpen className="w-5 h-5" />
                      <span className="text-sm">{article.title}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Listados */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Últimos presupuestos */}
          <Card data-tour="ultimos-presupuestos" className="bg-lime-100">
            <CardHeader>
              <CardTitle>Últimos 5 Presupuestos</CardTitle>
              <CardDescription>
                Presupuestos creados recientemente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : stats.recentBudgets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay presupuestos recientes
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.recentBudgets.map((budget) => (
                    <Link
                      key={budget.id}
                      href={`/budgets/create?tariff_id=${budget.tariff_id}&budget_id=${budget.id}`}
                      className="block p-3 rounded-lg border bg-lime-50 hover:bg-lime-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{budget.client_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(budget.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className={
                              statusColors[
                                budget.status as keyof typeof statusColors
                              ]
                            }
                          >
                            {budget.status}
                          </Badge>
                          <span className="text-sm font-medium">
                            {formatCurrency(budget.total || 0)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Próximos a caducar */}
          <Card data-tour="proximos-caducar" className="bg-lime-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Próximos a Caducar
              </CardTitle>
              <CardDescription>Menos de 7 días restantes</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : stats.expiringBudgets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay presupuestos próximos a caducar
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.expiringBudgets.map((budget) => {
                    const daysRemaining = Math.ceil(
                      (new Date(budget.end_date!).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    );

                    return (
                      <Link
                        key={budget.id}
                        href={`/budgets/create?tariff_id=${budget.tariff_id}&budget_id=${budget.id}`}
                        className="block p-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{budget.client_name}</p>
                            <p className="text-sm text-orange-700">
                              {daysRemaining}{" "}
                              {daysRemaining === 1 ? "día" : "días"} restantes
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              className={
                                statusColors[
                                  budget.status as keyof typeof statusColors
                                ]
                              }
                            >
                              {budget.status}
                            </Badge>
                            <span className="text-sm font-medium">
                              {formatCurrency(budget.total || 0)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal para completar perfil */}
      {showCompleteProfile && (
        <CompleteProfileModal
          userName={userName}
          userEmail={userEmail}
          legalNotice={legalNotice}
          onComplete={handleProfileComplete}
        />
      )}

      {/* Diálogo de espera de aprobación */}
      {showAwaitingApproval && (
        <AwaitingApprovalDialog showDialog={showAwaitingApproval} />
      )}
    </div>
  );
}
