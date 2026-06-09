export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  core: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          external_id: string | null
          first_contact_date: string | null
          id: string
          industry: string
          internal_notes: string | null
          is_public_name_allowed: boolean
          logo_url: string | null
          public_name: string
          real_name: string | null
          size: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          first_contact_date?: string | null
          id?: string
          industry: string
          internal_notes?: string | null
          is_public_name_allowed?: boolean
          logo_url?: string | null
          public_name: string
          real_name?: string | null
          size?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          first_contact_date?: string | null
          id?: string
          industry?: string
          internal_notes?: string | null
          is_public_name_allowed?: boolean
          logo_url?: string | null
          public_name?: string
          real_name?: string | null
          size?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          client_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_urls: string[]
          kind: string
          name: string
          product_id: string | null
          project_id: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          kind: string
          name: string
          product_id?: string | null
          project_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          kind?: string
          name?: string
          product_id?: string | null
          project_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
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
          converted_contact_id: string | null
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
          converted_contact_id?: string | null
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
          converted_contact_id?: string | null
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
            foreignKeyName: "inquiries_converted_contact_id_fkey"
            columns: ["converted_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          inquiry_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          inquiry_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          inquiry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_replies_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          due_on: string | null
          external_id: string | null
          id: string
          invoice_no: string | null
          issued_on: string | null
          notes: string | null
          paid_amount: number | null
          paid_on: string | null
          pdf_url: string | null
          project_id: string | null
          status: string
          subtotal: number
          tax: number
          title: string | null
          updated_at: string
          withholding: number
        }
        Insert: {
          client_id: string
          created_at?: string
          due_on?: string | null
          external_id?: string | null
          id?: string
          invoice_no?: string | null
          issued_on?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_on?: string | null
          pdf_url?: string | null
          project_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          title?: string | null
          updated_at?: string
          withholding?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          due_on?: string | null
          external_id?: string | null
          id?: string
          invoice_no?: string | null
          issued_on?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_on?: string | null
          pdf_url?: string | null
          project_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          title?: string | null
          updated_at?: string
          withholding?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          client_id: string | null
          created_at: string
          duration_min: number | null
          id: string
          inquiry_id: string | null
          location: string | null
          met_on: string
          notes: string | null
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          duration_min?: number | null
          id?: string
          inquiry_id?: string | null
          location?: string | null
          met_on?: string
          notes?: string | null
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          duration_min?: number | null
          id?: string
          inquiry_id?: string | null
          location?: string | null
          met_on?: string
          notes?: string | null
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_definitions: {
        Row: {
          auto: boolean
          created_at: string
          howto: string | null
          id: string
          is_active: boolean
          key: string
          kind: string
          label: string
          sort_order: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          auto?: boolean
          created_at?: string
          howto?: string | null
          id?: string
          is_active?: boolean
          key: string
          kind?: string
          label: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          auto?: boolean
          created_at?: string
          howto?: string | null
          id?: string
          is_active?: boolean
          key?: string
          kind?: string
          label?: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      metric_measurements: {
        Row: {
          deliverable_id: string | null
          id: string
          measured_at: string
          metric_key: string
          phase: string
          product_id: string | null
          project_id: string | null
          url: string | null
          value: string
        }
        Insert: {
          deliverable_id?: string | null
          id?: string
          measured_at?: string
          metric_key: string
          phase: string
          product_id?: string | null
          project_id?: string | null
          url?: string | null
          value: string
        }
        Update: {
          deliverable_id?: string | null
          id?: string
          measured_at?: string
          metric_key?: string
          phase?: string
          product_id?: string | null
          project_id?: string | null
          url?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_measurements_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_measurements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_measurements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "metric_measurements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          achieved: string | null
          created_at: string
          deliverable_id: string | null
          goal: string | null
          id: string
          kind: string
          label: string
          previous: string | null
          product_id: string | null
          project_id: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          achieved?: string | null
          created_at?: string
          deliverable_id?: string | null
          goal?: string | null
          id?: string
          kind?: string
          label: string
          previous?: string | null
          product_id?: string | null
          project_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          achieved?: string | null
          created_at?: string
          deliverable_id?: string | null
          goal?: string | null
          id?: string
          kind?: string
          label?: string
          previous?: string | null
          product_id?: string | null
          project_id?: string | null
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
            foreignKeyName: "metrics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
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
      nda_events: {
        Row: {
          agreed_on: string | null
          changed_at: string
          id: string
          nda_id: string
          publish_deliverables: boolean
          publish_metrics: boolean
          publish_problems: boolean
          publish_testimonial: boolean
          status: string
        }
        Insert: {
          agreed_on?: string | null
          changed_at?: string
          id?: string
          nda_id: string
          publish_deliverables: boolean
          publish_metrics: boolean
          publish_problems: boolean
          publish_testimonial: boolean
          status: string
        }
        Update: {
          agreed_on?: string | null
          changed_at?: string
          id?: string
          nda_id?: string
          publish_deliverables?: boolean
          publish_metrics?: boolean
          publish_problems?: boolean
          publish_testimonial?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "nda_events_nda_id_fkey"
            columns: ["nda_id"]
            isOneToOne: false
            referencedRelation: "ndas"
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
          pdf_url: string | null
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
          pdf_url?: string | null
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
          pdf_url?: string | null
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
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
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
          id: string
          outcome: string | null
          problem: string
          product_id: string | null
          project_id: string | null
          solution: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          outcome?: string | null
          problem: string
          product_id?: string | null
          project_id?: string | null
          solution?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          outcome?: string | null
          problem?: string
          product_id?: string | null
          project_id?: string | null
          solution?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "problems_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "problems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          id: string
          internal_notes: string | null
          launched_on: string | null
          name: string
          slug: string
          status: string
          summary: string | null
          tech_stack: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          internal_notes?: string | null
          launched_on?: string | null
          name: string
          slug: string
          status?: string
          summary?: string | null
          tech_stack?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          internal_notes?: string | null
          launched_on?: string | null
          name?: string
          slug?: string
          status?: string
          summary?: string | null
          tech_stack?: string[]
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
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
      project_repositories: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string | null
          updated_at: string
          url: string
          visibility: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string | null
          updated_at?: string
          url: string
          visibility?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string | null
          updated_at?: string
          url?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_repositories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_repositories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_status_events: {
        Row: {
          changed_at: string
          from_status: string | null
          id: string
          project_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          from_status?: string | null
          id?: string
          project_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          from_status?: string | null
          id?: string
          project_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_status_events_from_status_fkey"
            columns: ["from_status"]
            isOneToOne: false
            referencedRelation: "project_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "project_status_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_status_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_status_events_to_status_fkey"
            columns: ["to_status"]
            isOneToOne: false
            referencedRelation: "project_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      project_status_transitions: {
        Row: {
          from_status: string
          to_status: string
        }
        Insert: {
          from_status: string
          to_status: string
        }
        Update: {
          from_status?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_status_transitions_from_status_fkey"
            columns: ["from_status"]
            isOneToOne: false
            referencedRelation: "project_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "project_status_transitions_to_status_fkey"
            columns: ["to_status"]
            isOneToOne: false
            referencedRelation: "project_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      project_statuses: {
        Row: {
          code: string
          is_initial: boolean
          is_terminal: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          is_initial?: boolean
          is_terminal?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          is_initial?: boolean
          is_terminal?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string | null
          contact_id: string | null
          contract_value: number | null
          created_at: string
          due_on: string | null
          ended_on: string | null
          external_id: string | null
          id: string
          internal_notes: string | null
          product_id: string | null
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
          contact_id?: string | null
          contract_value?: number | null
          created_at?: string
          due_on?: string | null
          ended_on?: string | null
          external_id?: string | null
          id?: string
          internal_notes?: string | null
          product_id?: string | null
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
          contact_id?: string | null
          contract_value?: number | null
          created_at?: string
          due_on?: string | null
          ended_on?: string | null
          external_id?: string | null
          id?: string
          internal_notes?: string | null
          product_id?: string | null
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
            foreignKeyName: "projects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_status_fkey"
            columns: ["status"]
            isOneToOne: false
            referencedRelation: "project_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      requirements: {
        Row: {
          content: string
          created_at: string
          id: string
          note: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          note?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
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
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
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
          id: string
          included: boolean
          item: string
          note: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          included: boolean
          item: string
          note?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
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
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
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
          display_priority: number
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
          display_priority?: number
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
          display_priority?: number
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
          display_priority: number
          showcase_id: string
        }
        Insert: {
          created_at?: string
          deliverable_id: string
          display_priority?: number
          showcase_id: string
        }
        Update: {
          created_at?: string
          deliverable_id?: string
          display_priority?: number
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
          body_md: string | null
          client_display: string
          created_at: string
          display_priority: number
          id: string
          period: string | null
          product_id: string | null
          project_id: string | null
          slug: string
          status: string
          summary: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body_md?: string | null
          client_display?: string
          created_at?: string
          display_priority?: number
          id?: string
          period?: string | null
          product_id?: string | null
          project_id?: string | null
          slug?: string
          status?: string
          summary?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string | null
          client_display?: string
          created_at?: string
          display_priority?: number
          id?: string
          period?: string | null
          product_id?: string | null
          project_id?: string | null
          slug?: string
          status?: string
          summary?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
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
          display_priority: number
          metric_id: string
          showcase_id: string
        }
        Insert: {
          created_at?: string
          display_priority?: number
          metric_id: string
          showcase_id: string
        }
        Update: {
          created_at?: string
          display_priority?: number
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
          display_priority: number
          problem_id: string
          showcase_id: string
        }
        Insert: {
          created_at?: string
          display_priority?: number
          problem_id: string
          showcase_id: string
        }
        Update: {
          created_at?: string
          display_priority?: number
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
      work_logs: {
        Row: {
          created_at: string
          hours: number
          id: string
          note: string | null
          project_id: string
          task: string
          updated_at: string
          worked_on: string
        }
        Insert: {
          created_at?: string
          hours: number
          id?: string
          note?: string | null
          project_id: string
          task: string
          updated_at?: string
          worked_on?: string
        }
        Update: {
          created_at?: string
          hours?: number
          id?: string
          note?: string | null
          project_id?: string
          task?: string
          updated_at?: string
          worked_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      project_outcomes: {
        Row: {
          outcome: string | null
          project_id: string | null
          status: string | null
        }
        Insert: {
          outcome?: never
          project_id?: string | null
          status?: string | null
        }
        Update: {
          outcome?: never
          project_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_status_fkey"
            columns: ["status"]
            isOneToOne: false
            referencedRelation: "project_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      public_profile: {
        Row: {
          bio: string | null
          contact_email: string | null
          display_name: string | null
          handle: string | null
          id: string | null
          logo_svg: string | null
          operation_policy: string | null
          skills: string[] | null
          social_links: Json | null
          tagline: string | null
        }
        Insert: {
          bio?: string | null
          contact_email?: string | null
          display_name?: string | null
          handle?: string | null
          id?: string | null
          logo_svg?: string | null
          operation_policy?: string | null
          skills?: string[] | null
          social_links?: Json | null
          tagline?: string | null
        }
        Update: {
          bio?: string | null
          contact_email?: string | null
          display_name?: string | null
          handle?: string | null
          id?: string | null
          logo_svg?: string | null
          operation_policy?: string | null
          skills?: string[] | null
          social_links?: Json | null
          tagline?: string | null
        }
        Relationships: []
      }
      public_services: {
        Row: {
          coverage: string[] | null
          deliverables: string[] | null
          details: string | null
          display_priority: number | null
          duration: string | null
          exclusions: string[] | null
          followups: string[] | null
          headline: string | null
          name: string | null
          name_ja: string | null
          pricing: Json | null
          slug: string | null
          summary: string | null
          target_pains: string[] | null
        }
        Insert: {
          coverage?: string[] | null
          deliverables?: string[] | null
          details?: string | null
          display_priority?: number | null
          duration?: string | null
          exclusions?: string[] | null
          followups?: string[] | null
          headline?: string | null
          name?: string | null
          name_ja?: string | null
          pricing?: Json | null
          slug?: string | null
          summary?: string | null
          target_pains?: string[] | null
        }
        Update: {
          coverage?: string[] | null
          deliverables?: string[] | null
          details?: string | null
          display_priority?: number | null
          duration?: string | null
          exclusions?: string[] | null
          followups?: string[] | null
          headline?: string | null
          name?: string | null
          name_ja?: string | null
          pricing?: Json | null
          slug?: string | null
          summary?: string | null
          target_pains?: string[] | null
        }
        Relationships: []
      }
      public_showcases: {
        Row: {
          body_md: string | null
          client_industry: string | null
          client_name: string | null
          deliverables: Json | null
          display_priority: number | null
          metrics: Json | null
          period: string | null
          problems: Json | null
          product_id: string | null
          project_id: string | null
          slug: string | null
          subject_kind: string | null
          summary: string | null
          tech_stack: string[] | null
          testimonial: Json | null
          thumbnail_url: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "showcase_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_outcomes"
            referencedColumns: ["project_id"]
          },
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
      gen_short_id: { Args: { size?: number }; Returns: string }
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
  core: {
    Enums: {},
  },
} as const

