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
  nombre: string;
  tipo: "empresa" | "autonomo";
  cif: string;
  direccion: string;
  telefono: string;
  email: string;
}

export default function CompanyForm({ company, currentUserRole }: CompanyFormProps) {
  const [formData, setFormData] = useState<FormData>({
    nombre: company.nombre,
    tipo: company.tipo,
    cif: company.cif,
    direccion: company.direccion,
    telefono: company.telefono,
    email: company.email,
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
    setFormData((prev) => ({ ...prev, tipo: value }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio";
    }

    if (!formData.cif.trim()) {
      newErrors.cif = "El CIF/NIF es obligatorio";
    } else if (formData.cif.trim().length < 9) {
      newErrors.cif = "El CIF/NIF debe tener al menos 9 caracteres";
    }

    if (!formData.direccion.trim()) {
      newErrors.direccion = "La dirección es obligatoria";
    }

    if (!formData.telefono.trim()) {
      newErrors.telefono = "El teléfono es obligatorio";
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
              <Label htmlFor="nombre">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Nombre de la empresa"
                className={errors.nombre ? "border-red-500" : ""}
              />
              {errors.nombre && (
                <p className="text-sm text-red-500">{errors.nombre}</p>
              )}
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="tipo">
                Tipo <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.tipo} onValueChange={handleSelectChange}>
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="autonomo">Autónomo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CIF/NIF */}
          <div className="space-y-2">
            <Label htmlFor="cif">
              CIF/NIF <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cif"
              name="cif"
              value={formData.cif}
              onChange={handleChange}
              placeholder="B12345678 o 12345678A"
              className={errors.cif ? "border-red-500" : ""}
            />
            {errors.cif && <p className="text-sm text-red-500">{errors.cif}</p>}
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <Label htmlFor="direccion">
              Dirección <span className="text-red-500">*</span>
            </Label>
            <Input
              id="direccion"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Calle, número, ciudad, código postal"
              className={errors.direccion ? "border-red-500" : ""}
            />
            {errors.direccion && (
              <p className="text-sm text-red-500">{errors.direccion}</p>
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
              <Label htmlFor="telefono">
                Teléfono <span className="text-red-500">*</span>
              </Label>
              <Input
                id="telefono"
                name="telefono"
                type="tel"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="+34 600 000 000"
                className={errors.telefono ? "border-red-500" : ""}
              />
              {errors.telefono && (
                <p className="text-sm text-red-500">{errors.telefono}</p>
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
