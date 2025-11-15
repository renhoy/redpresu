'use client';

import { useState } from 'react';
import { Shield, FileText, History, BookOpen, Globe, ArrowLeft, List } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CompanySelector } from '@/components/settings/company-selector';
import { RulesEditor } from '@/components/settings/rules-editor';
import { AuditLog } from '@/components/settings/audit-log';
import { RulesList } from '@/components/settings/rules-list';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type ScopeType = 'global' | 'specific';

export default function BusinessRulesPage() {
  const [scope, setScope] = useState<ScopeType>('global'); // Por defecto: todas las empresas
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('global');

  const handleScopeChange = (newScope: ScopeType) => {
    setScope(newScope);
    if (newScope === 'global') {
      setSelectedCompanyId('global');
    } else {
      setSelectedCompanyId(''); // Reset cuando cambia a específica
    }
  };

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header con botón volver */}
        <div className="mb-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Volver
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
            <Shield className="h-7 w-7 text-lime-600" />
            Reglas de Negocio
          </h1>
          <p className="text-sm text-muted-foreground">
            Configura reglas automáticas por empresa (solo superadmin)
          </p>
        </div>

        {/* Card: Seleccionar Alcance */}
        <Card className="mb-6 bg-lime-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-lime-600" />
              1. Seleccionar Alcance
            </CardTitle>
            <CardDescription>
              Define si las reglas aplican a todas las empresas o a una específica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Radio Group: Global vs Específica */}
            <RadioGroup
              value={scope}
              onValueChange={(value) => handleScopeChange(value as ScopeType)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-4 border rounded-lg bg-white hover:bg-lime-50 transition-colors">
                <RadioGroupItem value="global" id="scope-global" />
                <Label htmlFor="scope-global" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-lime-600" />
                    <div>
                      <p className="font-semibold">Todas las empresas</p>
                      <p className="text-sm text-muted-foreground">
                        Reglas globales que se aplican a todas las empresas del sistema
                      </p>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-4 border rounded-lg bg-white hover:bg-lime-50 transition-colors">
                <RadioGroupItem value="specific" id="scope-specific" />
                <Label htmlFor="scope-specific" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-lime-600" />
                    <div>
                      <p className="font-semibold">Empresa específica</p>
                      <p className="text-sm text-muted-foreground">
                        Reglas personalizadas para una empresa en particular
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {/* Tabla de empresas - solo si scope es 'specific' */}
            {scope === 'specific' && (
              <div className="mt-6">
                <Label className="mb-3 block text-base font-semibold">
                  Selecciona la empresa:
                </Label>
                <CompanySelector
                  selectedCompanyId={selectedCompanyId}
                  onCompanySelect={setSelectedCompanyId}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mensaje si scope es específica pero no hay empresa seleccionada */}
        {scope === 'specific' && !selectedCompanyId ? (
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
                  {scope === 'global' && (
                    <span className="ml-2 text-xs font-normal px-2 py-1 bg-lime-600 text-white rounded-full">
                      Global
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {scope === 'global'
                    ? 'Editando reglas que se aplican a TODAS las empresas del sistema'
                    : 'Editando reglas personalizadas para esta empresa específica'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="editor" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 max-w-2xl">
                    <TabsTrigger value="editor" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Editor
                    </TabsTrigger>
                    <TabsTrigger value="list" className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      Lista
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

                  <TabsContent value="list" className="mt-6">
                    <RulesList
                      selectedCompanyId={selectedCompanyId}
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

        {/* Botón volver (inferior) */}
        <div className="flex justify-center pt-8">
          <Link href="/settings">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
