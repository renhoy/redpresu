"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CircleUser,
  Users,
  CreditCard,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
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
  userName: string;
  userRole: string;
  companyName?: string;
  issuerType?: string;
  currentPlan?: string;
  showSubscriptions?: boolean;
  showSettings?: boolean;
}

export function UserMenu({
  userName,
  userRole,
  companyName,
  issuerType,
  currentPlan = "free",
  showSubscriptions = false,
  showSettings = false,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);

  const getRoleLabel = (role: string) => {
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

      <DropdownMenuContent align="end" className="w-64">
        {/* Header del menú */}
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {getRoleLabel(userRole)}
            </p>
            <p className="text-sm font-medium leading-none mt-2">
              {companyName || userName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {issuerType || ""}
            </p>
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
        {/* Empresas - Superadmin ve lista, Admin ve edición de su empresa */}
        {(userRole === "superadmin" || userRole === "admin") && (
          <Link href={userRole === "superadmin" ? "/companies" : "/companies/edit"}>
            <DropdownMenuItem className="cursor-pointer">
              <Building2 className="mr-2 h-4 w-4" />
              <span>{userRole === "superadmin" ? "Empresas" : "Empresa"}</span>
            </DropdownMenuItem>
          </Link>
        )}

        <Link href="/users">
          <DropdownMenuItem className="cursor-pointer">
            <Users className="mr-2 h-4 w-4" />
            <span>Usuarios</span>
          </DropdownMenuItem>
        </Link>

        {showSubscriptions && (
          <Link href="/subscriptions">
            <DropdownMenuItem className="cursor-pointer">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Suscripción</span>
            </DropdownMenuItem>
          </Link>
        )}

        {showSettings && (
          <Link href="/settings">
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
          </Link>
        )}

        <DropdownMenuSeparator />

        {/* Salir */}
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            // El LogoutButton maneja el click
          }}
        >
          <LogoutButton
            variant="ghost"
            size="sm"
            showText={true}
            className="px-0 -ml-[10px] h-auto font-normal hover:bg-transparent"
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
