"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TariffFormFields } from "./TariffFormFields";
import { CSVUploadPreview } from "./CSVUploadPreview";
import { Layers, Play, X, Save } from "lucide-react";
import {
  createTariff,
  updateTariff,
  type TariffFormData,
} from "@/app/actions/tariffs";
import { Tariff } from "@/lib/types/database";
import { isValidNIF, getNIFErrorMessage } from "@/lib/helpers/nif-validator";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    status: (initialData?.status as "Borrador" | "Activa" | "Inactiva") || "Borrador",
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
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  /**
   * Validación mínima para guardar como borrador
   * Solo requiere título y CSV
   */
  const validateMinimal = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const newErrors: Record<string, string> = {};

    // Solo campos mínimos para borrador
    if (!formData.title || formData.title.trim() === "") {
      newErrors.title = "El título es obligatorio";
    }

    if (!csvData) {
      newErrors.csv = "Debe cargar un archivo CSV válido";
    }

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
    };
  };

  /**
   * Validación completa para activar tarifa
   * Requiere todos los campos
   */
  const validateComplete = (): {
    isValid: boolean;
    errors: Record<string, string>;
    missingFields: string[];
  } => {
    const newErrors: Record<string, string> = {};
    const missing: string[] = [];

    // Datos Tarifa
    if (!formData.title || formData.title.trim() === "") {
      newErrors.title = "El título es obligatorio";
      missing.push("Título");
    }
    if (!formData.validity || formData.validity < 1) {
      newErrors.validity = "La validez debe ser al menos 1 día";
      missing.push("Validez");
    }

    // Datos Empresa
    if (!formData.logo_url || formData.logo_url.trim() === "") {
      newErrors.logo_url = "El logo es obligatorio";
      missing.push("Logo");
    }
    if (!formData.name || formData.name.trim() === "") {
      newErrors.name = "El nombre de empresa es obligatorio";
      missing.push("Nombre de empresa");
    }
    if (!formData.nif || formData.nif.trim() === "") {
      newErrors.nif = "El NIF/CIF es obligatorio";
      missing.push("NIF/CIF");
    } else {
      // Validar formato y letra de control del NIF/CIF
      const nifCleaned = formData.nif.trim().toUpperCase();
      if (!isValidNIF(nifCleaned)) {
        newErrors.nif = getNIFErrorMessage(nifCleaned, "empresa");
        missing.push("NIF/CIF válido");
      }
    }
    if (!formData.address || formData.address.trim() === "") {
      newErrors.address = "La dirección es obligatoria";
      missing.push("Dirección");
    }
    if (!formData.contact || formData.contact.trim() === "") {
      newErrors.contact = "El contacto es obligatorio";
      missing.push("Contacto");
    }

    // Configuración Visual
    if (!formData.template || formData.template.trim() === "") {
      newErrors.template = "La plantilla es obligatoria";
      missing.push("Plantilla");
    }
    if (!formData.primary_color || formData.primary_color.trim() === "") {
      newErrors.primary_color = "El color primario es obligatorio";
      missing.push("Color primario");
    }
    if (!formData.secondary_color || formData.secondary_color.trim() === "") {
      newErrors.secondary_color = "El color secundario es obligatorio";
      missing.push("Color secundario");
    }

    // Notas PDF
    if (!formData.summary_note || formData.summary_note.trim() === "") {
      newErrors.summary_note = "La nota resumen es obligatoria";
      missing.push("Nota resumen");
    }
    if (!formData.conditions_note || formData.conditions_note.trim() === "") {
      newErrors.conditions_note = "Las condiciones son obligatorias";
      missing.push("Condiciones");
    }

    // Notas Formulario
    if (!formData.legal_note || formData.legal_note.trim() === "") {
      newErrors.legal_note = "Las notas legales son obligatorias";
      missing.push("Notas legales");
    }

    // CSV Data
    if (!csvData) {
      newErrors.csv = "Debe cargar un archivo CSV válido";
      missing.push("Archivo CSV");
    }

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
      missingFields: missing,
    };
  };

  const handleSave = async () => {
    setIsLoading(true);
    setErrors({});

    // Determinar qué tipo de validación usar según el estado deseado
    const wantsActive = formData.status === "Activa";

    if (wantsActive) {
      // Si quiere activar, validar todos los campos
      const validation = validateComplete();

      if (!validation.isValid) {
        setErrors(validation.errors);
        setMissingFields(validation.missingFields);

        // Mostrar mensaje general
        setErrors((prev) => ({
          ...prev,
          general: `Para activar la tarifa debe completar todos los campos obligatorios (faltan ${validation.missingFields.length} campos)`,
        }));

        // Scroll al primer error
        const firstErrorField = Object.keys(validation.errors)[0];
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        setIsLoading(false);
        return;
      }
    } else {
      // Si es borrador, solo validar campos mínimos
      const validation = validateMinimal();

      if (!validation.isValid) {
        setErrors(validation.errors);

        setErrors((prev) => ({
          ...prev,
          general: `Complete los campos mínimos para guardar: ${Object.keys(validation.errors).join(", ")}`,
        }));

        // Scroll al primer error
        const firstErrorField = Object.keys(validation.errors)[0];
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        setIsLoading(false);
        return;
      }

      // Si pasa validación mínima pero está en borrador, verificar si faltan campos
      const completeValidation = validateComplete();
      if (!completeValidation.isValid) {
        // Guardar pero mostrar advertencia
        setMissingFields(completeValidation.missingFields);
      }
    }

    try {
      const dataWithCSV = {
        ...formData,
        // Forzar estado a Borrador si faltan campos
        status: formData.status === "Activa" ? "Activa" : "Borrador",
        json_tariff_data: csvData,
      };

      let result;
      if (mode === "create") {
        result = await createTariff(dataWithCSV);
      } else {
        if (!tariffId) {
          setErrors({ general: "Error: ID de tarifa no encontrado" });
          setIsLoading(false);
          return;
        }
        result = await updateTariff(tariffId, dataWithCSV);
      }

      if (result.success) {
        // Si se guardó como borrador y faltan campos, mostrar advertencia
        if (dataWithCSV.status === "Borrador" && missingFields.length > 0) {
          setShowIncompleteDialog(true);
        } else {
          router.push("/tariffs");
        }
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
                  className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white h-8 px-3 gap-1.5"
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
                className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="min-w-[100px] bg-lime-500 hover:bg-lime-600"
              >
                <Save className="mr-2 h-4 w-4" />
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

        {/* Botones al final de la página */}
        <div className="flex gap-2 justify-center md:justify-end mt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="min-w-[100px] bg-lime-500 hover:bg-lime-600"
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Dialog de advertencia para tarifas incompletas */}
      <AlertDialog open={showIncompleteDialog} onOpenChange={setShowIncompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Tarifa guardada como Borrador</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                La tarifa se ha guardado correctamente, pero está <strong>incompleta</strong> y permanecerá en estado <strong>Borrador</strong>.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="font-semibold text-yellow-900 mb-2">Campos faltantes:</p>
                <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                  {missingFields.map((field, index) => (
                    <li key={index}>{field}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-semibold text-red-900 mb-2">⛔ Restricciones:</p>
                <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                  <li>No podrá crear presupuestos con esta tarifa</li>
                  <li>No podrá cambiar el estado hasta completar todos los campos</li>
                </ul>
              </div>

              <p className="text-sm text-gray-600">
                Para activar la tarifa y poder usarla en presupuestos, complete los campos faltantes y cambie el estado a <strong>Activa</strong>.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowIncompleteDialog(false);
                router.push("/tariffs");
              }}
              className="bg-lime-500 hover:bg-lime-600"
            >
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
