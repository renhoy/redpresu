"use client";

import { useState } from "react";
import {
  updateUserProfile,
  type UserProfile,
  type UpdateProfileData,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Save,
  User,
  Building2,
  Lock,
  CheckCircle2,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { startTour } from "@/lib/helpers/tour-helpers";

interface ProfileFormProps {
  profile: UserProfile;
}

interface ProfileFormData {
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

interface ProfileFormErrors {
  nombre_comercial?: string;
  nif?: string;
  direccion_fiscal?: string;
  codigo_postal?: string;
  localidad?: string;
  provincia?: string;
  telefono?: string;
  emailContacto?: string;
  web?: string;
  irpf_percentage?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    // Pre-cargar datos del emisor
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

    // Contraseña vacía por defecto
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ProfileFormErrors = {};

    // Validar datos emisor
    if (!formData.nombre_comercial.trim()) {
      newErrors.nombre_comercial = "El nombre comercial es requerido";
    }

    if (!formData.nif.trim()) {
      newErrors.nif = "El NIF/CIF es requerido";
    } else if (!/^[A-Z0-9]+$/i.test(formData.nif)) {
      newErrors.nif = "El NIF/CIF solo puede contener letras y números";
    }

    if (!formData.direccion_fiscal.trim()) {
      newErrors.direccion_fiscal = "La dirección fiscal es requerida";
    }

    if (!formData.codigo_postal.trim()) {
      newErrors.codigo_postal = "El código postal es requerido";
    } else if (!/^\d{5}$/.test(formData.codigo_postal)) {
      newErrors.codigo_postal = "El código postal debe tener 5 dígitos";
    }

    if (!formData.localidad.trim()) {
      newErrors.localidad = "La localidad es requerida";
    }

    if (!formData.provincia.trim()) {
      newErrors.provincia = "La provincia es requerida";
    }

    if (formData.telefono && !/^[0-9\s\+\-\(\)]+$/.test(formData.telefono)) {
      newErrors.telefono = "Teléfono inválido";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.emailContacto && !emailRegex.test(formData.emailContacto)) {
      newErrors.emailContacto = "Email inválido";
    }

    if (formData.web && !/^https?:\/\/.+/.test(formData.web)) {
      newErrors.web = "La URL debe comenzar con http:// o https://";
    }

    // Validar cambio de contraseña (solo si se proporcionó algún campo)
    const hasPasswordChange =
      formData.currentPassword ||
      formData.newPassword ||
      formData.confirmPassword;

    if (hasPasswordChange) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = "Debes ingresar tu contraseña actual";
      }

      if (!formData.newPassword) {
        newErrors.newPassword = "Debes ingresar una nueva contraseña";
      } else if (formData.newPassword.length < 8) {
        newErrors.newPassword =
          "La contraseña debe tener al menos 8 caracteres";
      } else if (
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)
      ) {
        newErrors.newPassword =
          "Debe contener mayúsculas, minúsculas y números";
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

    // Limpiar errores anteriores
    setErrors({});

    // Validar formulario
    if (!validateForm()) {
      toast.error("Por favor corrige los errores del formulario");
      return;
    }

    setIsLoading(true);

    try {
      const updateData: UpdateProfileData = {
        nombre_comercial: formData.nombre_comercial,
        nif: formData.nif,
        direccion_fiscal: formData.direccion_fiscal,
        codigo_postal: formData.codigo_postal,
        ciudad: formData.localidad,
        provincia: formData.provincia,
        pais: formData.pais || undefined,
        telefono: formData.telefono || undefined,
        emailContacto: formData.emailContacto || undefined,
        web: formData.web || undefined,
        irpf_percentage: formData.irpf_percentage,
      };

      // Incluir cambio de contraseña si se proporcionó
      if (formData.currentPassword && formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const result = await updateUserProfile(updateData);

      if (!result.success) {
        setErrors({
          general: result.error || "Error desconocido al actualizar perfil",
        });
        toast.error(result.error || "Error al actualizar perfil");
        return;
      }

      // Limpiar campos de contraseña después de éxito
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      setShowPasswordSection(false);

      toast.success("Perfil actualizado exitosamente", {
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Error inesperado al actualizar perfil";
      setErrors({ general: errorMsg });
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof ProfileFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        field === "irpf_percentage"
          ? e.target.value
            ? parseFloat(e.target.value)
            : undefined
          : e.target.value;

      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Limpiar error del campo cuando el usuario empieza a escribir
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center md:items-start md:flex-row md:justify-between gap-4">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <User className="h-6 w-6" />
              Mi Perfil
            </h1>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => startTour("profile-page")}
              className="border-lime-500 text-lime-600 hover:bg-lime-50 h-8 px-3 gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Tour</span>
            </Button>
          </div>
          <p className="text-sm">
            Administra tu información personal y configuración de cuenta
          </p>
        </div>
        <div className="flex justify-center md:justify-end gap-2">
          <Button id="btn-guardar-perfil" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error general */}
      {errors.general && (
        <Alert variant="destructive">
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      {/* Sección: Información Personal (Solo lectura) */}
      <Card id="card-info-personal">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/users/${profile.id}/edit`}
              className="border-lime-500 text-lime-600 hover:bg-lime-50"
            >
              Editar usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop: 1 línea (25% - 45% - 15% - 15%) */}
          {/* Tablet: 2 líneas (50%-50%, 50%-50%) */}
          {/* Móvil: 3 líneas (100%, 100%, 50%-50%) */}
          <div className="grid grid-cols-4 lg:grid-cols-20 gap-4">
            {/* Nombre: Desktop 25% (5/20), Tablet 50% (2/4), Móvil 100% (4/4) */}
            <div className="col-span-4 md:col-span-2 lg:col-span-5">
              <p className="text-sm">
                <span className="font-bold">Nombre:</span> {profile.name}
              </p>
            </div>

            {/* Email: Desktop 45% (9/20), Tablet 50% (2/4), Móvil 100% (4/4) */}
            <div className="col-span-4 md:col-span-2 lg:col-span-9">
              <p className="text-sm">
                <span className="font-bold">Email:</span> {profile.email}
              </p>
            </div>

            {/* Rol: Desktop 15% (3/20), Tablet 50% (2/4), Móvil 50% (2/4) */}
            <div className="col-span-2 md:col-span-2 lg:col-span-3">
              <p className="text-sm">
                <span className="font-bold">Rol:</span>{" "}
                <span className="capitalize">{profile.role}</span>
              </p>
            </div>

            {/* Tipo: Desktop 15% (3/20), Tablet 50% (2/4), Móvil 50% (2/4) */}
            {profile.emisor && (
              <div className="col-span-2 md:col-span-2 lg:col-span-3">
                <p className="text-sm">
                  <span className="font-bold">Tipo:</span>{" "}
                  {profile.emisor.tipo === "autonomo" ? "Autónomo" : "Empresa"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sección: Datos del Issuer (Emisor) - Editable */}
      {profile.emisor && (
        <Card id="card-datos-emisor">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos de {profile.emisor.tipo === "autonomo" ? "Autónomo" : "Empresa"}
            </CardTitle>
            <CardDescription>
              Información fiscal que aparecerá en tus presupuestos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.emisor.tipo === "empresa" ? (
              <>
                {/* EMPRESA */}
                {/* Desktop: Nombre Comercial* (75%) NIF/CIF* (25%) */}
                {/* Tablet: Nombre Comercial* (75%) NIF/CIF* (25%) */}
                {/* Móvil: Nombre Comercial* (100%), NIF (100%) */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-4 md:col-span-3 space-y-2">
                    <Label htmlFor="nombre_comercial">Nombre Comercial *</Label>
                    <Input
                      id="nombre_comercial"
                      value={formData.nombre_comercial}
                      onChange={handleInputChange("nombre_comercial")}
                      className={errors.nombre_comercial ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    {errors.nombre_comercial && (
                      <p className="text-sm text-red-600">{errors.nombre_comercial}</p>
                    )}
                  </div>

                  <div className="col-span-4 md:col-span-1 space-y-2">
                    <Label htmlFor="nif">NIF/CIF *</Label>
                    <Input
                      id="nif"
                      value={formData.nif}
                      onChange={handleInputChange("nif")}
                      className={errors.nif ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    {errors.nif && (
                      <p className="text-sm text-red-600">{errors.nif}</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* AUTÓNOMO */}
                {/* Desktop: Nombre Comercial* (50%) NIF/CIF* (25%) IRPF (25%) */}
                {/* Tablet: Nombre Comercial* (100%), NIF (50%) IRPF (50%) */}
                {/* Móvil: Nombre (100%), NIF (75%) IRPF (25%) */}

                {/* Desktop: 1 línea con 3 campos */}
                <div className="hidden lg:grid lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2 space-y-2">
                    <Label htmlFor="nombre_comercial">Nombre Comercial *</Label>
                    <Input
                      id="nombre_comercial"
                      value={formData.nombre_comercial}
                      onChange={handleInputChange("nombre_comercial")}
                      className={errors.nombre_comercial ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    {errors.nombre_comercial && (
                      <p className="text-sm text-red-600">{errors.nombre_comercial}</p>
                    )}
                  </div>

                  <div className="lg:col-span-1 space-y-2">
                    <Label htmlFor="nif">NIF/CIF *</Label>
                    <Input
                      id="nif"
                      value={formData.nif}
                      onChange={handleInputChange("nif")}
                      className={errors.nif ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    {errors.nif && (
                      <p className="text-sm text-red-600">{errors.nif}</p>
                    )}
                  </div>

                  <div className="lg:col-span-1 space-y-2">
                    <Label htmlFor="irpf_percentage">% IRPF</Label>
                    <Input
                      id="irpf_percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.irpf_percentage ?? ""}
                      onChange={handleInputChange("irpf_percentage")}
                      className={errors.irpf_percentage ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    {errors.irpf_percentage && (
                      <p className="text-sm text-red-600">{errors.irpf_percentage}</p>
                    )}
                  </div>
                </div>

                {/* Tablet y Móvil: distribución diferente */}
                <div className="lg:hidden space-y-4">
                  {/* Nombre Comercial */}
                  <div className="space-y-2">
                    <Label htmlFor="nombre_comercial">Nombre Comercial *</Label>
                    <Input
                      id="nombre_comercial"
                      value={formData.nombre_comercial}
                      onChange={handleInputChange("nombre_comercial")}
                      className={errors.nombre_comercial ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    {errors.nombre_comercial && (
                      <p className="text-sm text-red-600">{errors.nombre_comercial}</p>
                    )}
                  </div>

                  {/* NIF/CIF + IRPF */}
                  {/* Tablet: 50%-50%, Móvil: 75%-25% */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3 md:col-span-2 space-y-2">
                      <Label htmlFor="nif">NIF/CIF *</Label>
                      <Input
                        id="nif"
                        value={formData.nif}
                        onChange={handleInputChange("nif")}
                        className={errors.nif ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                      {errors.nif && (
                        <p className="text-sm text-red-600">{errors.nif}</p>
                      )}
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="irpf_percentage">% IRPF</Label>
                      <Input
                        id="irpf_percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.irpf_percentage ?? ""}
                        onChange={handleInputChange("irpf_percentage")}
                        className={errors.irpf_percentage ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                      {errors.irpf_percentage && (
                        <p className="text-sm text-red-600">{errors.irpf_percentage}</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Dirección Fiscal* (75%) Código Postal* (25%) */}
            {/* Desktop/Tablet: 75%-25%, Móvil: 100%-100% */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-4 md:col-span-3 space-y-2">
                <Label htmlFor="direccion_fiscal">Dirección Fiscal *</Label>
                <Input
                  id="direccion_fiscal"
                  value={formData.direccion_fiscal}
                  onChange={handleInputChange("direccion_fiscal")}
                  className={errors.direccion_fiscal ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.direccion_fiscal && (
                  <p className="text-sm text-red-600">{errors.direccion_fiscal}</p>
                )}
              </div>

              <div className="col-span-4 md:col-span-1 space-y-2">
                <Label htmlFor="codigo_postal">Código Postal *</Label>
                <Input
                  id="codigo_postal"
                  maxLength={5}
                  value={formData.codigo_postal}
                  onChange={handleInputChange("codigo_postal")}
                  className={errors.codigo_postal ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.codigo_postal && (
                  <p className="text-sm text-red-600">{errors.codigo_postal}</p>
                )}
              </div>
            </div>

            {/* Localidad* (50%) Provincia* (50%) */}
            {/* Móvil: Localidad (100%), Provincia (50%) Teléfono (50%) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="localidad">Localidad *</Label>
                <Input
                  id="localidad"
                  value={formData.localidad}
                  onChange={handleInputChange("localidad")}
                  className={errors.localidad ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.localidad && (
                  <p className="text-sm text-red-600">{errors.localidad}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="provincia">Provincia *</Label>
                <Input
                  id="provincia"
                  value={formData.provincia}
                  onChange={handleInputChange("provincia")}
                  className={errors.provincia ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.provincia && (
                  <p className="text-sm text-red-600">{errors.provincia}</p>
                )}
              </div>
            </div>

            {/* Desktop/Tablet: Teléfono (25%) Email de Contacto (50%) Sitio Web (25%) */}
            {/* Móvil: Teléfono (50%), Email (100%), Web (100%) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="md:col-span-1 space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={handleInputChange("telefono")}
                  className={errors.telefono ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.telefono && (
                  <p className="text-sm text-red-600">{errors.telefono}</p>
                )}
              </div>

              <div className="col-span-2 md:col-span-2 space-y-2">
                <Label htmlFor="emailContacto">Email de Contacto</Label>
                <Input
                  id="emailContacto"
                  type="email"
                  value={formData.emailContacto}
                  onChange={handleInputChange("emailContacto")}
                  className={errors.emailContacto ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.emailContacto && (
                  <p className="text-sm text-red-600">{errors.emailContacto}</p>
                )}
              </div>

              <div className="col-span-2 md:col-span-1 space-y-2">
                <Label htmlFor="web">Sitio Web</Label>
                <Input
                  id="web"
                  type="url"
                  placeholder="https://www.tuempresa.com"
                  value={formData.web}
                  onChange={handleInputChange("web")}
                  className={errors.web ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.web && (
                  <p className="text-sm text-red-600">{errors.web}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sección: Cambiar Contraseña (Opcional) */}
      <Card id="card-cambiar-password">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>
            Deja en blanco si no deseas cambiar tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPasswordSection ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPasswordSection(true)}
            >
              Cambiar Contraseña
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña Actual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={handleInputChange("currentPassword")}
                  className={errors.currentPassword ? "border-red-500" : ""}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                {errors.currentPassword && (
                  <p className="text-sm text-red-600">
                    {errors.currentPassword}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleInputChange("newPassword")}
                    className={errors.newPassword ? "border-red-500" : ""}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  {errors.newPassword && (
                    <p className="text-sm text-red-600">{errors.newPassword}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange("confirmPassword")}
                    className={errors.confirmPassword ? "border-red-500" : ""}
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

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowPasswordSection(false);
                  setFormData((prev) => ({
                    ...prev,
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  }));
                  setErrors((prev) => ({
                    ...prev,
                    currentPassword: undefined,
                    newPassword: undefined,
                    confirmPassword: undefined,
                  }));
                }}
              >
                Cancelar Cambio de Contraseña
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
