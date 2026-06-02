export interface RulesStep {
  text: string
}

export interface RulesSection {
  title: string
  icon: string
  intro: string
  steps: RulesStep[]
}

export const RULES_SECTIONS: RulesSection[] = [
  {
    title: 'Planechase Basics',
    icon: '🌍',
    intro: 'How the shared plane deck and die rolls work during a game.',
    steps: [
      { text: 'The game starts on a random plane from the deck. This plane\'s abilities affect all players equally.' },
      { text: 'On your turn, you may roll the planar die. The first roll each turn is free.' },
      { text: 'Each additional roll costs {1} more generic mana than the last (2nd roll = {1}, 3rd = {2}, etc.).' },
      { text: 'If you roll the Planeswalker symbol (⚔), the group planeswalks to the next plane in the deck.' },
      { text: 'If you roll Chaos (🌀), the current plane\'s chaos ability triggers.' },
      { text: 'Blank faces mean nothing happens — but you still paid the mana!' },
    ],
  },
  {
    title: 'The Planar Die',
    icon: '🎲',
    intro: 'Six faces, two outcomes, and an escalating mana cost.',
    steps: [
      { text: '1 face: Planeswalker symbol — triggers a planeswalk to the next plane.' },
      { text: '1 face: Chaos symbol — triggers the current plane\'s chaos ability.' },
      { text: '4 faces: Blank — nothing happens.' },
      { text: 'You can roll as many times per turn as you can afford. The first roll is free, then costs escalate.' },
      { text: 'PlaneChaser tracks roll costs automatically and shows you what each roll will cost.' },
    ],
  },
  {
    title: 'Phenomena',
    icon: '✨',
    intro: 'Special cards that trigger immediately and chain to the next plane.',
    steps: [
      { text: 'When you planeswalk into a Phenomenon, its ability triggers immediately.' },
      { text: 'After the ability resolves, you planeswalk again to the next card.' },
      { text: 'If you hit multiple Phenomena in a row, each one resolves before moving on.' },
      { text: 'PlaneChaser handles Phenomenon chaining automatically — just follow the prompts.' },
    ],
  },
  {
    title: 'Archenemy Mode',
    icon: '⚔️',
    intro: 'One dominant player faces the rest of the pod as a team.',
    steps: [
      { text: 'Each pod has a conquest threshold (configurable in pod settings). When a player crosses it, they become the Archenemy.' },
      { text: 'In Archenemy mode, the Archenemy plays against all other players working as a team.' },
      { text: 'The Archenemy gets a Scheme deck — powerful one-shot abilities drawn each turn.' },
      { text: 'If the team defeats the Archenemy, each team member can steal one of the Archenemy\'s conquered planes.' },
      { text: 'If the Archenemy wins, they remain dominant. The meta-game continues.' },
    ],
  },
  {
    title: 'Conquest System',
    icon: '👑',
    intro: 'Claim planes by winning games and build your collection over time.',
    steps: [
      { text: 'When a player wins a Commander game, they may claim the current plane as conquered.' },
      { text: 'Conquered planes appear in your profile collection and count toward pod leaderboards.' },
      { text: 'Each conquest records who you took it from (if anyone) and which pod it belongs to.' },
      { text: 'Conquered planes are removed from future game decks by default, making the pool smaller over time.' },
      { text: 'Earn achievements like "First Blood" (first conquest) and "Planar Dominion" (conquer 10+ planes).' },
    ],
  },
  {
    title: 'Pods & Playgroups',
    icon: '👥',
    intro: 'Group up with friends to share conquests and track leaderboards.',
    steps: [
      { text: 'Create a pod and invite friends using a shareable invite code.' },
      { text: 'Pod members share a conquest pool — conquests and leaderboards are tracked per-pod.' },
      { text: 'Start games directly from a pod with pre-selected members.' },
      { text: 'Pod owners can configure the Archenemy threshold, manage members, and regenerate invite codes.' },
      { text: 'You can belong to multiple pods — each one tracks its own conquest separately.' },
    ],
  },
  {
    title: 'Building Decks',
    icon: '📚',
    intro: 'Curate your plane and scheme decks for every session.',
    steps: [
      { text: 'Plane Decks: Choose which planes appear in your Planechase games. Use all 86+ or curate a smaller set.' },
      { text: 'Scheme Decks: Build decks for Archenemy mode with powerful scheme cards.' },
      { text: 'Decks are saved to your account and can be selected at game setup.' },
      { text: 'The "Random" option at setup shuffles all available planes without needing a saved deck.' },
      { text: 'Preset decks are available as starting points — one-click to start with a curated set.' },
    ],
  },
]
