// 對應 supabase/migrations/001_init.sql 的型別定義
// 供 useSupabaseClient<Database>() 使用，確保查詢型別安全。
// 結構比照 `supabase gen types typescript` 的官方輸出格式。

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Consistency = 'normal' | 'soft' | 'loose' | 'hard'
export type PoopColor = 'brown' | 'yellow' | 'black' | 'red'

export interface Database {
  public: {
    Tables: {
      walk_sessions: {
        Row: {
          id: string
          user_id: string
          dog_name: string
          started_at: string
          ended_at: string | null
          duration_sec: number | null
          distance_m: number | null
          route_json: Json | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dog_name: string
          started_at?: string
          ended_at?: string | null
          duration_sec?: number | null
          distance_m?: number | null
          route_json?: Json | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          dog_name?: string
          started_at?: string
          ended_at?: string | null
          duration_sec?: number | null
          distance_m?: number | null
          route_json?: Json | null
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      poop_logs: {
        Row: {
          id: string
          session_id: string | null
          user_id: string
          logged_at: string
          consistency: Consistency
          color: PoopColor
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id?: string | null
          user_id: string
          logged_at?: string
          consistency: Consistency
          color: PoopColor
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string | null
          user_id?: string
          logged_at?: string
          consistency?: Consistency
          color?: PoopColor
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      ai_reports: {
        Row: {
          id: string
          user_id: string
          generated_at: string
          period_start: string
          period_end: string
          summary: string | null
          anomaly_flag: boolean
          detail_json: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          generated_at?: string
          period_start: string
          period_end: string
          summary?: string | null
          anomaly_flag?: boolean
          detail_json?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          generated_at?: string
          period_start?: string
          period_end?: string
          summary?: string | null
          anomaly_flag?: boolean
          detail_json?: Json | null
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// 方便應用層使用的 Row 別名
export type WalkSession = Database['public']['Tables']['walk_sessions']['Row']
export type PoopLog = Database['public']['Tables']['poop_logs']['Row']
export type AiReport = Database['public']['Tables']['ai_reports']['Row']
