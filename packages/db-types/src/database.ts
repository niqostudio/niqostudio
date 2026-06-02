export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      cases: {
        Row: {
          client_id: string | null
          created_at: string
          display_order: number
          id: string
          image_urls: string[]
          metrics: Json
          outcome: string | null
          problem: string | null
          project_id: string | null
          published_at: string | null
          slug: string
          solution: string | null
          status: string
          summary: string | null
          tech_details: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_urls?: string[]
          metrics?: Json
          outcome?: string | null
          problem?: string | null
          project_id?: string | null
          published_at?: string | null
          slug: string
          solution?: string | null
          status?: string
          summary?: string | null
          tech_details?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_urls?: string[]
          metrics?: Json
          outcome?: string | null
          problem?: string | null
          project_id?: string | null
          published_at?: string | null
          slug?: string
          solution?: string | null
          status?: string
          summary?: string | null
          tech_details?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          first_contact_date: string | null
          id: string
          industry: string
          internal_notes: string | null
          is_public_name_allowed: boolean
          logo_url: string | null
          public_name: string
          real_name: string | null
          size: string | null
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          first_contact_date?: string | null
          id?: string
          industry: string
          internal_notes?: string | null
          is_public_name_allowed?: boolean
          logo_url?: string | null
          public_name: string
          real_name?: string | null
          size?: string | null
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          first_contact_date?: string | null
          id?: string
          industry?: string
          internal_notes?: string | null
          is_public_name_allowed?: boolean
          logo_url?: string | null
          public_name?: string
          real_name?: string | null
          size?: string | null
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          company: string | null
          converted_client_id: string | null
          created_at: string
          email: string
          id: string
          internal_notes: string | null
          message: string
          name: string
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          converted_client_id?: string | null
          created_at?: string
          email: string
          id?: string
          internal_notes?: string | null
          message: string
          name: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          converted_client_id?: string | null
          created_at?: string
          email?: string
          id?: string
          internal_notes?: string | null
          message?: string
          name?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          bio: string | null
          contact_email: string | null
          display_name: string
          handle: string
          id: string
          logo_svg: string | null
          operation_policy: string | null
          skills: string[]
          social_links: Json
          tagline: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          contact_email?: string | null
          display_name: string
          handle: string
          id?: string
          logo_svg?: string | null
          operation_policy?: string | null
          skills?: string[]
          social_links?: Json
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          contact_email?: string | null
          display_name?: string
          handle?: string
          id?: string
          logo_svg?: string | null
          operation_policy?: string | null
          skills?: string[]
          social_links?: Json
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string
          ended_on: string | null
          id: string
          internal_notes: string | null
          scope: string[]
          started_on: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          ended_on?: string | null
          id?: string
          internal_notes?: string | null
          scope?: string[]
          started_on?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          ended_on?: string | null
          id?: string
          internal_notes?: string | null
          scope?: string[]
          started_on?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          coverage: string[]
          created_at: string
          currency: string
          deliverables: string[]
          details: string | null
          display_order: number
          duration: string | null
          exclusions: string[]
          followups: string[]
          headline: string | null
          id: string
          is_active: boolean
          name: string
          name_ja: string | null
          price_min: number | null
          pricing: Json | null
          slug: string
          summary: string | null
          target_pains: string[]
          updated_at: string
        }
        Insert: {
          coverage?: string[]
          created_at?: string
          currency?: string
          deliverables?: string[]
          details?: string | null
          display_order?: number
          duration?: string | null
          exclusions?: string[]
          followups?: string[]
          headline?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_ja?: string | null
          price_min?: number | null
          pricing?: Json | null
          slug: string
          summary?: string | null
          target_pains?: string[]
          updated_at?: string
        }
        Update: {
          coverage?: string[]
          created_at?: string
          currency?: string
          deliverables?: string[]
          details?: string | null
          display_order?: number
          duration?: string | null
          exclusions?: string[]
          followups?: string[]
          headline?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_ja?: string | null
          price_min?: number | null
          pricing?: Json | null
          slug?: string
          summary?: string | null
          target_pains?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      works: {
        Row: {
          client_id: string | null
          created_at: string
          display_order: number
          id: string
          image_urls: string[]
          period: string | null
          project_id: string | null
          public_url: string | null
          scope: string[]
          slug: string
          status: string
          summary: string | null
          tech_stack: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_urls?: string[]
          period?: string | null
          project_id?: string | null
          public_url?: string | null
          scope?: string[]
          slug: string
          status?: string
          summary?: string | null
          tech_stack?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_urls?: string[]
          period?: string | null
          project_id?: string | null
          public_url?: string | null
          scope?: string[]
          slug?: string
          status?: string
          summary?: string | null
          tech_stack?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "works_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "works_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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

