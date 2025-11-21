"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, UserX, Mail, AlertCircle } from "lucide-react";

type StatusReason = 'inactive' | 'invited' | 'awaiting_approval' | null;

interface UserStatusDialogProps {
  reason: StatusReason;
  onClose?: () => void;
}

const statusConfig = {
  inactive: {
    icon: UserX,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    title: "Cuenta desactivada",
    titleColor: "text-red-700",
    description: (
      <>
        <p>
          Tu cuenta ha sido desactivada por un administrador.
        </p>
        <p className="font-medium text-gray-700 mt-3">
          Si crees que esto es un error, por favor contacta con soporte.
        </p>
      </>
    ),
    buttonText: "Entendido",
    buttonClass: "bg-red-500 hover:bg-red-600",
  },
  invited: {
    icon: Mail,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Cuenta pendiente de activación",
    titleColor: "text-blue-700",
    description: (
      <>
        <p>
          Tu cuenta aún no está activada.
        </p>
        <p className="font-medium text-gray-700 mt-3">
          Por favor, utiliza el enlace que recibiste por correo electrónico para completar la activación y establecer tu contraseña.
        </p>
        <p className="text-sm text-gray-600 mt-3">
          Si no encuentras el correo, revisa tu carpeta de spam o contacta con el administrador que te invitó.
        </p>
      </>
    ),
    buttonText: "Entendido",
    buttonClass: "bg-blue-500 hover:bg-blue-600",
  },
  awaiting_approval: {
    icon: Clock,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Cuenta pendiente de aprobación",
    titleColor: "text-amber-700",
    description: (
      <>
        <p>
          Tu registro ha sido completado exitosamente y está pendiente de aprobación por nuestro equipo.
        </p>
        <p className="font-medium text-gray-700 mt-3">
          Recibirás un email cuando tu cuenta sea activada y puedas acceder a la plataforma.
        </p>
        <p className="text-sm text-gray-600 mt-3">
          Si tienes alguna pregunta, puedes contactarnos en{" "}
          <a href="mailto:soporte@redpresu.com" className="text-lime-600 hover:text-lime-700 underline">
            soporte@redpresu.com
          </a>{" "}
          o a través del{" "}
          <a href="/contact" className="text-lime-600 hover:text-lime-700 underline">
            formulario de contacto
          </a>
        </p>
      </>
    ),
    buttonText: "Entendido",
    buttonClass: "bg-amber-500 hover:bg-amber-600",
  },
};

export function UserStatusDialog({ reason, onClose }: UserStatusDialogProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (reason && statusConfig[reason]) {
      setOpen(true);
    }
  }, [reason]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  if (!reason || !statusConfig[reason]) {
    return null;
  }

  const config = statusConfig[reason];
  const IconComponent = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={() => {}}>
      <AlertDialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <div className={`mx-auto mb-4 w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center`}>
            <IconComponent className={`h-8 w-8 ${config.iconColor}`} />
          </div>
          <AlertDialogTitle className={`${config.titleColor} text-center text-xl`}>
            {config.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-center space-y-3" asChild>
            <div>{config.description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleClose}
            className={config.buttonClass}
          >
            {config.buttonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
