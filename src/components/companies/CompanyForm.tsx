"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCompany, type Company } from "@/app/actions/companies";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface CompanyFormProps {
  company: Company;
  currentUserRole: string;
}

interface FormData {
  name: string;
  type: "empresa" | "autonomo";
  nif: string;
  address: string;
  phone: string;
  email: string;
}

export default function CompanyForm({ company, currentUserRole }: CompanyFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: company.name,
    type: company.type,
    nif: company.nif,
    address: company.address,
    phone: company.phone || "",
    email: company.email || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpiar error del campo
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (value: "empresa" | "autonomo") => {
    setFormData((prev) => ({ ...prev, type: value }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es obligatorio";
    }

    if (!formData.nif.trim()) {
      newErrors.nif = "El NIF/CIF es obligatorio";
    } else if (formData.nif.trim().length < 9) {
      newErrors.nif = "El NIF/CIF debe tener al menos 9 caracteres";
    }

    if (!formData.address.trim()) {
      newErrors.address = "La dirección es obligatoria";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El teléfono es obligatorio";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es obligatorio";
    } else if (!formData.email.includes("@")) {
      newErrors.email = "Email inválido";
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

    const result = await updateCompany(company.id.toString(), formData);

    if (result.success) {
      toast.success("Empresa actualizada correctamente");
      router.refresh();

      // Redirigir según rol
      if (currentUserRole === "superadmin") {
        router.push("/companies");
      } else {
        // Admin permanece en la página de edición
        router.refresh();
      }
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-cyan-600">Editar Empresa</h1>
          <p className="text-sm text-cyan-600">
            Modifica los datos de tu empresa
          </p>
        </div>

        <div className="flex gap-2">
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

      {/* Información */}
      {currentUserRole === "admin" && (
        <Alert>
          <AlertDescription>
            Estás editando los datos de tu empresa. Estos cambios se reflejarán en
            todos los presupuestos que generes.
          </AlertDescription>
        </Alert>
      )}

      {/* Datos Básicos */}
      <Card>
        <CardHeader>
          <CardTitle>Datos Básicos</CardTitle>
          <CardDescription>
            Información principal de la empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nombre de la empresa"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="type">
                Tipo <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.type} onValueChange={handleSelectChange}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="autonomo">Autónomo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* NIF/CIF */}
          <div className="space-y-2">
            <Label htmlFor="nif">
              NIF/CIF <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nif"
              name="nif"
              value={formData.nif}
              onChange={handleChange}
              placeholder="B12345678 o 12345678A"
              className={errors.nif ? "border-red-500" : ""}
            />
            {errors.nif && <p className="text-sm text-red-500">{errors.nif}</p>}
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <Label htmlFor="address">
              Dirección <span className="text-red-500">*</span>
            </Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Calle, número, ciudad, código postal"
              className={errors.address ? "border-red-500" : ""}
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Datos de Contacto */}
      <Card>
        <CardHeader>
          <CardTitle>Datos de Contacto</CardTitle>
          <CardDescription>
            Información de contacto de la empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Teléfono <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+34 600 000 000"
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contacto@empresa.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información de empresa */}
      <Card>
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
    </form>
  );
}
