"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { validateInvitationToken, acceptInvitation } from "@/app/actions/invitations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface FormData {
  name: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  lastName?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function AcceptInvitationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState("");
  const [inviterMessage, setInviterMessage] = useState("");
  const [isPreFilled, setIsPreFilled] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validar token al cargar
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setIsValid(false);
        setIsValidating(false);
        setErrors({
          general: "Token de invitación no proporcionado",
        });
        return;
      }

      const result = await validateInvitationToken(token);

      if (result.success && result.data) {
        setIsValid(true);
        setInviterMessage(result.data.emailMessage || "");
        // Extraer email del mensaje si es posible
        const emailMatch = result.data.emailMessage?.match(/para (.+)$/);
        if (emailMatch) {
          setInvitationEmail(emailMatch[1]);
        }

        // Pre-llenar nombre y apellidos si el usuario ya existe (pre-creado por admin)
        if (result.data.existingUserName) {
          setFormData((prev) => ({
            ...prev,
            name: result.data.existingUserName || "",
            lastName: result.data.existingUserLastName || "",
          }));
          setIsPreFilled(true);
        }
      } else {
        setIsValid(false);
        setErrors({
          general: result.error || "Token de invitación inválido o expirado",
        });
      }

      setIsValidating(false);
    }

    validateToken();
  }, [token]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validar nombre
    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    // Validar apellido
    if (!formData.lastName.trim()) {
      newErrors.lastName = "El apellido es requerido";
    }

    // Validar contraseña
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    } else {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(formData.password)) {
        newErrors.password =
          "Debe contener al menos una mayúscula, una minúscula y un número";
      }
    }

    // Validar confirmación
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirma tu contraseña";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !token) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const result = await acceptInvitation(
        token,
        formData.password,
        formData.name,
        formData.lastName
      );

      if (!result.success) {
        setErrors({
          general: result.error || "Error al aceptar la invitación",
        });
        return;
      }

      // Éxito
      setSuccess(true);

      // Si el auto-login falló, redirigir al login después de 2 segundos
      // Si el auto-login fue exitoso, el server action ya habrá hecho redirect
      if (result.data?.autoLoginFailed) {
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
      // Si no hay autoLoginFailed, el redirect lo maneja el server action
    } catch (error) {
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Error inesperado al aceptar la invitación",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));

      // Limpiar error del campo
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  // Mostrar loading mientras valida
  if (isValidating) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 pb-6 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-lime-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Validando invitación...</p>
        </CardContent>
      </Card>
    );
  }

  // Mostrar error si el token no es válido
  if (!isValid) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-6 w-6" />
            <CardTitle>Invitación Inválida</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {errors.general ||
                "El enlace de invitación no es válido o ha expirado."}
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push("/login")}
            className="w-full mt-4"
            variant="outline"
          >
            Ir al Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Mostrar mensaje de éxito
  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            <CardTitle>¡Cuenta Creada Exitosamente!</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              Tu cuenta ha sido creada correctamente y has iniciado sesión
              automáticamente. Serás redirigido en breve.
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
            Redirigiendo...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Formulario de aceptación
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          Acepta tu Invitación
        </CardTitle>
        <CardDescription className="text-center">
          {inviterMessage || "Configura tu contraseña para acceder al sistema"}
        </CardDescription>
        {invitationEmail && (
          <p className="text-sm text-center text-muted-foreground">
            Email: <strong>{invitationEmail}</strong>
          </p>
        )}
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Error general */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Mensaje informativo si los datos están pre-llenados */}
          {isPreFilled && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800 text-sm">
                Tu nombre y apellidos han sido pre-rellenados. Puedes modificarlos si no son correctos.
              </AlertDescription>
            </Alert>
          )}

          {/* Campo Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              type="text"
              placeholder="Tu nombre"
              value={formData.name}
              onChange={handleInputChange("name")}
              className={errors.name ? "border-red-500" : ""}
              disabled={isLoading}
              autoComplete="given-name"
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Campo Apellido */}
          <div className="space-y-2">
            <Label htmlFor="lastName">Apellido</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Tu apellido"
              value={formData.lastName}
              onChange={handleInputChange("lastName")}
              className={errors.lastName ? "border-red-500" : ""}
              disabled={isLoading}
              autoComplete="family-name"
            />
            {errors.lastName && (
              <p className="text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput
              id="password"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={handleInputChange("password")}
              className={errors.password ? "border-red-500" : ""}
              disabled={isLoading}
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Campo Confirmar Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Repite tu contraseña"
              value={formData.confirmPassword}
              onChange={handleInputChange("confirmPassword")}
              className={errors.confirmPassword ? "border-red-500" : ""}
              disabled={isLoading}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              "Crear Cuenta"
            )}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
