'use client';

import { useState } from 'react';
import { Shield, FileText, History, BookOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CompanySelector } from '@/components/settings/company-selector';
import { RulesEditor } from '@/components/settings/rules-editor';
import { AuditLog } from '@/components/settings/audit-log';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function BusinessRulesPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 text-center md:text-left">
          <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
            <Shield className="h-7 w-7 text-lime-600" />
            Reglas de Negocio
          </h1>
          <p className="text-sm text-muted-foreground">
            Configura reglas automáticas por empresa (solo superadmin)
          </p>
        </div>

        {/* Card: Seleccionar Empresa */}
        <Card className="mb-6 bg-lime-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-lime-600" />
              1. Seleccionar Empresa
            </CardTitle>
            <CardDescription>
              Selecciona la empresa para gestionar sus reglas de negocio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompanySelector
              selectedCompanyId={selectedCompanyId}
              onCompanySelect={setSelectedCompanyId}
            />
          </CardContent>
        </Card>

        {/* Mensaje si no hay empresa seleccionada */}
        {!selectedCompanyId ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Selecciona una empresa para comenzar</p>
              <p className="text-sm mt-2">
                Podrás editar las reglas y ver el historial de cambios
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Card: Tabs - Editor y Historial */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-lime-600" />
                  2. Gestionar Reglas
                </CardTitle>
                <CardDescription>
                  Edita las reglas o revisa el historial de cambios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="editor" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="editor" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Editor
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Historial
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="editor" className="mt-6">
                    <RulesEditor
                      selectedCompanyId={selectedCompanyId}
                      onCompanyChange={setSelectedCompanyId}
                    />
                  </TabsContent>

                  <TabsContent value="audit" className="mt-6">
                    <AuditLog
                      selectedCompanyId={selectedCompanyId}
                      onCompanyChange={setSelectedCompanyId}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Card: Documentación */}
            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Documentación
                </CardTitle>
                <CardDescription>
                  Guía rápida sobre cómo usar el sistema de reglas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-2">
                  <p className="font-semibold">📋 Estructura JSON:</p>
                  <p className="text-muted-foreground">
                    Las reglas usan formato BusinessRulesConfig con campos: version, updated_at,
                    updated_by y un array de rules.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">🧩 Condiciones (JsonLogic):</p>
                  <p className="text-muted-foreground">
                    Usa sintaxis JsonLogic para definir cuándo se aplica una regla. Ejemplo:{' '}
                    <code className="bg-muted px-1 rounded text-xs">
                      {'{"==": [{"var": "plan"}, "PRO"]}'}
                    </code>
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">⚡ Acciones disponibles:</p>
                  <ul className="text-muted-foreground list-disc list-inside ml-2 space-y-1">
                    <li>
                      <code className="bg-muted px-1 rounded text-xs">allow</code> - Permitir o
                      bloquear acción
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded text-xs">max_limit</code> - Establecer
                      límite máximo
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded text-xs">send_email</code> - Enviar
                      email automático
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded text-xs">downgrade_to</code> - Cambiar
                      plan automáticamente
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded text-xs">block_feature</code> - Bloquear
                      funcionalidad
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded text-xs">schedule_action</code> -
                      Programar acción futura
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">✅ Validación:</p>
                  <p className="text-muted-foreground">
                    Usa el botón "Validar" para probar las reglas antes de guardarlas. Esto verifica
                    sintaxis y prueba con datos de ejemplo.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">⏪ Rollback:</p>
                  <p className="text-muted-foreground">
                    Puedes revertir a la versión anterior en cualquier momento. Esto crea una nueva
                    versión con el contenido previo.
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <Link href="/docs/GUIA_REGLAS_NEGOCIO.md" target="_blank">
                    <Button variant="outline" size="sm" className="w-full md:w-auto">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Ver Guía Completa
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
