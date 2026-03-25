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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      approval_delegations: {
        Row: {
          backup_approver_id: string
          created_at: string | null
          delegation_type: string | null
          id: string
          is_active: boolean | null
          primary_approver_id: string
          timeout_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          backup_approver_id: string
          created_at?: string | null
          delegation_type?: string | null
          id?: string
          is_active?: boolean | null
          primary_approver_id: string
          timeout_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          backup_approver_id?: string
          created_at?: string | null
          delegation_type?: string | null
          id?: string
          is_active?: boolean | null
          primary_approver_id?: string
          timeout_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_delegations_backup_approver_id_fkey"
            columns: ["backup_approver_id"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_delegations_backup_approver_id_fkey"
            columns: ["backup_approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_delegations_primary_approver_id_fkey"
            columns: ["primary_approver_id"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_delegations_primary_approver_id_fkey"
            columns: ["primary_approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_cancellations: {
        Row: {
          booking_id: string
          cancellation_reason: string
          cancelled_by: string
          check_in: string
          check_out: string
          created_at: string | null
          guest_name: string
          id: string
          num_nights: number
          villa_id: string
        }
        Insert: {
          booking_id: string
          cancellation_reason: string
          cancelled_by: string
          check_in: string
          check_out: string
          created_at?: string | null
          guest_name: string
          id?: string
          num_nights: number
          villa_id: string
        }
        Update: {
          booking_id?: string
          cancellation_reason?: string
          cancelled_by?: string
          check_in?: string
          check_out?: string
          created_at?: string | null
          guest_name?: string
          id?: string
          num_nights?: number
          villa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_cancellations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "villa_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bottle_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ingredient_id: string
          notes: string | null
          opened_by: string | null
          quantity: number | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ingredient_id: string
          notes?: string | null
          opened_by?: string | null
          quantity?: number | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ingredient_id?: string
          notes?: string | null
          opened_by?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bottle_events_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottle_events_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bottle_events_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      breakfast_attendance: {
        Row: {
          created_at: string | null
          date: string
          guests_attended: number | null
          guests_expected: number | null
          id: string
          logged_at: string | null
          logged_by: string | null
          notes: string | null
          updated_at: string | null
          villa_breakdown: Json | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          guests_attended?: number | null
          guests_expected?: number | null
          id?: string
          logged_at?: string | null
          logged_by?: string | null
          notes?: string | null
          updated_at?: string | null
          villa_breakdown?: Json | null
        }
        Update: {
          created_at?: string | null
          date?: string
          guests_attended?: number | null
          guests_expected?: number | null
          id?: string
          logged_at?: string | null
          logged_by?: string | null
          notes?: string | null
          updated_at?: string | null
          villa_breakdown?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "breakfast_attendance_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakfast_attendance_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string | null
          department: Database["public"]["Enums"]["department_type"]
          description: string | null
          estimated_minutes: number | null
          id: string
          is_active: boolean | null
          items: Json
          name: string
          name_es: string
          type: Database["public"]["Enums"]["checklist_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department: Database["public"]["Enums"]["department_type"]
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean | null
          items?: Json
          name: string
          name_es: string
          type: Database["public"]["Enums"]["checklist_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: Database["public"]["Enums"]["department_type"]
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean | null
          items?: Json
          name?: string
          name_es?: string
          type?: Database["public"]["Enums"]["checklist_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      checklists: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          date: string
          duration_minutes: number | null
          id: string
          items: Json
          notes: string | null
          photos: Json | null
          qc_notes: string | null
          quality_score: number | null
          rejection_reason: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["checklist_status"] | null
          template_id: string | null
          type: Database["public"]["Enums"]["checklist_type"]
          updated_at: string | null
          villa_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          id?: string
          items?: Json
          notes?: string | null
          photos?: Json | null
          qc_notes?: string | null
          quality_score?: number | null
          rejection_reason?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["checklist_status"] | null
          template_id?: string | null
          type: Database["public"]["Enums"]["checklist_type"]
          updated_at?: string | null
          villa_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          id?: string
          items?: Json
          notes?: string | null
          photos?: Json | null
          qc_notes?: string | null
          quality_score?: number | null
          rejection_reason?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["checklist_status"] | null
          template_id?: string | null
          type?: Database["public"]["Enums"]["checklist_type"]
          updated_at?: string | null
          villa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklists_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payouts: {
        Row: {
          booking_ids: Json | null
          commission_amount: number
          created_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          partner_name: string
          payment_method: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          status: string | null
          total_bookings: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          booking_ids?: Json | null
          commission_amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          partner_name: string
          payment_method?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          status?: string | null
          total_bookings?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          booking_ids?: Json | null
          commission_amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          partner_name?: string
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          total_bookings?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_payouts_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payouts_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          communication_type: Database["public"]["Enums"]["communication_type"]
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_es: string
          send_time_of_day: number | null
          send_time_offset_hours: number | null
          template_en: string
          template_es: string
          template_fr: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          communication_type: Database["public"]["Enums"]["communication_type"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_es: string
          send_time_of_day?: number | null
          send_time_offset_hours?: number | null
          template_en: string
          template_es: string
          template_fr?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          communication_type?: Database["public"]["Enums"]["communication_type"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_es?: string
          send_time_of_day?: number | null
          send_time_offset_hours?: number | null
          template_en?: string
          template_es?: string
          template_fr?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      consumption_analytics: {
        Row: {
          analysis_date: string
          by_category: Json | null
          by_day_of_week: Json | null
          by_group_size: Json | null
          by_hour: Json | null
          by_nationality: Json | null
          created_at: string | null
          declining_items: Json | null
          id: string
          insights: Json | null
          period_end: string
          period_start: string
          period_type: string
          recommendations: Json | null
          top_items: Json | null
          total_orders: number | null
          total_revenue: number | null
          trending_items: Json | null
          unique_guests: number | null
        }
        Insert: {
          analysis_date: string
          by_category?: Json | null
          by_day_of_week?: Json | null
          by_group_size?: Json | null
          by_hour?: Json | null
          by_nationality?: Json | null
          created_at?: string | null
          declining_items?: Json | null
          id?: string
          insights?: Json | null
          period_end: string
          period_start: string
          period_type: string
          recommendations?: Json | null
          top_items?: Json | null
          total_orders?: number | null
          total_revenue?: number | null
          trending_items?: Json | null
          unique_guests?: number | null
        }
        Update: {
          analysis_date?: string
          by_category?: Json | null
          by_day_of_week?: Json | null
          by_group_size?: Json | null
          by_hour?: Json | null
          by_nationality?: Json | null
          created_at?: string | null
          declining_items?: Json | null
          id?: string
          insights?: Json | null
          period_end?: string
          period_start?: string
          period_type?: string
          recommendations?: Json | null
          top_items?: Json | null
          total_orders?: number | null
          total_revenue?: number | null
          trending_items?: Json | null
          unique_guests?: number | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          backup_notified_at: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string | null
          escalated_at: string | null
          escalated_to: string | null
          escalation_priority: string | null
          escalation_reason: string | null
          escalation_timeout_at: string | null
          id: string
          language: string | null
          last_message_at: string | null
          last_reminder_at: string | null
          reminder_count: number | null
          reservation_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          sentiment: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["conversation_status"] | null
          summary: string | null
          topics: Json | null
          updated_at: string | null
        }
        Insert: {
          backup_notified_at?: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_priority?: string | null
          escalation_reason?: string | null
          escalation_timeout_at?: string | null
          id?: string
          language?: string | null
          last_message_at?: string | null
          last_reminder_at?: string | null
          reminder_count?: number | null
          reservation_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sentiment?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["conversation_status"] | null
          summary?: string | null
          topics?: Json | null
          updated_at?: string | null
        }
        Update: {
          backup_notified_at?: string | null
          channel?: Database["public"]["Enums"]["conversation_channel"]
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_priority?: string | null
          escalation_reason?: string | null
          escalation_timeout_at?: string | null
          id?: string
          language?: string | null
          last_message_at?: string | null
          last_reminder_at?: string | null
          reminder_count?: number | null
          reservation_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sentiment?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["conversation_status"] | null
          summary?: string | null
          topics?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_metrics: {
        Row: {
          adr: number | null
          checklists_completed: number | null
          created_at: string | null
          date: string
          fb_revenue: number | null
          food_cost: number | null
          gross_margin: number | null
          gross_margin_pct: number | null
          id: string
          labor_cost: number | null
          maintenance_issues: number | null
          occupancy_pct: number | null
          occupied_villas: number | null
          orders_count: number | null
          revpar: number | null
          room_revenue: number | null
          service_revenue: number | null
          staff_performance: Json | null
          top_dishes: Json | null
          total_cost: number | null
          total_guests: number | null
          total_revenue: number | null
          total_villas: number | null
          transport_cost: number | null
          updated_at: string | null
        }
        Insert: {
          adr?: number | null
          checklists_completed?: number | null
          created_at?: string | null
          date: string
          fb_revenue?: number | null
          food_cost?: number | null
          gross_margin?: number | null
          gross_margin_pct?: number | null
          id?: string
          labor_cost?: number | null
          maintenance_issues?: number | null
          occupancy_pct?: number | null
          occupied_villas?: number | null
          orders_count?: number | null
          revpar?: number | null
          room_revenue?: number | null
          service_revenue?: number | null
          staff_performance?: Json | null
          top_dishes?: Json | null
          total_cost?: number | null
          total_guests?: number | null
          total_revenue?: number | null
          total_villas?: number | null
          transport_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          adr?: number | null
          checklists_completed?: number | null
          created_at?: string | null
          date?: string
          fb_revenue?: number | null
          food_cost?: number | null
          gross_margin?: number | null
          gross_margin_pct?: number | null
          id?: string
          labor_cost?: number | null
          maintenance_issues?: number | null
          occupancy_pct?: number | null
          occupied_villas?: number | null
          orders_count?: number | null
          revpar?: number | null
          room_revenue?: number | null
          service_revenue?: number | null
          staff_performance?: Json | null
          top_dishes?: Json | null
          total_cost?: number | null
          total_guests?: number | null
          total_revenue?: number | null
          total_villas?: number | null
          transport_cost?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_occupancy: {
        Row: {
          check_ins: number | null
          check_outs: number | null
          consumption_events: number | null
          created_at: string | null
          created_by: string | null
          date: string
          guests_count: number
          id: string
          notes: string | null
          person_nights: number | null
          updated_at: string | null
          villas_occupied: Json | null
        }
        Insert: {
          check_ins?: number | null
          check_outs?: number | null
          consumption_events?: number | null
          created_at?: string | null
          created_by?: string | null
          date: string
          guests_count?: number
          id?: string
          notes?: string | null
          person_nights?: number | null
          updated_at?: string | null
          villas_occupied?: Json | null
        }
        Update: {
          check_ins?: number | null
          check_outs?: number | null
          consumption_events?: number | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          guests_count?: number
          id?: string
          notes?: string | null
          person_nights?: number | null
          updated_at?: string | null
          villas_occupied?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_occupancy_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_occupancy_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tasks: {
        Row: {
          completed_at: string | null
          completed_count: number | null
          created_at: string | null
          date: string
          department: Database["public"]["Enums"]["department_type"]
          generated_from: string | null
          id: string
          notes: string | null
          occupancy_level: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          tasks: Json
          total_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_count?: number | null
          created_at?: string | null
          date?: string
          department: Database["public"]["Enums"]["department_type"]
          generated_from?: string | null
          id?: string
          notes?: string | null
          occupancy_level?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          tasks?: Json
          total_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_count?: number | null
          created_at?: string | null
          date?: string
          department?: Database["public"]["Enums"]["department_type"]
          generated_from?: string | null
          id?: string
          notes?: string | null
          occupancy_level?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          tasks?: Json
          total_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      day_visitors: {
        Row: {
          arrival_time: string | null
          consumption_total: number | null
          created_at: string | null
          departure_time: string | null
          host_guest_name: string | null
          host_villa_id: string | null
          id: string
          logged_by: string | null
          notes: string | null
          party_name: string
          party_size: number
          purpose: string | null
          updated_at: string | null
          visit_date: string
        }
        Insert: {
          arrival_time?: string | null
          consumption_total?: number | null
          created_at?: string | null
          departure_time?: string | null
          host_guest_name?: string | null
          host_villa_id?: string | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          party_name: string
          party_size?: number
          purpose?: string | null
          updated_at?: string | null
          visit_date?: string
        }
        Update: {
          arrival_time?: string | null
          consumption_total?: number | null
          created_at?: string | null
          departure_time?: string | null
          host_guest_name?: string | null
          host_villa_id?: string | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          party_name?: string
          party_size?: number
          purpose?: string | null
          updated_at?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_visitors_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_visitors_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_logs: {
        Row: {
          amount: number
          applied_at: string | null
          applied_by: string | null
          applied_to_invoice: boolean | null
          booking_id: string | null
          created_at: string | null
          currency: string | null
          date_paid: string
          id: string
          notes: string | null
          payment_method: string
          receipt_url: string | null
          reference_number: string | null
          reservation_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          applied_at?: string | null
          applied_by?: string | null
          applied_to_invoice?: boolean | null
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          date_paid: string
          id?: string
          notes?: string | null
          payment_method: string
          receipt_url?: string | null
          reference_number?: string | null
          reservation_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          applied_at?: string | null
          applied_by?: string | null
          applied_to_invoice?: boolean | null
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          date_paid?: string
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_url?: string | null
          reference_number?: string | null
          reservation_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposit_logs_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_logs_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "villa_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      eod_reconciliations: {
        Row: {
          closed_at: string | null
          closed_by: string
          created_at: string | null
          date: string
          id: string
          items: Json
          items_with_discrepancy: number | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          total_items_checked: number | null
          total_variance_cost: number | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by: string
          created_at?: string | null
          date?: string
          id?: string
          items?: Json
          items_with_discrepancy?: number | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          total_items_checked?: number | null
          total_variance_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string
          created_at?: string | null
          date?: string
          id?: string
          items?: Json
          items_with_discrepancy?: number | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          total_items_checked?: number | null
          total_variance_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eod_reconciliations_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eod_reconciliations_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eod_reconciliations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eod_reconciliations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          created_at: string | null
          description: string | null
          escalate_to: string | null
          id: string
          is_active: boolean | null
          name: string
          notification_method: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          trigger_type: string
          trigger_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          escalate_to?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notification_method?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          trigger_type: string
          trigger_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          escalate_to?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notification_method?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          trigger_type?: string
          trigger_value?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_rules_escalate_to_fkey"
            columns: ["escalate_to"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_rules_escalate_to_fkey"
            columns: ["escalate_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_bookings: {
        Row: {
          check_in: string
          check_out: string
          coordinator_email: string | null
          coordinator_name: string
          coordinator_phone: string | null
          created_at: string | null
          created_by: string | null
          group_billing: Json | null
          id: string
          name: string
          notes: string | null
          shared_itinerary: Json | null
          special_requests: string | null
          status: string | null
          total_guests: number | null
          updated_at: string | null
          villa_ids: string[]
        }
        Insert: {
          check_in: string
          check_out: string
          coordinator_email?: string | null
          coordinator_name: string
          coordinator_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          group_billing?: Json | null
          id?: string
          name: string
          notes?: string | null
          shared_itinerary?: Json | null
          special_requests?: string | null
          status?: string | null
          total_guests?: number | null
          updated_at?: string | null
          villa_ids?: string[]
        }
        Update: {
          check_in?: string
          check_out?: string
          coordinator_email?: string | null
          coordinator_name?: string
          coordinator_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          group_billing?: Json | null
          id?: string
          name?: string
          notes?: string | null
          shared_itinerary?: Json | null
          special_requests?: string | null
          status?: string | null
          total_guests?: number | null
          updated_at?: string | null
          villa_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "group_bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_communications: {
        Row: {
          booking_id: string | null
          communication_type: Database["public"]["Enums"]["communication_type"]
          created_at: string | null
          error_message: string | null
          followup_handled: boolean | null
          guest_language: string | null
          guest_name: string | null
          guest_phone: string
          handled_by: string | null
          id: string
          message_sent: string | null
          message_template: string
          requires_followup: boolean | null
          reservation_id: string | null
          response_at: string | null
          response_received: string | null
          scheduled_for: string
          sent_at: string | null
          status: Database["public"]["Enums"]["communication_status"] | null
          twilio_sid: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          communication_type: Database["public"]["Enums"]["communication_type"]
          created_at?: string | null
          error_message?: string | null
          followup_handled?: boolean | null
          guest_language?: string | null
          guest_name?: string | null
          guest_phone: string
          handled_by?: string | null
          id?: string
          message_sent?: string | null
          message_template: string
          requires_followup?: boolean | null
          reservation_id?: string | null
          response_at?: string | null
          response_received?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"] | null
          twilio_sid?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          communication_type?: Database["public"]["Enums"]["communication_type"]
          created_at?: string | null
          error_message?: string | null
          followup_handled?: boolean | null
          guest_language?: string | null
          guest_name?: string | null
          guest_phone?: string
          handled_by?: string | null
          id?: string
          message_sent?: string | null
          message_template?: string
          requires_followup?: boolean | null
          reservation_id?: string | null
          response_at?: string | null
          response_received?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"] | null
          twilio_sid?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_communications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "villa_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_communications_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_communications_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_communications_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_feedback: {
        Row: {
          check_in_date: string | null
          check_out_date: string | null
          cleanliness_rating: number | null
          comment: string | null
          created_at: string | null
          food_rating: number | null
          group_size: number | null
          guest_country: string | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          highlights: string[] | null
          id: string
          improvements: string[] | null
          language: string | null
          location_rating: number | null
          nps_score: number | null
          overall_rating: number | null
          reservation_id: string | null
          season: string | null
          service_rating: number | null
          source: string | null
          staff_mentioned: string[] | null
          submitted_at: string | null
          survey_sent_at: string | null
          updated_at: string | null
          value_rating: number | null
          villa_booking_id: string | null
          villa_id: string | null
        }
        Insert: {
          check_in_date?: string | null
          check_out_date?: string | null
          cleanliness_rating?: number | null
          comment?: string | null
          created_at?: string | null
          food_rating?: number | null
          group_size?: number | null
          guest_country?: string | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          highlights?: string[] | null
          id?: string
          improvements?: string[] | null
          language?: string | null
          location_rating?: number | null
          nps_score?: number | null
          overall_rating?: number | null
          reservation_id?: string | null
          season?: string | null
          service_rating?: number | null
          source?: string | null
          staff_mentioned?: string[] | null
          submitted_at?: string | null
          survey_sent_at?: string | null
          updated_at?: string | null
          value_rating?: number | null
          villa_booking_id?: string | null
          villa_id?: string | null
        }
        Update: {
          check_in_date?: string | null
          check_out_date?: string | null
          cleanliness_rating?: number | null
          comment?: string | null
          created_at?: string | null
          food_rating?: number | null
          group_size?: number | null
          guest_country?: string | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          highlights?: string[] | null
          id?: string
          improvements?: string[] | null
          language?: string | null
          location_rating?: number | null
          nps_score?: number | null
          overall_rating?: number | null
          reservation_id?: string | null
          season?: string | null
          service_rating?: number | null
          source?: string | null
          staff_mentioned?: string[] | null
          submitted_at?: string | null
          survey_sent_at?: string | null
          updated_at?: string | null
          value_rating?: number | null
          villa_booking_id?: string | null
          villa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_feedback_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_feedback_villa_booking_id_fkey"
            columns: ["villa_booking_id"]
            isOneToOne: false
            referencedRelation: "villa_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_history: {
        Row: {
          country: string | null
          created_at: string | null
          dietary_preferences: Json | null
          email: string | null
          favorite_villa: string | null
          first_stay_date: string | null
          full_name: string | null
          id: string
          interests: Json | null
          is_returning: boolean | null
          last_stay_date: string | null
          loyalty_discount_pct: number | null
          normalized_phone: string | null
          notes: string | null
          phone: string | null
          preferred_language: string | null
          room_preferences: Json | null
          total_nights: number | null
          total_spent: number | null
          total_stays: number | null
          updated_at: string | null
          vip_status: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          dietary_preferences?: Json | null
          email?: string | null
          favorite_villa?: string | null
          first_stay_date?: string | null
          full_name?: string | null
          id?: string
          interests?: Json | null
          is_returning?: boolean | null
          last_stay_date?: string | null
          loyalty_discount_pct?: number | null
          normalized_phone?: string | null
          notes?: string | null
          phone?: string | null
          preferred_language?: string | null
          room_preferences?: Json | null
          total_nights?: number | null
          total_spent?: number | null
          total_stays?: number | null
          updated_at?: string | null
          vip_status?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          dietary_preferences?: Json | null
          email?: string | null
          favorite_villa?: string | null
          first_stay_date?: string | null
          full_name?: string | null
          id?: string
          interests?: Json | null
          is_returning?: boolean | null
          last_stay_date?: string | null
          loyalty_discount_pct?: number | null
          normalized_phone?: string | null
          notes?: string | null
          phone?: string | null
          preferred_language?: string | null
          room_preferences?: Json | null
          total_nights?: number | null
          total_spent?: number | null
          total_stays?: number | null
          updated_at?: string | null
          vip_status?: string | null
        }
        Relationships: []
      }
      guest_upsell_tracking: {
        Row: {
          booking_id: string | null
          created_at: string | null
          guest_phone: string | null
          id: string
          reservation_id: string | null
          response: string | null
          service_id: string | null
          suggested_at: string | null
          suggestion_day: number | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          guest_phone?: string | null
          id?: string
          reservation_id?: string | null
          response?: string | null
          service_id?: string | null
          suggested_at?: string | null
          suggestion_day?: number | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          guest_phone?: string | null
          id?: string
          reservation_id?: string | null
          response?: string | null
          service_id?: string | null
          suggested_at?: string | null
          suggestion_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_upsell_tracking_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_upsell_tracking_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_upsell_tracking_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          category: Database["public"]["Enums"]["ingredient_category"]
          cost_per_unit: number
          created_at: string | null
          current_stock: number | null
          id: string
          is_active: boolean | null
          last_updated: string | null
          min_stock: number | null
          name: string
          name_es: string
          notes: string | null
          per_guest_night: number | null
          storage_location: string | null
          supplier: string | null
          unit: string
          updated_by: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["ingredient_category"]
          cost_per_unit?: number
          created_at?: string | null
          current_stock?: number | null
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          min_stock?: number | null
          name: string
          name_es: string
          notes?: string | null
          per_guest_night?: number | null
          storage_location?: string | null
          supplier?: string | null
          unit: string
          updated_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["ingredient_category"]
          cost_per_unit?: number
          created_at?: string | null
          current_stock?: number | null
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          min_stock?: number | null
          name?: string
          name_es?: string
          notes?: string | null
          per_guest_night?: number | null
          storage_location?: string | null
          supplier?: string | null
          unit?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          count_date: string | null
          counted_at: string | null
          counted_by: string
          created_at: string | null
          id: string
          ingredient_id: string
          notes: string | null
          previous_quantity: number | null
          quantity_counted: number
          variance: number | null
        }
        Insert: {
          count_date?: string | null
          counted_at?: string | null
          counted_by: string
          created_at?: string | null
          id?: string
          ingredient_id: string
          notes?: string | null
          previous_quantity?: number | null
          quantity_counted: number
          variance?: number | null
        }
        Update: {
          count_date?: string | null
          counted_at?: string | null
          counted_by?: string
          created_at?: string | null
          id?: string
          ingredient_id?: string
          notes?: string | null
          previous_quantity?: number | null
          quantity_counted?: number
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      item_86_logs: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          id: string
          item_id: string
          item_name: string
          item_type: string
          reason: string | null
          restored_at: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          item_name: string
          item_type: string
          reason?: string | null
          restored_at?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          reason?: string | null
          restored_at?: string | null
        }
        Relationships: []
      }
      linen_inventory: {
        Row: {
          available: number | null
          created_at: string | null
          id: string
          in_laundry: number
          in_use: number
          item_name: string
          item_name_es: string
          item_type: string
          min_available: number
          notes: string | null
          per_villa: number
          total_stock: number
          updated_at: string | null
        }
        Insert: {
          available?: number | null
          created_at?: string | null
          id?: string
          in_laundry?: number
          in_use?: number
          item_name: string
          item_name_es: string
          item_type: string
          min_available?: number
          notes?: string | null
          per_villa?: number
          total_stock?: number
          updated_at?: string | null
        }
        Update: {
          available?: number | null
          created_at?: string | null
          id?: string
          in_laundry?: number
          in_use?: number
          item_name?: string
          item_name_es?: string
          item_type?: string
          min_available?: number
          notes?: string | null
          per_villa?: number
          total_stock?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      linen_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          linen_id: string
          logged_by: string | null
          notes: string | null
          quantity: number
          villa_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          linen_id: string
          logged_by?: string | null
          notes?: string | null
          quantity: number
          villa_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          linen_id?: string
          logged_by?: string | null
          notes?: string | null
          quantity?: number
          villa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "linen_logs_linen_id_fkey"
            columns: ["linen_id"]
            isOneToOne: false
            referencedRelation: "linen_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linen_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linen_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_completions: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          issues_found: string | null
          notes: string | null
          parts_used: Json | null
          photos: Json | null
          recurring_maintenance_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          issues_found?: string | null
          notes?: string | null
          parts_used?: Json | null
          photos?: Json | null
          recurring_maintenance_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          issues_found?: string | null
          notes?: string | null
          parts_used?: Json | null
          photos?: Json | null
          recurring_maintenance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_completions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_completions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_completions_recurring_maintenance_id_fkey"
            columns: ["recurring_maintenance_id"]
            isOneToOne: false
            referencedRelation: "overdue_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_completions_recurring_maintenance_id_fkey"
            columns: ["recurring_maintenance_id"]
            isOneToOne: false
            referencedRelation: "recurring_maintenance"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_inspection_reports: {
        Row: {
          additional_comments: string | null
          beach_cleaned: boolean | null
          corrections_needed: string | null
          created_at: string | null
          date: string
          green_area_issues: string | null
          id: string
          irrigation_checked: boolean | null
          irrigation_issues: string | null
          irrigation_maintenance_notes: string | null
          irrigation_system_maintained: boolean | null
          is_monthly_check: boolean | null
          lawn_cut: boolean | null
          leaves_raked: boolean | null
          mulch_rotated: boolean | null
          pest_debris_checked: boolean | null
          plant_health_notes: string | null
          plumbing_inspected: boolean | null
          plumbing_issues: string | null
          replacement_details: string | null
          replacements_needed: boolean | null
          reported_by: string
          room_issues: string | null
          rooms_inspected: boolean | null
          tank_main_level: string | null
          tank_recycled_level: string | null
          tank_reserve_level: string | null
          updated_at: string | null
          water_report: string | null
        }
        Insert: {
          additional_comments?: string | null
          beach_cleaned?: boolean | null
          corrections_needed?: string | null
          created_at?: string | null
          date: string
          green_area_issues?: string | null
          id?: string
          irrigation_checked?: boolean | null
          irrigation_issues?: string | null
          irrigation_maintenance_notes?: string | null
          irrigation_system_maintained?: boolean | null
          is_monthly_check?: boolean | null
          lawn_cut?: boolean | null
          leaves_raked?: boolean | null
          mulch_rotated?: boolean | null
          pest_debris_checked?: boolean | null
          plant_health_notes?: string | null
          plumbing_inspected?: boolean | null
          plumbing_issues?: string | null
          replacement_details?: string | null
          replacements_needed?: boolean | null
          reported_by: string
          room_issues?: string | null
          rooms_inspected?: boolean | null
          tank_main_level?: string | null
          tank_recycled_level?: string | null
          tank_reserve_level?: string | null
          updated_at?: string | null
          water_report?: string | null
        }
        Update: {
          additional_comments?: string | null
          beach_cleaned?: boolean | null
          corrections_needed?: string | null
          created_at?: string | null
          date?: string
          green_area_issues?: string | null
          id?: string
          irrigation_checked?: boolean | null
          irrigation_issues?: string | null
          irrigation_maintenance_notes?: string | null
          irrigation_system_maintained?: boolean | null
          is_monthly_check?: boolean | null
          lawn_cut?: boolean | null
          leaves_raked?: boolean | null
          mulch_rotated?: boolean | null
          pest_debris_checked?: boolean | null
          plant_health_notes?: string | null
          plumbing_inspected?: boolean | null
          plumbing_issues?: string | null
          replacement_details?: string | null
          replacements_needed?: boolean | null
          reported_by?: string
          room_issues?: string | null
          rooms_inspected?: boolean | null
          tank_main_level?: string | null
          tank_recycled_level?: string | null
          tank_reserve_level?: string | null
          updated_at?: string | null
          water_report?: string | null
        }
        Relationships: []
      }
      maintenance_issues: {
        Row: {
          assigned_to: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          location: string
          photos: Json | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          title_es: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location: string
          photos?: Json | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          title_es?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string
          photos?: Json | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          title_es?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_issues_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_issues_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_issues_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_issues_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_issues_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_issues_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: Json | null
          category: Database["public"]["Enums"]["menu_category"]
          cost: number | null
          created_at: string | null
          description: string | null
          description_es: string | null
          dietary_tags: Json | null
          id: string
          is_active: boolean | null
          is_available: boolean | null
          linked_ingredient_id: string | null
          margin: number | null
          margin_pct: number | null
          name: string
          name_es: string
          photo_url: string | null
          pours_per_bottle: number | null
          prep_time_minutes: number | null
          price: number
          sort_order: number | null
          subcategory: string | null
          unavailable_reason: string | null
          unavailable_until: string | null
          updated_at: string | null
        }
        Insert: {
          allergens?: Json | null
          category: Database["public"]["Enums"]["menu_category"]
          cost?: number | null
          created_at?: string | null
          description?: string | null
          description_es?: string | null
          dietary_tags?: Json | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          linked_ingredient_id?: string | null
          margin?: number | null
          margin_pct?: number | null
          name: string
          name_es: string
          photo_url?: string | null
          pours_per_bottle?: number | null
          prep_time_minutes?: number | null
          price?: number
          sort_order?: number | null
          subcategory?: string | null
          unavailable_reason?: string | null
          unavailable_until?: string | null
          updated_at?: string | null
        }
        Update: {
          allergens?: Json | null
          category?: Database["public"]["Enums"]["menu_category"]
          cost?: number | null
          created_at?: string | null
          description?: string | null
          description_es?: string | null
          dietary_tags?: Json | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          linked_ingredient_id?: string | null
          margin?: number | null
          margin_pct?: number | null
          name?: string
          name_es?: string
          photo_url?: string | null
          pours_per_bottle?: number | null
          prep_time_minutes?: number | null
          price?: number
          sort_order?: number | null
          subcategory?: string | null
          unavailable_reason?: string | null
          unavailable_until?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_linked_ingredient_id_fkey"
            columns: ["linked_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          content_translated: string | null
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          model_used: string | null
          original_language: string | null
          role: string
          target_language: string | null
          tokens_used: number | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          content_translated?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_used?: string | null
          original_language?: string | null
          role: string
          target_language?: string | null
          tokens_used?: number | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          content_translated?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_used?: string | null
          original_language?: string | null
          role?: string
          target_language?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          notification_type: string
          recipient_phone: string
          related_id: string | null
          related_type: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          notification_type: string
          recipient_phone: string
          related_id?: string | null
          related_type?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          notification_type?: string
          recipient_phone?: string
          related_id?: string | null
          related_type?: string | null
          status?: string | null
        }
        Relationships: []
      }
      order_logs: {
        Row: {
          created_at: string | null
          day_visitor_id: string | null
          delivery_location: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          is_comp: boolean | null
          is_day_visitor: boolean | null
          is_staff_meal: boolean | null
          meal_period: Database["public"]["Enums"]["menu_category"] | null
          menu_item_id: string
          notes: string | null
          order_date: string
          order_time: string | null
          order_type: string | null
          quantity: number
          reservation_id: string | null
          served_by: string | null
          special_instructions: string | null
          status: string | null
          total_price: number
          unit_price: number
          villa_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_visitor_id?: string | null
          delivery_location?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          is_comp?: boolean | null
          is_day_visitor?: boolean | null
          is_staff_meal?: boolean | null
          meal_period?: Database["public"]["Enums"]["menu_category"] | null
          menu_item_id: string
          notes?: string | null
          order_date?: string
          order_time?: string | null
          order_type?: string | null
          quantity?: number
          reservation_id?: string | null
          served_by?: string | null
          special_instructions?: string | null
          status?: string | null
          total_price: number
          unit_price: number
          villa_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_visitor_id?: string | null
          delivery_location?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          is_comp?: boolean | null
          is_day_visitor?: boolean | null
          is_staff_meal?: boolean | null
          meal_period?: Database["public"]["Enums"]["menu_category"] | null
          menu_item_id?: string
          notes?: string | null
          order_date?: string
          order_time?: string | null
          order_type?: string | null
          quantity?: number
          reservation_id?: string | null
          served_by?: string | null
          special_instructions?: string | null
          status?: string | null
          total_price?: number
          unit_price?: number
          villa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_logs_day_visitor_id_fkey"
            columns: ["day_visitor_id"]
            isOneToOne: false
            referencedRelation: "day_visitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_logs_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "bottle_variance_report"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "order_logs_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "dish_pl"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "order_logs_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_logs_served_by_fkey"
            columns: ["served_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_logs_served_by_fkey"
            columns: ["served_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_approvals: {
        Row: {
          approval_type: string
          assigned_to: string
          created_at: string | null
          escalated_at: string | null
          escalated_to: string | null
          id: string
          related_id: string
          status: string | null
          timeout_at: string | null
        }
        Insert: {
          approval_type: string
          assigned_to: string
          created_at?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          id?: string
          related_id: string
          status?: string | null
          timeout_at?: string | null
        }
        Update: {
          approval_type?: string
          assigned_to?: string
          created_at?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          id?: string
          related_id?: string
          status?: string | null
          timeout_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_approvals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_approvals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_approvals_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_approvals_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applies_to: string
          banner_text: string | null
          banner_text_es: string | null
          category_filter: string[] | null
          created_at: string | null
          days_of_week: number[] | null
          description: string | null
          description_es: string | null
          discount_type: string
          discount_value: number
          end_time: string
          id: string
          is_active: boolean | null
          item_ids: string[] | null
          min_purchase: number | null
          name: string
          name_es: string
          start_time: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applies_to?: string
          banner_text?: string | null
          banner_text_es?: string | null
          category_filter?: string[] | null
          created_at?: string | null
          days_of_week?: number[] | null
          description?: string | null
          description_es?: string | null
          discount_type: string
          discount_value?: number
          end_time: string
          id?: string
          is_active?: boolean | null
          item_ids?: string[] | null
          min_purchase?: number | null
          name: string
          name_es: string
          start_time: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applies_to?: string
          banner_text?: string | null
          banner_text_es?: string | null
          category_filter?: string[] | null
          created_at?: string | null
          days_of_week?: number[] | null
          description?: string | null
          description_es?: string | null
          discount_type?: string
          discount_value?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          item_ids?: string[] | null
          min_purchase?: number | null
          name?: string
          name_es?: string
          start_time?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          actual_items: Json | null
          actual_subtotal: number | null
          actual_total_cost: number | null
          approved_at: string | null
          approved_by: string | null
          cost_variance: number | null
          created_at: string | null
          created_by: string | null
          delivery_date: string | null
          discrepancy_notes: string | null
          forecast_end: string | null
          forecast_person_nights: number | null
          forecast_start: string | null
          has_discrepancies: boolean | null
          id: string
          internal_notes: string | null
          items: Json
          order_date: string
          order_number: string
          receipt_logged_at: string | null
          receipt_logged_by: string | null
          receipt_photos: Json | null
          received_at: string | null
          received_by: string | null
          received_items: Json | null
          status: Database["public"]["Enums"]["purchase_order_status"] | null
          subtotal: number | null
          supplier_notes: string | null
          total_cost: number | null
          transport_cost: number | null
          updated_at: string | null
        }
        Insert: {
          actual_items?: Json | null
          actual_subtotal?: number | null
          actual_total_cost?: number | null
          approved_at?: string | null
          approved_by?: string | null
          cost_variance?: number | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          discrepancy_notes?: string | null
          forecast_end?: string | null
          forecast_person_nights?: number | null
          forecast_start?: string | null
          has_discrepancies?: boolean | null
          id?: string
          internal_notes?: string | null
          items?: Json
          order_date?: string
          order_number: string
          receipt_logged_at?: string | null
          receipt_logged_by?: string | null
          receipt_photos?: Json | null
          received_at?: string | null
          received_by?: string | null
          received_items?: Json | null
          status?: Database["public"]["Enums"]["purchase_order_status"] | null
          subtotal?: number | null
          supplier_notes?: string | null
          total_cost?: number | null
          transport_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_items?: Json | null
          actual_subtotal?: number | null
          actual_total_cost?: number | null
          approved_at?: string | null
          approved_by?: string | null
          cost_variance?: number | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          discrepancy_notes?: string | null
          forecast_end?: string | null
          forecast_person_nights?: number | null
          forecast_start?: string | null
          has_discrepancies?: boolean | null
          id?: string
          internal_notes?: string | null
          items?: Json
          order_date?: string
          order_number?: string
          receipt_logged_at?: string | null
          receipt_logged_by?: string | null
          receipt_photos?: Json | null
          received_at?: string | null
          received_by?: string | null
          received_items?: Json | null
          status?: Database["public"]["Enums"]["purchase_order_status"] | null
          subtotal?: number | null
          supplier_notes?: string | null
          total_cost?: number | null
          transport_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_receipt_logged_by_fkey"
            columns: ["receipt_logged_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_receipt_logged_by_fkey"
            columns: ["receipt_logged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string | null
          id: string
          ingredient_id: string
          is_optional: boolean | null
          menu_item_id: string
          notes: string | null
          quantity: number
          unit: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_id: string
          is_optional?: boolean | null
          menu_item_id: string
          notes?: string | null
          quantity: number
          unit: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_id?: string
          is_optional?: boolean | null
          menu_item_id?: string
          notes?: string | null
          quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "bottle_variance_report"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "dish_pl"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_maintenance: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          description_es: string | null
          estimated_minutes: number | null
          frequency: string
          frequency_days: number
          id: string
          is_active: boolean | null
          last_completed_at: string | null
          last_completed_by: string | null
          location: string | null
          next_due_date: string
          notes: string | null
          priority: string | null
          requires_approval: boolean | null
          task_name: string
          task_name_es: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          description_es?: string | null
          estimated_minutes?: number | null
          frequency: string
          frequency_days: number
          id?: string
          is_active?: boolean | null
          last_completed_at?: string | null
          last_completed_by?: string | null
          location?: string | null
          next_due_date: string
          notes?: string | null
          priority?: string | null
          requires_approval?: boolean | null
          task_name: string
          task_name_es: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          description_es?: string | null
          estimated_minutes?: number | null
          frequency?: string
          frequency_days?: number
          id?: string
          is_active?: boolean | null
          last_completed_at?: string | null
          last_completed_by?: string | null
          location?: string | null
          next_due_date?: string
          notes?: string | null
          priority?: string | null
          requires_approval?: boolean | null
          task_name?: string
          task_name_es?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_maintenance_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_maintenance_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_maintenance_last_completed_by_fkey"
            columns: ["last_completed_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_maintenance_last_completed_by_fkey"
            columns: ["last_completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          check_in: string
          check_out: string
          cloudbeds_id: string | null
          created_at: string | null
          dietary_needs: Json | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          guests_count: number
          id: string
          interests: Json | null
          language: string | null
          notes: string | null
          status: Database["public"]["Enums"]["reservation_status"] | null
          synced_at: string | null
          total_amount: number | null
          updated_at: string | null
          villas: Json | null
        }
        Insert: {
          check_in: string
          check_out: string
          cloudbeds_id?: string | null
          created_at?: string | null
          dietary_needs?: Json | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          guests_count?: number
          id?: string
          interests?: Json | null
          language?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["reservation_status"] | null
          synced_at?: string | null
          total_amount?: number | null
          updated_at?: string | null
          villas?: Json | null
        }
        Update: {
          check_in?: string
          check_out?: string
          cloudbeds_id?: string | null
          created_at?: string | null
          dietary_needs?: Json | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          guests_count?: number
          id?: string
          interests?: Json | null
          language?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["reservation_status"] | null
          synced_at?: string | null
          total_amount?: number | null
          updated_at?: string | null
          villas?: Json | null
        }
        Relationships: []
      }
      review_requests: {
        Row: {
          check_out_date: string | null
          clicked_at: string | null
          created_at: string | null
          error_message: string | null
          feedback_completed: boolean | null
          feedback_link: string | null
          guest_email: string | null
          guest_language: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          message_sid: string | null
          reservation_id: string | null
          review_platform: string | null
          reviewed_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          sent_via: string | null
          status: string | null
          updated_at: string | null
          villa_booking_id: string | null
        }
        Insert: {
          check_out_date?: string | null
          clicked_at?: string | null
          created_at?: string | null
          error_message?: string | null
          feedback_completed?: boolean | null
          feedback_link?: string | null
          guest_email?: string | null
          guest_language?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          message_sid?: string | null
          reservation_id?: string | null
          review_platform?: string | null
          reviewed_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_via?: string | null
          status?: string | null
          updated_at?: string | null
          villa_booking_id?: string | null
        }
        Update: {
          check_out_date?: string | null
          clicked_at?: string | null
          created_at?: string | null
          error_message?: string | null
          feedback_completed?: boolean | null
          feedback_link?: string | null
          guest_email?: string | null
          guest_language?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          message_sid?: string | null
          reservation_id?: string | null
          review_platform?: string | null
          reviewed_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_via?: string | null
          status?: string | null
          updated_at?: string | null
          villa_booking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_villa_booking_id_fkey"
            columns: ["villa_booking_id"]
            isOneToOne: false
            referencedRelation: "villa_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      service_availability_logs: {
        Row: {
          available_from: string | null
          capacity_note: string | null
          changed_at: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          is_available: boolean
          reason: string | null
          service_id: string
          weather_note: string | null
        }
        Insert: {
          available_from?: string | null
          capacity_note?: string | null
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          is_available: boolean
          reason?: string | null
          service_id: string
          weather_note?: string | null
        }
        Update: {
          available_from?: string | null
          capacity_note?: string | null
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          is_available?: boolean
          reason?: string | null
          service_id?: string
          weather_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_availability_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_availability_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_availability_logs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          booked_by: string | null
          booked_via: string | null
          commission_amount: number | null
          completed_at: string | null
          confirmed_at: string | null
          cost: number | null
          created_at: string | null
          date: string
          guest_name: string
          guest_phone: string | null
          id: string
          net_revenue: number | null
          notes: string | null
          partner_notified: boolean | null
          partner_notified_at: string | null
          quantity: number | null
          reservation_id: string | null
          service_id: string
          status: Database["public"]["Enums"]["booking_status"] | null
          time: string | null
          total_revenue: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          booked_by?: string | null
          booked_via?: string | null
          commission_amount?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          cost?: number | null
          created_at?: string | null
          date: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          net_revenue?: number | null
          notes?: string | null
          partner_notified?: boolean | null
          partner_notified_at?: string | null
          quantity?: number | null
          reservation_id?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          time?: string | null
          total_revenue: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          booked_by?: string | null
          booked_via?: string | null
          commission_amount?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          cost?: number | null
          created_at?: string | null
          date?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          net_revenue?: number | null
          notes?: string | null
          partner_notified?: boolean | null
          partner_notified_at?: string | null
          quantity?: number | null
          reservation_id?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          time?: string | null
          total_revenue?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_booked_by_fkey"
            columns: ["booked_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_booked_by_fkey"
            columns: ["booked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          advance_booking_hours: number | null
          category: string | null
          commission_pct: number | null
          cost: number | null
          created_at: string | null
          description: string | null
          description_es: string | null
          duration_hours: number | null
          id: string
          is_active: boolean | null
          is_available: boolean | null
          is_available_today: boolean | null
          margin: number | null
          max_guests: number | null
          min_guests: number | null
          name: string
          name_es: string
          partner_email: string | null
          partner_name: string | null
          partner_phone: string | null
          photos: Json | null
          price: number
          sort_order: number | null
          type: Database["public"]["Enums"]["service_type"]
          unavailable_reason: string | null
          unavailable_until: string | null
          updated_at: string | null
          upsell_day: number | null
          upsell_priority: number | null
          upsell_triggers: Json | null
        }
        Insert: {
          advance_booking_hours?: number | null
          category?: string | null
          commission_pct?: number | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          description_es?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          is_available_today?: boolean | null
          margin?: number | null
          max_guests?: number | null
          min_guests?: number | null
          name: string
          name_es: string
          partner_email?: string | null
          partner_name?: string | null
          partner_phone?: string | null
          photos?: Json | null
          price: number
          sort_order?: number | null
          type: Database["public"]["Enums"]["service_type"]
          unavailable_reason?: string | null
          unavailable_until?: string | null
          updated_at?: string | null
          upsell_day?: number | null
          upsell_priority?: number | null
          upsell_triggers?: Json | null
        }
        Update: {
          advance_booking_hours?: number | null
          category?: string | null
          commission_pct?: number | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          description_es?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          is_available_today?: boolean | null
          margin?: number | null
          max_guests?: number | null
          min_guests?: number | null
          name?: string
          name_es?: string
          partner_email?: string | null
          partner_name?: string | null
          partner_phone?: string | null
          photos?: Json | null
          price?: number
          sort_order?: number | null
          type?: Database["public"]["Enums"]["service_type"]
          unavailable_reason?: string | null
          unavailable_until?: string | null
          updated_at?: string | null
          upsell_day?: number | null
          upsell_priority?: number | null
          upsell_triggers?: Json | null
        }
        Relationships: []
      }
      sop_library: {
        Row: {
          allergens: Json | null
          category: string
          content: string
          content_es: string
          created_at: string | null
          created_by: string | null
          department: Database["public"]["Enums"]["sop_department"]
          difficulty: string | null
          equipment: Json | null
          id: string
          is_active: boolean | null
          last_viewed: string | null
          media_urls: Json | null
          related_items: Json | null
          subcategory: string | null
          tags: Json | null
          time_required: string | null
          title: string
          title_es: string
          updated_at: string | null
          updated_by: string | null
          version: number | null
          view_count: number | null
        }
        Insert: {
          allergens?: Json | null
          category: string
          content: string
          content_es: string
          created_at?: string | null
          created_by?: string | null
          department: Database["public"]["Enums"]["sop_department"]
          difficulty?: string | null
          equipment?: Json | null
          id?: string
          is_active?: boolean | null
          last_viewed?: string | null
          media_urls?: Json | null
          related_items?: Json | null
          subcategory?: string | null
          tags?: Json | null
          time_required?: string | null
          title: string
          title_es: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
          view_count?: number | null
        }
        Update: {
          allergens?: Json | null
          category?: string
          content?: string
          content_es?: string
          created_at?: string | null
          created_by?: string | null
          department?: Database["public"]["Enums"]["sop_department"]
          difficulty?: string | null
          equipment?: Json | null
          id?: string
          is_active?: boolean | null
          last_viewed?: string | null
          media_urls?: Json | null
          related_items?: Json | null
          subcategory?: string | null
          tags?: Json | null
          time_required?: string | null
          title?: string
          title_es?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_library_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_library_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_library_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_library_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      special_occasions: {
        Row: {
          bar_notified: boolean | null
          bar_notified_at: string | null
          booking_id: string | null
          created_at: string | null
          details: string | null
          guest_name: string
          id: string
          kitchen_notified: boolean | null
          kitchen_notified_at: string | null
          occasion_date: string | null
          occasion_type: Database["public"]["Enums"]["occasion_type"]
          reservation_id: string | null
          surprise_details: string | null
          surprise_prepared: boolean | null
          task_assigned_to: string | null
          task_completed: boolean | null
          task_created: boolean | null
          task_notes: string | null
          updated_at: string | null
          villa_id: string | null
        }
        Insert: {
          bar_notified?: boolean | null
          bar_notified_at?: string | null
          booking_id?: string | null
          created_at?: string | null
          details?: string | null
          guest_name: string
          id?: string
          kitchen_notified?: boolean | null
          kitchen_notified_at?: string | null
          occasion_date?: string | null
          occasion_type: Database["public"]["Enums"]["occasion_type"]
          reservation_id?: string | null
          surprise_details?: string | null
          surprise_prepared?: boolean | null
          task_assigned_to?: string | null
          task_completed?: boolean | null
          task_created?: boolean | null
          task_notes?: string | null
          updated_at?: string | null
          villa_id?: string | null
        }
        Update: {
          bar_notified?: boolean | null
          bar_notified_at?: string | null
          booking_id?: string | null
          created_at?: string | null
          details?: string | null
          guest_name?: string
          id?: string
          kitchen_notified?: boolean | null
          kitchen_notified_at?: string | null
          occasion_date?: string | null
          occasion_type?: Database["public"]["Enums"]["occasion_type"]
          reservation_id?: string | null
          surprise_details?: string | null
          surprise_prepared?: boolean | null
          task_assigned_to?: string | null
          task_completed?: boolean | null
          task_created?: boolean | null
          task_notes?: string | null
          updated_at?: string | null
          villa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_occasions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "villa_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_occasions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_occasions_task_assigned_to_fkey"
            columns: ["task_assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_occasions_task_assigned_to_fkey"
            columns: ["task_assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_absences: {
        Row: {
          absence_date: string
          created_at: string | null
          id: string
          notified_manager: boolean | null
          reason: string
          reason_details: string | null
          redistributed_to: string[] | null
          reported_at: string | null
          reported_by: string | null
          tasks_redistributed: boolean | null
          user_id: string
        }
        Insert: {
          absence_date: string
          created_at?: string | null
          id?: string
          notified_manager?: boolean | null
          reason: string
          reason_details?: string | null
          redistributed_to?: string[] | null
          reported_at?: string | null
          reported_by?: string | null
          tasks_redistributed?: boolean | null
          user_id: string
        }
        Update: {
          absence_date?: string
          created_at?: string | null
          id?: string
          notified_manager?: boolean | null
          reason?: string
          reason_details?: string | null
          redistributed_to?: string[] | null
          reported_at?: string | null
          reported_by?: string | null
          tasks_redistributed?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_absences_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_absences_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_absences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_absences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_performance: {
        Row: {
          avg_task_time_minutes: number | null
          created_at: string | null
          id: string
          notes: string | null
          period: string
          qc_approved: number | null
          qc_rejected: number | null
          qc_score: number | null
          qc_submissions: number | null
          reward_points: number | null
          tasks_assigned: number | null
          tasks_completed: number | null
          tasks_on_time: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_task_time_minutes?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          period: string
          qc_approved?: number | null
          qc_rejected?: number | null
          qc_score?: number | null
          qc_submissions?: number | null
          reward_points?: number | null
          tasks_assigned?: number | null
          tasks_completed?: number | null
          tasks_on_time?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_task_time_minutes?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          period?: string
          qc_approved?: number | null
          qc_rejected?: number | null
          qc_score?: number | null
          qc_submissions?: number | null
          reward_points?: number | null
          tasks_assigned?: number | null
          tasks_completed?: number | null
          tasks_on_time?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_performance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_performance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_rewards: {
        Row: {
          awarded_at: string | null
          awarded_by: string | null
          category: string | null
          created_at: string | null
          id: string
          notes: string | null
          points: number
          reason: string
          reason_es: string | null
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          awarded_at?: string | null
          awarded_by?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          points: number
          reason: string
          reason_es?: string | null
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          awarded_at?: string | null
          awarded_by?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          points?: number
          reason?: string
          reason_es?: string | null
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_rewards_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_rewards_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedule: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          is_day_off: boolean | null
          notes: string | null
          shift: string | null
          shift_end: string | null
          shift_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          is_day_off?: boolean | null
          notes?: string | null
          shift?: string | null
          shift_end?: string | null
          shift_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          is_day_off?: boolean | null
          notes?: string | null
          shift?: string | null
          shift_end?: string | null
          shift_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedule_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedule_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_training: {
        Row: {
          certified_by: string | null
          completed_at: string | null
          created_at: string | null
          department: string
          expires_at: string | null
          id: string
          notes: string | null
          score: number | null
          status: string
          training_name: string
          training_name_es: string
          training_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certified_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          department: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          score?: number | null
          status?: string
          training_name: string
          training_name_es: string
          training_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certified_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          department?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          score?: number | null
          status?: string
          training_name?: string
          training_name_es?: string
          training_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_training_certified_by_fkey"
            columns: ["certified_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_training_certified_by_fkey"
            columns: ["certified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_training_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_training_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_templates: {
        Row: {
          checklist_type: string
          created_at: string | null
          id: string
          supplies: Json
          updated_at: string | null
        }
        Insert: {
          checklist_type: string
          created_at?: string | null
          id?: string
          supplies?: Json
          updated_at?: string | null
        }
        Update: {
          checklist_type?: string
          created_at?: string | null
          id?: string
          supplies?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      training_requirements: {
        Row: {
          created_at: string | null
          department: string
          description: string | null
          description_es: string | null
          id: string
          is_active: boolean | null
          recertification_days: number | null
          required_before_task: boolean | null
          sort_order: number | null
          training_name: string
          training_name_es: string
          training_type: string
        }
        Insert: {
          created_at?: string | null
          department: string
          description?: string | null
          description_es?: string | null
          id?: string
          is_active?: boolean | null
          recertification_days?: number | null
          required_before_task?: boolean | null
          sort_order?: number | null
          training_name: string
          training_name_es: string
          training_type: string
        }
        Update: {
          created_at?: string | null
          department?: string
          description?: string | null
          description_es?: string | null
          id?: string
          is_active?: boolean | null
          recertification_days?: number | null
          required_before_task?: boolean | null
          sort_order?: number | null
          training_name?: string
          training_name_es?: string
          training_type?: string
        }
        Relationships: []
      }
      transport_trips: {
        Row: {
          boat_fuel: number | null
          created_at: string | null
          date: string
          id: string
          items_transported: string | null
          logged_by: string | null
          notes: string | null
          purchase_order_id: string | null
          purpose: string
          staff_cost: number | null
          staff_time_hours: number | null
          total_cost: number | null
          weight_kg: number | null
        }
        Insert: {
          boat_fuel?: number | null
          created_at?: string | null
          date?: string
          id?: string
          items_transported?: string | null
          logged_by?: string | null
          notes?: string | null
          purchase_order_id?: string | null
          purpose: string
          staff_cost?: number | null
          staff_time_hours?: number | null
          total_cost?: number | null
          weight_kg?: number | null
        }
        Update: {
          boat_fuel?: number | null
          created_at?: string | null
          date?: string
          id?: string
          items_transported?: string | null
          logged_by?: string | null
          notes?: string | null
          purchase_order_id?: string | null
          purpose?: string
          staff_cost?: number | null
          staff_time_hours?: number | null
          total_cost?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_trips_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_trips_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_trips_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          avatar_url: string | null
          created_at: string | null
          department: Database["public"]["Enums"]["department_type"] | null
          email: string
          id: string
          is_active: boolean | null
          last_active: string | null
          name: string
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          department?: Database["public"]["Enums"]["department_type"] | null
          email: string
          id?: string
          is_active?: boolean | null
          last_active?: string | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          department?: Database["public"]["Enums"]["department_type"] | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_active?: string | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      villa_bookings: {
        Row: {
          actual_check_in: string | null
          actual_check_out: string | null
          arrival_time: string | null
          boat_preference: string | null
          booking_source: string | null
          booking_type: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          check_in: string
          check_out: string
          cleaning_deadline: string | null
          created_at: string | null
          deposit_amount: number | null
          deposit_date: string | null
          deposit_paid: boolean | null
          external_booking_id: string | null
          group_booking_id: string | null
          guest_country: string | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          notes: string | null
          num_adults: number | null
          num_children: number | null
          special_requests: string | null
          status: string | null
          updated_at: string | null
          villa_id: string
          vip_level: string | null
        }
        Insert: {
          actual_check_in?: string | null
          actual_check_out?: string | null
          arrival_time?: string | null
          boat_preference?: string | null
          booking_source?: string | null
          booking_type?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in: string
          check_out: string
          cleaning_deadline?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_date?: string | null
          deposit_paid?: boolean | null
          external_booking_id?: string | null
          group_booking_id?: string | null
          guest_country?: string | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          num_adults?: number | null
          num_children?: number | null
          special_requests?: string | null
          status?: string | null
          updated_at?: string | null
          villa_id: string
          vip_level?: string | null
        }
        Update: {
          actual_check_in?: string | null
          actual_check_out?: string | null
          arrival_time?: string | null
          boat_preference?: string | null
          booking_source?: string | null
          booking_type?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in?: string
          check_out?: string
          cleaning_deadline?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_date?: string | null
          deposit_paid?: boolean | null
          external_booking_id?: string | null
          group_booking_id?: string | null
          guest_country?: string | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          num_adults?: number | null
          num_children?: number | null
          special_requests?: string | null
          status?: string | null
          updated_at?: string | null
          villa_id?: string
          vip_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "villa_bookings_group_booking_id_fkey"
            columns: ["group_booking_id"]
            isOneToOne: false
            referencedRelation: "group_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      villa_moves: {
        Row: {
          booking_id: string | null
          created_at: string | null
          from_villa_id: string
          id: string
          move_reason: string
          moved_at: string | null
          moved_by: string | null
          notes: string | null
          to_villa_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          from_villa_id: string
          id?: string
          move_reason: string
          moved_at?: string | null
          moved_by?: string | null
          notes?: string | null
          to_villa_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          from_villa_id?: string
          id?: string
          move_reason?: string
          moved_at?: string | null
          moved_by?: string | null
          notes?: string | null
          to_villa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "villa_moves_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "villa_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      villa_nightly_rates: {
        Row: {
          booking_id: string | null
          booking_source: string | null
          created_at: string | null
          currency: string | null
          date: string
          id: string
          notes: string | null
          rate: number
          updated_at: string | null
          villa_id: string
        }
        Insert: {
          booking_id?: string | null
          booking_source?: string | null
          created_at?: string | null
          currency?: string | null
          date: string
          id?: string
          notes?: string | null
          rate?: number
          updated_at?: string | null
          villa_id: string
        }
        Update: {
          booking_id?: string | null
          booking_source?: string | null
          created_at?: string | null
          currency?: string | null
          date?: string
          id?: string
          notes?: string | null
          rate?: number
          updated_at?: string | null
          villa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "villa_nightly_rates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "villa_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      villa_status: {
        Row: {
          cleaning_status: string | null
          current_booking_id: string | null
          last_cleaned_at: string | null
          last_inspected_at: string | null
          maintenance_status: string | null
          notes: string | null
          status: string | null
          updated_at: string | null
          villa_id: string
        }
        Insert: {
          cleaning_status?: string | null
          current_booking_id?: string | null
          last_cleaned_at?: string | null
          last_inspected_at?: string | null
          maintenance_status?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          villa_id: string
        }
        Update: {
          cleaning_status?: string | null
          current_booking_id?: string | null
          last_cleaned_at?: string | null
          last_inspected_at?: string | null
          maintenance_status?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          villa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "villa_status_current_booking_id_fkey"
            columns: ["current_booking_id"]
            isOneToOne: false
            referencedRelation: "villa_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_logs: {
        Row: {
          cost: number | null
          created_at: string | null
          id: string
          ingredient_id: string
          logged_at: string | null
          logged_by: string
          notes: string | null
          quantity: number
          reason: Database["public"]["Enums"]["waste_reason"]
          unit: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          id?: string
          ingredient_id: string
          logged_at?: string | null
          logged_by: string
          notes?: string | null
          quantity: number
          reason: Database["public"]["Enums"]["waste_reason"]
          unit: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          id?: string
          ingredient_id?: string
          logged_at?: string | null
          logged_by?: string
          notes?: string | null
          quantity?: number
          reason?: Database["public"]["Enums"]["waste_reason"]
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "waste_logs_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_cache: {
        Row: {
          data: Json
          expires_at: string | null
          fetched_at: string | null
          forecast_date: string
          id: string
          location: string
        }
        Insert: {
          data: Json
          expires_at?: string | null
          fetched_at?: string | null
          forecast_date: string
          id?: string
          location?: string
        }
        Update: {
          data?: Json
          expires_at?: string | null
          fetched_at?: string | null
          forecast_date?: string
          id?: string
          location?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          avg_occupancy_pct: number | null
          avg_qc_score: number | null
          checklists_completed: number | null
          created_at: string | null
          fb_margin_pct: number | null
          fb_revenue: number | null
          generated_at: string | null
          id: string
          maintenance_issues_closed: number | null
          maintenance_issues_opened: number | null
          maintenance_pending: number | null
          report_url: string | null
          room_revenue: number | null
          sent_at: string | null
          sent_to: Json | null
          service_revenue: number | null
          staff_leaderboard: Json | null
          top_dishes: Json | null
          total_bookings: number | null
          total_guest_nights: number | null
          total_orders: number | null
          total_revenue: number | null
          vs_last_month: Json | null
          vs_last_week: Json | null
          week_end: string
          week_start: string
          weekly_adr: number | null
          weekly_revpar: number | null
        }
        Insert: {
          avg_occupancy_pct?: number | null
          avg_qc_score?: number | null
          checklists_completed?: number | null
          created_at?: string | null
          fb_margin_pct?: number | null
          fb_revenue?: number | null
          generated_at?: string | null
          id?: string
          maintenance_issues_closed?: number | null
          maintenance_issues_opened?: number | null
          maintenance_pending?: number | null
          report_url?: string | null
          room_revenue?: number | null
          sent_at?: string | null
          sent_to?: Json | null
          service_revenue?: number | null
          staff_leaderboard?: Json | null
          top_dishes?: Json | null
          total_bookings?: number | null
          total_guest_nights?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          vs_last_month?: Json | null
          vs_last_week?: Json | null
          week_end: string
          week_start: string
          weekly_adr?: number | null
          weekly_revpar?: number | null
        }
        Update: {
          avg_occupancy_pct?: number | null
          avg_qc_score?: number | null
          checklists_completed?: number | null
          created_at?: string | null
          fb_margin_pct?: number | null
          fb_revenue?: number | null
          generated_at?: string | null
          id?: string
          maintenance_issues_closed?: number | null
          maintenance_issues_opened?: number | null
          maintenance_pending?: number | null
          report_url?: string | null
          room_revenue?: number | null
          sent_at?: string | null
          sent_to?: Json | null
          service_revenue?: number | null
          staff_leaderboard?: Json | null
          top_dishes?: Json | null
          total_bookings?: number | null
          total_guest_nights?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          vs_last_month?: Json | null
          vs_last_week?: Json | null
          week_end?: string
          week_start?: string
          weekly_adr?: number | null
          weekly_revpar?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      bottle_variance_report: {
        Row: {
          actual_pours_sold: number | null
          bottles_opened: number | null
          category: Database["public"]["Enums"]["menu_category"] | null
          expected_pours: number | null
          ingredient_name: string | null
          menu_item_id: string | null
          name_es: string | null
          pours_per_bottle: number | null
          variance: number | null
        }
        Relationships: []
      }
      breakfast_rate_30d: {
        Row: {
          attendance_rate_pct: number | null
          days_tracked: number | null
          total_attended: number | null
          total_expected: number | null
        }
        Relationships: []
      }
      dish_pl: {
        Row: {
          avg_orders_per_week: number | null
          category: string | null
          ingredient_cost: number | null
          margin: number | null
          margin_pct: number | null
          menu_item_id: string | null
          name: string | null
          name_es: string | null
          orders_this_week: number | null
          price: number | null
          transport_cost: number | null
          weekly_profit: number | null
        }
        Insert: {
          avg_orders_per_week?: never
          category?: never
          ingredient_cost?: never
          margin?: never
          margin_pct?: never
          menu_item_id?: string | null
          name?: string | null
          name_es?: string | null
          orders_this_week?: never
          price?: number | null
          transport_cost?: never
          weekly_profit?: never
        }
        Update: {
          avg_orders_per_week?: never
          category?: never
          ingredient_cost?: never
          margin?: never
          margin_pct?: never
          menu_item_id?: string | null
          name?: string | null
          name_es?: string | null
          orders_this_week?: never
          price?: number | null
          transport_cost?: never
          weekly_profit?: never
        }
        Relationships: []
      }
      guest_spending_summary: {
        Row: {
          comp_total: number | null
          drinks_total: number | null
          first_order_date: string | null
          food_total: number | null
          grand_total: number | null
          guest_name: string | null
          last_order_date: string | null
          reservation_id: string | null
          total_items: number | null
          total_orders: number | null
          villa_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_summary: {
        Row: {
          avg_cleanliness: number | null
          avg_food: number | null
          avg_overall: number | null
          avg_service: number | null
          detractors: number | null
          month: string | null
          nps_score: number | null
          passives: number | null
          promoters: number | null
          responses: number | null
          season: string | null
          villa_id: string | null
        }
        Relationships: []
      }
      overdue_maintenance: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          days_overdue: number | null
          description: string | null
          description_es: string | null
          estimated_minutes: number | null
          frequency: string | null
          frequency_days: number | null
          id: string | null
          is_active: boolean | null
          last_completed_at: string | null
          last_completed_by: string | null
          location: string | null
          next_due_date: string | null
          notes: string | null
          priority: string | null
          requires_approval: boolean | null
          task_name: string | null
          task_name_es: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          days_overdue?: never
          description?: string | null
          description_es?: string | null
          estimated_minutes?: number | null
          frequency?: string | null
          frequency_days?: number | null
          id?: string | null
          is_active?: boolean | null
          last_completed_at?: string | null
          last_completed_by?: string | null
          location?: string | null
          next_due_date?: string | null
          notes?: string | null
          priority?: string | null
          requires_approval?: boolean | null
          task_name?: string | null
          task_name_es?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          days_overdue?: never
          description?: string | null
          description_es?: string | null
          estimated_minutes?: number | null
          frequency?: string | null
          frequency_days?: number | null
          id?: string | null
          is_active?: boolean | null
          last_completed_at?: string | null
          last_completed_by?: string | null
          location?: string | null
          next_due_date?: string | null
          notes?: string | null
          priority?: string | null
          requires_approval?: boolean | null
          task_name?: string | null
          task_name_es?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_maintenance_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_maintenance_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_maintenance_last_completed_by_fkey"
            columns: ["last_completed_by"]
            isOneToOne: false
            referencedRelation: "staff_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_maintenance_last_completed_by_fkey"
            columns: ["last_completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_summary: {
        Row: {
          avg_booking_value: number | null
          category: string | null
          gross_revenue: number | null
          net_revenue: number | null
          service_type: Database["public"]["Enums"]["service_type"] | null
          total_bookings: number | null
          total_commissions: number | null
          total_cost: number | null
        }
        Relationships: []
      }
      staff_leaderboard: {
        Row: {
          avg_qc_score: number | null
          department: Database["public"]["Enums"]["department_type"] | null
          guest_mentions: number | null
          id: string | null
          monthly_points: number | null
          name: string | null
          total_points: number | null
          weekly_points: number | null
        }
        Relationships: []
      }
      staff_meal_costs: {
        Row: {
          staff_meals_count: number | null
          total_staff_meal_cost: number | null
          week_start: string | null
        }
        Relationships: []
      }
      weekly_waste_report: {
        Row: {
          category: Database["public"]["Enums"]["ingredient_category"] | null
          name_es: string | null
          reason: Database["public"]["Enums"]["waste_reason"] | null
          total_cost: number | null
          total_quantity: number | null
          unit: string | null
          week_start: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_restore_86_items: { Args: never; Returns: undefined }
      calculate_daily_metrics: {
        Args: { target_date?: string }
        Returns: string
      }
      check_returning_guest: {
        Args: { p_email: string; p_phone: string }
        Returns: {
          dietary_preferences: Json
          guest_id: string
          is_returning: boolean
          loyalty_discount: number
          notes: string
          preferred_language: string
          room_preferences: Json
          total_stays: number
          vip_status: string
        }[]
      }
      get_active_promotions: {
        Args: never
        Returns: {
          applies_to: string
          banner_text: string | null
          banner_text_es: string | null
          category_filter: string[] | null
          created_at: string | null
          days_of_week: number[] | null
          description: string | null
          description_es: string | null
          discount_type: string
          discount_value: number
          end_time: string
          id: string
          is_active: boolean | null
          item_ids: string[] | null
          min_purchase: number | null
          name: string
          name_es: string
          start_time: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "promotions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      schedule_guest_communications: {
        Args: { p_booking_id: string }
        Returns: number
      }
      search_sop: {
        Args: { lang?: string; query: string }
        Returns: {
          category: string
          content: string
          content_es: string
          department: Database["public"]["Enums"]["sop_department"]
          id: string
          rank: number
          title: string
          title_es: string
        }[]
      }
      update_ingredient_costs_from_receipt: {
        Args: { po_id: string }
        Returns: number
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      checklist_status:
        | "pending"
        | "in_progress"
        | "complete"
        | "approved"
        | "rejected"
      checklist_type:
        | "villa_retouch"
        | "villa_occupied"
        | "villa_empty_arriving"
        | "villa_leaving"
        | "pool_8am"
        | "pool_2pm"
        | "pool_8pm"
        | "maintenance_monday"
        | "maintenance_tuesday"
        | "maintenance_wednesday"
        | "maintenance_thursday"
        | "maintenance_friday"
        | "maintenance_saturday"
        | "maintenance_sunday"
        | "breakfast_setup"
        | "common_area"
        | "kitchen_open"
        | "kitchen_close"
        | "kitchen_lunch_prep"
        | "kitchen_dinner_prep"
      communication_status:
        | "scheduled"
        | "sent"
        | "delivered"
        | "failed"
        | "skipped"
      communication_type:
        | "booking_confirmed"
        | "pre_arrival_7_days"
        | "pre_arrival_1_day"
        | "day_of_arrival"
        | "mid_stay_checkin"
        | "checkout_thank_you"
        | "post_checkout_photos"
        | "post_checkout_rebooking"
        | "post_checkout_referral"
        | "welcome_back"
        | "special_occasion"
      contact_type: "guest" | "staff" | "partner" | "lead"
      conversation_channel: "web" | "whatsapp" | "instagram"
      conversation_status: "active" | "resolved" | "escalated" | "archived"
      department_type:
        | "kitchen"
        | "housekeeping"
        | "maintenance"
        | "pool"
        | "front_desk"
        | "management"
      ingredient_category:
        | "produce"
        | "protein"
        | "dairy"
        | "dry_goods"
        | "beverages"
        | "alcohol"
        | "cleaning"
        | "other"
      menu_category:
        | "breakfast"
        | "lunch"
        | "dinner"
        | "snack"
        | "cocktail"
        | "mocktail"
        | "beer"
        | "wine"
        | "spirit"
        | "soft_drink"
      occasion_type:
        | "birthday"
        | "anniversary"
        | "honeymoon"
        | "proposal"
        | "celebration"
        | "other"
      purchase_order_status: "draft" | "sent" | "received" | "cancelled"
      reservation_status:
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
        | "no_show"
      service_type: "tvc_owned" | "partner" | "opportunity"
      sop_department:
        | "kitchen"
        | "housekeeping"
        | "maintenance"
        | "pool"
        | "front_desk"
        | "emergency"
        | "general"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "completed" | "skipped"
      user_role: "owner" | "manager" | "staff" | "guest"
      waste_reason:
        | "spoiled"
        | "overprepped"
        | "returned"
        | "expired"
        | "dropped"
        | "other"
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
    Enums: {
      booking_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      checklist_status: [
        "pending",
        "in_progress",
        "complete",
        "approved",
        "rejected",
      ],
      checklist_type: [
        "villa_retouch",
        "villa_occupied",
        "villa_empty_arriving",
        "villa_leaving",
        "pool_8am",
        "pool_2pm",
        "pool_8pm",
        "maintenance_monday",
        "maintenance_tuesday",
        "maintenance_wednesday",
        "maintenance_thursday",
        "maintenance_friday",
        "maintenance_saturday",
        "maintenance_sunday",
        "breakfast_setup",
        "common_area",
        "kitchen_open",
        "kitchen_close",
        "kitchen_lunch_prep",
        "kitchen_dinner_prep",
      ],
      communication_status: [
        "scheduled",
        "sent",
        "delivered",
        "failed",
        "skipped",
      ],
      communication_type: [
        "booking_confirmed",
        "pre_arrival_7_days",
        "pre_arrival_1_day",
        "day_of_arrival",
        "mid_stay_checkin",
        "checkout_thank_you",
        "post_checkout_photos",
        "post_checkout_rebooking",
        "post_checkout_referral",
        "welcome_back",
        "special_occasion",
      ],
      contact_type: ["guest", "staff", "partner", "lead"],
      conversation_channel: ["web", "whatsapp", "instagram"],
      conversation_status: ["active", "resolved", "escalated", "archived"],
      department_type: [
        "kitchen",
        "housekeeping",
        "maintenance",
        "pool",
        "front_desk",
        "management",
      ],
      ingredient_category: [
        "produce",
        "protein",
        "dairy",
        "dry_goods",
        "beverages",
        "alcohol",
        "cleaning",
        "other",
      ],
      menu_category: [
        "breakfast",
        "lunch",
        "dinner",
        "snack",
        "cocktail",
        "mocktail",
        "beer",
        "wine",
        "spirit",
        "soft_drink",
      ],
      occasion_type: [
        "birthday",
        "anniversary",
        "honeymoon",
        "proposal",
        "celebration",
        "other",
      ],
      purchase_order_status: ["draft", "sent", "received", "cancelled"],
      reservation_status: [
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
        "no_show",
      ],
      service_type: ["tvc_owned", "partner", "opportunity"],
      sop_department: [
        "kitchen",
        "housekeeping",
        "maintenance",
        "pool",
        "front_desk",
        "emergency",
        "general",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "completed", "skipped"],
      user_role: ["owner", "manager", "staff", "guest"],
      waste_reason: [
        "spoiled",
        "overprepped",
        "returned",
        "expired",
        "dropped",
        "other",
      ],
    },
  },
} as const

