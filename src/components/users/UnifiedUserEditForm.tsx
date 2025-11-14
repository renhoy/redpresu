"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, User, Building2, Lock, Users, Play, Search } from "lucide-react";
import { toast } from "sonner";
import { startTour } from "@/lib/helpers/tour-helpers";
import { ActionButtons } from "@/components/shared/ActionButtons";
import type { User as UserType } from "@/app/actions/users";
import { updateUserComplete } from "@/app/actions/users";
import type { UserProfile } from "@/app/actions/auth";

interface UnifiedUserEditFormProps {
  user: UserType;
  profile: UserProfile;
  isOwnProfile: boolean; // true si el usuario está editando su propio perfil
  currentUserRole: string;
  currentUserId: string;
}

interface FormData {
  // Datos básicos usuario
  name: string;
  last_name: string;
  role: "comercial" | "admin" | "superadmin";
  status: "active" | "inactive" | "pending";
  issuer_id?: string;
  company_id?: number; // Para que superadmin pueda cambiar empresa

  // Datos emisor
  nombre_comercial: string;
  nif: string;
  direccion_fiscal: string;
  codigo_postal: string;
  localidad: string;
  provincia: string;
  pais: string;
  telefono: string;
  emailContacto: string;
  web: string;
  irpf_percentage?: number;

  // Cambio de contraseña (opcional)
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function UnifiedUserEditForm({
  user,
  profile,
  isOwnProfile,
  currentUserRole,
  currentUserId,
}: UnifiedUserEditFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    // Datos básicos
    name: user.name || "",
    last_name: user.last_name || "",
    role: user.role,
    status: user.status || "active",
    issuer_id: user.issuer_id,
    company_id: user.company_id,

    // Datos emisor
    nombre_comercial: profile.emisor?.nombre_comercial || "",
    nif: profile.emisor?.nif || "",
    direccion_fiscal: profile.emisor?.direccion_fiscal || "",
    codigo_postal: profile.emisor?.codigo_postal || "",
    localidad: profile.emisor?.ciudad || "",
    provincia: profile.emisor?.provincia || "",
    pais: profile.emisor?.pais || "España",
    telefono: profile.emisor?.telefono || "",
    emailContacto: profile.emisor?.email || "",
    web: profile.emisor?.web || "",
    irpf_percentage: profile.emisor?.irpf_percentage,

    // Contraseña
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [companies, setCompanies] = useState<Array<{
    id: number;
    name: string;
    nif: string;
    type: string;
    address: string;
    locality: string;
    province: string;
    phone: string;
    email: string;
  }>>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companySearch, setCompanySearch] = useState("");

  // Determinar permisos de edición
  const canEditBasicInfo =
    isOwnProfile || ["admin", "superadmin"].includes(currentUserRole);
  const canEditRole =
    ["admin", "superadmin"].includes(currentUserRole) && !isOwnProfile;
  const canEditStatus =
    ["admin", "superadmin"].includes(currentUserRole) && !isOwnProfile;
  const canEditEmisor = true; // Todos pueden editar emisor según el plan
  const canChangePassword = true; // Todos pueden cambiar contraseña
  const canEditCompany =
    currentUserRole?.toLowerCase().trim() === "superadmin" &&
    user.role?.toLowerCase().trim() === "superadmin"; // Solo superadmin puede cambiar empresa de superadmins

  // Cargar lista de empresas si el usuario actual es superadmin
  useEffect(() => {
    console.log("[useEffect companies] canEditCompany:", canEditCompany, {
      currentUserRole,
      userRole: user.role,
      isOwnProfile,
    });
    if (canEditCompany) {
      loadCompanies();
    }
  }, [canEditCompany]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      console.log("[loadCompanies] Iniciando carga de empresas...");
      const response = await fetch("/api/companies");
      console.log("[loadCompanies] Response status:", response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log("[loadCompanies] Empresas cargadas:", data.length, data);
        setCompanies(data);
      } else {
        // Si la respuesta no es OK, obtener el error
        const errorData = await response.json();
        console.error("[loadCompanies] Error del servidor:", response.status, errorData);
        toast.error(errorData.error || "Error al cargar empresas");
        setCompanies([]); // Establecer array vacío explícitamente
      }
    } catch (error) {
      console.error("[loadCompanies] Error de red o parsing:", error);
      toast.error("Error al cargar empresas");
      setCompanies([]); // Establecer array vacío explícitamente
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleInputChange =
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
      // Limpiar error del campo
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    };

