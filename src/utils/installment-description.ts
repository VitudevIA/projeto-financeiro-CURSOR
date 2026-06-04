/** Regex universal para variações de parcelamento (PARC01/02, Parcela 1 de 2, (01/12), etc.) */
export const INSTALLMENT_REGEX = /(?:PARC\s*)?\(?(\d{1,2})\s*[\/de\s]+\s*(\d{1,2})\)?/i

/**
 * Reconstrói a descrição com o número de parcela correto para projeções futuras.
 * Ex: "SHEINPARC01/02" + parcela 2 → "SHEINPARC02/02"
 */
export function buildDynamicInstallmentDescription(
  description: string,
  installmentNumber: number,
  totalInstallments: number
): string {
  const paddedCurrent = String(installmentNumber).padStart(2, '0')
  const paddedTotal = String(totalInstallments).padStart(2, '0')

  if (INSTALLMENT_REGEX.test(description)) {
    return description.replace(INSTALLMENT_REGEX, (match) => {
      if (/PARC/i.test(match)) {
        const hasSpace = /\s/.test(match)
        return hasSpace
          ? `PARC ${paddedCurrent}/${paddedTotal}`
          : `PARC${paddedCurrent}/${paddedTotal}`
      }
      if (/\bde\b/i.test(match)) {
        return `Parcela ${installmentNumber} de ${totalInstallments}`
      }
      if (match.trim().startsWith('(')) {
        return `(${paddedCurrent}/${paddedTotal})`
      }
      return `${paddedCurrent}/${paddedTotal}`
    })
  }

  return `${description} (${installmentNumber}/${totalInstallments})`
}
