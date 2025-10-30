"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateCompany,
  createCompany,
  type Company,
} from "@/app/actions/companies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, X, Building2, User } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface CompanyFormProps {
  mode: "create" | "edit";
  company?: Company;
  currentUserRole: string;
}

interface FormData {
  name: string;
  type: "empresa" | "autonomo";
  nif: string;
  address: string;
  postal_code: string;
  locality: string;
  province: string;
  country: string;
  phone: string;
  email: string;
  web: string;
  irpf_percentage: number | null;
}

export default function CompanyForm({
  mode,
  company,
  currentUserRole,
}: CompanyFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: company?.name || "",
    type: company?.type || "empresa",
    nif: company?.nif || "",
    address: company?.address || "",
    postal_code: company?.postal_code || "",
    locality: company?.locality || "",
    province: company?.province || "",
    country: company?.country || "España",
    phone: company?.phone || "",
    email: company?.email || "",
    web: company?.web || "",
    irpf_percentage: company?.irpf_percentage || null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Handle number inputs specially (irpf_percentage)
    const processedValue =
      name === "irpf_percentage" ? (value ? parseFloat(value) : null) : value;

    setFormData((prev) => ({ ...prev, [name]: processedValue }));

    // Limpiar error del campo
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleTabChange = (value: "empresa" | "autonomo") => {
    setFormData((prev) => ({
      ...prev,
      type: value,
      // Si cambia a autónomo y no tiene IRPF, poner 15 por defecto
      irpf_percentage: value === "autonomo" ? prev.irpf_percentage ?? 15 : null,
    }));

    if (errors.type) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.type;
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre comercial es obligatorio";
    }

    if (!formData.nif.trim()) {
      newErrors.nif = "El NIF/CIF es obligatorio";
    } else if (formData.nif.trim().length < 9) {
      newErrors.nif = "El NIF/CIF debe tener al menos 9 caracteres";
    }

    if (!formData.address.trim()) {
      newErrors.address = "La dirección es obligatoria";
    }

    if (!formData.postal_code.trim()) {
      newErrors.postal_code = "El código postal es obligatorio";
    }

    if (!formData.locality.trim()) {
      newErrors.locality = "La localidad es obligatoria";
    }

    if (!formData.province.trim()) {
      newErrors.province = "La provincia es obligatoria";
    }

    if (
      formData.phone &&
      formData.phone.trim() &&
      formData.phone.trim().length < 9
    ) {
      newErrors.phone = "El teléfono debe tener al menos 9 caracteres";
    }

    if (
      formData.email &&
      formData.email.trim() &&
      !formData.email.includes("@")
    ) {
      newErrors.email = "Email inválido";
    }

    if (formData.type === "autonomo" && !formData.irpf_percentage) {
      newErrors.irpf_percentage = "El % IRPF es obligatorio para autónomos";
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

    let result;
    if (mode === "create") {
      // Crear nueva empresa
      result = await createCompany(formData as any);
    } else {
      // Actualizar empresa existente
      if (!company) {
        toast.error("Error: empresa no encontrada");
        setIsLoading(false);
        return;
      }
      result = await updateCompany(
        company.uuid || company.id.toString(),
        formData
      );
    }

    if (result.success) {
      toast.success(
        mode === "create"
          ? "Empresa creada correctamente"
          : "Empresa actualizada correctamente"
      );
      router.refresh();

      // Redirigir a la lista de empresas
      router.push("/companies");
    } else {
      toast.error(result.error || "Error al actualizar empresa");
    }

    setIsLoading(false);
  };

  const handleCancel = () => {
    if (currentUserRole === "superadmin") {
      router.push("/companies");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:items-center">
          <div className="text-center md:text-left w-full md:w-auto">
            <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
              <Building2 className="h-6 w-6" />
              {mode === "create" ? "Nueva Empresa" : "Editar Empresa"}
            </h1>
            <p className="text-sm">
              {mode === "create"
                ? "Crea una nueva empresa en el sistema"
                : "Modifica los datos de la empresa"}
            </p>
          </div>

          <div className="flex gap-2 justify-center md:justify-end w-full md:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "create" ? "Creando..." : "Guardando..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {mode === "create" ? "Crear Empresa" : "Guardar"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Información */}
        {currentUserRole === "admin" && (
          <Alert className="bg-indigo-50">
            <AlertDescription>
              Estás editando los datos de tu empresa. Estos cambios se
              reflejarán en todos los presupuestos que generes a partir de
              ahora.
            </AlertDescription>
          </Alert>
        )}

        {/* Datos Fiscales */}
        <Card className="bg-lime-100">
          <CardHeader>
            <CardTitle>Datos Fiscales</CardTitle>
            <CardDescription>Información fiscal de la empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo - Tabs */}
            <div>
              <Tabs
                value={formData.type}
                onValueChange={handleTabChange}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="empresa"
                    disabled={isLoading}
                    className="bg-lime-500 text-white hover:bg-lime-600 data-[state=active]:bg-white data-[state=active]:text-lime-600"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Empresa
                  </TabsTrigger>
                  <TabsTrigger
                    value="autonomo"
                    disabled={isLoading}
                    className="bg-lime-500 text-white hover:bg-lime-600 data-[state=active]:bg-white data-[state=active]:text-lime-600"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Autónomo
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {errors.type && (
                <p className="text-sm text-red-500 mt-1">{errors.type}</p>
              )}
            </div>

            {/* Empresa: Nombre Comercial 75% + NIF 25% */}
            {formData.type === "empresa" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-9">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Nombre Comercial *"
                        value={formData.name}
                        onChange={handleChange}
                        className={`bg-white ${
                          errors.nombreComercial ? "border-red-500" : ""
                        }`}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mi Empresa S.L.</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="nif"
                        name="nif"
                        type="text"
                        placeholder="NIF/CIF *"
                        value={formData.nif}
                        onChange={handleChange}
                        className={`bg-white ${
                          errors.nif ? "border-red-500" : ""
                        }`}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>B12345678</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.nif && (
                    <p className="text-sm text-red-500 mt-1">{errors.nif}</p>
                  )}
                </div>
              </div>
            )}

            {/* Autónomo: Nombre 50% + NIF 25% + IRPF 25% */}
            {formData.type === "autonomo" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Nombre Comercial *"
                        value={formData.name}
                        onChange={handleChange}
                        className={`bg-white ${
                          errors.name ? "border-red-500" : ""
                        }`}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Juan Pérez</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="nif"
                        name="nif"
                        type="text"
                        placeholder="NIF *"
                        value={formData.nif}
                        onChange={handleChange}
                        className={`bg-white ${
                          errors.nif ? "border-red-500" : ""
                        }`}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>12345678A</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.nif && (
                    <p className="text-sm text-red-500 mt-1">{errors.nif}</p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="irpf_percentage"
                        name="irpf_percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="% IRPF *"
                        value={formData.irpf_percentage ?? ""}
                        onChange={handleChange}
                        className={`bg-white ${
                          errors.irpf_percentage ? "border-red-500" : ""
                        }`}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>15</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.irpf_percentage && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.irpf_percentage}
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
                      id="address"
                      name="address"
                      type="text"
                      placeholder="Dirección *"
                      value={formData.address}
                      onChange={handleChange}
                      className={`bg-white ${
                        errors.address ? "border-red-500" : ""
                      }`}
                      disabled={isLoading}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Calle Real, 123</p>
                  </TooltipContent>
                </Tooltip>
                {errors.address && (
                  <p className="text-sm text-red-500 mt-1">{errors.address}</p>
                )}
              </div>

              <div className="md:col-span-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      id="postal_code"
                      name="postal_code"
                      type="text"
                      placeholder="Código Postal *"
                      maxLength={5}
                      value={formData.postal_code}
                      onChange={handleChange}
                      className={`bg-white ${
                        errors.postal_code ? "border-red-500" : ""
                      }`}
                      disabled={isLoading}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>41200</p>
                  </TooltipContent>
                </Tooltip>
                {errors.postal_code && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.postal_code}
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
                      id="locality"
                      name="locality"
                      type="text"
                      placeholder="Localidad *"
                      value={formData.locality}
                      onChange={handleChange}
                      className={`bg-white ${
                        errors.locality ? "border-red-500" : ""
                      }`}
                      disabled={isLoading}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Alcalá del Río</p>
                  </TooltipContent>
                </Tooltip>
                {errors.locality && (
                  <p className="text-sm text-red-500 mt-1">{errors.locality}</p>
                )}
              </div>

              <div className="md:col-span-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      id="province"
                      name="province"
                      type="text"
                      placeholder="Provincia *"
                      value={formData.province}
                      onChange={handleChange}
                      className={`bg-white ${
                        errors.province ? "border-red-500" : ""
                      }`}
                      disabled={isLoading}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sevilla</p>
                  </TooltipContent>
                </Tooltip>
                {errors.province && (
                  <p className="text-sm text-red-500 mt-1">{errors.province}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datos de Contacto */}
        <Card className="bg-lime-100">
          <CardHeader>
            <CardTitle>Datos de Contacto</CardTitle>
            <CardDescription>
              Información de contacto de la empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Teléfono 25% + Email 50% + Web 25% */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Teléfono"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`bg-white ${
                        errors.phone ? "border-red-500" : ""
                      }`}
                      disabled={isLoading}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>678 912 345</p>
                  </TooltipContent>
                </Tooltip>
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>

              <div className="md:col-span-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`bg-white ${
                        errors.email ? "border-red-500" : ""
                      }`}
                      disabled={isLoading}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>contacto@empresa.com</p>
                  </TooltipContent>
                </Tooltip>
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              <div className="md:col-span-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      id="web"
                      name="web"
                      type="url"
                      placeholder="Sitio Web"
                      value={formData.web}
                      onChange={handleChange}
                      className={`bg-white ${
                        errors.web ? "border-red-500" : ""
                      }`}
                      disabled={isLoading}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>www.empresa.com</p>
                  </TooltipContent>
                </Tooltip>
                {errors.web && (
                  <p className="text-sm text-red-500 mt-1">{errors.web}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información de empresa */}
        {/* Información Adicional - Solo en modo edición */}
        {mode === "edit" && company && (
          <Card className="bg-lime-100">
            <CardHeader>
              <CardTitle>Información Adicional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>ID de la empresa:</span>
                <span className="font-mono">{company.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Creada el:</span>
                <span>
                  {new Date(company.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Última modificación:</span>
                <span>
                  {new Date(company.updated_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </TooltipProvider>
  );
}
