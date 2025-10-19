"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createUser,
  updateUser,
  type CreateUserData,
  type UpdateUserData,
  type User,
} from "@/app/actions/users";
import {
  getIssuers,
  registerUser,
  type IssuerData,
  type RegisterData,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Copy, Check, Search, Filter } from "lucide-react";
import { toast } from "sonner";

interface UserFormProps {
  mode: "create" | "edit";
  user?: User;
  empresaId: number;
  currentUserRole?: string;
}

interface FormData {
  email: string;
  name: string;
  last_name: string;
  role: "vendedor" | "admin" | "superadmin";
  status?: "active" | "inactive" | "pending";
  issuer_id?: string; // ID del emisor al que se asignará el usuario (solo superadmin)
}

export default function UserForm({
  mode,
  user,
  empresaId,
  currentUserRole,
}: UserFormProps) {
  const [formData, setFormData] = useState<FormData>({
    email: user?.email || "",
    name: user?.nombre || "",
    last_name: user?.apellidos || "",
    role: user?.role || "vendedor",
    status: user?.status || "active",
    issuer_id: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null
  );
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [issuers, setIssuers] = useState<IssuerData[]>([]);
  const [loadingIssuers, setLoadingIssuers] = useState(false);
  const [selectedIssuer, setSelectedIssuer] = useState<IssuerData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "empresa" | "autonomo">(
    "all"
  );

  const router = useRouter();

  // Generar password temporal segura
  const generateTemporaryPassword = (): string => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Cargar emisores si el usuario es superadmin
  useEffect(() => {
    if (currentUserRole === "superadmin" && mode === "create") {
      loadIssuers();
    }
  }, [currentUserRole, mode]);

  const loadIssuers = async () => {
    setLoadingIssuers(true);
    try {
      const result = await getIssuers();
      if (result.success && result.data) {
        setIssuers(result.data);
      } else {
        toast.error(result.error || "Error al cargar emisores");
      }
    } catch (error) {
      toast.error("Error al cargar emisores");
    } finally {
      setLoadingIssuers(false);
    }
  };

  // Manejar selección de empresa
  const handleIssuerChange = (issuerId: string) => {
    const issuer = issuers.find((i) => i.id === issuerId);
    if (issuer) {
      setSelectedIssuer(issuer);
      setFormData((prev) => ({ ...prev, issuer_id: issuerId }));

      // Limpiar error si existe
      if (errors.issuer_id) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.issuer_id;
          return newErrors;
        });
      }
    }
  };

  const handleInputChange =
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Limpiar error del campo
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    };

  const handleSelectChange = (field: keyof FormData) => (value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Limpiar error del campo
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (mode === "create") {
        // Si es superadmin, validar y usar registerUser
        if (currentUserRole === "superadmin") {
          // Validar que se haya seleccionado una empresa
          if (!formData.issuer_id || !selectedIssuer) {
            setErrors({ issuer_id: "Debes seleccionar una empresa" });
            setIsLoading(false);
            return;
          }

          // Generar password temporal
          const temporaryPassword = generateTemporaryPassword();

          const registerData: RegisterData = {
            email: formData.email,
            name: formData.nombre,
            last_name: formData.apellidos,
            password: temporaryPassword,
            tipo: "empresa", // No importa, no se usará
            nombreComercial: "", // No importa, no se usará
            nif: "", // No importa, no se usará
            direccionFiscal: "", // No importa, no se usará
            issuer_id: formData.issuer_id,
            role: formData.role,
          };

          const result = await registerUser(registerData);

          if (!result.success) {
            setErrors({ general: result.error || "Error al crear usuario" });
            return;
          }

          // Mostrar password temporal
          setTemporaryPassword(temporaryPassword);
          toast.success("Usuario creado correctamente");
        } else {
          // Flujo normal para admin (crear usuario de su misma empresa)
          const createData: CreateUserData = {
            email: formData.email,
            name: formData.nombre,
            last_name: formData.apellidos,
            role: formData.role,
            company_id: empresaId,
          };

          const result = await createUser(createData);

          if (!result.success) {
            setErrors({ general: result.error || "Error al crear usuario" });
            return;
          }

          // Mostrar password temporal
          if (result.temporaryPassword) {
            setTemporaryPassword(result.temporaryPassword);
          }

          toast.success("Usuario creado correctamente");
        }

        // No redirigir aún, mostrar password primero
      } else {
        // Actualizar usuario
        const updateData: UpdateUserData = {
          name: formData.nombre !== user?.nombre ? formData.nombre : undefined,
          last_name:
            formData.apellidos !== user?.apellidos
              ? formData.apellidos
              : undefined,
          role: formData.role !== user?.role ? formData.role : undefined,
          status:
            formData.status !== user?.status ? formData.status : undefined,
        };

        // Si no hay cambios
        if (Object.values(updateData).every((v) => v === undefined)) {
          toast.info("No hay cambios que guardar");
          return;
        }

        const result = await updateUser(user!.id, updateData);

        if (!result.success) {
          setErrors({ general: result.error || "Error al actualizar usuario" });
          return;
        }

        toast.success("Usuario actualizado correctamente");
        router.push("/users");
        router.refresh();
      }
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : "Error inesperado",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopiedPassword(true);
      toast.success("Contraseña copiada al portapapeles");

      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (error) {
      toast.error("Error al copiar contraseña");
    }
  };

  const handleGoToUsers = () => {
    router.push("/users");
    router.refresh();
  };

  // Determinar qué roles puede asignar el usuario actual
  const getAvailableRoles = () => {
    if (currentUserRole === "superadmin") {
      // Superadmin puede crear cualquier rol
      return [
        { value: "vendedor", label: "Comercial" },
        { value: "admin", label: "Admin" },
        { value: "superadmin", label: "Superadmin" },
      ];
    } else if (currentUserRole === "admin") {
      // Admin solo puede crear admin y vendedor (NO superadmin)
      return [
        { value: "vendedor", label: "Comercial" },
        { value: "admin", label: "Admin" },
      ];
    } else {
      // Comercial no puede crear usuarios (no debería llegar aquí)
      return [{ value: "vendedor", label: "Comercial" }];
    }
  };

  const availableRoles = getAvailableRoles();

  // Filtrar issuers según búsqueda y tipo
  const filteredIssuers = issuers.filter((issuer) => {
    // Filtro por tipo
    if (filterType !== "all" && issuer.type !== filterType) {
      return false;
    }

    // Filtro por búsqueda (nombre o NIF)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        issuer.name.toLowerCase().includes(search) ||
        issuer.nif.toLowerCase().includes(search) ||
        issuer.address?.toLowerCase().includes(search) ||
        issuer.locality?.toLowerCase().includes(search)
      );
    }

    return true;
  });

  // Si ya se creó el usuario y hay password temporal
  if (mode === "create" && temporaryPassword) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-green-600">
            ✓ Usuario Creado
          </CardTitle>
          <CardDescription className="text-center">
            El usuario ha sido creado correctamente
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              <strong>Importante:</strong> Esta es la única vez que verás esta
              contraseña. Cópiala y envíala al usuario de forma segura.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Email del usuario</Label>
            <div className="p-3 bg-muted rounded-md font-mono">
              {formData.email}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contraseña temporal</Label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-lg">
                {temporaryPassword}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyPassword}
              >
                {copiedPassword ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              El usuario deberá cambiar esta contraseña en su primer inicio de
              sesión.
            </p>
          </div>
        </CardContent>

        <CardFooter>
          <Button onClick={handleGoToUsers} className="w-full">
            Volver a Usuarios
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Formulario normal
  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto py-10">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {mode === "create" ? "Crear Usuario" : "Editar Usuario"}
              </h1>
              <p className="text-muted-foreground">
                {mode === "create"
                  ? "Invita a un nuevo usuario a tu empresa"
                  : "Modifica los datos del usuario"}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/users")}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "create" ? "Creando..." : "Guardando..."}
                  </>
                ) : mode === "create" ? (
                  "Crear Usuario"
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </div>
          </div>

          {/* Error general */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Card con formulario */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Línea 1: Email + Rol (25%) */}
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  {mode === "create" ? (
                    <>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="usuario@empresa.com"
                        value={formData.email}
                        onChange={handleInputChange("email")}
                        className={errors.email ? "border-red-500" : ""}
                        disabled={isLoading}
                        required
                      />
                      {errors.email && (
                        <p className="text-sm text-red-600">{errors.email}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <Label>Email</Label>
                      <div className="p-3 bg-muted rounded-md text-muted-foreground">
                        {formData.email}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        El email no se puede modificar
                      </p>
                    </>
                  )}
                </div>

                <div className="w-1/4 space-y-2">
                  <Label htmlFor="role">Rol *</Label>
                  {mode === "edit" && currentUserRole === "vendedor" ? (
                    <div className="p-3 bg-muted rounded-md text-muted-foreground text-sm">
                      {availableRoles.find((r) => r.value === formData.role)
                        ?.label || formData.role}
                    </div>
                  ) : (
                    <Select
                      value={formData.role}
                      onValueChange={handleSelectChange("role")}
                      disabled={isLoading || loadingIssuers}
                    >
                      <SelectTrigger
                        className={errors.role ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder="Rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.role && (
                    <p className="text-sm text-red-600">{errors.role}</p>
                  )}
                </div>
              </div>

              {/* Línea 2: Nombre (50%) + Apellidos (50%) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Juan"
                    value={formData.nombre}
                    onChange={handleInputChange("name")}
                    className={errors.nombre ? "border-red-500" : ""}
                    disabled={isLoading}
                    required
                  />
                  {errors.nombre && (
                    <p className="text-sm text-red-600">{errors.nombre}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellidos *</Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="García López"
                    value={formData.apellidos}
                    onChange={handleInputChange("last_name")}
                    className={errors.apellidos ? "border-red-500" : ""}
                    disabled={isLoading}
                    required
                  />
                  {errors.apellidos && (
                    <p className="text-sm text-red-600">{errors.apellidos}</p>
                  )}
                </div>
              </div>

              {/* Línea 3: Descripción de roles */}
              <div className="p-4 bg-lime-50 border border-lime-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Superadmin:</strong> Acceso total al sistema.{" "}
                  <strong>Admin:</strong> Gestión completa empresa y usuarios
                  Admin y Comercial. <strong>Comercial:</strong> Solo
                  crear/editar presupuestos.
                </p>
              </div>

              {/* Status (solo en edición y solo admin/superadmin) */}
              {mode === "edit" && currentUserRole !== "vendedor" && (
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={handleSelectChange("status")}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Los usuarios inactivos no pueden acceder al sistema
                  </p>
                </div>
              )}

              {/* Selección de Empresa (solo para superadmin creando) */}
              {mode === "create" && currentUserRole === "superadmin" && (
                <>
                  {/* Línea 5: Título y Filtros */}
                  <div className="pt-4 border-t space-y-4">
                    <h3 className="text-lg font-semibold">
                      Empresa / Autónomo
                    </h3>

                    {/* Filtros de búsqueda */}
                    <div className="flex gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar por nombre, NIF, dirección..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select
                        value={filterType}
                        onValueChange={(value: any) => setFilterType(value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <Filter className="mr-2 h-4 w-4" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="empresa">Solo Empresas</SelectItem>
                          <SelectItem value="autonomo">
                            Solo Autónomos
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Contador de resultados */}
                    {!loadingIssuers && issuers.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Mostrando {filteredIssuers.length} de {issuers.length}{" "}
                        {issuers.length === 1 ? "empresa" : "empresas"}
                      </p>
                    )}
                  </div>

                  {/* Línea 6: Listado Empresa / Autónomo */}
                  <div className="space-y-3">
                    {loadingIssuers ? (
                      <div className="p-8 bg-white rounded-lg border flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-lime-600" />
                        <span className="text-muted-foreground">
                          Cargando empresas...
                        </span>
                      </div>
                    ) : issuers.length === 0 ? (
                      <Alert>
                        <AlertDescription>
                          No hay empresas registradas en el sistema. Por favor,
                          registra una empresa primero.
                        </AlertDescription>
                      </Alert>
                    ) : filteredIssuers.length === 0 ? (
                      <Alert>
                        <AlertDescription>
                          No se encontraron empresas que coincidan con los
                          filtros aplicados.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <RadioGroup
                        value={formData.issuer_id || ""}
                        onValueChange={handleIssuerChange}
                        disabled={isLoading}
                        className="space-y-3"
                      >
                        {filteredIssuers.map((issuer) => (
                          <div
                            key={issuer.id}
                            className={`relative flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${
                              formData.issuer_id === issuer.id
                                ? "border-lime-500 bg-lime-50"
                                : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            <RadioGroupItem
                              value={issuer.id}
                              id={issuer.id}
                              className="mt-1"
                            />
                            <Label
                              htmlFor={issuer.id}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="space-y-1">
                                {/* Nombre (NIF) (Tipo) */}
                                <p className="font-semibold text-base">
                                  {issuer.name} ({issuer.nif})
                                  <span className="ml-1 text-xs font-normal text-gray-500">
                                    (
                                    {issuer.type === "empresa"
                                      ? "Empresa"
                                      : "Autónomo"}
                                    )
                                  </span>
                                </p>

                                {/* Datos de Dirección */}
                                <p className="text-sm text-gray-600">
                                  {issuer.address}
                                  {issuer.postal_code &&
                                    `, ${issuer.postal_code}`}
                                  {issuer.locality && `, ${issuer.locality}`}
                                  {issuer.province && ` (${issuer.province})`}
                                </p>

                                {/* Datos de Contacto */}
                                <p className="text-sm text-gray-500">
                                  {issuer.phone || "-"} • {issuer.email || "-"}{" "}
                                  • {issuer.web || "-"}
                                </p>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                    {errors.issuer_id && (
                      <p className="text-sm text-red-600">{errors.issuer_id}</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