  const handleSelectChange = (field: keyof FormData) => (value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validar datos básicos
    if (!formData.name.trim()) {
      newErrors.name = "El nombre es obligatorio";
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Los apellidos son obligatorios";
    }

    // Validar datos emisor
    if (formData.nombre_comercial && formData.nombre_comercial.trim()) {
      if (!formData.nif.trim()) {
        newErrors.nif = "El NIF/CIF es obligatorio";
      }
      if (!formData.direccion_fiscal.trim()) {
        newErrors.direccion_fiscal = "La dirección fiscal es obligatoria";
      }
    }

    // Validar contraseña
    if (
      showPasswordSection &&
      (formData.newPassword || formData.confirmPassword)
    ) {
      // Si es propio perfil, pedir contraseña actual
      if (isOwnProfile && !formData.currentPassword) {
        newErrors.currentPassword = "Debes introducir tu contraseña actual";
      }

      if (!formData.newPassword) {
        newErrors.newPassword = "Debes introducir una nueva contraseña";
      } else if (formData.newPassword.length < 8) {
        newErrors.newPassword =
          "La contraseña debe tener al menos 8 caracteres";
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "Las contraseñas no coinciden";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor, corrige los errores en el formulario");
      return;
    }

    setIsLoading(true);

    try {
      // Preparar datos básicos (solo si cambiaron o si no es propio perfil)
      const basicData: any = {};
      if (canEditBasicInfo) {
        if (formData.name !== user.name) basicData.name = formData.name;
        if (formData.last_name !== user.last_name)
          basicData.last_name = formData.last_name;
      }
      if (canEditRole && formData.role !== user.role) {
        basicData.role = formData.role;
      }
      if (canEditStatus && formData.status !== user.status) {
        basicData.status = formData.status;
      }
      if (canEditCompany && formData.company_id !== user.company_id) {
        basicData.company_id = formData.company_id;
      }

      // Preparar datos emisor
      const emisorData: any = {};
      if (canEditEmisor) {
        if (formData.nombre_comercial)
          emisorData.nombre_comercial = formData.nombre_comercial;
        if (formData.nif) emisorData.nif = formData.nif;
        if (formData.direccion_fiscal)
          emisorData.direccion_fiscal = formData.direccion_fiscal;
        if (formData.codigo_postal)
          emisorData.codigo_postal = formData.codigo_postal;
        if (formData.localidad) emisorData.localidad = formData.localidad;
        if (formData.provincia) emisorData.provincia = formData.provincia;
        if (formData.pais) emisorData.pais = formData.pais;
        if (formData.telefono) emisorData.telefono = formData.telefono;
        if (formData.emailContacto)
          emisorData.emailContacto = formData.emailContacto;
        if (formData.web) emisorData.web = formData.web;
        if (formData.irpf_percentage !== undefined)
          emisorData.irpf_percentage = formData.irpf_percentage;
      }

      // Preparar datos contraseña (solo si se completó el formulario)
      let passwordData: any = undefined;
      if (showPasswordSection && formData.newPassword) {
        passwordData = {
          newPassword: formData.newPassword,
        };
        if (isOwnProfile && formData.currentPassword) {
          passwordData.currentPassword = formData.currentPassword;
        }
      }

      const result = await updateUserComplete({
        userId: user.id,
        basicData: Object.keys(basicData).length > 0 ? basicData : undefined,
        emisorData: Object.keys(emisorData).length > 0 ? emisorData : undefined,
        passwordData,
      });

      if (!result.success) {
        toast.error(result.error || "Error al actualizar el usuario");
        return;
      }

      toast.success("Usuario actualizado correctamente");

      // Si un superadmin cambió de empresa (su propio perfil), redirigir a /users con recarga completa
      // porque el backend lo habrá convertido a admin de la nueva empresa
      const superadminChangedCompany =
        isOwnProfile &&
        basicData.company_id !== undefined &&
        user.role === 'superadmin';

      if (superadminChangedCompany) {
        // Forzar recarga completa para actualizar sesión con nuevo rol (admin)
        window.location.href = "/users";
      } else if (isOwnProfile) {
        // Si estoy editando mi propio perfil (sin cambio de empresa), recargar
        router.refresh();
      } else {
        // Si soy admin editando otro usuario, volver a listado
        router.push("/users");
      }
    } catch (error) {
      console.error("[UnifiedUserEditForm] Error:", error);
      toast.error("Error inesperado al actualizar el usuario");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form id="unified-user-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="text-center md:text-left w-full md:w-auto">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <User className="h-6 w-6" />
              {isOwnProfile ? "Mi Perfil" : "Editar Usuario"}
            </h1>
            {isOwnProfile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => startTour("profile-page")}
                className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white h-8 px-3 gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                Tour
              </Button>
            )}
          </div>
          <p className="text-sm">
            {isOwnProfile
              ? "Gestiona tu información personal y datos fiscales"
              : `Modificar datos de ${user.name} ${user.last_name}`}
          </p>
        </div>

        <div className="w-full md:w-auto">
          <ActionButtons
            primaryAction="save"
            isLoading={isLoading}
            isHeader={true}
            formId="unified-user-form"
            onCancelClick={() =>
              router.push(isOwnProfile ? "/dashboard" : "/users")
            }
          />
        </div>
      </div>

      {/* 1. Card: Información Básica */}
      <Card id="card-info-basica" className="bg-lime-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información Personal
          </CardTitle>
          <CardDescription>Datos básicos del usuario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Línea 1: Email (50%) + Rol (25%) + Estado (25%) */}
          <div className="grid grid-cols-4 gap-4">
            {/* Email (readonly) - 50% = 2/4 columnas */}
            <div className="col-span-4 md:col-span-2 space-y-2">
              <Label>Email</Label>
              <div className="py-2 px-3 bg-muted rounded-md text-sm">
                {user.email}
              </div>
              <p className="text-xs text-muted-foreground">
                El email no se puede modificar
              </p>
            </div>

