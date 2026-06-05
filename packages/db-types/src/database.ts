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
      deliverables: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_urls: string[]
          kind: string
          name: string
          project_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_urls?: string[]
          kind: string
          name: string
          project_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_urls?: string[]
          kind?: string
          name?: string
          project_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          auto_reply_id: string | null
          company: string | null
          converted_client_id: string | null
          created_at: string
          delivery_status: string
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
          auto_reply_id?: string | null
          company?: string | null
          converted_client_id?: string | null
          created_at?: string
          delivery_status?: string
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
          auto_reply_id?: string | null
          company?: string | null
          converted_client_id?: string | null
          created_at?: string
          delivery_status?: string
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
      metrics: {
        Row: {
          achieved: string
          created_at: string
          deliverable_id: string | null
          display_order: number
          goal: string | null
          id: string
          kind: string
          label: string
          previous: string | null
          project_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          achieved: string
          created_at?: string
          deliverable_id?: string | null
          display_order?: number
          goal?: string | null
          id?: string
          kind?: string
          label: string
          previous?: string | null
          project_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          achieved?: string
          created_at?: string
          deliverable_id?: string | null
          display_order?: number
          goal?: string | null
          id?: string
          kind?: string
          label?: string
          previous?: string | null
          project_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ndas: {
        Row: {
          agreed_on: string | null
          created_at: string
          id: string
          notes: string | null
          project_id: string
          publish_deliverables: boolean
          publish_metrics: boolean
          publish_problems: boolean
          publish_testimonial: boolean
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agreed_on?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          project_id: string
          publish_deliverables?: boolean
          publish_metrics?: boolean
          publish_problems?: boolean
          publish_testimonial?: boolean
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agreed_on?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          project_id?: string
          publish_deliverables?: boolean
          publish_metrics?: boolean
          publish_problems?: boolean
          publish_testimonial?: boolean
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ndas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      problems: {
        Row: {
          created_at: string
          display_order: number
          id: string
          outcome: string | null
          problem: string
          project_id: string
          solution: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          outcome?: string | null
          problem: string
          project_id: string
          solution?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          outcome?: string | null
          problem?: string
          project_id?: string
          solution?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "problems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      project_decisions: {
        Row: {
          created_at: string
          decision: string
          display_order: number
          id: string
          internal_notes: string | null
          project_id: string
          rationale: string | null
          status: string
          superseded_by: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision: string
          display_order?: number
          id?: string
          internal_notes?: string | null
          project_id: string
          rationale?: string | null
          status?: string
          superseded_by?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision?: string
          display_order?: number
          id?: string
          internal_notes?: string | null
          project_id?: string
          rationale?: string | null
          status?: string
          superseded_by?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_decisions_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "project_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string
          ended_on: string | null
          id: string
          internal_notes: string | null
          service_id: string | null
          started_on: string | null
          status: string
          tech_stack: string[]
          testimonial: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          ended_on?: string | null
          id?: string
          internal_notes?: string | null
          service_id?: string | null
          started_on?: string | null
          status?: string
          tech_stack?: string[]
          testimonial?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          ended_on?: string | null
          id?: string
          internal_notes?: string | null
          service_id?: string | null
          started_on?: string | null
          status?: string
          tech_stack?: string[]
          testimonial?: Json | null
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
          {
            foreignKeyName: "projects_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      requirements: {
        Row: {
          content: string
          created_at: string
          display_order: number
          id: string
          note: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          id?: string
          note?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          note?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scope_items: {
        Row: {
          created_at: string
          display_order: number
          id: string
          included: boolean
          item: string
          note: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          included: boolean
          item: string
          note?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          included?: boolean
          item?: string
          note?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      showcase_deliverables: {
        Row: {
          created_at: string
          deliverable_id: string
          display_order: number
          showcase_id: string
        }
        Insert: {
          created_at?: string
          deliverable_id: string
          display_order?: number
          showcase_id: string
        }
        Update: {
          created_at?: string
          deliverable_id?: string
          display_order?: number
          showcase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_deliverables_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_deliverables_showcase_id_fkey"
            columns: ["showcase_id"]
            isOneToOne: false
            referencedRelation: "showcase_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      showcase_entries: {
        Row: {
          client_display: string
          created_at: string
          display_order: number
          id: string
          period: string | null
          project_id: string
          slug: string
          status: string
          summary: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_display?: string
          created_at?: string
          display_order?: number
          id?: string
          period?: string | null
          project_id: string
          slug: string
          status?: string
          summary?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_display?: string
          created_at?: string
          display_order?: number
          id?: string
          period?: string | null
          project_id?: string
          slug?: string
          status?: string
          summary?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      showcase_metrics: {
        Row: {
          created_at: string
          display_order: number
          metric_id: string
          showcase_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          metric_id: string
          showcase_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          metric_id?: string
          showcase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_metrics_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_metrics_showcase_id_fkey"
            columns: ["showcase_id"]
            isOneToOne: false
            referencedRelation: "showcase_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      showcase_problems: {
        Row: {
          created_at: string
          display_order: number
          problem_id: string
          showcase_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          problem_id: string
          showcase_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          problem_id?: string
          showcase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_problems_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_problems_showcase_id_fkey"
            columns: ["showcase_id"]
            isOneToOne: false
            referencedRelation: "showcase_entries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      showcases: {
        Row: {
          client_industry: string | null
          client_name: string | null
          deliverables: Json | null
          display_order: number | null
          metrics: Json | null
          period: string | null
          problems: Json | null
          project_id: string | null
          slug: string | null
          summary: string | null
          tech_stack: string[] | null
          testimonial: Json | null
          thumbnail_url: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "showcase_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
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

