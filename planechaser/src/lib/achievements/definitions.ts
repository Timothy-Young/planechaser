export interface AchievementDef {
  key: string
  name: string
  description: string
  icon: string
  category: 'planes' | 'games' | 'dice' | 'conquest' | 'archenemy' | 'special'
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Plane visit milestones
  { key: 'first_steps', name: 'First Steps', description: 'Visit your first plane', icon: '👣', category: 'planes' },
  { key: 'wanderer', name: 'Wanderer', description: 'Visit 10 planes across all games', icon: '🧭', category: 'planes' },
  { key: 'planeswalker', name: 'Planeswalker', description: 'Visit 50 planes across all games', icon: '✨', category: 'planes' },
  { key: 'multiverse_tourist', name: 'Multiverse Tourist', description: 'Visit 100 planes across all games', icon: '🌌', category: 'planes' },

  // Game milestones
  { key: 'rookie', name: 'Rookie', description: 'Play your first game', icon: '🎮', category: 'games' },
  { key: 'veteran', name: 'Veteran', description: 'Play 10 games', icon: '⚔️', category: 'games' },
  { key: 'commander', name: 'Commander', description: 'Play 25 games', icon: '🎖️', category: 'games' },
  { key: 'legendary', name: 'Legendary', description: 'Play 50 games', icon: '👑', category: 'games' },

  // Die roll milestones
  { key: 'lucky_roll', name: 'Lucky Roll', description: 'Roll the planar die 10 times', icon: '🎲', category: 'dice' },
  { key: 'dice_master', name: 'Dice Master', description: 'Roll the planar die 100 times', icon: '🎯', category: 'dice' },
  { key: 'chaos_agent', name: 'Chaos Agent', description: 'Trigger chaos 10 times', icon: '🌀', category: 'dice' },
  { key: 'planeswalk_pro', name: 'Planeswalk Pro', description: 'Roll planeswalk 10 times', icon: '🚀', category: 'dice' },

  // Conquest milestones
  { key: 'first_conquest', name: 'First Conquest', description: 'Conquer your first plane', icon: '🏴', category: 'conquest' },
  { key: 'conqueror', name: 'Conqueror', description: 'Conquer 5 planes', icon: '⚡', category: 'conquest' },
  { key: 'dominator', name: 'Dominator', description: 'Conquer 15 planes', icon: '🔥', category: 'conquest' },
  { key: 'overlord', name: 'Overlord', description: 'Conquer 25 planes', icon: '💀', category: 'conquest' },

  // Archenemy milestones
  { key: 'villain_origin', name: 'Villain Origin', description: 'Play your first Archenemy game', icon: '😈', category: 'archenemy' },
  { key: 'supervillain', name: 'Supervillain', description: 'Play 5 Archenemy games', icon: '🦹', category: 'archenemy' },

  // Special achievements
  { key: 'full_house', name: 'Full House', description: 'Play a game with 5+ players', icon: '🃏', category: 'special' },
  { key: 'marathon', name: 'Marathon', description: 'Visit 20+ planes in a single game', icon: '🏃', category: 'special' },
  { key: 'speed_run', name: 'Speed Run', description: 'Finish a game in under 5 rolls', icon: '⏱️', category: 'special' },
  { key: 'ten_streak', name: 'Rolling Hot', description: 'Roll the die 10+ times in one game', icon: '🔟', category: 'special' },
]

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.key, a]))
