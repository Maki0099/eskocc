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
      ai_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      beskydy_routes: {
        Row: {
          created_at: string
          description: string
          difficulty: string
          distance_km: number
          elevation_m: number
          gpx_path: string
          id: string
          is_published: boolean
          komoot_url: string | null
          mapy_url: string | null
          slug: string
          sort_order: number
          start_location: string
          terrain: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          difficulty?: string
          distance_km?: number
          elevation_m?: number
          gpx_path: string
          id?: string
          is_published?: boolean
          komoot_url?: string | null
          mapy_url?: string | null
          slug: string
          sort_order?: number
          start_location?: string
          terrain?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          difficulty?: string
          distance_km?: number
          elevation_m?: number
          gpx_path?: string
          id?: string
          is_published?: boolean
          komoot_url?: string | null
          mapy_url?: string | null
          slug?: string
          sort_order?: number
          start_location?: string
          terrain?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cafe_gallery: {
        Row: {
          caption: string | null
          created_at: string | null
          file_name: string
          file_url: string
          id: string
          sort_order: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          file_name: string
          file_url: string
          id?: string
          sort_order?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      cafe_menu_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cafe_menu_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cafe_menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_menu_items: {
        Row: {
          category: string
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_available: boolean | null
          name: string
          price: number
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          name: string
          price: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cafe_menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cafe_menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_opening_hours: {
        Row: {
          close_time: string | null
          created_at: string | null
          day_of_week: number
          id: string
          is_closed: boolean | null
          open_time: string | null
          updated_at: string | null
        }
        Insert: {
          close_time?: string | null
          created_at?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          open_time?: string | null
          updated_at?: string | null
        }
        Update: {
          close_time?: string | null
          created_at?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          open_time?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      club_activities: {
        Row: {
          activity_date: string
          athlete_firstname: string
          athlete_full: string
          athlete_lastname_initial: string | null
          created_at: string
          distance_m: number
          elevation_gain: number
          excluded_as_duplicate: boolean
          excluded_at: string | null
          excluded_by: string | null
          fingerprint: string
          id: string
          matched_user_id: string | null
          moving_time: number
          sport_type: string | null
        }
        Insert: {
          activity_date: string
          athlete_firstname: string
          athlete_full: string
          athlete_lastname_initial?: string | null
          created_at?: string
          distance_m?: number
          elevation_gain?: number
          excluded_as_duplicate?: boolean
          excluded_at?: string | null
          excluded_by?: string | null
          fingerprint: string
          id?: string
          matched_user_id?: string | null
          moving_time?: number
          sport_type?: string | null
        }
        Update: {
          activity_date?: string
          athlete_firstname?: string
          athlete_full?: string
          athlete_lastname_initial?: string | null
          created_at?: string
          distance_m?: number
          elevation_gain?: number
          excluded_as_duplicate?: boolean
          excluded_at?: string | null
          excluded_by?: string | null
          fingerprint?: string
          id?: string
          matched_user_id?: string | null
          moving_time?: number
          sport_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_activities_matched_user_id_fkey"
            columns: ["matched_user_id"]
            isOneToOne: false
            referencedRelation: "member_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_activities_matched_user_id_fkey"
            columns: ["matched_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_api_credentials: {
        Row: {
          access_token: string
          athlete_id: string | null
          expires_at: string
          id: string
          last_error: string | null
          needs_reauth: boolean
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          athlete_id?: string | null
          expires_at: string
          id?: string
          last_error?: string | null
          needs_reauth?: boolean
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          athlete_id?: string | null
          expires_at?: string
          id?: string
          last_error?: string | null
          needs_reauth?: boolean
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      club_athlete_mappings: {
        Row: {
          athlete_firstname: string
          athlete_key: string
          athlete_lastname_initial: string | null
          created_at: string
          id: string
          ignored: boolean
          matched_user_id: string | null
          updated_at: string
        }
        Insert: {
          athlete_firstname: string
          athlete_key: string
          athlete_lastname_initial?: string | null
          created_at?: string
          id?: string
          ignored?: boolean
          matched_user_id?: string | null
          updated_at?: string
        }
        Update: {
          athlete_firstname?: string
          athlete_key?: string
          athlete_lastname_initial?: string | null
          created_at?: string
          id?: string
          ignored?: boolean
          matched_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_athlete_mappings_matched_user_id_fkey"
            columns: ["matched_user_id"]
            isOneToOne: false
            referencedRelation: "member_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_athlete_mappings_matched_user_id_fkey"
            columns: ["matched_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_sync_log: {
        Row: {
          error_message: string | null
          fetched_count: number
          finished_at: string | null
          id: string
          new_activities: number
          new_athletes: number
          started_at: string
          status: string
          triggered_by: string | null
          ytd_users_updated: number
          ytd_users_zeroed: number
        }
        Insert: {
          error_message?: string | null
          fetched_count?: number
          finished_at?: string | null
          id?: string
          new_activities?: number
          new_athletes?: number
          started_at?: string
          status?: string
          triggered_by?: string | null
          ytd_users_updated?: number
          ytd_users_zeroed?: number
        }
        Update: {
          error_message?: string | null
          fetched_count?: number
          finished_at?: string | null
          id?: string
          new_activities?: number
          new_athletes?: number
          started_at?: string
          status?: string
          triggered_by?: string | null
          ytd_users_updated?: number
          ytd_users_zeroed?: number
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_subscriptions: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_subscriptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          distance_km: number | null
          elevation_m: number | null
          event_date: string
          gpx_file_url: string | null
          id: string
          location: string
          max_elevation: number | null
          min_elevation: number | null
          organizing_athlete_name: string | null
          route_link: string | null
          source_route_id: string | null
          sport_type: string | null
          start_latlng: Json | null
          strava_event_id: string | null
          strava_event_url: string | null
          terrain_type: string | null
          title: string
          updated_at: string
          women_only: boolean | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          distance_km?: number | null
          elevation_m?: number | null
          event_date: string
          gpx_file_url?: string | null
          id?: string
          location: string
          max_elevation?: number | null
          min_elevation?: number | null
          organizing_athlete_name?: string | null
          route_link?: string | null
          source_route_id?: string | null
          sport_type?: string | null
          start_latlng?: Json | null
          strava_event_id?: string | null
          strava_event_url?: string | null
          terrain_type?: string | null
          title: string
          updated_at?: string
          women_only?: boolean | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          distance_km?: number | null
          elevation_m?: number | null
          event_date?: string
          gpx_file_url?: string | null
          id?: string
          location?: string
          max_elevation?: number | null
          min_elevation?: number | null
          organizing_athlete_name?: string | null
          route_link?: string | null
          source_route_id?: string | null
          sport_type?: string | null
          start_latlng?: Json | null
          strava_event_id?: string | null
          strava_event_url?: string | null
          terrain_type?: string | null
          title?: string
          updated_at?: string
          women_only?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_source_route_id_fkey"
            columns: ["source_route_id"]
            isOneToOne: false
            referencedRelation: "favorite_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      external_albums: {
        Row: {
          cover_image_url: string | null
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
          url: string
          year: number | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
          url: string
          year?: number | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string
          year?: number | null
        }
        Relationships: []
      }
      favorite_routes: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          distance_km: number | null
          elevation_m: number | null
          gpx_file_url: string | null
          id: string
          max_elevation: number | null
          min_elevation: number | null
          route_link: string | null
          source_event_id: string | null
          terrain_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          distance_km?: number | null
          elevation_m?: number | null
          gpx_file_url?: string | null
          id?: string
          max_elevation?: number | null
          min_elevation?: number | null
          route_link?: string | null
          source_event_id?: string | null
          terrain_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          distance_km?: number | null
          elevation_m?: number | null
          gpx_file_url?: string | null
          id?: string
          max_elevation?: number | null
          min_elevation?: number | null
          route_link?: string | null
          source_event_id?: string | null
          terrain_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_routes_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          caption: string | null
          created_at: string
          event_id: string | null
          file_name: string
          file_url: string
          id: string
          route_id: string | null
          sort_order: number
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          event_id?: string | null
          file_name: string
          file_url: string
          id?: string
          route_id?: string | null
          sort_order?: number
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          event_id?: string | null
          file_name?: string
          file_url?: string
          id?: string
          route_id?: string | null
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_items_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "favorite_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_activities: {
        Row: {
          activity_date: string
          average_cadence: number | null
          average_heartrate: number | null
          average_speed: number | null
          average_watts: number | null
          calories: number | null
          created_at: string
          distance_m: number
          elapsed_time: number | null
          elevation_gain: number
          excluded_as_duplicate: boolean
          excluded_at: string | null
          excluded_by: string | null
          id: string
          is_commute: boolean
          is_race: boolean
          is_trainer: boolean
          map_polyline: string | null
          max_heartrate: number | null
          max_speed: number | null
          moving_time: number
          name: string | null
          sport_type: string | null
          start_lat: number | null
          start_lng: number | null
          strava_activity_id: string
          suffer_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date: string
          average_cadence?: number | null
          average_heartrate?: number | null
          average_speed?: number | null
          average_watts?: number | null
          calories?: number | null
          created_at?: string
          distance_m?: number
          elapsed_time?: number | null
          elevation_gain?: number
          excluded_as_duplicate?: boolean
          excluded_at?: string | null
          excluded_by?: string | null
          id?: string
          is_commute?: boolean
          is_race?: boolean
          is_trainer?: boolean
          map_polyline?: string | null
          max_heartrate?: number | null
          max_speed?: number | null
          moving_time?: number
          name?: string | null
          sport_type?: string | null
          start_lat?: number | null
          start_lng?: number | null
          strava_activity_id: string
          suffer_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          average_cadence?: number | null
          average_heartrate?: number | null
          average_speed?: number | null
          average_watts?: number | null
          calories?: number | null
          created_at?: string
          distance_m?: number
          elapsed_time?: number | null
          elevation_gain?: number
          excluded_as_duplicate?: boolean
          excluded_at?: string | null
          excluded_by?: string | null
          id?: string
          is_commute?: boolean
          is_race?: boolean
          is_trainer?: boolean
          map_polyline?: string | null
          max_heartrate?: number | null
          max_speed?: number | null
          moving_time?: number
          name?: string | null
          sport_type?: string | null
          start_lat?: number | null
          start_lng?: number | null
          strava_activity_id?: string
          suffer_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          club_match_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          nickname: string | null
          personal_stats_cached_at: string | null
          personal_ytd_count: number | null
          personal_ytd_distance: number | null
          phone: string | null
          push_notifications_enabled: boolean | null
          strava_stats_cached_at: string | null
          strava_ytd_count: number | null
          strava_ytd_distance: number | null
          strava_ytd_elevation: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          club_match_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          nickname?: string | null
          personal_stats_cached_at?: string | null
          personal_ytd_count?: number | null
          personal_ytd_distance?: number | null
          phone?: string | null
          push_notifications_enabled?: boolean | null
          strava_stats_cached_at?: string | null
          strava_ytd_count?: number | null
          strava_ytd_distance?: number | null
          strava_ytd_elevation?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          club_match_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          nickname?: string | null
          personal_stats_cached_at?: string | null
          personal_ytd_count?: number | null
          personal_ytd_distance?: number | null
          phone?: string | null
          push_notifications_enabled?: boolean | null
          strava_stats_cached_at?: string | null
          strava_ytd_count?: number | null
          strava_ytd_distance?: number | null
          strava_ytd_elevation?: number
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strava_club_events: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          event_date: string
          id: string
          organizing_athlete_id: string | null
          organizing_athlete_name: string | null
          participant_count: number | null
          route_id: string | null
          route_polyline: string | null
          skill_level: number | null
          sport_type: string | null
          start_latlng: Json | null
          strava_event_id: string
          strava_route_id: string | null
          terrain: number | null
          title: string
          updated_at: string | null
          women_only: boolean | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          event_date: string
          id?: string
          organizing_athlete_id?: string | null
          organizing_athlete_name?: string | null
          participant_count?: number | null
          route_id?: string | null
          route_polyline?: string | null
          skill_level?: number | null
          sport_type?: string | null
          start_latlng?: Json | null
          strava_event_id: string
          strava_route_id?: string | null
          terrain?: number | null
          title: string
          updated_at?: string | null
          women_only?: boolean | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string
          id?: string
          organizing_athlete_id?: string | null
          organizing_athlete_name?: string | null
          participant_count?: number | null
          route_id?: string | null
          route_polyline?: string | null
          skill_level?: number | null
          sport_type?: string | null
          start_latlng?: Json | null
          strava_event_id?: string
          strava_route_id?: string | null
          terrain?: number | null
          title?: string
          updated_at?: string | null
          women_only?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_strava_tokens: {
        Row: {
          access_token: string
          athlete_id: string
          created_at: string
          expires_at: string
          last_error: string | null
          last_synced_at: string | null
          needs_reauth: boolean
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          athlete_id: string
          created_at?: string
          expires_at: string
          last_error?: string | null
          last_synced_at?: string | null
          needs_reauth?: boolean
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          athlete_id?: string
          created_at?: string
          expires_at?: string
          last_error?: string | null
          last_synced_at?: string | null
          needs_reauth?: boolean
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vapid_keys: {
        Row: {
          created_at: string
          id: string
          private_key: string
          public_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          private_key: string
          public_key: string
        }
        Update: {
          created_at?: string
          id?: string
          private_key?: string
          public_key?: string
        }
        Relationships: []
      }
      yearly_challenge_settings: {
        Row: {
          club_total_target: number
          created_at: string | null
          id: string
          target_over_60: number
          target_under_40: number
          target_under_60: number
          updated_at: string | null
          year: number
        }
        Insert: {
          club_total_target?: number
          created_at?: string | null
          id?: string
          target_over_60?: number
          target_under_40?: number
          target_under_60?: number
          updated_at?: string | null
          year: number
        }
        Update: {
          club_total_target?: number
          created_at?: string | null
          id?: string
          target_over_60?: number
          target_under_40?: number
          target_under_60?: number
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      member_profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          nickname: string | null
          strava_ytd_count: number | null
          strava_ytd_distance: number | null
          strava_ytd_elevation: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          nickname?: string | null
          strava_ytd_count?: number | null
          strava_ytd_distance?: number | null
          strava_ytd_elevation?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          nickname?: string | null
          strava_ytd_count?: number | null
          strava_ytd_distance?: number | null
          strava_ytd_elevation?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_club_activity_polylines: {
        Args: { _days?: number }
        Returns: {
          activity_date: string
          distance_km: number
          full_name: string
          is_virtual: boolean
          map_polyline: string
          start_lat: number
          start_lng: number
          user_id: string
        }[]
      }
      get_club_activity_starts: {
        Args: { _days?: number }
        Returns: {
          activity_date: string
          distance_m: number
          full_name: string
          start_lat: number
          start_lng: number
          user_id: string
        }[]
      }
      get_club_records: {
        Args: { _year?: number }
        Returns: {
          activity_date: string
          activity_name: string
          avatar_url: string
          full_name: string
          label: string
          record_key: string
          user_id: string
          value: string
        }[]
      }
      get_club_strava_status: {
        Args: never
        Returns: {
          athlete_id: string
          expires_at: string
          last_error: string
          needs_reauth: boolean
          updated_at: string
        }[]
      }
      get_club_teaser_stats: { Args: never; Returns: Json }
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          last_run_at: string
          last_run_duration_ms: number
          last_run_status: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      get_duplicate_activity_candidates: {
        Args: never
        Returns: {
          a_date: string
          a_distance_m: number
          a_elevation: number
          a_excluded: boolean
          a_id: string
          a_moving_time: number
          a_sport_type: string
          athlete_full: string
          b_date: string
          b_distance_m: number
          b_elevation: number
          b_excluded: boolean
          b_id: string
          b_moving_time: number
          b_sport_type: string
          likely_duplicate: boolean
          matched_user_id: string
        }[]
      }
      get_member_activity_heatmap: {
        Args: { _user_id: string; _year?: number }
        Returns: {
          day: string
          elevation: number
          km: number
          rides: number
        }[]
      }
      get_member_badges: {
        Args: { _user_id: string }
        Returns: {
          badge_key: string
          detail: string
          earned_at: string
          label: string
        }[]
      }
      get_member_calories_monthly: {
        Args: { _user_id: string; _year?: number }
        Returns: {
          calories: number
          month: number
          rides: number
        }[]
      }
      get_member_consistency_streak: {
        Args: { _user_id: string; _year?: number }
        Returns: {
          current_streak: number
          longest_streak: number
        }[]
      }
      get_member_duplicate_candidates: {
        Args: never
        Returns: {
          a_date: string
          a_distance_m: number
          a_elevation: number
          a_excluded: boolean
          a_id: string
          a_moving_time: number
          a_sport_type: string
          b_date: string
          b_distance_m: number
          b_elevation: number
          b_excluded: boolean
          b_id: string
          b_moving_time: number
          b_sport_type: string
          likely_duplicate: boolean
          member_name: string
          user_id: string
        }[]
      }
      get_member_heart_rate_zones: {
        Args: { _user_id: string; _year?: number }
        Returns: {
          minutes: number
          rides: number
          zone_label: string
          zone_max: number
          zone_min: number
        }[]
      }
      get_member_heartrate_trend: {
        Args: { _user_id: string; _year: number }
        Returns: {
          avg_hr: number
          max_hr: number
          month: number
          rides: number
        }[]
      }
      get_member_highlights: {
        Args: { _user_id: string; _year?: number }
        Returns: {
          active_days: number
          avg_heartrate: number
          avg_speed_kmh: number
          best_month: number
          best_month_km: number
          biggest_climb_date: string
          biggest_climb_m: number
          longest_ride_date: string
          longest_ride_km: number
          max_speed_kmh: number
          moving_time: number
          rides: number
          total_calories: number
          total_elevation: number
          total_km: number
        }[]
      }
      get_member_power_trend: {
        Args: { _user_id: string; _year?: number }
        Returns: {
          avg_watts: number
          max_watts: number
          month: number
          rides: number
        }[]
      }
      get_member_records: {
        Args: { _user_id: string }
        Returns: {
          fastest_date: string
          fastest_kmh: number
          longest_date: string
          longest_km: number
          most_elevation: number
          most_elevation_date: string
        }[]
      }
      get_member_routes: {
        Args: { _limit?: number; _offset?: number; _user_id: string }
        Returns: {
          activity_date: string
          distance_m: number
          elevation_gain: number
          id: string
          map_polyline: string
          moving_time: number
          name: string
          sport_type: string
          start_lat: number
          start_lng: number
        }[]
      }
      get_member_sport_breakdown: {
        Args: { _user_id: string; _year?: number }
        Returns: {
          elevation: number
          km: number
          moving_time: number
          rides: number
          sport_type: string
        }[]
      }
      get_member_statistics: {
        Args: never
        Returns: {
          age_category: string
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          is_connected: boolean
          last_synced_at: string
          needs_reauth: boolean
          nickname: string
          strava_ytd_count: number
          strava_ytd_distance: number
          strava_ytd_elevation: number
        }[]
      }
      get_member_statistics_filtered: {
        Args: { _mode?: string }
        Returns: {
          elevation: number
          km: number
          rides: number
          user_id: string
        }[]
      }
      get_member_strava_connections: {
        Args: never
        Returns: {
          activities_count: number
          athlete_id: string
          full_name: string
          last_error: string
          last_synced_at: string
          needs_reauth: boolean
          user_id: string
        }[]
      }
      get_member_trainer_ratio: {
        Args: { _user_id: string; _year?: number }
        Returns: {
          category: string
          km: number
          minutes: number
          rides: number
        }[]
      }
      get_member_weekly_load: {
        Args: { _user_id: string; _weeks?: number }
        Returns: {
          elevation: number
          km: number
          rides: number
          suffer: number
          week_start: string
        }[]
      }
      get_member_yearly_progress: {
        Args: { _user_id: string }
        Returns: {
          cumulative_elevation: number
          cumulative_km: number
          day: string
          day_elevation: number
          day_km: number
          target: number
        }[]
      }
      get_monthly_leaderboard: {
        Args: { _month?: number; _year?: number }
        Returns: {
          avatar_url: string
          elevation: number
          full_name: string
          km: number
          rides: number
          user_id: string
        }[]
      }
      get_public_club_stats: { Args: never; Returns: Json }
      get_push_subscription_counts: {
        Args: never
        Returns: {
          subscription_count: number
          user_id: string
        }[]
      }
      get_shared_rides: {
        Args: { _user_id: string }
        Returns: {
          activity_date: string
          own_distance_km: number
          partner_avatar: string
          partner_distance_km: number
          partner_id: string
          partner_name: string
        }[]
      }
      get_top_members: { Args: { limit_count?: number }; Returns: Json }
      get_weekly_leaderboard: {
        Args: never
        Returns: {
          avatar_url: string
          elevation: number
          full_name: string
          km: number
          rides: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalc_club_ytd: {
        Args: never
        Returns: {
          users_updated: number
          users_zeroed: number
        }[]
      }
      recalc_member_ytd: {
        Args: never
        Returns: {
          users_updated: number
          users_zeroed: number
        }[]
      }
      set_activity_duplicate: {
        Args: { _excluded: boolean; _id: string }
        Returns: undefined
      }
      set_member_activity_duplicate: {
        Args: { _excluded: boolean; _id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "pending" | "member" | "active_member" | "admin"
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
    Enums: {
      app_role: ["pending", "member", "active_member", "admin"],
    },
  },
} as const
