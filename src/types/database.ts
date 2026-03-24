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
      inventory_logs: {
        Row: {
          counted_at: string | null;
          counted_by: string;
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
        };
        Insert: {
          id?: string;
          menu_item_id: string;
          quantity?: number;
          order_date?: string | null;
          served_by?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          menu_item_id?: string;
          quantity?: number;
          order_date?: string | null;
          served_by?: string | null;
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
