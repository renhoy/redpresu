"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { sendContactMessage } from "@/app/actions/contact";

interface ContactFormProps {
  legalNotice: string;
}

export function ContactForm({ legalNotice }: ContactFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    emailConfirmation: "",
    subject: "",
    message: "",
    privacyAccepted: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, privacyAccepted: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.firstName || !formData.lastName) {
      toast.error("Por favor, completa tu nombre y apellidos");
      return;
    }

    if (!formData.email || !formData.emailConfirmation) {
      toast.error("Por favor, completa los campos de correo electrónico");
      return;
    }

    if (formData.email !== formData.emailConfirmation) {
      toast.error("Los correos electrónicos no coinciden");
      return;
    }

    if (!formData.subject || !formData.message) {
      toast.error("Por favor, completa el asunto y mensaje");
      return;
    }

    if (!formData.privacyAccepted) {
      toast.error("Debes aceptar la política de privacidad");
      return;
    }

    setLoading(true);

    const result = await sendContactMessage({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      subject: formData.subject,
      message: formData.message,
    });

    if (result.success) {
      toast.success("Mensaje enviado correctamente");
      // Limpiar formulario
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        emailConfirmation: "",
        subject: "",
        message: "",
        privacyAccepted: false,
      });
    } else {
      toast.error(result.error || "Error al enviar el mensaje");
    }

    setLoading(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Formulario de Contacto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre y Apellidos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Apellidos <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Correo electrónico y confirmación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Correo electrónico <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailConfirmation">
                  Confirmar correo electrónico{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="emailConfirmation"
                  name="emailConfirmation"
                  type="email"
                  value={formData.emailConfirmation}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Asunto */}
            <div className="space-y-2">
              <Label htmlFor="subject">
                Asunto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* Mensaje */}
            <div className="space-y-2">
              <Label htmlFor="message">
                Mensaje <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={6}
                required
                disabled={loading}
              />
            </div>

            {/* Checkbox política de privacidad */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="privacyAccepted"
                checked={formData.privacyAccepted}
                onCheckedChange={handleCheckboxChange}
                disabled={loading}
              />
              <Label
                htmlFor="privacyAccepted"
                className="text-sm font-normal leading-relaxed cursor-pointer"
              >
                Acepto la{" "}
                <a
                  href="/legal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lime-600 underline hover:text-lime-700"
                >
                  política de privacidad
                </a>{" "}
                y el tratamiento de mis datos personales{" "}
                <span className="text-red-500">*</span>
              </Label>
            </div>

            {/* Botón enviar */}
            <Button
              type="submit"
              className="w-full bg-lime-500 hover:bg-lime-600"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar Mensaje"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Información Legal */}
      <div className="mt-8 p-6 bg-white rounded-lg border">
        <div
          className="prose prose-sm max-w-none text-gray-600"
          dangerouslySetInnerHTML={{ __html: legalNotice }}
        />
      </div>
    </>
  );
}
