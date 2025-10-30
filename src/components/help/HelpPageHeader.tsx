"use client";

import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function HelpPageHeader() {
  const router = useRouter();

  return (
    <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="text-center md:text-left w-full md:w-auto">
        <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
          <HelpCircle className="h-6 w-6" />
          Centro de Ayuda
        </h1>
        <p className="text-sm">
          Encuentra toda la ayuda e información para aprovechar al máximo la
          aplicación
        </p>
      </div>

      <div className="w-full md:w-auto flex justify-center md:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white w-full md:w-auto"
        >
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
