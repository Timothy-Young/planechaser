import { createClient } from '@/lib/supabase/client'

const BUCKET = 'custom-plane-images'

export function getImageUrl(imagePath: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(imagePath)
  return data.publicUrl
}

export async function uploadPlaneImage(
  userId: string,
  file: File,
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const fileName = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) throw new Error(`Failed to upload image: ${error.message}`)
  return fileName
}

export async function deletePlaneImage(imagePath: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([imagePath])

  if (error) throw new Error(`Failed to delete image: ${error.message}`)
}
