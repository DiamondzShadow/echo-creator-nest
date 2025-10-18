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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          created_at: string
          description: string | null
          duration: number | null
          id: string
          livepeer_asset_id: string
          livepeer_playback_id: string | null
          ready_at: string | null
          size: number | null
          status: string
          stream_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          livepeer_asset_id: string
          livepeer_playback_id?: string | null
          ready_at?: string | null
          size?: number | null
          status: string
          stream_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          livepeer_asset_id?: string
          livepeer_playback_id?: string | null
          ready_at?: string | null
          size?: number | null
          status?: string
          stream_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followers_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          is_live: boolean | null
          livepeer_playback_id: string | null
          livepeer_stream_id: string | null
          started_at: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          viewer_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_live?: boolean | null
          livepeer_playback_id?: string | null
          livepeer_stream_id?: string | null
          started_at?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          viewer_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_live?: boolean | null
          livepeer_playback_id?: string | null
          livepeer_stream_id?: string | null
          started_at?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          metadata: Json | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_email: string | null
          platform_user_id: string
          platform_username: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_email?: string | null
          platform_user_id: string
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          platform?: Database["public"]["Enums"]["platform_type"]
          platform_email?: string | null
          platform_user_id?: string
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          background_image: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          follower_count: number | null
          following_count: number | null
          id: string
          soundcloud_url: string | null
          theme_color: string | null
          tip_count: number | null
          total_tips_received: number | null
          updated_at: string
          username: string
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          background_image?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          id: string
          soundcloud_url?: string | null
          theme_color?: string | null
          tip_count?: number | null
          total_tips_received?: number | null
          updated_at?: string
          username: string
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          background_image?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          soundcloud_url?: string | null
          theme_color?: string | null
          tip_count?: number | null
          total_tips_received?: number | null
          updated_at?: string
          username?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      stream_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          stream_id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          stream_id: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          stream_id?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_reactions: {
        Row: {
          created_at: string | null
          id: string
          reaction: Database["public"]["Enums"]["reaction_type"]
          stream_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reaction: Database["public"]["Enums"]["reaction_type"]
          stream_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reaction?: Database["public"]["Enums"]["reaction_type"]
          stream_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_reactions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          amount: string
          block_number: number | null
          created_at: string | null
          from_user_id: string | null
          from_wallet_address: string
          id: string
          metadata: Json | null
          network: Database["public"]["Enums"]["blockchain_network"]
          to_user_id: string
          to_wallet_address: string
          token_address: string | null
          token_symbol: string
          transaction_hash: string
        }
        Insert: {
          amount: string
          block_number?: number | null
          created_at?: string | null
          from_user_id?: string | null
          from_wallet_address: string
          id?: string
          metadata?: Json | null
          network: Database["public"]["Enums"]["blockchain_network"]
          to_user_id: string
          to_wallet_address: string
          token_address?: string | null
          token_symbol: string
          transaction_hash: string
        }
        Update: {
          amount?: string
          block_number?: number | null
          created_at?: string | null
          from_user_id?: string | null
          from_wallet_address?: string
          id?: string
          metadata?: Json | null
          network?: Database["public"]["Enums"]["blockchain_network"]
          to_user_id?: string
          to_wallet_address?: string
          token_address?: string | null
          token_symbol?: string
          transaction_hash?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_stream_key: {
        Args: { p_stream_id: string }
        Returns: string
      }
      store_stream_key: {
        Args: { p_stream_id: string; p_stream_key: string }
        Returns: undefined
      }
    }
    Enums: {
      blockchain_network:
        | "ethereum"
        | "polygon"
        | "base"
        | "arbitrum"
        | "optimism"
      platform_type: "youtube" | "twitch" | "tiktok"
      reaction_type: "like" | "unlike" | "love" | "what" | "lmao"
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
      blockchain_network: [
        "ethereum",
        "polygon",
        "base",
        "arbitrum",
        "optimism",
      ],
      platform_type: ["youtube", "twitch", "tiktok"],
      reaction_type: ["like", "unlike", "love", "what", "lmao"],
    },
  },
} as const
