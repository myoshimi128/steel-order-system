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
    PostgrestVersion: "14.5"
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
          sales_rep: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sales_rep?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sales_rep?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cutting_prices: {
        Row: {
          cutting_method: string
          cutting_type: string
          id: string
          material_id: string | null
          plate_type_id: string
          thickness_max: number
          thickness_min: number
          unit_price: number | null
          valid_from: string
        }
        Insert: {
          cutting_method: string
          cutting_type: string
          id?: string
          material_id?: string | null
          plate_type_id: string
          thickness_max: number
          thickness_min: number
          unit_price?: number | null
          valid_from: string
        }
        Update: {
          cutting_method?: string
          cutting_type?: string
          id?: string
          material_id?: string | null
          plate_type_id?: string
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
        }
        Insert: {
          address?: string | null
          area?: string | null
          code: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          address?: string | null
          area?: string | null
          code?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
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
          extra_price: number
          id: string
          material_id: string
          steel_making: string
        }
        Insert: {
          extra_price: number
          id?: string
          material_id: string
          steel_making: string
        }
        Update: {
          extra_price?: number
          id?: string
          material_id?: string
          steel_making?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_extras_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          display_color: string | null
          id: string
          is_active: boolean
          line_mark: string | null
          name: string
        }
        Insert: {
          display_color?: string | null
          id?: string
          is_active?: boolean
          line_mark?: string | null
          name: string
        }
        Update: {
          display_color?: string | null
          id?: string
          is_active?: boolean
          line_mark?: string | null
          name?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          body: string
          customer_id: string | null
          id: string
          is_active: boolean
          priority: number
          process_type_id: string | null
        }
        Insert: {
          body: string
          customer_id?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          process_type_id?: string | null
        }
        Update: {
          body?: string
          customer_id?: string | null
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
      order_item_processes: {
        Row: {
          id: string
          line_no: number
          order_item_id: string
          process_type_id: string
          quantity: number | null
          remarks: string | null
          spec: string | null
          unit_price: number | null
        }
        Insert: {
          id?: string
          line_no: number
          order_item_id: string
          process_type_id: string
          quantity?: number | null
          remarks?: string | null
          spec?: string | null
          unit_price?: number | null
        }
        Update: {
          id?: string
          line_no?: number
          order_item_id?: string
          process_type_id?: string
          quantity?: number | null
          remarks?: string | null
          spec?: string | null
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
          delivery_destination_id: string
          due_date: string | null
          due_date_type: string
          field_note: string | null
          id: string
          order_date: string
          order_no: string
          project_name: string | null
          remarks: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_contact?: string | null
          customer_id: string
          delivery_destination_id: string
          due_date?: string | null
          due_date_type: string
          field_note?: string | null
          id?: string
          order_date: string
          order_no: string
          project_name?: string | null
          remarks?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_contact?: string | null
          customer_id?: string
          delivery_destination_id?: string
          due_date?: string | null
          due_date_type?: string
          field_note?: string | null
          id?: string
          order_date?: string
          order_no?: string
          project_name?: string | null
          remarks?: string | null
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
        ]
      }
      plate_types: {
        Row: {
          applies_material_extra: boolean
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          applies_material_extra?: boolean
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          applies_material_extra?: boolean
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      process_types: {
        Row: {
          category: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category?: string | null
          id?: string
          is_active?: boolean
          name?: string
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
      special_product_prices: {
        Row: {
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
          id: string
          is_active: boolean
          min_weight: number | null
          name: string
          weight_basis: string
        }
        Insert: {
          always_piece_price?: boolean
          applies_large_plate_extra?: boolean
          applies_thickness_extra?: boolean
          id?: string
          is_active?: boolean
          min_weight?: number | null
          name: string
          weight_basis: string
        }
        Update: {
          always_piece_price?: boolean
          applies_large_plate_extra?: boolean
          applies_thickness_extra?: boolean
          id?: string
          is_active?: boolean
          min_weight?: number | null
          name?: string
          weight_basis?: string
        }
        Relationships: []
      }
      stamps: {
        Row: {
          body: string
          display_order: number
          id: string
          is_active: boolean
        }
        Insert: {
          body: string
          display_order?: number
          id?: string
          is_active?: boolean
        }
        Update: {
          body?: string
          display_order?: number
          id?: string
          is_active?: boolean
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
          employee_no: string | null
          id: string
          is_active: boolean
          name: string
          role: string
        }
        Insert: {
          employee_no?: string | null
          id: string
          is_active?: boolean
          name: string
          role: string
        }
        Update: {
          employee_no?: string | null
          id?: string
          is_active?: boolean
          name?: string
          role?: string
        }
        Relationships: []
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
    }
    Functions: {
      current_user_role: { Args: never; Returns: string }
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
