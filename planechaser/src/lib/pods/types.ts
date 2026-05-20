export interface Pod {
  id: string
  name: string
  invite_code: string
  archenemy_threshold: number
  max_players: number
  created_by: string
  created_at: string
  last_archenemy_user_id: string | null
}

export interface FriendRequest {
  id: string
  from_user_id: string
  to_user_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  profile?: {
    display_name: string
    avatar_url?: string | null
    friend_code?: string
  }
}

export interface Friend {
  user_id: string
  display_name: string
  avatar_url: string | null
  friend_code: string
  request_id: string
}

export interface PodMember {
  pod_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  profile?: {
    display_name: string
    avatar_url?: string | null
  }
}

export interface ConqueredPlane {
  id: string
  user_id: string
  pod_id: string
  plane_scryfall_id: string
  plane_name: string
  plane_image_uri: string
  conquered_at: string
  game_session_id: string | null
  conquered_from_user_id: string | null
  conquered_from_name?: string  // populated by join, not stored in DB
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  conquered_count: number
  is_archenemy: boolean
}
