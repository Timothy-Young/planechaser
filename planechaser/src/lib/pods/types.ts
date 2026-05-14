export interface Pod {
  id: string
  name: string
  invite_code: string
  archenemy_threshold: number
  created_by: string
  created_at: string
}

export interface PodMember {
  pod_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  profile?: {
    display_name: string
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
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  conquered_count: number
  is_archenemy: boolean
}
