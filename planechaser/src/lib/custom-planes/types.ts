export interface CustomPlane {
  id: string
  user_id: string
  name: string
  type_line: string
  oracle_text: string
  chaos_text: string
  flavor_text: string | null
  image_path: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface CustomPlaneInput {
  name: string
  type_line?: string
  oracle_text: string
  chaos_text: string
  flavor_text?: string
  image_path?: string | null
  is_public?: boolean
}
