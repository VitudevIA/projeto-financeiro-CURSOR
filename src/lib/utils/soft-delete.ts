/**
 * Soft Delete - Não deleta fisicamente, apenas marca como deletado
 */

/**
 * Interface para entidades com soft delete
 */
export interface SoftDeletable {
  deleted_at: string | null
  is_deleted?: boolean
}

/**
 * Marca registro como deletado (soft delete)
 */
export async function softDelete<T extends SoftDeletable>(
  supabase: any,
  table: string,
  id: string
): Promise<{ data: T | null; error: any }> {
  const { data, error } = await supabase
    .from(table)
    .update({
      deleted_at: new Date().toISOString(),
      is_deleted: true,
    } as Partial<T>)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

/**
 * Restaura registro deletado (un-delete)
 */
export async function restoreDeleted<T extends SoftDeletable>(
  supabase: any,
  table: string,
  id: string
): Promise<{ data: T | null; error: any }> {
  const { data, error } = await supabase
    .from(table)
    .update({
      deleted_at: null,
      is_deleted: false,
    } as Partial<T>)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

/**
 * Hard delete - deleta fisicamente (use com cuidado!)
 */
export async function hardDelete(
  supabase: any,
  table: string,
  id: string,
  requireConfirmation: boolean = true
): Promise<{ data: any; error: any }> {
  if (requireConfirmation) {
    // Em produção, requer confirmação adicional
    const env = process.env.NODE_ENV
    if (env === 'production') {
      throw new Error('Hard delete não permitido em produção sem confirmação explícita')
    }
  }

  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)

  return { data, error }
}

/**
 * Query com exclusão de registros deletados
 */
export function excludeDeleted<T extends SoftDeletable>(query: any) {
  return query.is('deleted_at', null).eq('is_deleted', false)
}

/**
 * Query apenas registros deletados
 */
export function onlyDeleted<T extends SoftDeletable>(query: any) {
  return query.not('deleted_at', 'is', null)
}

