/**
 * Validador de Senha Forte
 * Políticas: Mínimo 8 caracteres, maiúscula, minúscula, número, caractere especial
 */

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong' | 'very-strong'
  score: number // 0-100
}

/**
 * Valida senha conforme políticas de segurança
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  let score = 0

  // Mínimo 8 caracteres
  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres')
  } else {
    score += 20
  }

  // Máximo 128 caracteres (prevenir DoS)
  if (password.length > 128) {
    errors.push('Senha muito longa (máximo 128 caracteres)')
  }

  // Pelo menos uma letra maiúscula
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula')
  } else {
    score += 20
  }

  // Pelo menos uma letra minúscula
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula')
  } else {
    score += 20
  }

  // Pelo menos um número
  if (!/\d/.test(password)) {
    errors.push('Senha deve conter pelo menos um número')
  } else {
    score += 20
  }

  // Pelo menos um caractere especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial')
  } else {
    score += 20
  }

  // Verificar se não é uma senha comum
  const commonPasswords = ['12345678', 'password', 'senha123', '123456789']
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Esta senha é muito comum. Escolha uma senha mais segura')
    score = Math.max(0, score - 30)
  }

  // Calcular força
  let strength: PasswordValidationResult['strength'] = 'weak'
  if (score >= 80 && password.length >= 12) {
    strength = 'very-strong'
  } else if (score >= 80) {
    strength = 'strong'
  } else if (score >= 60) {
    strength = 'medium'
  }

  return {
    valid: errors.length === 0 && password.length <= 128,
    errors,
    strength,
    score: Math.min(100, score)
  }
}

/**
 * Gera feedback visual de força da senha
 */
export function getPasswordStrengthColor(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'very-strong':
      return 'bg-green-500'
    case 'strong':
      return 'bg-green-400'
    case 'medium':
      return 'bg-yellow-400'
    case 'weak':
      return 'bg-red-400'
    default:
      return 'bg-gray-300'
  }
}

