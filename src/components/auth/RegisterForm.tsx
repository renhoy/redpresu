"use client";

import { useState } from "react";
import Link from "next/link";
import { registerUser, type RegisterData } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Building2, User } from "lucide-react";
import {
  registerSchema,
  type RegisterFormData,
} from "@/lib/validators/auth-schemas";

interface RegisterFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  tipo?: string;
  nombreComercial?: string;
  nif?: string;
  direccionFiscal?: string;
  codigoPostal?: string;
  ciudad?: string;
  provincia?: string;
  telefono?: string;
  emailContacto?: string;
  web?: string;
  irpfPercentage?: string;
  general?: string;
}

export default function RegisterForm() {
  const [formData, setFormData] = useState<Partial<RegisterFormData>>({
    email: "",
    password: "",
    confirmPassword: "",
    tipo: "empresa", // Por defecto empresa
    nombreComercial: "",
    nif: "",
    direccionFiscal: "",
    codigoPostal: "",
    ciudad: "",
    provincia: "",
    pais: "España",
    telefono: "",
    emailContacto: "",
    web: "",
    irpfPercentage: undefined, // Solo para autónomos
  });

  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    try {
      // Validar con Zod schema
      registerSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const newErrors: RegisterFormErrors = {};

      if (error.errors) {
        error.errors.forEach((err: any) => {
          const field = err.path[0];
          newErrors[field as keyof RegisterFormErrors] = err.message;
        });
      }

      setErrors(newErrors);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Limpiar errores anteriores
    setErrors({});

    // Validar formulario
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const registerData: RegisterData = {
        email: formData.email!,
        password: formData.password!,
        tipo: formData.tipo!,
        nombreComercial: formData.nombreComercial!,
        nif: formData.nif!,
        direccionFiscal: formData.direccionFiscal!,
        codigoPostal: formData.codigoPostal || undefined,
        ciudad: formData.ciudad || undefined,
        provincia: formData.provincia || undefined,
        pais: formData.pais || "España",
        telefono: formData.telefono || undefined,
        emailContacto: formData.emailContacto || undefined,
        web: formData.web || undefined,
        irpfPercentage:
          formData.tipo === "autonomo" ? formData.irpfPercentage ?? 15 : null,
      };

      const result = await registerUser(registerData);

      if (!result.success) {
        setErrors({
          general: result.error || "Error desconocido durante el registro",
        });
        return;
      }

      // El Server Action maneja el redirect automáticamente
    } catch (error) {
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Error inesperado durante el registro",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof RegisterFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        field === "irpfPercentage"
          ? e.target.value
            ? parseFloat(e.target.value)
            : undefined
          : e.target.value;

      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Limpiar error del campo cuando el usuario empieza a escribir
      if (errors[field as keyof RegisterFormErrors]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  const handleTabChange = (value: "empresa" | "autonomo") => {
    setFormData((prev) => ({
      ...prev,
      tipo: value,
      // Si cambia a autónomo, poner IRPF por defecto
      irpfPercentage: value === "autonomo" ? 15 : undefined,
    }));

    if (errors.tipo) {
      setErrors((prev) => ({
        ...prev,
        tipo: undefined,
      }));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Crear Cuenta</CardTitle>
        <CardDescription className="text-center">
          Completa el formulario para registrarte en el sistema
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Error general */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Sección: Datos de Acceso */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Datos de Acceso</h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Email - 50% */}
              <div className="md:col-span-6 space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleInputChange("email")}
                  className={errors.email ? "border-red-500" : ""}
                  disabled={isLoading}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Contraseña - 25% */}
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={handleInputChange("password")}
                  className={errors.password ? "border-red-500" : ""}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirmar Contraseña - 25% */}
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repite tu contraseña"
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
          </div>

          {/* Sección: Datos Fiscales */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Datos Fiscales</h3>

            {/* Tipo - Tabs */}
            <div className="space-y-2">
              <Label>Tipo de Emisor *</Label>
              <Tabs
                value={formData.tipo}
                onValueChange={handleTabChange}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="empresa" disabled={isLoading}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Empresa
                  </TabsTrigger>
                  <TabsTrigger value="autonomo" disabled={isLoading}>
                    <User className="h-4 w-4 mr-2" />
                    Autónomo
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {errors.tipo && (
                <p className="text-sm text-red-600">{errors.tipo}</p>
              )}
            </div>

            {/* Empresa: Nombre Comercial 75% + NIF 25% */}
            {formData.tipo === "empresa" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-9 space-y-2">
                  <Label htmlFor="nombreComercial">Nombre Comercial *</Label>
                  <Input
                    id="nombreComercial"
                    type="text"
                    placeholder="Mi Empresa S.L."
                    value={formData.nombreComercial}
                    onChange={handleInputChange("nombreComercial")}
                    className={errors.nombreComercial ? "border-red-500" : ""}
                    disabled={isLoading}
                  />
                  {errors.nombreComercial && (
                    <p className="text-sm text-red-600">
                      {errors.nombreComercial}
                    </p>
                  )}
                </div>

                <div className="md:col-span-3 space-y-2">
                  <Label htmlFor="nif">NIF/CIF *</Label>
                  <Input
                    id="nif"
                    type="text"
                    placeholder="B12345678"
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
            )}

            {/* Autónomo: Nombre 50% + NIF 25% + IRPF 25% */}
            {formData.tipo === "autonomo" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6 space-y-2">
                  <Label htmlFor="nombreComercial">Nombre Comercial *</Label>
                  <Input
                    id="nombreComercial"
                    type="text"
                    placeholder="Juan Pérez"
                    value={formData.nombreComercial}
                    onChange={handleInputChange("nombreComercial")}
                    className={errors.nombreComercial ? "border-red-500" : ""}
                    disabled={isLoading}
                  />
                  {errors.nombreComercial && (
                    <p className="text-sm text-red-600">
                      {errors.nombreComercial}
                    </p>
                  )}
                </div>

                <div className="md:col-span-3 space-y-2">
                  <Label htmlFor="nif">NIF *</Label>
                  <Input
                    id="nif"
                    type="text"
                    placeholder="12345678A"
                    value={formData.nif}
                    onChange={handleInputChange("nif")}
                    className={errors.nif ? "border-red-500" : ""}
                    disabled={isLoading}
                  />
                  {errors.nif && (
                    <p className="text-sm text-red-600">{errors.nif}</p>
                  )}
                </div>

                <div className="md:col-span-3 space-y-2">
                  <Label htmlFor="irpfPercentage">% IRPF *</Label>
                  <Input
                    id="irpfPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="15"
                    value={formData.irpfPercentage ?? ""}
                    onChange={handleInputChange("irpfPercentage")}
                    className={errors.irpfPercentage ? "border-red-500" : ""}
                    disabled={isLoading}
                  />
                  {errors.irpfPercentage && (
                    <p className="text-sm text-red-600">
                      {errors.irpfPercentage}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Dirección - 75% + Código Postal - 25% */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-9 space-y-2">
                <Label htmlFor="direccionFiscal">Dirección *</Label>
                <Input
                  id="direccionFiscal"
                  type="text"
                  placeholder="Calle Principal, 123"
                  value={formData.direccionFiscal}
                  onChange={handleInputChange("direccionFiscal")}
                  className={errors.direccionFiscal ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.direccionFiscal && (
                  <p className="text-sm text-red-600">{errors.direccionFiscal}</p>
                )}
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="codigoPostal">Código Postal *</Label>
                <Input
                  id="codigoPostal"
                  type="text"
                  placeholder="28001"
                  maxLength={5}
                  value={formData.codigoPostal}
                  onChange={handleInputChange("codigoPostal")}
                  className={errors.codigoPostal ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.codigoPostal && (
                  <p className="text-sm text-red-600">{errors.codigoPostal}</p>
                )}
              </div>
            </div>

            {/* Localidad - 75% + Provincia - 25% */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-9 space-y-2">
                <Label htmlFor="ciudad">Localidad *</Label>
                <Input
                  id="ciudad"
                  type="text"
                  placeholder="Madrid"
                  value={formData.ciudad}
                  onChange={handleInputChange("ciudad")}
                  className={errors.ciudad ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.ciudad && (
                  <p className="text-sm text-red-600">{errors.ciudad}</p>
                )}
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="provincia">Provincia *</Label>
                <Input
                  id="provincia"
                  type="text"
                  placeholder="Madrid"
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
          </div>

          {/* Sección: Datos de Contacto */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Datos de Contacto</h3>

            {/* Teléfono 25% + Email 50% + Web 25% */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  type="tel"
                  placeholder="+34 600 000 000"
                  value={formData.telefono}
                  onChange={handleInputChange("telefono")}
                  className={errors.telefono ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.telefono && (
                  <p className="text-sm text-red-600">{errors.telefono}</p>
                )}
              </div>

              <div className="md:col-span-6 space-y-2">
                <Label htmlFor="emailContacto">Email</Label>
                <Input
                  id="emailContacto"
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={formData.emailContacto}
                  onChange={handleInputChange("emailContacto")}
                  className={errors.emailContacto ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.emailContacto && (
                  <p className="text-sm text-red-600">{errors.emailContacto}</p>
                )}
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="web">Sitio Web</Label>
                <Input
                  id="web"
                  type="url"
                  placeholder="www.empresa.com"
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
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              "Crear Cuenta"
            )}
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-center text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
