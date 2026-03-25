export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      checklist_templates: {
        Row: {
          created_at: string | null;
          department: Database["public"]["Enums"]["department_type"];
          description: string | null;
          estimated_minutes: number | null;
          id: string;
          is_active: boolean | null;
          items: Json;
          name: string;
          name_es: string;
          type: Database["public"]["Enums"]["checklist_type"];
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          department: Database["public"]["Enums"]["department_type"];
          description?: string | null;
          estimated_minutes?: number | null;
          id?: string;
          is_active?: boolean | null;
          items?: Json;
          name: string;
          name_es: string;
          type: Database["public"]["Enums"]["checklist_type"];
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          department?: Database["public"]["Enums"]["department_type"];
          description?: string | null;
          estimated_minutes?: number | null;
          id?: string;
          is_active?: boolean | null;
          items?: Json;
          name?: string;
          name_es?: string;
          type?: Database["public"]["Enums"]["checklist_type"];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      checklists: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          assigned_to: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string | null;
          date: string;
          duration_minutes: number | null;
          id: string;
          items: Json;
          notes: string | null;
          photos: Json | null;
          qc_notes: string | null;
          quality_score: number | null;
          rejection_reason: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["checklist_status"] | null;
          template_id: string | null;
          type: Database["public"]["Enums"]["checklist_type"];
          updated_at: string | null;
          villa_id: string | null;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          assigned_to?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          date?: string;
          duration_minutes?: number | null;
          id?: string;
          items?: Json;
          notes?: string | null;
          photos?: Json | null;
          qc_notes?: string | null;
          quality_score?: number | null;
          rejection_reason?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["checklist_status"] | null;
          template_id?: string | null;
          type: Database["public"]["Enums"]["checklist_type"];
          updated_at?: string | null;
          villa_id?: string | null;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          assigned_to?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          date?: string;
          duration_minutes?: number | null;
          id?: string;
          items?: Json;
          notes?: string | null;
          photos?: Json | null;
          qc_notes?: string | null;
          quality_score?: number | null;
          rejection_reason?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["checklist_status"] | null;
          template_id?: string | null;
          type?: Database["public"]["Enums"]["checklist_type"];
          updated_at?: string | null;
          villa_id?: string | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          channel: Database["public"]["Enums"]["conversation_channel"];
          contact_email: string | null;
          contact_id: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          contact_type: Database["public"]["Enums"]["contact_type"];
          created_at: string | null;
          escalated_at: string | null;
          escalated_to: string | null;
          escalation_reason: string | null;
          id: string;
          language: string | null;
          last_message_at: string | null;
          reservation_id: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          sentiment: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["conversation_status"] | null;
          summary: string | null;
          topics: Json | null;
          updated_at: string | null;
        };
        Insert: {
          channel: Database["public"]["Enums"]["conversation_channel"];
          contact_email?: string | null;
          contact_id?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_type: Database["public"]["Enums"]["contact_type"];
          created_at?: string | null;
          escalated_at?: string | null;
          escalated_to?: string | null;
          escalation_reason?: string | null;
          id?: string;
          language?: string | null;
          last_message_at?: string | null;
          reservation_id?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          sentiment?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["conversation_status"] | null;
          summary?: string | null;
          topics?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          channel?: Database["public"]["Enums"]["conversation_channel"];
          contact_email?: string | null;
          contact_id?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_type?: Database["public"]["Enums"]["contact_type"];
          created_at?: string | null;
          escalated_at?: string | null;
          escalated_to?: string | null;
          escalation_reason?: string | null;
          id?: string;
          language?: string | null;
          last_message_at?: string | null;
          reservation_id?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          sentiment?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["conversation_status"] | null;
          summary?: string | null;
          topics?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      daily_occupancy: {
        Row: {
          check_ins: number | null;
          check_outs: number | null;
          consumption_events: number | null;
          created_at: string | null;
          created_by: string | null;
          date: string;
          guests_count: number;
          id: string;
          notes: string | null;
          person_nights: number | null;
          updated_at: string | null;
          villas_occupied: Json | null;
        };
        Insert: {
          check_ins?: number | null;
          check_outs?: number | null;
          consumption_events?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          date: string;
          guests_count?: number;
          id?: string;
          notes?: string | null;
          person_nights?: number | null;
          updated_at?: string | null;
          villas_occupied?: Json | null;
        };
        Update: {
          check_ins?: number | null;
          check_outs?: number | null;
          consumption_events?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          date?: string;
          guests_count?: number;
          id?: string;
          notes?: string | null;
          person_nights?: number | null;
          updated_at?: string | null;
          villas_occupied?: Json | null;
        };
        Relationships: [];
      };
      ingredients: {
        Row: {
          category: Database["public"]["Enums"]["ingredient_category"];
          cost_per_unit: number;
          created_at: string | null;
          current_stock: number | null;
          id: string;
          is_active: boolean | null;
          last_updated: string | null;
          min_stock: number | null;
          name: string;
          name_es: string;
          notes: string | null;
          per_guest_night: number | null;
          storage_location: string | null;
          supplier: string | null;
          unit: string;
          updated_by: string | null;
        };
        Insert: {
          category: Database["public"]["Enums"]["ingredient_category"];
          cost_per_unit?: number;
          created_at?: string | null;
          current_stock?: number | null;
          id?: string;
          is_active?: boolean | null;
          last_updated?: string | null;
          min_stock?: number | null;
          name: string;
          name_es: string;
          notes?: string | null;
          per_guest_night?: number | null;
          storage_location?: string | null;
          supplier?: string | null;
          unit: string;
          updated_by?: string | null;
        };
        Update: {
          category?: Database["public"]["Enums"]["ingredient_category"];
          cost_per_unit?: number;
          created_at?: string | null;
          current_stock?: number | null;
          id?: string;
          is_active?: boolean | null;
          last_updated?: string | null;
          min_stock?: number | null;
          name?: string;
          name_es?: string;
          notes?: string | null;
          per_guest_night?: number | null;
          storage_location?: string | null;
          supplier?: string | null;
          unit?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      idempotency_keys: {
        Row: {
          id: string;
          key: string;
          user_id: string;
          endpoint: string;
          response: Json | null;
          created_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          key: string;
          user_id: string;
          endpoint: string;
          response?: Json | null;
          created_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          key?: string;
          user_id?: string;
          endpoint?: string;
          response?: Json | null;
          created_at?: string | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      inventory_logs: {
        Row: {
          counted_at: string | null;
          counted_by: string;
          count_date: string | null;
          created_at: string | null;
          id: string;
          ingredient_id: string;
          notes: string | null;
          previous_quantity: number | null;
          quantity_counted: number;
          variance: number | null;
        };
        Insert: {
          counted_at?: string | null;
          counted_by: string;
          count_date?: string | null;
          created_at?: string | null;
          id?: string;
          ingredient_id: string;
          notes?: string | null;
          previous_quantity?: number | null;
          quantity_counted: number;
          variance?: number | null;
        };
        Update: {
          counted_at?: string | null;
          counted_by?: string;
          count_date?: string | null;
          created_at?: string | null;
          id?: string;
          ingredient_id?: string;
          notes?: string | null;
          previous_quantity?: number | null;
          quantity_counted?: number;
          variance?: number | null;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          allergens: Json | null;
          category: Database["public"]["Enums"]["menu_category"];
          cost: number | null;
          created_at: string | null;
          description: string | null;
          description_es: string | null;
          dietary_tags: Json | null;
          id: string;
          is_active: boolean | null;
          is_available: boolean | null;
          margin: number | null;
          margin_pct: number | null;
          name: string;
          name_es: string;
          photo_url: string | null;
          prep_time_minutes: number | null;
          price: number;
          sort_order: number | null;
          subcategory: string | null;
          updated_at: string | null;
          pours_per_bottle: number | null;
          linked_ingredient_id: string | null;
        };
        Insert: {
          allergens?: Json | null;
          category: Database["public"]["Enums"]["menu_category"];
          cost?: number | null;
          created_at?: string | null;
          description?: string | null;
          description_es?: string | null;
          dietary_tags?: Json | null;
          id?: string;
          is_active?: boolean | null;
          is_available?: boolean | null;
          margin?: number | null;
          margin_pct?: number | null;
          name: string;
          name_es: string;
          photo_url?: string | null;
          prep_time_minutes?: number | null;
          price?: number;
          sort_order?: number | null;
          subcategory?: string | null;
          updated_at?: string | null;
          pours_per_bottle?: number | null;
          linked_ingredient_id?: string | null;
        };
        Update: {
          allergens?: Json | null;
          category?: Database["public"]["Enums"]["menu_category"];
          cost?: number | null;
          created_at?: string | null;
          description?: string | null;
          description_es?: string | null;
          dietary_tags?: Json | null;
          id?: string;
          is_active?: boolean | null;
          is_available?: boolean | null;
          margin?: number | null;
          margin_pct?: number | null;
          name?: string;
          name_es?: string;
          photo_url?: string | null;
          prep_time_minutes?: number | null;
          price?: number;
          sort_order?: number | null;
          subcategory?: string | null;
          updated_at?: string | null;
          pours_per_bottle?: number | null;
          linked_ingredient_id?: string | null;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          check_in: string;
          check_out: string;
          cloudbeds_id: string | null;
          created_at: string | null;
          dietary_needs: Json | null;
          guest_email: string | null;
          guest_name: string;
          guest_phone: string | null;
          guests_count: number;
          id: string;
          interests: Json | null;
          language: string | null;
          notes: string | null;
          status: Database["public"]["Enums"]["reservation_status"] | null;
          synced_at: string | null;
          total_amount: number | null;
          updated_at: string | null;
          villas: Json | null;
        };
        Insert: {
          check_in: string;
          check_out: string;
          cloudbeds_id?: string | null;
          created_at?: string | null;
          dietary_needs?: Json | null;
          guest_email?: string | null;
          guest_name: string;
          guest_phone?: string | null;
          guests_count?: number;
          id?: string;
          interests?: Json | null;
          language?: string | null;
          notes?: string | null;
          status?: Database["public"]["Enums"]["reservation_status"] | null;
          synced_at?: string | null;
          total_amount?: number | null;
          updated_at?: string | null;
          villas?: Json | null;
        };
        Update: {
          check_in?: string;
          check_out?: string;
          cloudbeds_id?: string | null;
          created_at?: string | null;
          dietary_needs?: Json | null;
          guest_email?: string | null;
          guest_name?: string;
          guest_phone?: string | null;
          guests_count?: number;
          id?: string;
          interests?: Json | null;
          language?: string | null;
          notes?: string | null;
          status?: Database["public"]["Enums"]["reservation_status"] | null;
          synced_at?: string | null;
          total_amount?: number | null;
          updated_at?: string | null;
          villas?: Json | null;
        };
        Relationships: [];
      };
      services: {
        Row: {
          advance_booking_hours: number | null;
          category: string | null;
          commission_pct: number | null;
          cost: number | null;
          created_at: string | null;
          description: string | null;
          description_es: string | null;
          duration_hours: number | null;
          id: string;
          is_active: boolean | null;
          is_available: boolean | null;
          is_available_today: boolean | null;
          unavailable_reason: string | null;
          unavailable_until: string | null;
          margin: number | null;
          max_guests: number | null;
          min_guests: number | null;
          name: string;
          name_es: string;
          partner_email: string | null;
          partner_name: string | null;
          partner_phone: string | null;
          photos: Json | null;
          price: number;
          sort_order: number | null;
          type: Database["public"]["Enums"]["service_type"];
          updated_at: string | null;
          upsell_triggers: Json | null;
        };
        Insert: {
          advance_booking_hours?: number | null;
          category?: string | null;
          commission_pct?: number | null;
          cost?: number | null;
          created_at?: string | null;
          description?: string | null;
          description_es?: string | null;
          duration_hours?: number | null;
          id?: string;
          is_active?: boolean | null;
          is_available?: boolean | null;
          is_available_today?: boolean | null;
          unavailable_reason?: string | null;
          unavailable_until?: string | null;
          margin?: number | null;
          max_guests?: number | null;
          min_guests?: number | null;
          name: string;
          name_es: string;
          partner_email?: string | null;
          partner_name?: string | null;
          partner_phone?: string | null;
          photos?: Json | null;
          price: number;
          sort_order?: number | null;
          type: Database["public"]["Enums"]["service_type"];
          updated_at?: string | null;
          upsell_triggers?: Json | null;
        };
        Update: {
          advance_booking_hours?: number | null;
          category?: string | null;
          commission_pct?: number | null;
          cost?: number | null;
          created_at?: string | null;
          description?: string | null;
          description_es?: string | null;
          duration_hours?: number | null;
          id?: string;
          is_active?: boolean | null;
          is_available?: boolean | null;
          is_available_today?: boolean | null;
          unavailable_reason?: string | null;
          unavailable_until?: string | null;
          margin?: number | null;
          max_guests?: number | null;
          min_guests?: number | null;
          name?: string;
          name_es?: string;
          partner_email?: string | null;
          partner_name?: string | null;
          partner_phone?: string | null;
          photos?: Json | null;
          price?: number;
          sort_order?: number | null;
          type?: Database["public"]["Enums"]["service_type"];
          updated_at?: string | null;
          upsell_triggers?: Json | null;
        };
        Relationships: [];
      };
      sop_library: {
        Row: {
          allergens: Json | null;
          category: string;
          content: string;
          content_es: string;
          created_at: string | null;
          created_by: string | null;
          department: Database["public"]["Enums"]["sop_department"];
          difficulty: string | null;
          equipment: Json | null;
          id: string;
          is_active: boolean | null;
          last_viewed: string | null;
          media_urls: Json | null;
          related_items: Json | null;
          subcategory: string | null;
          tags: Json | null;
          time_required: string | null;
          title: string;
          title_es: string;
          updated_at: string | null;
          updated_by: string | null;
          version: number | null;
          view_count: number | null;
        };
        Insert: {
          allergens?: Json | null;
          category: string;
          content: string;
          content_es: string;
          created_at?: string | null;
          created_by?: string | null;
          department: Database["public"]["Enums"]["sop_department"];
          difficulty?: string | null;
          equipment?: Json | null;
          id?: string;
          is_active?: boolean | null;
          last_viewed?: string | null;
          media_urls?: Json | null;
          related_items?: Json | null;
          subcategory?: string | null;
          tags?: Json | null;
          time_required?: string | null;
          title: string;
          title_es: string;
          updated_at?: string | null;
          updated_by?: string | null;
          version?: number | null;
          view_count?: number | null;
        };
        Update: {
          allergens?: Json | null;
          category?: string;
          content?: string;
          content_es?: string;
          created_at?: string | null;
          created_by?: string | null;
          department?: Database["public"]["Enums"]["sop_department"];
          difficulty?: string | null;
          equipment?: Json | null;
          id?: string;
          is_active?: boolean | null;
          last_viewed?: string | null;
          media_urls?: Json | null;
          related_items?: Json | null;
          subcategory?: string | null;
          tags?: Json | null;
          time_required?: string | null;
          title?: string;
          title_es?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          version?: number | null;
          view_count?: number | null;
        };
        Relationships: [];
      };
      daily_tasks: {
        Row: {
          id: string;
          date: string;
          user_id: string;
          department: Database["public"]["Enums"]["department_type"] | null;
          tasks: Json;
          occupancy_level: string | null;
          total_count: number;
          completed_count: number;
          status: string | null;
          completed_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          date: string;
          user_id: string;
          department?: Database["public"]["Enums"]["department_type"] | null;
          tasks?: Json;
          occupancy_level?: string | null;
          total_count?: number;
          completed_count?: number;
          status?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          date?: string;
          user_id?: string;
          department?: Database["public"]["Enums"]["department_type"] | null;
          tasks?: Json;
          occupancy_level?: string | null;
          total_count?: number;
          completed_count?: number;
          status?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          created_at: string | null;
          created_by: string | null;
          approved_at: string | null;
          approved_by: string | null;
          status: string | null;
          total_cost: number | null;
          transport_cost: number | null;
          forecast_person_nights: number | null;
          items: Json | null;
          notes: string | null;
          delivery_date: string | null;
          updated_at: string | null;
          received_at: string | null;
          received_by: string | null;
          received_items: Json | null;
          has_discrepancies: boolean | null;
          discrepancy_notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string | null;
          created_by?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          status?: string | null;
          total_cost?: number | null;
          transport_cost?: number | null;
          forecast_person_nights?: number | null;
          items?: Json | null;
          notes?: string | null;
          delivery_date?: string | null;
          updated_at?: string | null;
          received_at?: string | null;
          received_by?: string | null;
          received_items?: Json | null;
          has_discrepancies?: boolean | null;
          discrepancy_notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string | null;
          created_by?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          status?: string | null;
          total_cost?: number | null;
          transport_cost?: number | null;
          forecast_person_nights?: number | null;
          items?: Json | null;
          notes?: string | null;
          delivery_date?: string | null;
          updated_at?: string | null;
          received_at?: string | null;
          received_by?: string | null;
          received_items?: Json | null;
          has_discrepancies?: boolean | null;
          discrepancy_notes?: string | null;
        };
        Relationships: [];
      };
      order_logs: {
        Row: {
          id: string;
          menu_item_id: string;
          quantity: number;
          order_date: string | null;
          served_by: string | null;
          created_at: string | null;
          is_staff_meal: boolean | null;
          is_comp: boolean | null;
          unit_price: number | null;
          total_price: number | null;
          order_time: string | null;
          meal_period: string | null;
          villa_id: string | null;
          reservation_id: string | null;
          guest_name: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          menu_item_id: string;
          quantity?: number;
          order_date?: string | null;
          served_by?: string | null;
          created_at?: string | null;
          is_staff_meal?: boolean | null;
          is_comp?: boolean | null;
          unit_price?: number | null;
          total_price?: number | null;
          order_time?: string | null;
          meal_period?: string | null;
          villa_id?: string | null;
          reservation_id?: string | null;
          guest_name?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          menu_item_id?: string;
          quantity?: number;
          order_date?: string | null;
          served_by?: string | null;
          created_at?: string | null;
          is_staff_meal?: boolean | null;
          is_comp?: boolean | null;
          unit_price?: number | null;
          total_price?: number | null;
          order_time?: string | null;
          meal_period?: string | null;
          villa_id?: string | null;
          reservation_id?: string | null;
          guest_name?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      waste_logs: {
        Row: {
          id: string;
          ingredient_id: string;
          quantity: number;
          unit: string;
          reason: string;
          cost: number | null;
          logged_by: string;
          notes: string | null;
          logged_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          ingredient_id: string;
          quantity: number;
          unit: string;
          reason: string;
          logged_by: string;
          notes?: string | null;
          logged_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          ingredient_id?: string;
          quantity?: number;
          unit?: string;
          reason?: string;
          logged_by?: string;
          notes?: string | null;
          logged_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      bottle_events: {
        Row: {
          id: string;
          ingredient_id: string;
          event_type: string;
          quantity: number | null;
          opened_by: string | null;
          notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          ingredient_id: string;
          event_type: string;
          quantity?: number | null;
          opened_by?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          ingredient_id?: string;
          event_type?: string;
          quantity?: number | null;
          opened_by?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      breakfast_attendance: {
        Row: {
          id: string;
          date: string;
          guests_expected: number | null;
          guests_attended: number | null;
          villa_breakdown: Json | null;
          logged_by: string | null;
          logged_at: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          date: string;
          guests_expected?: number | null;
          guests_attended?: number | null;
          villa_breakdown?: Json | null;
          logged_by?: string | null;
          logged_at?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          date?: string;
          guests_expected?: number | null;
          guests_attended?: number | null;
          villa_breakdown?: Json | null;
          logged_by?: string | null;
          logged_at?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      eod_reconciliations: {
        Row: {
          id: string;
          date: string;
          closed_by: string;
          closed_at: string | null;
          items: Json;
          total_items_checked: number | null;
          items_with_discrepancy: number | null;
          total_variance_cost: number | null;
          status: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          date: string;
          closed_by: string;
          closed_at?: string | null;
          items?: Json;
          total_items_checked?: number | null;
          items_with_discrepancy?: number | null;
          total_variance_cost?: number | null;
          status?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          date?: string;
          closed_by?: string;
          closed_at?: string | null;
          items?: Json;
          total_items_checked?: number | null;
          items_with_discrepancy?: number | null;
          total_variance_cost?: number | null;
          status?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      service_availability_logs: {
        Row: {
          id: string;
          service_id: string;
          is_available: boolean;
          reason: string | null;
          weather_note: string | null;
          capacity_note: string | null;
          changed_by: string | null;
          changed_at: string | null;
          available_from: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          service_id: string;
          is_available: boolean;
          reason?: string | null;
          weather_note?: string | null;
          capacity_note?: string | null;
          changed_by?: string | null;
          changed_at?: string | null;
          available_from?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          service_id?: string;
          is_available?: boolean;
          reason?: string | null;
          weather_note?: string | null;
          capacity_note?: string | null;
          changed_by?: string | null;
          changed_at?: string | null;
          available_from?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      staff_rewards: {
        Row: {
          id: string;
          user_id: string;
          points: number;
          reason: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          points?: number;
          reason?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          points?: number;
          reason?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      staff_schedule: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          shift: string | null;
          shift_start: string | null;
          shift_end: string | null;
          is_day_off: boolean | null;
          notes: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          shift?: string | null;
          shift_start?: string | null;
          shift_end?: string | null;
          is_day_off?: boolean | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          shift?: string | null;
          shift_start?: string | null;
          shift_end?: string | null;
          is_day_off?: boolean | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          auth_id: string | null;
          avatar_url: string | null;
          created_at: string | null;
          department: Database["public"]["Enums"]["department_type"] | null;
          email: string;
          id: string;
          is_active: boolean | null;
          last_active: string | null;
          name: string;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string | null;
          onboarding_completed: boolean | null;
          onboarding_completed_at: string | null;
        };
        Insert: {
          auth_id?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          department?: Database["public"]["Enums"]["department_type"] | null;
          email: string;
          id?: string;
          is_active?: boolean | null;
          last_active?: string | null;
          name: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string | null;
          onboarding_completed?: boolean | null;
          onboarding_completed_at?: string | null;
        };
        Update: {
          auth_id?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          department?: Database["public"]["Enums"]["department_type"] | null;
          email?: string;
          id?: string;
          is_active?: boolean | null;
          last_active?: string | null;
          name?: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string | null;
          onboarding_completed?: boolean | null;
          onboarding_completed_at?: string | null;
        };
        Relationships: [];
      };
      supply_templates: {
        Row: {
          id: string;
          checklist_type: string;
          supplies: Json;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          checklist_type: string;
          supplies?: Json;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          checklist_type?: string;
          supplies?: Json;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      linen_inventory: {
        Row: {
          id: string;
          item_type: string;
          item_name: string;
          item_name_es: string;
          total_stock: number;
          in_use: number;
          in_laundry: number;
          available: number;
          min_available: number;
          per_villa: number;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          item_type: string;
          item_name: string;
          item_name_es: string;
          total_stock?: number;
          in_use?: number;
          in_laundry?: number;
          min_available?: number;
          per_villa?: number;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          item_type?: string;
          item_name?: string;
          item_name_es?: string;
          total_stock?: number;
          in_use?: number;
          in_laundry?: number;
          min_available?: number;
          per_villa?: number;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      linen_logs: {
        Row: {
          id: string;
          linen_id: string;
          action: string;
          quantity: number;
          villa_id: string | null;
          notes: string | null;
          logged_by: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          linen_id: string;
          action: string;
          quantity: number;
          villa_id?: string | null;
          notes?: string | null;
          logged_by?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          linen_id?: string;
          action?: string;
          quantity?: number;
          villa_id?: string | null;
          notes?: string | null;
          logged_by?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      staff_training: {
        Row: {
          id: string;
          user_id: string;
          department: string;
          training_type: string;
          training_name: string;
          training_name_es: string;
          status: string;
          score: number | null;
          completed_at: string | null;
          expires_at: string | null;
          certified_by: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          department: string;
          training_type: string;
          training_name: string;
          training_name_es: string;
          status?: string;
          score?: number | null;
          completed_at?: string | null;
          expires_at?: string | null;
          certified_by?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          department?: string;
          training_type?: string;
          training_name?: string;
          training_name_es?: string;
          status?: string;
          score?: number | null;
          completed_at?: string | null;
          expires_at?: string | null;
          certified_by?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      training_requirements: {
        Row: {
          id: string;
          department: string;
          training_type: string;
          training_name: string;
          training_name_es: string;
          description: string | null;
          description_es: string | null;
          required_before_task: boolean | null;
          recertification_days: number | null;
          sort_order: number | null;
          is_active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          department: string;
          training_type: string;
          training_name: string;
          training_name_es: string;
          description?: string | null;
          description_es?: string | null;
          required_before_task?: boolean | null;
          recertification_days?: number | null;
          sort_order?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          department?: string;
          training_type?: string;
          training_name?: string;
          training_name_es?: string;
          description?: string | null;
          description_es?: string | null;
          required_before_task?: boolean | null;
          recertification_days?: number | null;
          sort_order?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      guest_upsell_tracking: {
        Row: {
          id: string;
          reservation_id: string | null;
          guest_phone: string | null;
          service_id: string | null;
          suggested_at: string | null;
          suggestion_day: number | null;
          response: string | null;
          booking_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          reservation_id?: string | null;
          guest_phone?: string | null;
          service_id?: string | null;
          suggested_at?: string | null;
          suggestion_day?: number | null;
          response?: string | null;
          booking_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          reservation_id?: string | null;
          guest_phone?: string | null;
          service_id?: string | null;
          suggested_at?: string | null;
          suggestion_day?: number | null;
          response?: string | null;
          booking_id?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      guest_communications: {
        Row: {
          id: string;
          reservation_id: string | null;
          booking_id: string | null;
          communication_type: Database["public"]["Enums"]["communication_type"];
          status: Database["public"]["Enums"]["communication_status"];
          scheduled_for: string;
          sent_at: string | null;
          message_template: string;
          message_sent: string | null;
          guest_phone: string;
          guest_name: string | null;
          guest_language: string;
          twilio_sid: string | null;
          error_message: string | null;
          response_received: string | null;
          response_at: string | null;
          requires_followup: boolean;
          followup_handled: boolean;
          handled_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          reservation_id?: string | null;
          booking_id?: string | null;
          communication_type: Database["public"]["Enums"]["communication_type"];
          status?: Database["public"]["Enums"]["communication_status"];
          scheduled_for: string;
          sent_at?: string | null;
          message_template: string;
          message_sent?: string | null;
          guest_phone: string;
          guest_name?: string | null;
          guest_language?: string;
          twilio_sid?: string | null;
          error_message?: string | null;
          response_received?: string | null;
          response_at?: string | null;
          requires_followup?: boolean;
          followup_handled?: boolean;
          handled_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          reservation_id?: string | null;
          booking_id?: string | null;
          communication_type?: Database["public"]["Enums"]["communication_type"];
          status?: Database["public"]["Enums"]["communication_status"];
          scheduled_for?: string;
          sent_at?: string | null;
          message_template?: string;
          message_sent?: string | null;
          guest_phone?: string;
          guest_name?: string | null;
          guest_language?: string;
          twilio_sid?: string | null;
          error_message?: string | null;
          response_received?: string | null;
          response_at?: string | null;
          requires_followup?: boolean;
          followup_handled?: boolean;
          handled_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      guest_history: {
        Row: {
          id: string;
          email: string | null;
          phone: string | null;
          normalized_phone: string | null;
          full_name: string | null;
          preferred_language: string;
          country: string | null;
          dietary_preferences: Json;
          room_preferences: Json;
          interests: Json;
          notes: string | null;
          total_stays: number;
          total_nights: number;
          total_spent: number;
          first_stay_date: string | null;
          last_stay_date: string | null;
          favorite_villa: string | null;
          vip_status: string;
          is_returning: boolean;
          loyalty_discount_pct: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          full_name?: string | null;
          preferred_language?: string;
          country?: string | null;
          dietary_preferences?: Json;
          room_preferences?: Json;
          interests?: Json;
          notes?: string | null;
          total_stays?: number;
          total_nights?: number;
          total_spent?: number;
          first_stay_date?: string | null;
          last_stay_date?: string | null;
          favorite_villa?: string | null;
          vip_status?: string;
          is_returning?: boolean;
          loyalty_discount_pct?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          full_name?: string | null;
          preferred_language?: string;
          country?: string | null;
          dietary_preferences?: Json;
          room_preferences?: Json;
          interests?: Json;
          notes?: string | null;
          total_stays?: number;
          total_nights?: number;
          total_spent?: number;
          first_stay_date?: string | null;
          last_stay_date?: string | null;
          favorite_villa?: string | null;
          vip_status?: string;
          is_returning?: boolean;
          loyalty_discount_pct?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      special_occasions: {
        Row: {
          id: string;
          reservation_id: string | null;
          booking_id: string | null;
          villa_id: string | null;
          guest_name: string;
          occasion_type: Database["public"]["Enums"]["occasion_type"];
          occasion_date: string | null;
          details: string | null;
          task_created: boolean;
          task_assigned_to: string | null;
          task_completed: boolean;
          task_notes: string | null;
          kitchen_notified: boolean;
          kitchen_notified_at: string | null;
          bar_notified: boolean;
          bar_notified_at: string | null;
          surprise_prepared: boolean;
          surprise_details: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          reservation_id?: string | null;
          booking_id?: string | null;
          villa_id?: string | null;
          guest_name: string;
          occasion_type: Database["public"]["Enums"]["occasion_type"];
          occasion_date?: string | null;
          details?: string | null;
          task_created?: boolean;
          task_assigned_to?: string | null;
          task_completed?: boolean;
          task_notes?: string | null;
          kitchen_notified?: boolean;
          kitchen_notified_at?: string | null;
          bar_notified?: boolean;
          bar_notified_at?: string | null;
          surprise_prepared?: boolean;
          surprise_details?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          reservation_id?: string | null;
          booking_id?: string | null;
          villa_id?: string | null;
          guest_name?: string;
          occasion_type?: Database["public"]["Enums"]["occasion_type"];
          occasion_date?: string | null;
          details?: string | null;
          task_created?: boolean;
          task_assigned_to?: string | null;
          task_completed?: boolean;
          task_notes?: string | null;
          kitchen_notified?: boolean;
          kitchen_notified_at?: string | null;
          bar_notified?: boolean;
          bar_notified_at?: string | null;
          surprise_prepared?: boolean;
          surprise_details?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      communication_templates: {
        Row: {
          id: string;
          communication_type: Database["public"]["Enums"]["communication_type"];
          name: string;
          name_es: string;
          template_en: string;
          template_es: string;
          template_fr: string | null;
          variables: Json;
          send_time_offset_hours: number;
          send_time_of_day: number | null;
          is_active: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          communication_type: Database["public"]["Enums"]["communication_type"];
          name: string;
          name_es: string;
          template_en: string;
          template_es: string;
          template_fr?: string | null;
          variables?: Json;
          send_time_offset_hours?: number;
          send_time_of_day?: number | null;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          communication_type?: Database["public"]["Enums"]["communication_type"];
          name?: string;
          name_es?: string;
          template_en?: string;
          template_es?: string;
          template_fr?: string | null;
          variables?: Json;
          send_time_offset_hours?: number;
          send_time_of_day?: number | null;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      villa_bookings: {
        Row: {
          id: string;
          villa_id: string;
          reservation_id: string | null;
          cloudbeds_reservation_id: string | null;
          guest_name: string;
          guest_email: string | null;
          guest_phone: string | null;
          guest_country: string | null;
          num_adults: number;
          num_children: number;
          check_in: string;
          check_out: string;
          status: string;
          nightly_rate: number | null;
          total_amount: number | null;
          deposit_amount: number | null;
          deposit_paid: boolean;
          notes: string | null;
          source: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancellation_reason: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          villa_id: string;
          reservation_id?: string | null;
          cloudbeds_reservation_id?: string | null;
          guest_name: string;
          guest_email?: string | null;
          guest_phone?: string | null;
          guest_country?: string | null;
          num_adults?: number;
          num_children?: number;
          check_in: string;
          check_out: string;
          status?: string;
          nightly_rate?: number | null;
          total_amount?: number | null;
          deposit_amount?: number | null;
          deposit_paid?: boolean;
          notes?: string | null;
          source?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          villa_id?: string;
          reservation_id?: string | null;
          cloudbeds_reservation_id?: string | null;
          guest_name?: string;
          guest_email?: string | null;
          guest_phone?: string | null;
          guest_country?: string | null;
          num_adults?: number;
          num_children?: number;
          check_in?: string;
          check_out?: string;
          status?: string;
          nightly_rate?: number | null;
          total_amount?: number | null;
          deposit_amount?: number | null;
          deposit_paid?: boolean;
          notes?: string | null;
          source?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      villa_status: {
        Row: {
          id: string;
          villa_id: string;
          status: string;
          current_booking_id: string | null;
          current_guest_name: string | null;
          check_in: string | null;
          check_out: string | null;
          next_booking_id: string | null;
          next_check_in: string | null;
          last_cleaned_at: string | null;
          last_cleaned_by: string | null;
          maintenance_notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          villa_id: string;
          status?: string;
          current_booking_id?: string | null;
          current_guest_name?: string | null;
          check_in?: string | null;
          check_out?: string | null;
          next_booking_id?: string | null;
          next_check_in?: string | null;
          last_cleaned_at?: string | null;
          last_cleaned_by?: string | null;
          maintenance_notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          villa_id?: string;
          status?: string;
          current_booking_id?: string | null;
          current_guest_name?: string | null;
          check_in?: string | null;
          check_out?: string | null;
          next_booking_id?: string | null;
          next_check_in?: string | null;
          last_cleaned_at?: string | null;
          last_cleaned_by?: string | null;
          maintenance_notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: string;
          old_data: Json | null;
          new_data: Json | null;
          user_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          action: string;
          old_data?: Json | null;
          new_data?: Json | null;
          user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          table_name?: string;
          record_id?: string;
          action?: string;
          old_data?: Json | null;
          new_data?: Json | null;
          user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      booking_cancellations: {
        Row: {
          id: string;
          booking_id: string;
          villa_id: string;
          guest_name: string;
          check_in: string;
          check_out: string;
          cancelled_by: string;
          cancellation_reason: string;
          num_nights: number;
          refund_amount: number | null;
          refund_status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          villa_id: string;
          guest_name: string;
          check_in: string;
          check_out: string;
          cancelled_by: string;
          cancellation_reason: string;
          num_nights: number;
          refund_amount?: number | null;
          refund_status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          villa_id?: string;
          guest_name?: string;
          check_in?: string;
          check_out?: string;
          cancelled_by?: string;
          cancellation_reason?: string;
          num_nights?: number;
          refund_amount?: number | null;
          refund_status?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      consumption_analytics: {
        Row: {
          id: string;
          analysis_date: string;
          period_type: string;
          period_start: string;
          period_end: string;
          total_orders: number;
          total_revenue: number;
          unique_guests: number;
          by_nationality: Json | null;
          by_day_of_week: Json | null;
          by_hour: Json | null;
          by_group_size: Json | null;
          by_category: Json | null;
          top_items: Json | null;
          trending_items: Json | null;
          declining_items: Json | null;
          insights: Json | null;
          recommendations: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          analysis_date: string;
          period_type: string;
          period_start: string;
          period_end: string;
          total_orders?: number;
          total_revenue?: number;
          unique_guests?: number;
          by_nationality?: Json | null;
          by_day_of_week?: Json | null;
          by_hour?: Json | null;
          by_group_size?: Json | null;
          by_category?: Json | null;
          top_items?: Json | null;
          trending_items?: Json | null;
          declining_items?: Json | null;
          insights?: Json | null;
          recommendations?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          analysis_date?: string;
          period_type?: string;
          period_start?: string;
          period_end?: string;
          total_orders?: number;
          total_revenue?: number;
          unique_guests?: number;
          by_nationality?: Json | null;
          by_day_of_week?: Json | null;
          by_hour?: Json | null;
          by_group_size?: Json | null;
          by_category?: Json | null;
          top_items?: Json | null;
          trending_items?: Json | null;
          declining_items?: Json | null;
          insights?: Json | null;
          recommendations?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      maintenance_issues: {
        Row: {
          id: string;
          villa_id: string | null;
          location: string;
          title: string;
          title_es: string | null;
          description: string | null;
          description_es: string | null;
          priority: string;
          status: string;
          category: string | null;
          reported_by: string | null;
          assigned_to: string | null;
          photos: Json | null;
          estimated_cost: number | null;
          actual_cost: number | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          due_date: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          villa_id?: string | null;
          location: string;
          title: string;
          title_es?: string | null;
          description?: string | null;
          description_es?: string | null;
          priority?: string;
          status?: string;
          category?: string | null;
          reported_by?: string | null;
          assigned_to?: string | null;
          photos?: Json | null;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          due_date?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          villa_id?: string | null;
          location?: string;
          title?: string;
          title_es?: string | null;
          description?: string | null;
          description_es?: string | null;
          priority?: string;
          status?: string;
          category?: string | null;
          reported_by?: string | null;
          assigned_to?: string | null;
          photos?: Json | null;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          due_date?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      weekly_reports: {
        Row: {
          id: string;
          week_start: string;
          week_end: string;
          total_revenue: number | null;
          total_orders: number | null;
          occupancy_rate: number | null;
          avg_daily_revenue: number | null;
          top_items: Json | null;
          staff_performance: Json | null;
          maintenance_summary: Json | null;
          guest_satisfaction: number | null;
          insights: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          week_start: string;
          week_end: string;
          total_revenue?: number | null;
          total_orders?: number | null;
          occupancy_rate?: number | null;
          avg_daily_revenue?: number | null;
          top_items?: Json | null;
          staff_performance?: Json | null;
          maintenance_summary?: Json | null;
          guest_satisfaction?: number | null;
          insights?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          week_start?: string;
          week_end?: string;
          total_revenue?: number | null;
          total_orders?: number | null;
          occupancy_rate?: number | null;
          avg_daily_revenue?: number | null;
          top_items?: Json | null;
          staff_performance?: Json | null;
          maintenance_summary?: Json | null;
          guest_satisfaction?: number | null;
          insights?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      daily_metrics: {
        Row: {
          id: string;
          date: string;
          revenue: number | null;
          orders_count: number | null;
          guests_count: number | null;
          occupancy_pct: number | null;
          avg_order_value: number | null;
          food_revenue: number | null;
          beverage_revenue: number | null;
          service_revenue: number | null;
          labor_cost: number | null;
          food_cost: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          date: string;
          revenue?: number | null;
          orders_count?: number | null;
          guests_count?: number | null;
          occupancy_pct?: number | null;
          avg_order_value?: number | null;
          food_revenue?: number | null;
          beverage_revenue?: number | null;
          service_revenue?: number | null;
          labor_cost?: number | null;
          food_cost?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          date?: string;
          revenue?: number | null;
          orders_count?: number | null;
          guests_count?: number | null;
          occupancy_pct?: number | null;
          avg_order_value?: number | null;
          food_revenue?: number | null;
          beverage_revenue?: number | null;
          service_revenue?: number | null;
          labor_cost?: number | null;
          food_cost?: number | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      review_requests: {
        Row: {
          id: string;
          booking_id: string | null;
          reservation_id: string | null;
          guest_name: string;
          guest_email: string | null;
          guest_phone: string | null;
          check_out: string;
          status: string;
          sent_at: string | null;
          clicked_at: string | null;
          reviewed_at: string | null;
          review_platform: string | null;
          review_rating: number | null;
          twilio_sid: string | null;
          error_message: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          booking_id?: string | null;
          reservation_id?: string | null;
          guest_name: string;
          guest_email?: string | null;
          guest_phone?: string | null;
          check_out: string;
          status?: string;
          sent_at?: string | null;
          clicked_at?: string | null;
          reviewed_at?: string | null;
          review_platform?: string | null;
          review_rating?: number | null;
          twilio_sid?: string | null;
          error_message?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string | null;
          reservation_id?: string | null;
          guest_name?: string;
          guest_email?: string | null;
          guest_phone?: string | null;
          check_out?: string;
          status?: string;
          sent_at?: string | null;
          clicked_at?: string | null;
          reviewed_at?: string | null;
          review_platform?: string | null;
          review_rating?: number | null;
          twilio_sid?: string | null;
          error_message?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      recurring_maintenance: {
        Row: {
          id: string;
          title: string;
          title_es: string | null;
          description: string | null;
          description_es: string | null;
          location: string;
          villa_id: string | null;
          frequency: string;
          day_of_week: number | null;
          day_of_month: number | null;
          time_of_day: string | null;
          estimated_duration_minutes: number | null;
          assigned_to: string | null;
          priority: string;
          category: string | null;
          is_active: boolean;
          last_completed_at: string | null;
          next_due_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          title_es?: string | null;
          description?: string | null;
          description_es?: string | null;
          location: string;
          villa_id?: string | null;
          frequency: string;
          day_of_week?: number | null;
          day_of_month?: number | null;
          time_of_day?: string | null;
          estimated_duration_minutes?: number | null;
          assigned_to?: string | null;
          priority?: string;
          category?: string | null;
          is_active?: boolean;
          last_completed_at?: string | null;
          next_due_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          title_es?: string | null;
          description?: string | null;
          description_es?: string | null;
          location?: string;
          villa_id?: string | null;
          frequency?: string;
          day_of_week?: number | null;
          day_of_month?: number | null;
          time_of_day?: string | null;
          estimated_duration_minutes?: number | null;
          assigned_to?: string | null;
          priority?: string;
          category?: string | null;
          is_active?: boolean;
          last_completed_at?: string | null;
          next_due_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      promotions: {
        Row: {
          id: string;
          name: string;
          name_es: string | null;
          description: string | null;
          description_es: string | null;
          discount_type: string;
          discount_value: number;
          applies_to: string;
          category: string | null;
          item_ids: Json | null;
          start_time: string | null;
          end_time: string | null;
          days_of_week: Json | null;
          min_guests: number | null;
          max_uses: number | null;
          current_uses: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          name_es?: string | null;
          description?: string | null;
          description_es?: string | null;
          discount_type: string;
          discount_value: number;
          applies_to: string;
          category?: string | null;
          item_ids?: Json | null;
          start_time?: string | null;
          end_time?: string | null;
          days_of_week?: Json | null;
          min_guests?: number | null;
          max_uses?: number | null;
          current_uses?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          name_es?: string | null;
          description?: string | null;
          description_es?: string | null;
          discount_type?: string;
          discount_value?: number;
          applies_to?: string;
          category?: string | null;
          item_ids?: Json | null;
          start_time?: string | null;
          end_time?: string | null;
          days_of_week?: Json | null;
          min_guests?: number | null;
          max_uses?: number | null;
          current_uses?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      guest_feedback: {
        Row: {
          id: string;
          reservation_id: string | null;
          booking_id: string | null;
          guest_name: string;
          guest_email: string | null;
          guest_phone: string | null;
          check_out: string | null;
          overall_rating: number | null;
          cleanliness_rating: number | null;
          service_rating: number | null;
          food_rating: number | null;
          amenities_rating: number | null;
          value_rating: number | null;
          feedback_text: string | null;
          sentiment: string | null;
          staff_mentioned: Json | null;
          issues_mentioned: Json | null;
          submitted_via: string | null;
          is_public: boolean;
          response_sent: boolean;
          response_text: string | null;
          response_sent_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          reservation_id?: string | null;
          booking_id?: string | null;
          guest_name: string;
          guest_email?: string | null;
          guest_phone?: string | null;
          check_out?: string | null;
          overall_rating?: number | null;
          cleanliness_rating?: number | null;
          service_rating?: number | null;
          food_rating?: number | null;
          amenities_rating?: number | null;
          value_rating?: number | null;
          feedback_text?: string | null;
          sentiment?: string | null;
          staff_mentioned?: Json | null;
          issues_mentioned?: Json | null;
          submitted_via?: string | null;
          is_public?: boolean;
          response_sent?: boolean;
          response_text?: string | null;
          response_sent_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          reservation_id?: string | null;
          booking_id?: string | null;
          guest_name?: string;
          guest_email?: string | null;
          guest_phone?: string | null;
          check_out?: string | null;
          overall_rating?: number | null;
          cleanliness_rating?: number | null;
          service_rating?: number | null;
          food_rating?: number | null;
          amenities_rating?: number | null;
          value_rating?: number | null;
          feedback_text?: string | null;
          sentiment?: string | null;
          staff_mentioned?: Json | null;
          issues_mentioned?: Json | null;
          submitted_via?: string | null;
          is_public?: boolean;
          response_sent?: boolean;
          response_text?: string | null;
          response_sent_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      weather_cache: {
        Row: {
          id: string;
          location: string;
          data: Json;
          fetched_at: string;
          expires_at: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          location: string;
          data: Json;
          fetched_at: string;
          expires_at: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          location?: string;
          data?: Json;
          fetched_at?: string;
          expires_at?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      approval_delegations: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          approval_type: string;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_user_id: string;
          approval_type: string;
          start_date: string;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          from_user_id?: string;
          to_user_id?: string;
          approval_type?: string;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string | null;
        };
        Relationships: [];
      };
      staff_absences: {
        Row: {
          id: string;
          user_id: string;
          absence_type: string;
          start_date: string;
          end_date: string;
          reason: string | null;
          approved_by: string | null;
          status: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          absence_type: string;
          start_date: string;
          end_date: string;
          reason?: string | null;
          approved_by?: string | null;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          absence_type?: string;
          start_date?: string;
          end_date?: string;
          reason?: string | null;
          approved_by?: string | null;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      pending_approvals: {
        Row: {
          id: string;
          approval_type: string;
          entity_type: string;
          entity_id: string;
          requested_by: string;
          assigned_to: string | null;
          status: string;
          request_data: Json | null;
          response_data: Json | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          approval_type: string;
          entity_type: string;
          entity_id: string;
          requested_by: string;
          assigned_to?: string | null;
          status?: string;
          request_data?: Json | null;
          response_data?: Json | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          approval_type?: string;
          entity_type?: string;
          entity_id?: string;
          requested_by?: string;
          assigned_to?: string | null;
          status?: string;
          request_data?: Json | null;
          response_data?: Json | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      maintenance_completions: {
        Row: {
          id: string;
          recurring_id: string;
          completed_at: string;
          completed_by: string | null;
          duration_minutes: number | null;
          notes: string | null;
          photos: Json | null;
          issues_found: boolean;
          issue_description: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          recurring_id: string;
          completed_at: string;
          completed_by?: string | null;
          duration_minutes?: number | null;
          notes?: string | null;
          photos?: Json | null;
          issues_found?: boolean;
          issue_description?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          recurring_id?: string;
          completed_at?: string;
          completed_by?: string | null;
          duration_minutes?: number | null;
          notes?: string | null;
          photos?: Json | null;
          issues_found?: boolean;
          issue_description?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      dish_pl: {
        Row: {
          category: Database["public"]["Enums"]["menu_category"] | null;
          ingredient_cost: number | null;
          margin: number | null;
          margin_pct: number | null;
          menu_item_id: string | null;
          name: string | null;
          name_es: string | null;
          orders_this_week: number | null;
          avg_orders_per_week: number | null;
          price: number | null;
          transport_cost: number | null;
          weekly_profit: number | null;
        };
        Relationships: [];
      };
      staff_leaderboard: {
        Row: {
          avg_qc_score: number | null;
          department: Database["public"]["Enums"]["department_type"] | null;
          guest_mentions: number | null;
          id: string | null;
          monthly_points: number | null;
          name: string | null;
          total_points: number | null;
          weekly_points: number | null;
        };
        Relationships: [];
      };
      guest_spending_summary: {
        Row: {
          villa_id: string | null;
          reservation_id: string | null;
          guest_name: string | null;
          first_order_date: string | null;
          last_order_date: string | null;
          total_orders: number | null;
          food_total: number | null;
          drinks_total: number | null;
          grand_total: number | null;
          total_items: number | null;
          comp_total: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      search_sop: {
        Args: { lang?: string; query: string };
        Returns: {
          category: string;
          content: string;
          content_es: string;
          department: Database["public"]["Enums"]["sop_department"];
          id: string;
          rank: number;
          title: string;
          title_es: string;
        }[];
      };
      check_returning_guest: {
        Args: { p_email: string | null; p_phone: string | null };
        Returns: {
          is_returning: boolean;
          guest_id: string;
          total_stays: number;
          vip_status: string;
          loyalty_discount: number;
          preferred_language: string;
          dietary_preferences: Json;
          room_preferences: Json;
          notes: string | null;
        }[];
      };
      schedule_guest_communications: {
        Args: { p_booking_id: string };
        Returns: number;
      };
    };
    Enums: {
      checklist_status:
        | "pending"
        | "in_progress"
        | "complete"
        | "approved"
        | "rejected";
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
        | "common_area";
      contact_type: "guest" | "staff" | "partner" | "lead";
      conversation_channel: "web" | "whatsapp" | "instagram";
      conversation_status: "active" | "resolved" | "escalated" | "archived";
      department_type:
        | "kitchen"
        | "housekeeping"
        | "maintenance"
        | "pool"
        | "front_desk"
        | "management";
      ingredient_category:
        | "produce"
        | "protein"
        | "dairy"
        | "dry_goods"
        | "beverages"
        | "alcohol"
        | "cleaning"
        | "other";
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
        | "soft_drink";
      reservation_status:
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
        | "no_show";
      service_type: "tvc_owned" | "partner" | "opportunity";
      sop_department:
        | "kitchen"
        | "housekeeping"
        | "maintenance"
        | "pool"
        | "front_desk"
        | "emergency"
        | "general";
      user_role: "owner" | "manager" | "staff" | "guest";
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
        | "special_occasion";
      communication_status:
        | "scheduled"
        | "sent"
        | "delivered"
        | "failed"
        | "skipped";
      occasion_type:
        | "birthday"
        | "anniversary"
        | "honeymoon"
        | "proposal"
        | "celebration"
        | "other";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;
