"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { registerUser, type RegisterData } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Building2, User } from "lucide-react";
import {
  registerSchema,
  type RegisterFormData,
} from "@/lib/validators/auth-schemas";
import { validateEmail } from "@/lib/helpers/email-validation";
import { EmailConfirmationMessage } from "@/components/auth/EmailConfirmationMessage";

interface RegisterFormErrors {
  nombre?: string;
  apellidos?: string;
  email?: string;
  confirmEmail?: string;
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
    name: "",
    last_name: "",
    email: "",
    confirmEmail: "",
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
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");
  const [isDevelopment, setIsDevelopment] = useState(false);

  // Debug: Ver cambios en errors
  useEffect(() => {
    console.log("[RegisterForm] Estado de errors cambió:", errors);
  }, [errors]);

  const validateForm = (): boolean => {
    try {
      console.log("[RegisterForm] Validando formulario con datos:", formData);
      // Validar con Zod schema
      registerSchema.parse(formData);
      console.log("[RegisterForm] Validación exitosa");
      setErrors({});
      return true;
    } catch (error: any) {
      console.error("[RegisterForm] Error capturado:", error);
      console.error("[RegisterForm] Tipo de error:", error.constructor.name);
      console.error("[RegisterForm] Tiene .issues?:", !!error.issues);
      console.error("[RegisterForm] Tiene .errors?:", !!error.errors);

      const newErrors: RegisterFormErrors = {};

      // Zod usa .issues, no .errors
      const errorList = error.issues || error.errors || [];
      console.log("[RegisterForm] Lista de errores:", errorList);

      if (errorList.length > 0) {
        // Agrupar errores por campo
        const errorsByField: Record<string, string[]> = {};

        errorList.forEach((err: any) => {
          const field = err.path[0];
          if (!errorsByField[field]) {
            errorsByField[field] = [];
          }
          errorsByField[field].push(err.message);
        });

        // Combinar múltiples errores del mismo campo
        Object.keys(errorsByField).forEach((field) => {
          newErrors[field as keyof RegisterFormErrors] =
            errorsByField[field].join(". ");
          console.log(
            `[RegisterForm] Error en campo ${field}:`,
            errorsByField[field].join(". ")
          );
        });
      }

      console.log("[RegisterForm] newErrors object:", newErrors);
      setErrors(newErrors);
      console.log("[RegisterForm] Después de setErrors");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[RegisterForm] Submit iniciado");

    // Validar formulario (validateForm ya limpia los errores si es exitoso)
    if (!validateForm()) {
      console.log("[RegisterForm] Validación falló, deteniendo submit");
      return;
    }

    console.log("[RegisterForm] Iniciando registro...");
    setIsLoading(true);

    try {
      const registerData: RegisterData = {
        name: formData.name!,
        last_name: formData.last_name!,
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

      // Registro exitoso: mostrar mensaje de confirmación de email
      console.log("[RegisterForm] Registro exitoso, mostrando mensaje de confirmación");
      setRegisteredEmail(formData.email!);
      setIsDevelopment(result.data?.isDevelopment || false);
      setRegistrationSuccess(true);
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

      // SECURITY (VULN-019): Validar emails en tiempo real
      if (
        (field === "email" || field === "emailContacto") &&
        typeof value === "string" &&
        value.trim()
      ) {
        const validation = validateEmail(value);
        if (!validation.valid) {
          setErrors((prev) => ({
            ...prev,
            [field]: validation.error || "Email no válido",
          }));
          return;
        }
      }

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

  // Si el registro fue exitoso, mostrar mensaje de confirmación de email
  if (registrationSuccess && registeredEmail) {
    return (
      <EmailConfirmationMessage
        email={registeredEmail}
        isDevelopment={isDevelopment}
      />
    );
  }

  return (
    <TooltipProvider>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Crear Cuenta</CardTitle>
          <CardDescription className="text-center">
            Completa el formulario para registrarte en el sistema
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Debug: Mostrar todos los errores */}
            {Object.keys(errors).length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-semibold mb-2">
                    Errores de validación:
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    {Object.entries(errors).map(([field, message]) => (
                      <li key={field}>
                        <strong>{field}:</strong> {message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Error general */}
            {errors.general &&
              !Object.keys(errors).some((k) => k !== "general") && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              )}

            {/* Sección: Datos de Acceso (Administrador) */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">
                Datos de Acceso (Administrador)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Nombre - 50% */}
                <div className="md:col-span-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Nombre *"
                        value={formData.nombre}
                        onChange={handleInputChange("name")}
                        className={errors.nombre ? "border-red-500" : ""}
                        disabled={isLoading}
                        autoComplete="given-name"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Nombre del administrador de la cuenta</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.nombre && (
                    <p className="text-sm text-red-600 mt-1">{errors.nombre}</p>
                  )}
                </div>

                {/* Apellidos - 50% */}
                <div className="md:col-span-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="last_name"
                        type="text"
                        placeholder="Apellidos *"
                        value={formData.apellidos}
                        onChange={handleInputChange("last_name")}
                        className={errors.apellidos ? "border-red-500" : ""}
                        disabled={isLoading}
                        autoComplete="family-name"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Apellidos del administrador de la cuenta</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.apellidos && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.apellidos}
                    </p>
                  )}
                </div>

                {/* Email - 50% */}
                <div className="md:col-span-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Email *"
                        value={formData.email}
                        onChange={handleInputChange("email")}
                        className={errors.email ? "border-red-500" : ""}
                        disabled={isLoading}
                        autoComplete="email"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>tu@email.com</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Confirmar Email - 50% */}
                <div className="md:col-span-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="confirmEmail"
                        type="email"
                        placeholder="Confirmar Email *"
                        value={formData.confirmEmail}
                        onChange={handleInputChange("confirmEmail")}
                        className={errors.confirmEmail ? "border-red-500" : ""}
                        disabled={isLoading}
                        autoComplete="email"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Confirma tu email</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.confirmEmail && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.confirmEmail}
                    </p>
                  )}
                </div>

                {/* Contraseña - 50% */}
                <div className="md:col-span-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PasswordInput
                        id="password"
                        placeholder="Contraseña *"
                        value={formData.password}
                        onChange={handleInputChange("password")}
                        className={errors.password ? "border-red-500" : ""}
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.password && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirmar Contraseña - 50% */}
                <div className="md:col-span-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PasswordInput
                        id="confirmPassword"
                        placeholder="Confirmar Contraseña *"
                        value={formData.confirmPassword}
                        onChange={handleInputChange("confirmPassword")}
                        className={
                          errors.confirmPassword ? "border-red-500" : ""
                        }
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Confirma contraseña</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sección: Datos Fiscales */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Datos Fiscales</h3>

              {/* Tipo - Tabs (sin label) */}
              <div>
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
                  <p className="text-sm text-red-600 mt-1">{errors.tipo}</p>
                )}
              </div>

              {/* Empresa: Nombre Comercial 75% + NIF 25% */}
              {formData.tipo === "empresa" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-9">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          id="nombreComercial"
                          type="text"
                          placeholder="Nombre Comercial *"
                          value={formData.nombreComercial}
                          onChange={handleInputChange("nombreComercial")}
                          className={
                            errors.nombreComercial ? "border-red-500" : ""
                          }
                          disabled={isLoading}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mi Empresa S.L.</p>
                      </TooltipContent>
                    </Tooltip>
                    {errors.nombreComercial && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.nombreComercial}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          id="nif"
                          type="text"
                          placeholder="NIF/CIF *"
                          value={formData.nif}
                          onChange={handleInputChange("nif")}
                          className={errors.nif ? "border-red-500" : ""}
                          disabled={isLoading}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>B12345678</p>
                      </TooltipContent>
                    </Tooltip>
                    {errors.nif && (
                      <p className="text-sm text-red-600 mt-1">{errors.nif}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Autónomo: Nombre 50% + NIF 25% + IRPF 25% */}
              {formData.tipo === "autonomo" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          id="nombreComercial"
                          type="text"
                          placeholder="Nombre Comercial *"
                          value={formData.nombreComercial}
                          onChange={handleInputChange("nombreComercial")}
                          className={
                            errors.nombreComercial ? "border-red-500" : ""
                          }
                          disabled={isLoading}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Juan Pérez</p>
                      </TooltipContent>
                    </Tooltip>
                    {errors.nombreComercial && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.nombreComercial}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          id="nif"
                          type="text"
                          placeholder="NIF *"
                          value={formData.nif}
                          onChange={handleInputChange("nif")}
                          className={errors.nif ? "border-red-500" : ""}
                          disabled={isLoading}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>12345678A</p>
                      </TooltipContent>
                    </Tooltip>
                    {errors.nif && (
                      <p className="text-sm text-red-600 mt-1">{errors.nif}</p>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          id="irpfPercentage"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="% IRPF *"
                          value={formData.irpfPercentage ?? ""}
                          onChange={handleInputChange("irpfPercentage")}
                          className={
                            errors.irpfPercentage ? "border-red-500" : ""
                          }
                          disabled={isLoading}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>15</p>
                      </TooltipContent>
                    </Tooltip>
                    {errors.irpfPercentage && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.irpfPercentage}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Dirección - 75% + Código Postal - 25% */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-9">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="direccionFiscal"
                        type="text"
                        placeholder="Dirección *"
                        value={formData.direccionFiscal}
                        onChange={handleInputChange("direccionFiscal")}
                        className={
                          errors.direccionFiscal ? "border-red-500" : ""
                        }
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Calle Real, 123</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.direccionFiscal && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.direccionFiscal}
                    </p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="codigoPostal"
                        type="text"
                        placeholder="Código Postal *"
                        maxLength={5}
                        value={formData.codigoPostal}
                        onChange={handleInputChange("codigoPostal")}
                        className={errors.codigoPostal ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>41200</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.codigoPostal && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.codigoPostal}
                    </p>
                  )}
                </div>
              </div>

              {/* Localidad - 75% + Provincia - 25% */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-9">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="ciudad"
                        type="text"
                        placeholder="Localidad *"
                        value={formData.ciudad}
                        onChange={handleInputChange("ciudad")}
                        className={errors.ciudad ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Alcalá del Río</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.ciudad && (
                    <p className="text-sm text-red-600 mt-1">{errors.ciudad}</p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="provincia"
                        type="text"
                        placeholder="Provincia *"
                        value={formData.provincia}
                        onChange={handleInputChange("provincia")}
                        className={errors.provincia ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sevilla</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.provincia && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.provincia}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sección: Datos de Contacto */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Datos de Contacto</h3>

              {/* Teléfono 25% + Email 50% + Web 25% */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="telefono"
                        type="tel"
                        placeholder="Teléfono"
                        value={formData.telefono}
                        onChange={handleInputChange("telefono")}
                        className={errors.telefono ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>678 912 345</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.telefono && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.telefono}
                    </p>
                  )}
                </div>

                <div className="md:col-span-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="emailContacto"
                        type="email"
                        placeholder="Email"
                        value={formData.emailContacto}
                        onChange={handleInputChange("emailContacto")}
                        className={errors.emailContacto ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>contacto@empresa.com</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.emailContacto && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.emailContacto}
                    </p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="web"
                        type="url"
                        placeholder="Sitio Web"
                        value={formData.web}
                        onChange={handleInputChange("web")}
                        className={errors.web ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>www.empresa.com</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.web && (
                    <p className="text-sm text-red-600 mt-1">{errors.web}</p>
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
    </TooltipProvider>
  );
}
