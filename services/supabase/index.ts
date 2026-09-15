export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase is introduced in Phase 3 and is not configured yet.');
    this.name = 'SupabaseNotConfiguredError';
  }
}
