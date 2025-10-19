"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Building2,
  LogOut,
  Home,
  FileText,
  Receipt,
  Users,
  Settings,
  CircleUser,
  HelpCircle,
} from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeaderProps {
  userRole?: string;
  userName?: string;
  isAuthenticated?: boolean;
  hasBudgets?: boolean;
  appName?: string;
  companyName?: string;
  issuerType?: string;
  currentPlan?: string;
  multiempresa?: boolean;
}

export function Header({
  userRole,
  userName,
  isAuthenticated = true,
  hasBudgets = true,
  appName = "Redpresu",
  companyName,
  issuerType,
  currentPlan = "free",
  multiempresa = true,
}: HeaderProps) {
  const pathname = usePathname();

  // Si no está autenticado, mostrar header público
  if (!isAuthenticated) {
    return (
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-lime-500 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">{appName}</span>
            </Link>

            {/* Enlaces de navegación */}
            <div className="flex items-center gap-6">
              {/* Solo mostrar Pricing y Registro en modo multiempresa */}
              {multiempresa && (
                <>
                  <Link
                    href="/pricing"
                    className="text-gray-700 hover:text-lime-600 transition-colors font-medium"
                  >
                    Precios
                  </Link>
                  <Link href="/register">
                    <Button className="bg-lime-500 hover:bg-lime-600">
                      Registro
                    </Button>
                  </Link>
                </>
              )}
              <Link
                href="/login"
                className="text-gray-700 hover:text-lime-600 transition-colors font-medium"
              >
                Acceso
              </Link>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Construir navegación según rol (solo si está autenticado)
  const isSuperadmin = userRole === "superadmin";
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  // Verificar si suscripciones están habilitadas
  // Solo mostrar suscripciones si está en modo multiempresa Y está habilitado Stripe
  const subscriptionsEnabled =
    multiempresa && process.env.NEXT_PUBLIC_STRIPE_ENABLED === "true";

  const navigation = [
    { name: "Panel", href: "/dashboard", icon: Home, show: true },
    { name: "Tarifas", href: "/tariffs", icon: FileText, show: true },
    { name: "Presupuestos", href: "/budgets", icon: Receipt, show: true },
    { name: "Ayuda", href: "/help", icon: HelpCircle, show: true }, // Centro de ayuda
  ].filter((item) => item.show);

  // Formatear rol para mostrar
  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "superadmin":
        return "Super";
      case "admin":
        return "Admin";
      case "vendedor":
        return "Comercial";
      default:
        return "Usuario";
    }
  };

  // Debug log
  useEffect(() => {
    console.log("[Header] userRole:", userRole);
    console.log("[Header] userName:", userName);
    console.log(
      "[Header] navigation items:",
      navigation.map((n) => n.name)
    );
  }, [userRole, userName, navigation]);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-lime-500 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">{appName}</span>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden lg:flex items-center space-x-4">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;
              const isTarifasButton = item.href === "/tariffs";
              const isPresupuestosButton = item.href === "/budgets";
              const isDisabled = isPresupuestosButton && !hasBudgets;
              const isSpecialButton = isTarifasButton || isPresupuestosButton;

              // Si está deshabilitado, mostrar como span en vez de Link
              if (isDisabled) {
                return (
                  <span
                    key={item.name}
                    className="px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
                    title="No tienes presupuestos creados"
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </span>
                );
              }

              // Botones especiales con fondo (Tarifas y Presupuestos)

              if (isSpecialButton) {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                      isTarifasButton
                        ? "text-white bg-cyan-600 hover:bg-cyan-700"
                        : "text-white bg-lime-500 hover:bg-lime-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              }

              // Botones sin fondo (Inicio, Ayuda, Usuarios, Configuración)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                    isActive
                      ? "text-lime-700"
                      : "text-gray-700 hover:text-lime-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Navigation - Mobile/Tablet (solo iconos) */}
          <nav className="flex lg:hidden items-center gap-2">
            <TooltipProvider>
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                const Icon = item.icon;
                const isPresupuestosButton = item.href === "/budgets";
                const isDisabled = isPresupuestosButton && !hasBudgets;

                // Si está deshabilitado, mostrar como span
                if (isDisabled) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <span className="p-2 rounded-md border bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed opacity-60">
                          <Icon className="w-5 h-5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>No tienes presupuestos creados</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={`p-2 rounded-md transition-colors border ${
                          isActive
                            ? "text-lime-700 bg-lime-50 border-lime-500"
                            : "text-green-600 bg-white border-green-600 hover:bg-green-50"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.name}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </nav>

          {/* User Menu Dropdown */}
          <UserMenu
            userName={userName || "Usuario"}
            userRole={userRole || "vendedor"}
            companyName={companyName}
            issuerType={issuerType}
            currentPlan={currentPlan}
            showSubscriptions={isAdmin && subscriptionsEnabled}
            showSettings={isSuperadmin}
          />
        </div>
      </div>
    </header>
  );
}
