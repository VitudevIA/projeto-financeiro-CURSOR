/**
 * Validação Dupla (Frontend + Backend)
 * Schemas Zod para validação consistente
 */

import { z } from 'zod'
import { sanitizeEmail, sanitizeNumber, sanitizeString } from './sanitizer'

/**
 * Schema de validação para Login
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .transform(val => sanitizeEmail(val))
    .refine(val => val !== null, { message: 'Email inválido' })
    .transform(val => val!),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(128, 'Senha muito longa'),
})

/**
 * Schema de validação para Signup
 */
export const signupSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .transform(val => sanitizeEmail(val))
    .refine(val => val !== null, { message: 'Email inválido' })
    .transform(val => val!),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(128, 'Senha muito longa')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/\d/, 'Senha deve conter pelo menos um número')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Senha deve conter pelo menos um caractere especial'),
  full_name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome muito longo')
    .transform(val => sanitizeString(val, 100)),
})

/**
 * Schema de validação para Transação
 */
export const transactionSchema = z.object({
  description: z
    .string()
    .min(1, 'Descrição é obrigatória')
    .max(500, 'Descrição muito longa')
    .transform(val => sanitizeString(val, 500)),
  amount: z
    .number()
    .positive('Valor deve ser positivo')
    .max(999999999.99, 'Valor muito alto'),
  type: z.enum(['income', 'expense'], {
    message: 'Tipo deve ser receita ou despesa'
  }),
  category_id: z.string().uuid('ID de categoria inválido'),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  payment_method: z.string().max(50),
  installments: z.number().int().min(1).max(120).default(1),
  nature: z.string().max(100).optional(),
})

/**
 * Schema de validação para Cartão
 */
export const cardSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome muito longo')
    .transform(val => sanitizeString(val, 100)),
  type: z.enum(['credit', 'debit']),
  brand: z.string().max(50).nullable().optional(),
  last_digits: z.string().regex(/^\d{4}$/).nullable().optional(),
  limit: z.number().positive().nullable().optional(),
}).refine(
  (data) => {
    if (data.type === 'credit') {
      return data.limit !== null && data.limit !== undefined && data.limit > 0
    }
    return true
  },
  { message: 'Cartão de crédito deve ter um limite válido', path: ['limit'] }
)

/**
 * Valida dados conforme schema
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: z.ZodError
} {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return { success: false, errors: result.error }
}

