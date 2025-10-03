/**
 * Esquemas de validación Zod para autenticación y registro
 */

import { z } from 'zod';

/**
 * Schema para registro de usuario
 */
export const registerSchema = z.object({
  // Datos de autenticación
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido')
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    ),

  confirmPassword: z.string().min(1, 'Debes confirmar la contraseña'),

  // Datos del issuer (emisor)
  tipo: z.enum(['empresa', 'autonomo'], {
    required_error: 'Debes seleccionar el tipo de emisor'
  }),

  nombreComercial: z
    .string()
    .min(1, 'El nombre comercial es requerido')
    .max(100, 'El nombre comercial no puede exceder 100 caracteres')
    .trim(),

  nif: z
    .string()
    .min(1, 'El NIF/CIF es requerido')
    .max(20, 'El NIF/CIF no puede exceder 20 caracteres')
    .regex(
      /^[A-Z0-9]+$/i,
      'El NIF/CIF solo puede contener letras y números'
    )
    .trim()
    .toUpperCase(),

  // Dirección fiscal
  direccionFiscal: z
    .string()
    .min(1, 'La dirección fiscal es requerida')
    .max(200, 'La dirección fiscal no puede exceder 200 caracteres')
    .trim(),

  codigoPostal: z
    .string()
    .regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos')
    .optional()
    .or(z.literal('')),

  ciudad: z
    .string()
    .max(100, 'La ciudad no puede exceder 100 caracteres')
    .trim()
    .optional()
    .or(z.literal('')),

  provincia: z
    .string()
    .max(100, 'La provincia no puede exceder 100 caracteres')
    .trim()
    .optional()
    .or(z.literal('')),

  pais: z
    .string()
    .max(100, 'El país no puede exceder 100 caracteres')
    .trim()
    .default('España'),

  // Datos de contacto (opcionales)
  telefono: z
    .string()
    .regex(/^[0-9\s\+\-\(\)]+$/, 'Teléfono inválido')
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .optional()
    .or(z.literal('')),

  emailContacto: z
    .string()
    .email('Email de contacto inválido')
    .optional()
    .or(z.literal('')),

  web: z
    .string()
    .url('URL inválida')
    .optional()
    .or(z.literal('')),

  // IRPF (obligatorio para autónomos)
  irpfPercentage: z
    .number({
      required_error: 'El % IRPF es requerido para autónomos',
      invalid_type_error: 'El % IRPF debe ser un número'
    })
    .min(0, 'El % IRPF no puede ser negativo')
    .max(100, 'El % IRPF no puede exceder 100%')
    .optional()
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  }
).refine(
  (data) => {
    // Si es autónomo, IRPF es OBLIGATORIO
    if (data.tipo === 'autonomo') {
      return data.irpfPercentage !== null && data.irpfPercentage !== undefined;
    }
    return true;
  },
  {
    message: 'El % IRPF es obligatorio para autónomos',
    path: ['irpfPercentage']
  }
);

/**
 * Tipo inferido del schema de registro
 */
export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Schema para login (ya existe en LoginForm pero lo documentamos aquí)
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido')
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Schema para recuperación de contraseña
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido')
    .toLowerCase()
    .trim()
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Schema para reset de contraseña
 */
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    ),

  confirmPassword: z.string().min(1, 'Debes confirmar la contraseña')
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  }
);

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
