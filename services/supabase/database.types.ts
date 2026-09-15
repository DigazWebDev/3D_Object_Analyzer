export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      analyses: {
        Row: {
          confidence: number | null;
          created_at: string;
          id: string;
          object_name: string | null;
          photo_id: string;
          raw_response: Json | null;
          status: Database['public']['Enums']['analysis_job_status'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          confidence?: number | null;
          created_at?: string;
          id?: string;
          object_name?: string | null;
          photo_id: string;
          raw_response?: Json | null;
          status?: Database['public']['Enums']['analysis_job_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          confidence?: number | null;
          created_at?: string;
          id?: string;
          object_name?: string | null;
          photo_id?: string;
          raw_response?: Json | null;
          status?: Database['public']['Enums']['analysis_job_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'analyses_photo_owner_fk';
            columns: ['photo_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'photos';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      components: {
        Row: {
          analysis_id: string;
          confidence: number | null;
          created_at: string;
          dimensions: Json | null;
          evidence_status: Database['public']['Enums']['component_evidence_status'];
          id: string;
          metadata: Json;
          name: string;
          position: Json | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          analysis_id: string;
          confidence?: number | null;
          created_at?: string;
          dimensions?: Json | null;
          evidence_status?: Database['public']['Enums']['component_evidence_status'];
          id?: string;
          metadata?: Json;
          name: string;
          position?: Json | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          analysis_id?: string;
          confidence?: number | null;
          created_at?: string;
          dimensions?: Json | null;
          evidence_status?: Database['public']['Enums']['component_evidence_status'];
          id?: string;
          metadata?: Json;
          name?: string;
          position?: Json | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'components_analysis_owner_fk';
            columns: ['analysis_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'analyses';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      photos: {
        Row: {
          analysis_status: Database['public']['Enums']['photo_analysis_status'];
          client_id: string;
          created_at: string;
          height: number;
          id: string;
          original_path: string;
          thumbnail_path: string;
          updated_at: string;
          user_id: string;
          width: number;
        };
        Insert: {
          analysis_status?: Database['public']['Enums']['photo_analysis_status'];
          client_id: string;
          created_at?: string;
          height: number;
          id?: string;
          original_path: string;
          thumbnail_path: string;
          updated_at?: string;
          user_id: string;
          width: number;
        };
        Update: {
          analysis_status?: Database['public']['Enums']['photo_analysis_status'];
          client_id?: string;
          created_at?: string;
          height?: number;
          id?: string;
          original_path?: string;
          thumbnail_path?: string;
          updated_at?: string;
          user_id?: string;
          width?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      analysis_job_status: 'queued' | 'analyzing' | 'generating' | 'completed' | 'failed';
      component_evidence_status: 'identified' | 'inferred' | 'unknown';
      photo_analysis_status: 'not_analyzed' | 'queued' | 'analyzing' | 'completed' | 'failed';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer Row;
    }
    ? Row
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer Row;
      }
      ? Row
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer Insert;
    }
    ? Insert
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer Insert;
      }
      ? Insert
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer Update;
    }
    ? Update
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer Update;
      }
      ? Update
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      analysis_job_status: ['queued', 'analyzing', 'generating', 'completed', 'failed'],
      component_evidence_status: ['identified', 'inferred', 'unknown'],
      photo_analysis_status: ['not_analyzed', 'queued', 'analyzing', 'completed', 'failed'],
    },
  },
} as const;
