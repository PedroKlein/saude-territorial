/**
 * Database type definitions for Supabase cache tables.
 *
 * Supabase is a CACHE layer — it never stores patient names, CNS, health
 * conditions, or any LGPD-sensitive data. Only geocoded coordinates,
 * sync metadata, user preferences, and manual pins live here.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      coordinates_cache: {
        Row: {
          id: string;
          address_hash: string;
          lat: number;
          lng: number;
          confidence: number;
          raw_address: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          address_hash: string;
          lat: number;
          lng: number;
          confidence?: number;
          raw_address: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          address_hash?: string;
          lat?: number;
          lng?: number;
          confidence?: number;
          raw_address?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sync_metadata: {
        Row: {
          id: string;
          user_id: string;
          spreadsheet_id: string;
          tab_name: string;
          last_synced_at: string;
          row_count: number;
          status: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          spreadsheet_id: string;
          tab_name: string;
          last_synced_at?: string;
          row_count?: number;
          status?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          spreadsheet_id?: string;
          tab_name?: string;
          last_synced_at?: string;
          row_count?: number;
          status?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          spreadsheet_id: string | null;
          active_layers: Json | null;
          map_center: Json | null;
          map_zoom: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          spreadsheet_id?: string | null;
          active_layers?: Json | null;
          map_center?: Json | null;
          map_zoom?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          spreadsheet_id?: string | null;
          active_layers?: Json | null;
          map_center?: Json | null;
          map_zoom?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      manual_pins: {
        Row: {
          id: string;
          user_id: string;
          patient_cns: string;
          lat: number;
          lng: number;
          reference_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          patient_cns: string;
          lat: number;
          lng: number;
          reference_text?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          patient_cns?: string;
          lat?: number;
          lng?: number;
          reference_text?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
