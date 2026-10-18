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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          file_name: string
          file_type: string
          id: string
          order_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type: string
          id?: string
          order_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string
          id?: string
          order_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_stamps: {
        Row: {
          customer_id: string
          id: string
          stamp_id: string
        }
        Insert: {
          customer_id: string
          id?: string
          stamp_id: string
        }
        Update: {
          customer_id?: string
          id?: string
          stamp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_stamps_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_stamps_stamp_id_fkey"
            columns: ["stamp_id"]
            isOneToOne: false
            referencedRelation: "stamps"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_kana: string | null
          sales_rep: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_kana?: string | null
          sales_rep?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_kana?: string | null
          sales_rep?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cutting_prices: {
        Row: {
          cutting_method: string
          cutting_type: string
          has_light_tier: boolean
          id: string
          material_id: string | null
          plate_type_id: string
          small_piece_quote_required: boolean
          thickness_max: number
          thickness_min: number
          unit_price: number | null
          valid_from: string
        }
        Insert: {
          cutting_method: string
          cutting_type: string
          has_light_tier?: boolean
          id?: string
          material_id?: string | null
          plate_type_id: string
          small_piece_quote_required?: boolean
          thickness_max: number
          thickness_min: number
          unit_price?: number | null
          valid_from: string
        }
        Update: {
          cutting_method?: string
          cutting_type?: string
          has_light_tier?: boolean
          id?: string
          material_id?: string | null
          plate_type_id?: string
          small_piece_quote_required?: boolean
          thickness_max?: number
          thickness_min?: number
          unit_price?: number | null
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "cutting_prices_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cutting_prices_plate_type_id_fkey"
            columns: ["plate_type_id"]
            isOneToOne: false
            referencedRelation: "plate_types"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_destinations: {
        Row: {
          address: string | null
          area: string | null
          code: string
          id: string
          is_active: boolean
          name: string
          name_kana: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          code: string
          id?: string
          is_active?: boolean
          name: string
          name_kana?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          code?: string
          id?: string
          is_active?: boolean
          name?: string
          name_kana?: string | null
        }
        Relationships: []
      }
      delivery_methods: {
        Row: {
          id: string
          is_active: boolean
          name: string
          number: number
          requires_note: boolean
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          number: number
          requires_note?: boolean
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          number?: number
          requires_note?: boolean
        }
        Relationships: []
      }
      intake_destinations: {
        Row: {
          created_at: string
          destination_id: string | null
          id: string
          intake_id: string
          seq: number
        }
        Insert: {
          created_at?: string
          destination_id?: string | null
          id?: string
          intake_id: string
          seq: number
        }
        Update: {
          created_at?: string
          destination_id?: string | null
          id?: string
          intake_id?: string
          seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "intake_destinations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "delivery_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_destinations_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_destinations_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "work_unit_queue_view"
            referencedColumns: ["intake_id"]
          },
        ]
      }
      intake_files: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          intake_id: string
          kind: string
          mime_type: string | null
          original_name: string
          size_bytes: number | null
          slot: string | null
          storage_path: string
          updated_at: string
          updated_by: string | null
          uploaded_by: string | null
          work_unit_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          intake_id: string
          kind: string
          mime_type?: string | null
          original_name: string
          size_bytes?: number | null
          slot?: string | null
          storage_path: string
          updated_at?: string
          updated_by?: string | null
          uploaded_by?: string | null
          work_unit_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          intake_id?: string
          kind?: string
          mime_type?: string | null
          original_name?: string
          size_bytes?: number | null
          slot?: string | null
          storage_path?: string
          updated_at?: string
          updated_by?: string | null
          uploaded_by?: string | null
          work_unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_files_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_files_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "work_unit_queue_view"
            referencedColumns: ["intake_id"]
          },
          {
            foreignKeyName: "intake_files_unit_same_intake_fkey"
            columns: ["work_unit_id", "intake_id"]
            isOneToOne: false
            referencedRelation: "work_units"
            referencedColumns: ["id", "intake_id"]
          },
          {
            foreignKeyName: "intake_files_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_site_changes: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_site_id: string | null
          id: string
          intake_id: string
          reason: string | null
          to_site_id: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_site_id?: string | null
          id?: string
          intake_id: string
          reason?: string | null
          to_site_id?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_site_id?: string | null
          id?: string
          intake_id?: string
          reason?: string | null
          to_site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_site_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_site_changes_from_site_id_fkey"
            columns: ["from_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_site_changes_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_site_changes_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "work_unit_queue_view"
            referencedColumns: ["intake_id"]
          },
          {
            foreignKeyName: "intake_site_changes_to_site_id_fkey"
            columns: ["to_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      intakes: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          customer_contact: string | null
          customer_id: string | null
          deleted_at: string | null
          delivery_method_id: string | null
          delivery_method_note: string | null
          due_date: string | null
          due_date_type: string | null
          email_body: string | null
          email_from: string | null
          email_message_id: string | null
          email_subject: string | null
          handling_at: string | null
          handling_by: string | null
          id: string
          intake_date: string | null
          intake_no: string | null
          intake_seq: number | null
          intake_year: number | null
          is_urgent: boolean
          last_branch: number
          memo: string | null
          project_name: string | null
          received_at: string
          registered_at: string | null
          registered_by: string | null
          site_change_reason_input: string | null
          site_id: string | null
          staff_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          created_by?: string | null
          customer_contact?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          delivery_method_id?: string | null
          delivery_method_note?: string | null
          due_date?: string | null
          due_date_type?: string | null
          email_body?: string | null
          email_from?: string | null
          email_message_id?: string | null
          email_subject?: string | null
          handling_at?: string | null
          handling_by?: string | null
          id?: string
          intake_date?: string | null
          intake_no?: string | null
          intake_seq?: number | null
          intake_year?: number | null
          is_urgent?: boolean
          last_branch?: number
          memo?: string | null
          project_name?: string | null
          received_at?: string
          registered_at?: string | null
          registered_by?: string | null
          site_change_reason_input?: string | null
          site_id?: string | null
          staff_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_contact?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          delivery_method_id?: string | null
          delivery_method_note?: string | null
          due_date?: string | null
          due_date_type?: string | null
          email_body?: string | null
          email_from?: string | null
          email_message_id?: string | null
          email_subject?: string | null
          handling_at?: string | null
          handling_by?: string | null
          id?: string
          intake_date?: string | null
          intake_no?: string | null
          intake_seq?: number | null
          intake_year?: number | null
          is_urgent?: boolean
          last_branch?: number
          memo?: string | null
          project_name?: string | null
          received_at?: string
          registered_at?: string | null
          registered_by?: string | null
          site_change_reason_input?: string | null
          site_id?: string | null
          staff_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intakes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_delivery_method_id_fkey"
            columns: ["delivery_method_id"]
            isOneToOne: false
            referencedRelation: "delivery_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_handling_by_fkey"
            columns: ["handling_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      large_plate_extras: {
        Row: {
          extra_price: number
          id: string
          thickness: number
        }
        Insert: {
          extra_price: number
          id?: string
          thickness: number
        }
        Update: {
          extra_price?: number
          id?: string
          thickness?: number
        }
        Relationships: []
      }
      lead_time_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          dept: string
          id: string
          summary: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          dept: string
          id?: string
          summary: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          dept?: string
          id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_time_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_time_items: {
        Row: {
          congestion: string
          days: number | null
          dept: string
          id: string
          name: string
          note: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          congestion?: string
          days?: number | null
          dept: string
          id?: string
          name: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          congestion?: string
          days?: number | null
          dept?: string
          id?: string
          name?: string
          note?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_time_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_time_messages: {
        Row: {
          dept: string
          expires_on: string | null
          message: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          dept: string
          expires_on?: string | null
          message?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          dept?: string
          expires_on?: string | null
          message?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_time_messages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          code: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      material_extras: {
        Row: {
          blast_furnace_extra: number
          extra_price: number
          id: string
          material_id: string
        }
        Insert: {
          blast_furnace_extra: number
          extra_price: number
          id?: string
          material_id: string
        }
        Update: {
          blast_furnace_extra?: number
          extra_price?: number
          id?: string
          material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_extras_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          default_steel_making: string
          display_color: string | null
          has_dedicated_price: boolean
          id: string
          is_active: boolean
          line_mark: string | null
          name: string
          number: number
        }
        Insert: {
          default_steel_making?: string
          display_color?: string | null
          has_dedicated_price?: boolean
          id?: string
          is_active?: boolean
          line_mark?: string | null
          name: string
          number: number
        }
        Update: {
          default_steel_making?: string
          display_color?: string | null
          has_dedicated_price?: boolean
          id?: string
          is_active?: boolean
          line_mark?: string | null
          name?: string
          number?: number
        }
        Relationships: []
      }
      notices: {
        Row: {
          body: string
          customer_id: string
          cutting_method: string | null
          id: string
          is_active: boolean
          priority: number
          process_type_id: string | null
        }
        Insert: {
          body: string
          customer_id: string
          cutting_method?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          process_type_id?: string | null
        }
        Update: {
          body?: string
          customer_id?: string
          cutting_method?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          process_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_process_type_id_fkey"
            columns: ["process_type_id"]
            isOneToOne: false
            referencedRelation: "process_types"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dept: string
          id: string
          intake_id: string | null
          kind: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dept: string
          id?: string
          intake_id?: string | null
          kind: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dept?: string
          id?: string
          intake_id?: string | null
          kind?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "work_unit_queue_view"
            referencedColumns: ["intake_id"]
          },
        ]
      }
      order_item_processes: {
        Row: {
          id: string
          line_no: number
          order_item_id: string
          price_unit: string
          process_type_id: string
          quantity: number | null
          remarks: string | null
          spec: string | null
          spec_fields: Json | null
          unit_price: number | null
        }
        Insert: {
          id?: string
          line_no: number
          order_item_id: string
          price_unit?: string
          process_type_id: string
          quantity?: number | null
          remarks?: string | null
          spec?: string | null
          spec_fields?: Json | null
          unit_price?: number | null
        }
        Update: {
          id?: string
          line_no?: number
          order_item_id?: string
          price_unit?: string
          process_type_id?: string
          quantity?: number | null
          remarks?: string | null
          spec?: string | null
          spec_fields?: Json | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_processes_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_processes_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items_factory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_processes_process_type_id_fkey"
            columns: ["process_type_id"]
            isOneToOne: false
            referencedRelation: "process_types"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          actual_weight: number | null
          cutting_method: string | null
          cutting_type: string | null
          cutting_unit_price: number | null
          field_note: string | null
          id: string
          inner_diameter: number | null
          length: number | null
          line_no: number
          manufacturer_specified_id: string | null
          manufacturer_used_id: string | null
          material_weight: number | null
          mill_sheet_no: string | null
          order_id: string
          outer_diameter: number | null
          package_count: number | null
          plate_size: string | null
          price_unit: string | null
          product_id: string
          quantity: number
          remarks: string | null
          sales_unit_price: number | null
          special_product_type_id: string | null
          square_weight: number | null
          steel_making: string | null
          width: number | null
        }
        Insert: {
          actual_weight?: number | null
          cutting_method?: string | null
          cutting_type?: string | null
          cutting_unit_price?: number | null
          field_note?: string | null
          id?: string
          inner_diameter?: number | null
          length?: number | null
          line_no: number
          manufacturer_specified_id?: string | null
          manufacturer_used_id?: string | null
          material_weight?: number | null
          mill_sheet_no?: string | null
          order_id: string
          outer_diameter?: number | null
          package_count?: number | null
          plate_size?: string | null
          price_unit?: string | null
          product_id: string
          quantity: number
          remarks?: string | null
          sales_unit_price?: number | null
          special_product_type_id?: string | null
          square_weight?: number | null
          steel_making?: string | null
          width?: number | null
        }
        Update: {
          actual_weight?: number | null
          cutting_method?: string | null
          cutting_type?: string | null
          cutting_unit_price?: number | null
          field_note?: string | null
          id?: string
          inner_diameter?: number | null
          length?: number | null
          line_no?: number
          manufacturer_specified_id?: string | null
          manufacturer_used_id?: string | null
          material_weight?: number | null
          mill_sheet_no?: string | null
          order_id?: string
          outer_diameter?: number | null
          package_count?: number | null
          plate_size?: string | null
          price_unit?: string | null
          product_id?: string
          quantity?: number
          remarks?: string | null
          sales_unit_price?: number | null
          special_product_type_id?: string | null
          square_weight?: number | null
          steel_making?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_manufacturer_specified_id_fkey"
            columns: ["manufacturer_specified_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_manufacturer_used_id_fkey"
            columns: ["manufacturer_used_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_special_product_type_id_fkey"
            columns: ["special_product_type_id"]
            isOneToOne: false
            referencedRelation: "special_product_types"
            referencedColumns: ["id"]
          },
        ]
      }
      order_stamps: {
        Row: {
          id: string
          order_id: string
          stamp_id: string
        }
        Insert: {
          id?: string
          order_id: string
          stamp_id: string
        }
        Update: {
          id?: string
          order_id?: string
          stamp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_stamps_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_stamps_stamp_id_fkey"
            columns: ["stamp_id"]
            isOneToOne: false
            referencedRelation: "stamps"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string
          customer_contact: string | null
          customer_id: string
          deleted_at: string | null
          delivery_destination_id: string | null
          delivery_method_id: string
          delivery_method_note: string | null
          due_date: string | null
          due_date_type: string
          field_note: string | null
          id: string
          joint_no: string | null
          member_class: string
          order_date: string
          order_no: string
          project_name: string | null
          remarks: string | null
          site_id: string
          splice_shot: boolean | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_contact?: string | null
          customer_id: string
          deleted_at?: string | null
          delivery_destination_id?: string | null
          delivery_method_id: string
          delivery_method_note?: string | null
          due_date?: string | null
          due_date_type: string
          field_note?: string | null
          id?: string
          joint_no?: string | null
          member_class?: string
          order_date: string
          order_no?: string
          project_name?: string | null
          remarks?: string | null
          site_id: string
          splice_shot?: boolean | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_contact?: string | null
          customer_id?: string
          deleted_at?: string | null
          delivery_destination_id?: string | null
          delivery_method_id?: string
          delivery_method_note?: string | null
          due_date?: string | null
          due_date_type?: string
          field_note?: string | null
          id?: string
          joint_no?: string | null
          member_class?: string
          order_date?: string
          order_no?: string
          project_name?: string | null
          remarks?: string | null
          site_id?: string
          splice_shot?: boolean | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_destination_id_fkey"
            columns: ["delivery_destination_id"]
            isOneToOne: false
            referencedRelation: "delivery_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_method_id_fkey"
            columns: ["delivery_method_id"]
            isOneToOne: false
            referencedRelation: "delivery_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      plate_types: {
        Row: {
          applies_material_extra: boolean
          id: string
          is_active: boolean
          name: string
          number: number
        }
        Insert: {
          applies_material_extra?: boolean
          id?: string
          is_active?: boolean
          name: string
          number: number
        }
        Update: {
          applies_material_extra?: boolean
          id?: string
          is_active?: boolean
          name?: string
          number?: number
        }
        Relationships: []
      }
      process_notices: {
        Row: {
          body: string
          hole_diameter_max: number | null
          hole_diameter_min: number | null
          id: string
          is_active: boolean
          process_type_id: string
          thickness_max: number | null
          thickness_min: number | null
        }
        Insert: {
          body: string
          hole_diameter_max?: number | null
          hole_diameter_min?: number | null
          id?: string
          is_active?: boolean
          process_type_id: string
          thickness_max?: number | null
          thickness_min?: number | null
        }
        Update: {
          body?: string
          hole_diameter_max?: number | null
          hole_diameter_min?: number | null
          id?: string
          is_active?: boolean
          process_type_id?: string
          thickness_max?: number | null
          thickness_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "process_notices_process_type_id_fkey"
            columns: ["process_type_id"]
            isOneToOne: false
            referencedRelation: "process_types"
            referencedColumns: ["id"]
          },
        ]
      }
      process_types: {
        Row: {
          category: string | null
          id: string
          input_shape: string
          is_active: boolean
          name: string
          number: number | null
        }
        Insert: {
          category?: string | null
          id?: string
          input_shape?: string
          is_active?: boolean
          name: string
          number?: number | null
        }
        Update: {
          category?: string | null
          id?: string
          input_shape?: string
          is_active?: boolean
          name?: string
          number?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          is_active: boolean
          material_id: string | null
          plate_type_id: string
          shape: string
          thickness: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          material_id?: string | null
          plate_type_id: string
          shape: string
          thickness: number
        }
        Update: {
          id?: string
          is_active?: boolean
          material_id?: string | null
          plate_type_id?: string
          shape?: string
          thickness?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_plate_type_id_fkey"
            columns: ["plate_type_id"]
            isOneToOne: false
            referencedRelation: "plate_types"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_items: {
        Row: {
          id: string
          order_item_id: string
          quantity: number
          shipment_id: string
          weight: number | null
        }
        Insert: {
          id?: string
          order_item_id: string
          quantity: number
          shipment_id: string
          weight?: number | null
        }
        Update: {
          id?: string
          order_item_id?: string
          quantity?: number
          shipment_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items_factory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          created_at: string
          created_by: string
          id: string
          order_id: string
          shipment_no: string
          shipped_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          order_id: string
          shipment_no: string
          shipped_date: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          order_id?: string
          shipment_no?: string
          shipped_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          number: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          number: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          number?: number
          updated_at?: string
        }
        Relationships: []
      }
      special_product_prices: {
        Row: {
          cutting_method: string | null
          has_shot: boolean
          id: string
          plate_type_id: string
          special_product_type_id: string
          thickness_max: number
          thickness_min: number
          unit_price: number
          valid_from: string
        }
        Insert: {
          cutting_method?: string | null
          has_shot?: boolean
          id?: string
          plate_type_id: string
          special_product_type_id: string
          thickness_max: number
          thickness_min: number
          unit_price: number
          valid_from: string
        }
        Update: {
          cutting_method?: string | null
          has_shot?: boolean
          id?: string
          plate_type_id?: string
          special_product_type_id?: string
          thickness_max?: number
          thickness_min?: number
          unit_price?: number
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_product_prices_plate_type_id_fkey"
            columns: ["plate_type_id"]
            isOneToOne: false
            referencedRelation: "plate_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_product_prices_special_product_type_id_fkey"
            columns: ["special_product_type_id"]
            isOneToOne: false
            referencedRelation: "special_product_types"
            referencedColumns: ["id"]
          },
        ]
      }
      special_product_types: {
        Row: {
          always_piece_price: boolean
          applies_large_plate_extra: boolean
          applies_thickness_extra: boolean
          dimension_shape: string
          has_light_tier: boolean
          id: string
          irregular_cut_quote_required: boolean
          is_active: boolean
          is_splice_order_type: boolean
          min_weight: number | null
          name: string
          number: number
          weight_basis: string
        }
        Insert: {
          always_piece_price?: boolean
          applies_large_plate_extra?: boolean
          applies_thickness_extra?: boolean
          dimension_shape?: string
          has_light_tier?: boolean
          id?: string
          irregular_cut_quote_required?: boolean
          is_active?: boolean
          is_splice_order_type?: boolean
          min_weight?: number | null
          name: string
          number: number
          weight_basis: string
        }
        Update: {
          always_piece_price?: boolean
          applies_large_plate_extra?: boolean
          applies_thickness_extra?: boolean
          dimension_shape?: string
          has_light_tier?: boolean
          id?: string
          irregular_cut_quote_required?: boolean
          is_active?: boolean
          is_splice_order_type?: boolean
          min_weight?: number | null
          name?: string
          number?: number
          weight_basis?: string
        }
        Relationships: []
      }
      stamps: {
        Row: {
          body: string
          id: string
          is_active: boolean
          number: number
        }
        Insert: {
          body: string
          id?: string
          is_active?: boolean
          number: number
        }
        Update: {
          body?: string
          id?: string
          is_active?: boolean
          number?: number
        }
        Relationships: []
      }
      standard_plate_prices: {
        Row: {
          id: string
          material_id: string | null
          plate_size: string
          plate_type_id: string
          thickness: number
          unit_price: number
          valid_from: string
        }
        Insert: {
          id?: string
          material_id?: string | null
          plate_size: string
          plate_type_id: string
          thickness: number
          unit_price: number
          valid_from: string
        }
        Update: {
          id?: string
          material_id?: string | null
          plate_size?: string
          plate_type_id?: string
          thickness?: number
          unit_price?: number
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_plate_prices_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standard_plate_prices_plate_type_id_fkey"
            columns: ["plate_type_id"]
            isOneToOne: false
            referencedRelation: "plate_types"
            referencedColumns: ["id"]
          },
        ]
      }
      thickness_extras: {
        Row: {
          extra_price: number
          id: string
          thickness: number
        }
        Insert: {
          extra_price: number
          id?: string
          thickness: number
        }
        Update: {
          extra_price?: number
          id?: string
          thickness?: number
        }
        Relationships: []
      }
      unit_weights: {
        Row: {
          id: string
          is_active: boolean
          manufacturer_id: string
          plate_type_id: string
          thickness: number
          unit_weight: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          manufacturer_id: string
          plate_type_id: string
          thickness: number
          unit_weight: number
        }
        Update: {
          id?: string
          is_active?: boolean
          manufacturer_id?: string
          plate_type_id?: string
          thickness?: number
          unit_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "unit_weights_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_weights_plate_type_id_fkey"
            columns: ["plate_type_id"]
            isOneToOne: false
            referencedRelation: "plate_types"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          department: string | null
          employee_no: string | null
          id: string
          is_active: boolean
          name: string
          role: string
          site_id: string | null
        }
        Insert: {
          department?: string | null
          employee_no?: string | null
          id: string
          is_active?: boolean
          name: string
          role: string
          site_id?: string | null
        }
        Update: {
          department?: string | null
          employee_no?: string | null
          id?: string
          is_active?: boolean
          name?: string
          role?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      work_units: {
        Row: {
          cad_assignee: string | null
          cad_started_at: string | null
          created_at: string
          created_by: string | null
          done_at: string | null
          id: string
          intake_id: string
          kind: string
          note: string | null
          origin: string
          ready_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cad_assignee?: string | null
          cad_started_at?: string | null
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          id?: string
          intake_id: string
          kind: string
          note?: string | null
          origin?: string
          ready_at?: string | null
          status: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cad_assignee?: string | null
          cad_started_at?: string | null
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          id?: string
          intake_id?: string
          kind?: string
          note?: string | null
          origin?: string
          ready_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_units_cad_assignee_fkey"
            columns: ["cad_assignee"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_units_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_units_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_units_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "work_unit_queue_view"
            referencedColumns: ["intake_id"]
          },
          {
            foreignKeyName: "work_units_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      order_item_processes_factory_view: {
        Row: {
          id: string | null
          line_no: number | null
          order_item_id: string | null
          process_type_id: string | null
          quantity: number | null
          remarks: string | null
          spec: string | null
        }
        Insert: {
          id?: string | null
          line_no?: number | null
          order_item_id?: string | null
          process_type_id?: string | null
          quantity?: number | null
          remarks?: string | null
          spec?: string | null
        }
        Update: {
          id?: string | null
          line_no?: number | null
          order_item_id?: string | null
          process_type_id?: string | null
          quantity?: number | null
          remarks?: string | null
          spec?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_processes_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_processes_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items_factory_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_processes_process_type_id_fkey"
            columns: ["process_type_id"]
            isOneToOne: false
            referencedRelation: "process_types"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items_factory_view: {
        Row: {
          cutting_method: string | null
          field_note: string | null
          id: string | null
          length: number | null
          line_no: number | null
          manufacturer_specified_id: string | null
          manufacturer_used_id: string | null
          mill_sheet_no: string | null
          order_id: string | null
          package_count: number | null
          product_id: string | null
          quantity: number | null
          remarks: string | null
          unit_weight: number | null
          width: number | null
        }
        Insert: {
          cutting_method?: string | null
          field_note?: string | null
          id?: string | null
          length?: number | null
          line_no?: number | null
          manufacturer_specified_id?: string | null
          manufacturer_used_id?: string | null
          mill_sheet_no?: string | null
          order_id?: string | null
          package_count?: number | null
          product_id?: string | null
          quantity?: number | null
          remarks?: string | null
          unit_weight?: number | null
          width?: number | null
        }
        Update: {
          cutting_method?: string | null
          field_note?: string | null
          id?: string | null
          length?: number | null
          line_no?: number | null
          manufacturer_specified_id?: string | null
          manufacturer_used_id?: string | null
          mill_sheet_no?: string | null
          order_id?: string | null
          package_count?: number | null
          product_id?: string | null
          quantity?: number | null
          remarks?: string | null
          unit_weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_manufacturer_specified_id_fkey"
            columns: ["manufacturer_specified_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_manufacturer_used_id_fkey"
            columns: ["manufacturer_used_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      work_unit_queue_view: {
        Row: {
          cad_assignee: string | null
          cad_started_at: string | null
          customer_id: string | null
          customer_name: string | null
          due_date: string | null
          due_date_type: string | null
          file_count: number | null
          intake_id: string | null
          intake_no: string | null
          is_urgent: boolean | null
          kind: string | null
          origin: string | null
          project_name: string | null
          ready_at: string | null
          registered_at: string | null
          site_id: string | null
          staff_id: string | null
          staff_name: string | null
          status: string | null
          work_unit_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intakes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_units_cad_assignee_fkey"
            columns: ["cad_assignee"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_work_unit: {
        Args: {
          p_intake_id: string
          p_kind: string
          p_note?: string
          p_origin: string
        }
        Returns: string
      }
      complete_split: {
        Args: { p_intake_id: string; p_no_file_kinds?: string[] }
        Returns: string[]
      }
      complete_work_unit: {
        Args: { p_work_unit_id: string }
        Returns: undefined
      }
      create_order: { Args: { p_items: Json; p_order: Json }; Returns: string }
      current_user_department: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      get_pricing_rows: {
        Args: {
          p_as_of: string
          p_cutting_method?: string
          p_cutting_type?: string
          p_has_shot?: boolean
          p_material_id?: string
          p_plate_size?: string
          p_plate_type_id: string
          p_special_product_type_id?: string
          p_thickness: number
        }
        Returns: Json
      }
      register_intake: { Args: { p_intake_id: string }; Returns: string }
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
