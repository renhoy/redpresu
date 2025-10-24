"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TariffFormFields } from "./TariffFormFields";
import { CSVUploadPreview } from "./CSVUploadPreview";
import { Layers, Play } from "lucide-react";
import {
  createTariff,
  updateTariff,
  type TariffFormData,
} from "@/app/actions/tariffs";
import { Tariff } from "@/lib/types/database";
import { isValidNIF, getNIFErrorMessage } from "@/lib/helpers/nif-validator";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

interface TariffFormProps {
  mode: "create" | "edit";
  tariffId?: string;
  initialData?: Tariff;
}

export function TariffForm({ mode, tariffId, initialData }: TariffFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<TariffFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    validity: initialData?.validity || 30,
    status: (initialData?.status as "Activa" | "Inactiva") || "Activa",
    logo_url: initialData?.logo_url || "",
    name: initialData?.name || "",
    nif: initialData?.nif || "",
    address: initialData?.address || "",
    contact: initialData?.contact || "",
    template: initialData?.template || "modern",
    primary_color: initialData?.primary_color || "#e8951c",
    secondary_color: initialData?.secondary_color || "#109c61",
    summary_note: initialData?.summary_note || "",
    conditions_note: initialData?.conditions_note || "",
    legal_note: initialData?.legal_note || "",
    json_tariff_data: initialData?.json_tariff_data || null,
  });

  const [csvData, setCsvData] = useState<unknown>(
    initialData?.json_tariff_data || null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const newErrors: Record<string, string> = {};

    // Datos Tarifa
    if (!formData.title || formData.title.trim() === "") {
      newErrors.title = "El título es obligatorio";
    }
    if (!formData.validity || formData.validity < 1) {
      newErrors.validity = "La validez debe ser al menos 1 día";
    }
    if (!formData.status) {
      newErrors.status = "El estado es obligatorio";
    }

    // Datos Empresa
    if (!formData.logo_url || formData.logo_url.trim() === "") {
      newErrors.logo_url = "El logo es obligatorio";
    }
    if (!formData.name || formData.name.trim() === "") {
      newErrors.name = "El nombre de empresa es obligatorio";
    }
    if (!formData.nif || formData.nif.trim() === "") {
      newErrors.nif = "El NIF/CIF es obligatorio";
    } else {
      // Validar formato y letra de control del NIF/CIF
      const nifCleaned = formData.nif.trim().toUpperCase();
      if (!isValidNIF(nifCleaned)) {
        // Para tarifas asumimos que es empresa (CIF) por defecto
        newErrors.nif = getNIFErrorMessage(nifCleaned, "empresa");
      }
    }
    if (!formData.address || formData.address.trim() === "") {
      newErrors.address = "La dirección es obligatoria";
    }
    if (!formData.contact || formData.contact.trim() === "") {
      newErrors.contact = "El contacto es obligatorio";
    }

    // Configuración Visual
    if (!formData.template || formData.template.trim() === "") {
      newErrors.template = "La plantilla es obligatoria";
    }
    if (!formData.primary_color || formData.primary_color.trim() === "") {
      newErrors.primary_color = "El color primario es obligatorio";
    }
    if (!formData.secondary_color || formData.secondary_color.trim() === "") {
      newErrors.secondary_color = "El color secundario es obligatorio";
    }

    // Notas PDF
    if (!formData.summary_note || formData.summary_note.trim() === "") {
      newErrors.summary_note = "La nota resumen es obligatoria";
    }
    if (!formData.conditions_note || formData.conditions_note.trim() === "") {
      newErrors.conditions_note = "Las condiciones son obligatorias";
    }

    // Notas Formulario
    if (!formData.legal_note || formData.legal_note.trim() === "") {
      newErrors.legal_note = "Las notas legales son obligatorias";
    }

    // CSV Data
    if (!csvData) {
      newErrors.csv = "Debe cargar un archivo CSV válido";
    }

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
    };
  };

  const handleSave = async () => {
    // Validar formulario
    const validation = validateForm();

    if (!validation.isValid) {
      setErrors(validation.errors);

      // Mostrar mensaje general
      setErrors((prev) => ({
        ...prev,
        general: `Por favor, complete todos los campos obligatorios (${
          Object.keys(validation.errors).length
        } errores encontrados)`,
      }));

      // Scroll al primer error
      const firstErrorField = Object.keys(validation.errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const dataWithCSV = {
        ...formData,
        json_tariff_data: csvData,
      };

      let result;
      if (mode === "create") {
        result = await createTariff(dataWithCSV);
      } else {
        if (!tariffId) {
          setErrors({ general: "Error: ID de tarifa no encontrado" });
          return;
        }
        result = await updateTariff(tariffId, dataWithCSV);
      }

      if (result.success) {
        router.push("/tariffs");
      } else {
        setErrors({ general: result.error || "Error al guardar la tarifa" });
      }
    } catch {
      setErrors({ general: "Error inesperado al guardar" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/tariffs");
  };

  const handleFormDataChange = (newData: Partial<TariffFormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
    // Limpiar errores del campo modificado
    if (errors) {
      const clearedErrors = { ...errors };
      Object.keys(newData).forEach((key) => {
        delete clearedErrors[key];
      });
      setErrors(clearedErrors);
    }
  };

  const handleCSVChange = (data: unknown) => {
    setCsvData(data);
    if (errors.csv) {
      const clearedErrors = { ...errors };
      delete clearedErrors.csv;
      setErrors(clearedErrors);
    }
  };

  const startTour = async (tourId: string) => {
    try {
      const response = await fetch("/help/tours.json");
      const tours = await response.json();
      const tourConfig = tours[tourId];

      if (!tourConfig) {
        console.error(`Tour "${tourId}" not found`);
        return;
      }

      const driverObj = driver({
        showProgress: true,
        steps: tourConfig.steps,
        nextBtnText: "Siguiente →",
        prevBtnText: "← Anterior",
        doneBtnText: "Finalizar",
        popoverClass: "driver-popover-lime",
      });

      driverObj.drive();
    } catch (error) {
      console.error("Error loading tour:", error);
    }
  };

  return (
    <div className="min-h-screen bg-lime-50">
      {/* Línea 2: Título + Botones (sticky) */}
      <div className="sticky top-16 z-40 bg-lime-50 border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:items-center">
            <div className="text-center md:text-left w-full md:w-auto">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <h1 className="text-3xl font-bold text-black flex items-center gap-2">
                  <Layers className="h-6 w-6" />
                  {mode === "create" ? "Nueva Tarifa" : "Editar Tarifa"}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startTour("tarifa-create")}
                  className="border-lime-500 text-lime-600 hover:bg-lime-50 h-8 px-3 gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Guía</span>
                </Button>
              </div>
              <p className="text-sm text-black">
                Complete los datos de la tarifa
              </p>
            </div>
            <div className="flex gap-2 justify-center md:justify-end w-full md:w-auto">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="border-lime-500 text-lime-600 hover:bg-lime-50"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="min-w-[100px] bg-lime-500 hover:bg-lime-600"
              >
                {isLoading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>

          {/* Mostrar errores generales */}
          {errors.general && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{errors.general}</p>
            </div>
          )}
        </div>
      </div>

      {/* Línea 3: Contenido (scroll) */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna izquierda - Formulario (50%) */}
          <div>
            <TariffFormFields
              data={formData}
              errors={errors}
              onChange={handleFormDataChange}
            />
          </div>

          {/* Columna derecha - CSV y Preview (50%) */}
          <div>
            <CSVUploadPreview
              data={csvData}
              error={errors.csv}
              onChange={handleCSVChange}
              primaryColor={formData.primary_color}
              secondaryColor={formData.secondary_color}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
