import type { SupabaseClient } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from './client';
import type { Database } from './database.types';

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase is not configured. The application remains in local-only mode.');
    this.name = 'SupabaseNotConfiguredError';
  }
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new SupabaseNotConfiguredError();
  }

  return supabase;
}

export { isSupabaseConfigured, supabase };
export type { Database, Enums, Json, Tables, TablesInsert, TablesUpdate } from './database.types';
