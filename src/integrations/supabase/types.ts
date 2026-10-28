export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      cases: {
        Row: {
          business_address: string | null
          business_name: string | null
          category: string | null
          channel: string
          cnic_address: string | null
          cnic_address_confidence: string | null
          cnic_dob: string | null
          cnic_father_name: string | null
          cnic_number: string | null
          cnic_scanned: boolean | null
          created_at: string
          decided_by: string | null
          decision_note: string | null
          declared_name: string | null
          existing_customer: boolean | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          name_match_score: number | null
          name_override: boolean | null
          owner_name: string | null
          phone: string | null
          products: Json
          queue_reason: string | null
          reference: string
          risk_band: string | null
          shop_photo: boolean | null
          status: string
          tier: string | null
          updated_at: string
        }
        Insert: {
          business_address?: string | null
          business_name?: string | null
          category?: string | null
          channel: string
          cnic_address?: string | null
          cnic_address_confidence?: string | null
          cnic_dob?: string | null
          cnic_father_name?: string | null
          cnic_number?: string | null
          cnic_scanned?: boolean | null
          created_at?: string
          decided_by?: string | null
          decision_note?: string | null
          declared_name?: string | null
          existing_customer?: boolean | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          name_match_score?: number | null
          name_override?: boolean | null
          owner_name?: string | null
          phone?: string | null
          products?: Json
          queue_reason?: string | null
          reference: string
          risk_band?: string | null
          shop_photo?: boolean | null
          status?: string
          tier?: string | null
          updated_at?: string
        }
        Update: {
          business_address?: string | null
          business_name?: string | null
          category?: string | null
          channel?: string
          cnic_address?: string | null
          cnic_address_confidence?: string | null
          cnic_dob?: string | null
          cnic_father_name?: string | null
          cnic_number?: string | null
          cnic_scanned?: boolean | null
          created_at?: string
          decided_by?: string | null
          decision_note?: string | null
          declared_name?: string | null
          existing_customer?: boolean | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          name_match_score?: number | null
          name_override?: boolean | null
          owner_name?: string | null
          phone?: string | null
          products?: Json
          queue_reason?: string | null
          reference?: string
          risk_band?: string | null
          shop_photo?: boolean | null
          status?: string
          tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      checks: {
        Row: {
          case_id: string
          created_at: string
          id: number
          message: string | null
          mode: string
          name: string
          reference: string | null
          status: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: number
          message?: string | null
          mode: string
          name: string
          reference?: string | null
          status: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: number
          message?: string | null
          mode?: string
          name?: string
          reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "checks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      fbr_atl: {
        Row: {
          active: boolean
          cnic: string
          snapshot_date: string
        }
        Insert: {
          active: boolean
          cnic: string
          snapshot_date: string
        }
        Update: {
          active?: boolean
          cnic?: string
          snapshot_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
