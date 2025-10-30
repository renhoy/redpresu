"use client";

import { FlaskConical, Clock } from "lucide-react";

interface TestingHeaderProps {
  mockTime: string | null;
  currentTime: string;
}

export function TestingHeader({ mockTime, currentTime }: TestingHeaderProps) {
  const isMockActive = mockTime !== null;

  return (
    <div className="mb-6">
      {/* Título */}
      <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2 mb-2">
        <FlaskConical className="h-6 w-6 text-orange-600" />
        Testing de Suscripciones
      </h1>

      {/* Subtítulo con estado */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        {isMockActive ? (
          <div className="flex items-center gap-2">
            <span className="font-medium text-orange-600">Mock Time Activo:</span>
            <span className="font-mono bg-orange-100 px-2 py-1 rounded text-orange-800">
              {new Date(mockTime).toLocaleString("es-ES")}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-600">Tiempo Real:</span>
            <span className="font-mono bg-green-100 px-2 py-1 rounded text-green-800">
              {new Date(currentTime).toLocaleString("es-ES")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
