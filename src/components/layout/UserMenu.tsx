"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleUser,
  Users,
  CreditCard,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  UserCircle,
  Home,
  HelpCircle,
  Mail,
  FlaskConical,
  MailCheck,
} from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UserMenuProps {
  userId?: string;
  userName: string;
  userRole: string;
  companyName?: string;
  issuerType?: string;
  currentPlan?: string;
  showSubscriptions?: boolean;
  showSettings?: boolean;
}

export function UserMenu({
  userId,
  userName,
  userRole,
  companyName,
  issuerType,
  currentPlan = "free",
  showSubscriptions = false,
  showSettings = false,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Función helper para determinar si un item está activo
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "superadmin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "comercial":
        return "Comercial";
      default:
        return "Usuario";
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "free":
        return <Badge variant="secondary">Free</Badge>;
      case "pro":
        return <Badge className="bg-lime-600">Pro</Badge>;
      case "enterprise":
        return <Badge className="bg-yellow-600">Enterprise</Badge>;
      default:
        return <Badge variant="secondary">{plan}</Badge>;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 hover:bg-gray-100"
        >
          <CircleUser className="h-8 w-8 text-gray-700" />
          <div className="hidden lg:flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900">
              {userName}
            </span>
            <span className="text-xs text-gray-500">
              {getRoleLabel(userRole)}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        {/* Header del menú */}
        <DropdownMenuLabel>
          {/* Primera sección: Nombre y Rol */}
          <div className="py-1.5 flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {getRoleLabel(userRole)}
            </p>
          </div>

          <DropdownMenuSeparator />

          {/* Segunda sección: Empresa y Tipo */}
          <div className="py-1.5 flex flex-col space-y-1">
            <p className="text-xs font-medium leading-none mt-2">
              {companyName || userName}
            </p>
            {issuerType && (
              <p className="text-[10px] text-muted-foreground leading-none">
                ({issuerType})
              </p>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Plan de Suscripción (si está habilitado) */}
        {showSubscriptions && (
          <>
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground mb-1">Plan Actual</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Suscripción</span>
                {getPlanBadge(currentPlan)}
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Opciones del menú */}

        {/* Panel y Ayuda - Solo visible en móvil/tablet */}
        <div className="lg:hidden">
          <Link href="/dashboard">
            <DropdownMenuItem className={`cursor-pointer ${isActive("/dashboard") ? "bg-lime-50 text-lime-700" : ""}`}>
              <Home className={`mr-2 h-4 w-4 ${isActive("/dashboard") ? "text-lime-700" : ""}`} />
              <span>Panel</span>
            </DropdownMenuItem>
          </Link>

          <Link href="/help">
            <DropdownMenuItem className={`cursor-pointer ${isActive("/help") ? "bg-lime-50 text-lime-700" : ""}`}>
              <HelpCircle className={`mr-2 h-4 w-4 ${isActive("/help") ? "text-lime-700" : ""}`} />
              <span>Ayuda</span>
            </DropdownMenuItem>
          </Link>

          <DropdownMenuSeparator />
        </div>

        <Link href={userId ? `/users/${userId}/edit` : "/profile"}>
          <DropdownMenuItem className={`cursor-pointer ${isActive("/profile") || (userId && isActive(`/users/${userId}/edit`)) ? "bg-lime-50 text-lime-700" : ""}`}>
            <UserCircle className={`mr-2 h-4 w-4 ${isActive("/profile") || (userId && isActive(`/users/${userId}/edit`)) ? "text-lime-700" : ""}`} />
            <span>Mi Perfil</span>
          </DropdownMenuItem>
        </Link>

        {/* Empresas - Superadmin ve lista, Admin ve edición de su empresa */}
        {(userRole === "superadmin" || userRole === "admin") && (
          <Link
            href={userRole === "superadmin" ? "/companies" : "/companies/edit"}
          >
            <DropdownMenuItem className={`cursor-pointer ${
              userRole === "superadmin"
                ? (isActive("/companies") ? "bg-lime-100 text-lime-700 font-medium" : "text-lime-600 hover:text-lime-700 hover:bg-lime-50")
                : (isActive("/companies/edit") ? "bg-lime-50 text-lime-700" : "")
            }`}>
              <Building2 className={`mr-2 h-4 w-4 ${
                userRole === "superadmin"
                  ? (isActive("/companies") ? "text-lime-700" : "text-lime-600")
                  : (isActive("/companies/edit") ? "text-lime-700" : "")
              }`} />
              <span>{userRole === "superadmin" ? "Empresas" : "Empresa"}</span>
            </DropdownMenuItem>
          </Link>
        )}

        {/* Mensajes de Contacto - Solo superadmin */}
        {userRole === "superadmin" && (
          <Link href="/contact-messages">
            <DropdownMenuItem className={`cursor-pointer ${
              isActive("/contact-messages")
                ? "bg-lime-100 text-lime-700 font-medium"
                : "text-lime-600 hover:text-lime-700 hover:bg-lime-50"
            }`}>
              <Mail className={`mr-2 h-4 w-4 ${isActive("/contact-messages") ? "text-lime-700" : "text-lime-600"}`} />
              <span>Mensajes</span>
            </DropdownMenuItem>
          </Link>
        )}

        {/* Testing Tools - Solo superadmin */}
        {userRole === "superadmin" && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1">
              <p className="text-xs text-lime-600 font-semibold">Testing</p>
            </div>
            <Link href="/settings/subscriptions-testing">
              <DropdownMenuItem className={`cursor-pointer ${
                isActive("/settings/subscriptions-testing")
                  ? "bg-lime-100 text-lime-700 font-medium"
                  : "text-lime-600 hover:text-lime-700 hover:bg-lime-50"
              }`}>
                <FlaskConical className={`mr-2 h-4 w-4 ${isActive("/settings/subscriptions-testing") ? "text-lime-700" : "text-lime-600"}`} />
                <span>Suscripciones</span>
              </DropdownMenuItem>
            </Link>
            <Link href="/settings/mock-emails">
              <DropdownMenuItem className={`cursor-pointer ${
                isActive("/settings/mock-emails")
                  ? "bg-lime-100 text-lime-700 font-medium"
                  : "text-lime-600 hover:text-lime-700 hover:bg-lime-50"
              }`}>
                <MailCheck className={`mr-2 h-4 w-4 ${isActive("/settings/mock-emails") ? "text-lime-700" : "text-lime-600"}`} />
                <span>Emails Mock</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
          </>
        )}

        <Link href="/users">
          <DropdownMenuItem className={`cursor-pointer ${isActive("/users") ? "bg-lime-50 text-lime-700" : ""}`}>
            <Users className={`mr-2 h-4 w-4 ${isActive("/users") ? "text-lime-700" : ""}`} />
            <span>Usuarios</span>
          </DropdownMenuItem>
        </Link>

        {showSubscriptions && (
          <Link href="/subscriptions">
            <DropdownMenuItem className={`cursor-pointer ${isActive("/subscriptions") ? "bg-lime-50 text-lime-700" : ""}`}>
              <CreditCard className={`mr-2 h-4 w-4 ${isActive("/subscriptions") ? "text-lime-700" : ""}`} />
              <span>Suscripción</span>
            </DropdownMenuItem>
          </Link>
        )}

        {showSettings && (
          <Link href="/settings">
            <DropdownMenuItem className={`cursor-pointer ${
              isActive("/settings")
                ? "bg-lime-100 text-lime-700 font-medium"
                : "text-lime-600 hover:text-lime-700 hover:bg-lime-50"
            }`}>
              <Settings className={`mr-2 h-4 w-4 ${isActive("/settings") ? "text-lime-700" : "text-lime-600"}`} />
              <span>Configuración</span>
            </DropdownMenuItem>
          </Link>
        )}

        <DropdownMenuSeparator />

        {/* Cerrar Sesión */}
        <DropdownMenuItem
          className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
          onSelect={(e) => {
            e.preventDefault();
            // El LogoutButton maneja el click
          }}
        >
          <LogoutButton
            variant="ghost"
            size="sm"
            showText={true}
            className="px-0 -ml-[10px] h-auto font-normal hover:bg-transparent text-red-600 hover:text-red-700"
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
