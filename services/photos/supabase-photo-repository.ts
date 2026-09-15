import { getSupabaseClient, type Tables, type TablesInsert } from '@/services/supabase';

export type CloudPhoto = Tables<'photos'>;
export type CloudPhotoInsert = TablesInsert<'photos'>;

export class SupabasePhotoRepository {
  async upsertMetadata(input: CloudPhotoInsert): Promise<CloudPhoto> {
    const { data, error } = await getSupabaseClient()
      .from('photos')
      .upsert(input, { onConflict: 'user_id,client_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async list(userId: string): Promise<CloudPhoto[]> {
    const { data, error } = await getSupabaseClient()
      .from('photos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data;
  }

  async get(id: string, userId: string): Promise<CloudPhoto | null> {
    const { data, error } = await getSupabaseClient()
      .from('photos')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('photos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }
}
