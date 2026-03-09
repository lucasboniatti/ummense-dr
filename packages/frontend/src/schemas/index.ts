import { z } from 'zod';

// Task schemas
export const taskSchema = z.object({
  title: z
    .string()
    .min(3, 'Título deve ter no mínimo 3 caracteres')
    .max(200, 'Título deve ter no máximo 200 caracteres'),
  description: z.string().max(2000, 'Descrição deve ter no máximo 2000 caracteres').optional(),
  priority: z.enum(['P1', 'P2', 'P3']),
  status: z.enum(['open', 'todo', 'in_progress', 'completed', 'blocked']),
  assignedTo: z.string().max(100, 'Nome muito longo').optional(),
  dueDate: z.string().optional(),
});

export type TaskFormData = z.infer<typeof taskSchema>;

// Webhook schemas
export const webhookSchema = z.object({
  url: z
    .string()
    .url('URL inválida')
    .max(500, 'URL muito longa'),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  enabled: z.boolean(),
});

export type WebhookFormData = z.infer<typeof webhookSchema>;

// Auth schemas
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = loginSchema.extend({
  confirmPassword: z.string().min(6, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

export type SignupFormData = z.infer<typeof signupSchema>;

// Event schemas
export const eventSchema = z.object({
  title: z
    .string()
    .min(3, 'Título deve ter no mínimo 3 caracteres')
    .max(200, 'Título deve ter no máximo 200 caracteres'),
  description: z.string().max(2000, 'Descrição muito longa').optional(),
  date: z.string().min(1, 'Data é obrigatória'),
  time: z.string().optional(),
  type: z.enum(['meeting', 'deadline', 'reminder', 'other']).optional(),
});

export type EventFormData = z.infer<typeof eventSchema>;

// Flow schemas
export const flowSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().max(500, 'Descrição muito longa').optional(),
});

export type FlowFormData = z.infer<typeof flowSchema>;