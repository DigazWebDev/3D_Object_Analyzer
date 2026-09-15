import {
  getSupabaseClient,
  type Tables,
  type TablesInsert,
  type TablesUpdate,
} from '@/services/supabase';

export type CloudAnalysis = Tables<'analyses'>;
export type CloudAnalysisInsert = TablesInsert<'analyses'>;
export type CloudAnalysisUpdate = Pick<
  TablesUpdate<'analyses'>,
  'status' | 'object_name' | 'confidence' | 'raw_response'
>;

export class SupabaseAnalysisRepository {
  async create(input: CloudAnalysisInsert): Promise<CloudAnalysis> {
    const { data, error } = await getSupabaseClient()
      .from('analyses')
      .insert(input)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async getByPhotoId(photoId: string, userId: string): Promise<CloudAnalysis | null> {
    const { data, error } = await getSupabaseClient()
      .from('analyses')
      .select('*')
      .eq('photo_id', photoId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async update(id: string, userId: string, input: CloudAnalysisUpdate): Promise<CloudAnalysis> {
    const { data, error } = await getSupabaseClient()
      .from('analyses')
      .update(input)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('analyses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }
}
