import type { PostgrestError } from '@supabase/supabase-js';

export type SupabaseErrorDetails = {
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
};

export function extractSupabaseError(error: PostgrestError | null | undefined): SupabaseErrorDetails {
  return {
    message: error?.message ?? 'Unknown error',
    code: error?.code ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  };
}

export function logSupabaseError(label: string, error: PostgrestError | null | undefined, context?: object) {
  const details = extractSupabaseError(error);
  console.error(label, { ...context, ...details });
  return details;
}

export function isCheckConstraintViolation(error: PostgrestError | null | undefined): boolean {
  return error?.code === '23514';
}