            {/* Rol - 25% = 1/4 columnas */}
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label htmlFor="role">Rol</Label>
              {isOwnProfile ? (
                <div className="py-2 px-3 bg-muted rounded-md text-sm">
                  {formData.role === "comercial"
                    ? "Comercial"
                    : formData.role === "admin"
                    ? "Administrador"
                    : "Superadmin"}
                </div>
              ) : (
                <Select
                  value={formData.role}
                  onValueChange={handleSelectChange("role")}
                  disabled={isLoading || !canEditRole}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Estado - 25% = 1/4 columnas */}
            <div className="col-span-2 md:col-span-1 space-y-2">
              <Label htmlFor="status">Estado</Label>
              {isOwnProfile ? (
                <div className="py-2 px-3 bg-muted rounded-md text-sm">
                  {formData.status === "active"
                    ? "Activo"
                    : formData.status === "inactive"
                    ? "Inactivo"
                    : "Pendiente"}
                </div>
              ) : (
                <Select
                  value={formData.status}
                  onValueChange={handleSelectChange("status")}
                  disabled={isLoading || !canEditStatus}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {!isOwnProfile && (
                <p className="text-xs text-muted-foreground">
                  Los usuarios inactivos no pueden acceder al sistema
                </p>
              )}
            </div>
          </div>

          {/* Línea 2: Nombre (50%) + Apellidos (50%) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleInputChange("name")}
                className={`bg-white ${errors.name ? "border-red-500" : ""}`}
                disabled={isLoading || !canEditBasicInfo}
                required
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Apellidos *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={handleInputChange("last_name")}
                className={`bg-white ${errors.last_name ? "border-red-500" : ""}`}
                disabled={isLoading || !canEditBasicInfo}
                required
              />
              {errors.last_name && (
                <p className="text-sm text-red-600">{errors.last_name}</p>
              )}
            </div>
          </div>

          {/* Empresa Actual - Solo lectura */}
          <div className="space-y-2">
            <Label>Empresa Actual</Label>
            <div className="py-2 px-3 bg-muted rounded-md text-sm font-medium">
              {profile.company_name || "Sin empresa asignada"}
            </div>
            <p className="text-xs text-muted-foreground">
              {canEditCompany
                ? "Como superadmin, puedes cambiar a cualquier empresa para realizar tareas de soporte"
                : "Tu empresa asignada"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card: Seleccionar Empresa (Solo superadmin) */}
      {canEditCompany && (
        <Card id="card-seleccionar-empresa" className="bg-lime-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Cambiar de Empresa
            </CardTitle>
            <CardDescription>
              Selecciona la empresa a la que deseas cambiar para realizar tareas de soporte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Buscador */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, NIF, dirección..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="bg-white pl-10"
                  disabled={loadingCompanies}
                />
              </div>
            </div>

            {/* Tabla de empresas */}
            {loadingCompanies ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-lime-600" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Cargando empresas...
                </span>
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay empresas disponibles
              </div>
            ) : (
              <RadioGroup
                value={formData.company_id?.toString() || ""}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    company_id: parseInt(value, 10),
                  }));
                }}
              >
                <div className="rounded-md border bg-white max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>NIF/CIF</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Teléfono</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies
                        .filter((company) => {
                          if (!companySearch) return true;
                          const search = companySearch.toLowerCase();
                          return (
                            company.name.toLowerCase().includes(search) ||
                            company.nif.toLowerCase().includes(search) ||
                            company.address.toLowerCase().includes(search) ||
                            company.locality.toLowerCase().includes(search) ||
                            company.province.toLowerCase().includes(search) ||
                            company.phone.toLowerCase().includes(search)
                          );
                        })
                        .map((company) => (
                          <TableRow
                            key={company.id}
                            className={`cursor-pointer ${
                              formData.company_id === company.id
                                ? "bg-lime-200 hover:bg-lime-200"
                                : "bg-white hover:bg-lime-100"
                            }`}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                company_id: company.id,
                              }));
                            }}
                          >
                            <TableCell>
                              <RadioGroupItem
                                value={company.id.toString()}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {company.name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {company.nif || '-'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {company.address ? (
                                <div className="max-w-xs truncate">
                                  {company.address}
                                  {company.locality && `, ${company.locality}`}
                                  {company.province && ` (${company.province})`}
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {company.phone || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </RadioGroup>
            )}

            {/* Contador de resultados */}
            {!loadingCompanies && companies.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Mostrando{" "}
                {
                  companies.filter((company) => {
                    if (!companySearch) return true;
                    const search = companySearch.toLowerCase();
                    return (
                      company.name.toLowerCase().includes(search) ||
                      company.nif.toLowerCase().includes(search) ||
                      company.address.toLowerCase().includes(search) ||
                      company.locality.toLowerCase().includes(search) ||
                      company.province.toLowerCase().includes(search) ||
                      company.phone.toLowerCase().includes(search)
                    );
                  }).length
                }{" "}
                de {companies.length} empresas
              </div>
            )}

            {formData.company_id !== user.company_id && formData.company_id && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-sm text-yellow-800">
                  <strong>⚠️ Importante:</strong> Al guardar, tu rol cambiará automáticamente de Superadmin a Administrador de la empresa seleccionada. Esto te permitirá realizar tareas de soporte y mantenimiento con permisos de admin.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. Card: Datos del Emisor */}
      {profile.emisor && canEditEmisor && (
        <Card id="card-datos-emisor" className="bg-lime-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos de{" "}
              {profile.emisor.tipo === "autonomo" ? "Autónomo" : "Empresa"}
            </CardTitle>
            <CardDescription>
              Información fiscal que aparecerá en los presupuestos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nombre Comercial y NIF */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-4 md:col-span-3 space-y-2">
                <Label htmlFor="nombre_comercial">
                  {profile.emisor.tipo === "empresa"
                    ? "Nombre Comercial *"
                    : "Nombre y Apellidos *"}
                </Label>
                <Input
                  id="nombre_comercial"
                  value={formData.nombre_comercial}
                  onChange={handleInputChange("nombre_comercial")}
                  className={`bg-white ${errors.nombre_comercial ? "border-red-500" : ""}`}
                  disabled={isLoading}
                />
                {errors.nombre_comercial && (
                  <p className="text-sm text-red-600">
                    {errors.nombre_comercial}
                  </p>
                )}
              </div>

              <div className="col-span-4 md:col-span-1 space-y-2">
                <Label htmlFor="nif">
                  {profile.emisor.tipo === "empresa" ? "NIF/CIF *" : "NIF *"}
                </Label>
                <Input
                  id="nif"
                  value={formData.nif}
                  onChange={handleInputChange("nif")}
                  className={`bg-white ${errors.nif ? "border-red-500" : ""}`}
                  disabled={isLoading}
                />
                {errors.nif && (
                  <p className="text-sm text-red-600">{errors.nif}</p>
                )}
              </div>
            </div>

            {/* Dirección Fiscal */}
            <div className="space-y-2">
              <Label htmlFor="direccion_fiscal">Dirección Fiscal *</Label>
              <Input
                id="direccion_fiscal"
                value={formData.direccion_fiscal}
                onChange={handleInputChange("direccion_fiscal")}
                className={`bg-white ${errors.direccion_fiscal ? "border-red-500" : ""}`}
                disabled={isLoading}
              />
              {errors.direccion_fiscal && (
                <p className="text-sm text-red-600">
                  {errors.direccion_fiscal}
                </p>
              )}
            </div>

            {/* CP, Localidad, Provincia */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo_postal">Código Postal</Label>
                <Input
                  id="codigo_postal"
                  value={formData.codigo_postal}
                  onChange={handleInputChange("codigo_postal")}
                  className="bg-white"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="localidad">Localidad</Label>
                <Input
                  id="localidad"
                  value={formData.localidad}
                  onChange={handleInputChange("localidad")}
                  className="bg-white"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provincia">Provincia</Label>
                <Input
                  id="provincia"
                  value={formData.provincia}
                  onChange={handleInputChange("provincia")}
                  className="bg-white"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* País */}
            <div className="space-y-2">
              <Label htmlFor="pais">País</Label>
              <Input
                id="pais"
                value={formData.pais}
                onChange={handleInputChange("pais")}
                className="bg-white"
                disabled={isLoading}
              />
            </div>

            {/* Teléfono, Email, Web */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange("telefono")}
                  className="bg-white"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailContacto">Email de Contacto</Label>
                <Input
                  id="emailContacto"
                  type="email"
                  value={formData.emailContacto}
                  onChange={handleInputChange("emailContacto")}
                  className="bg-white"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="web">Web</Label>
                <Input
                  id="web"
                  value={formData.web}
                  onChange={handleInputChange("web")}
                  className="bg-white"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* IRPF (solo autónomos) */}
            {profile.emisor.tipo === "autonomo" && (
              <div className="space-y-2">
                <Label htmlFor="irpf_percentage">Porcentaje de IRPF (%)</Label>
                <Input
                  id="irpf_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.irpf_percentage || ""}
                  onChange={handleInputChange("irpf_percentage")}
                  className="bg-white"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Porcentaje de retención de IRPF aplicable (por defecto 15%)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Card: Cambiar Contraseña */}
      {canChangePassword && (
        <Card id="card-cambiar-password" className="bg-lime-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Cambiar Contraseña
            </CardTitle>
            <CardDescription>
              {isOwnProfile
                ? "Deja en blanco si no deseas cambiar tu contraseña"
                : "Establece una nueva contraseña temporal para este usuario"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showPasswordSection ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPasswordSection(true)}
                className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
              >
                Cambiar Contraseña
              </Button>
            ) : (
              <>
                {/* Contraseña actual (solo si es propio perfil) */}
                {isOwnProfile && (
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Contraseña Actual *</Label>
                    <PasswordInput
                      id="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange("currentPassword")}
                      className={`bg-white ${errors.currentPassword ? "border-red-500" : ""}`}
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    {errors.currentPassword && (
                      <p className="text-sm text-red-600">
                        {errors.currentPassword}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña *</Label>
                    <PasswordInput
                      id="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange("newPassword")}
                      className={`bg-white ${errors.newPassword ? "border-red-500" : ""}`}
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    {errors.newPassword && (
                      <p className="text-sm text-red-600">
                        {errors.newPassword}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirmar Contraseña *
                    </Label>
                    <PasswordInput
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange("confirmPassword")}
                      className={`bg-white ${errors.confirmPassword ? "border-red-500" : ""}`}
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-600">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                {!isOwnProfile && (
                  <Alert>
                    <AlertDescription className="text-sm">
                      Como administrador, puedes establecer una nueva contraseña
                      temporal sin necesidad de conocer la actual.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="mt-6">
        <ActionButtons
          primaryAction="save"
          isLoading={isLoading}
          isHeader={false}
          formId="unified-user-form"
          onCancelClick={() =>
            router.push(isOwnProfile ? "/dashboard" : "/users")
          }
        />
      </div>
    </form>
  );
}
