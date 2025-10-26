import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date))
}

export function formatDateLong(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(date))
}

export function getMonthStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function getMonthEnd(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function getLastMonthStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - 1, 1)
}

export function getLastMonthEnd(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 0)
}

export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

export function getBudgetStatusColor(percentage: number): string {
  if (percentage < 50) return 'text-green-600'
  if (percentage < 80) return 'text-yellow-600'
  return 'text-red-600'
}

export function getBudgetStatusBadge(percentage: number): string {
  if (percentage < 50) return 'success'
  if (percentage < 80) return 'warning'
  return 'destructive'
}
