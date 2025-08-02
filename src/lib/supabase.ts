// Local client replacement for Supabase
// This file maintains the same interface but uses local database and auth

import { localClient } from './localClient';

// Re-export the local client as 'supabase' to maintain compatibility
export const supabase = localClient;

// Keep the Database interface for reference (now using local SQLite types)
export interface Database {
  public: {
    Tables: {
      phone_numbers: {
        Row: {
          id: string
          number: string
          status: 'available' | 'assigned' | 'reserved' | 'aging' | 'blocked' | 'toll-free'
          system: string
          carrier: string
          assigned_to: string | null
          notes: string
          extension: string
          department: string
          location: string
          date_assigned: string | null
          date_available: string | null
          last_used: string | null
          aging_days: number
          number_type: 'local' | 'toll-free' | 'international'
          range_name: string
          project: string | null
          reserved_until: string | null
          usage_inbound: number
          usage_outbound: number
          usage_last_activity: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          number: string
          status?: 'available' | 'assigned' | 'reserved' | 'aging' | 'blocked' | 'toll-free'
          system?: string
          carrier?: string
          assigned_to?: string | null
          notes?: string
          extension?: string
          department?: string
          location?: string
          date_assigned?: string | null
          date_available?: string | null
          last_used?: string | null
          aging_days?: number
          number_type?: 'local' | 'toll-free' | 'international'
          range_name?: string
          project?: string | null
          reserved_until?: string | null
          usage_inbound?: number
          usage_outbound?: number
          usage_last_activity?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          number?: string
          status?: 'available' | 'assigned' | 'reserved' | 'aging' | 'blocked' | 'toll-free'
          system?: string
          carrier?: string
          assigned_to?: string | null
          notes?: string
          extension?: string
          department?: string
          location?: string
          date_assigned?: string | null
          date_available?: string | null
          last_used?: string | null
          aging_days?: number
          number_type?: 'local' | 'toll-free' | 'international'
          range_name?: string
          project?: string | null
          reserved_until?: string | null
          usage_inbound?: number
          usage_outbound?: number
          usage_last_activity?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      number_ranges: {
        Row: {
          id: string
          name: string
          pattern: string
          start_number: string
          end_number: string
          total_numbers: number
          available_numbers: number
          assigned_numbers: number
          reserved_numbers: number
          carrier: string
          location: string
          department: string
          date_created: string
          notes: string
          status: 'active' | 'inactive' | 'pending'
          project: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          pattern: string
          start_number: string
          end_number: string
          total_numbers: number
          available_numbers: number
          assigned_numbers: number
          reserved_numbers: number
          carrier: string
          location: string
          department: string
          date_created: string
          notes: string
          status: 'active' | 'inactive' | 'pending'
          project?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          pattern?: string
          start_number?: string
          end_number?: string
          total_numbers?: number
          available_numbers?: number
          assigned_numbers?: number
          reserved_numbers?: number
          carrier?: string
          location?: string
          department?: string
          date_created?: string
          notes?: string
          status?: 'active' | 'inactive' | 'pending'
          project?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bulk_operations: {
        Row: {
          id: string
          type: 'assign' | 'release' | 'reserve' | 'import' | 'export' | 'transform'
          status: 'pending' | 'running' | 'completed' | 'failed'
          progress: number
          total_items: number
          processed_items: number
          failed_items: number
          start_time: string
          end_time: string | null
          details: string
          results: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'assign' | 'release' | 'reserve' | 'import' | 'export' | 'transform'
          status?: 'pending' | 'running' | 'completed' | 'failed'
          progress?: number
          total_items?: number
          processed_items?: number
          failed_items?: number
          start_time: string
          end_time?: string | null
          details: string
          results?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'assign' | 'release' | 'reserve' | 'import' | 'export' | 'transform'
          status?: 'pending' | 'running' | 'completed' | 'failed'
          progress?: number
          total_items?: number
          processed_items?: number
          failed_items?: number
          start_time?: string
          end_time?: string | null
          details?: string
          results?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          action: string
          user: string
          timestamp: string
          type: 'assignment' | 'import' | 'release' | 'settings' | 'auth' | 'sync'
          details: any | null
          created_at: string
        }
        Insert: {
          id?: string
          action: string
          user: string
          timestamp: string
          type: 'assignment' | 'import' | 'release' | 'settings' | 'auth' | 'sync'
          details?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          action?: string
          user?: string
          timestamp?: string
          type?: 'assignment' | 'import' | 'release' | 'settings' | 'auth' | 'sync'
          details?: any | null
          created_at?: string
        }
      }
    }
  }
}