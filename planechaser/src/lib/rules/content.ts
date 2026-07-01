export interface RulesStep {
  text: string
}

export interface RulesSection {
  title: string
  icon: string
  intro: string
  steps: RulesStep[]
}

export const PLANECHASE_SECTIONS: RulesSection[] = [
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
      { text: 'Blank faces mean nothing happens, but you still paid the mana!' },
    ],
  },
  {
    title: 'The Planar Die',
    icon: '🎲',
    intro: 'Six faces, two outcomes, and an escalating mana cost.',
    steps: [
      { text: '1 face: Planeswalker symbol. Triggers a planeswalk to the next plane.' },
      { text: '1 face: Chaos symbol. Triggers the current plane\'s chaos ability.' },
      { text: '4 faces: Blank. Nothing happens.' },
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
      { text: 'PlaneChaser handles Phenomenon chaining automatically. Just follow the prompts.' },
    ],
  },
  {
    title: 'Spatial Merging (Two Planes)',
    icon: '🔀',
    intro: 'A rare phenomenon that puts two planes in play simultaneously.',
    steps: [
      { text: 'Spatial Merging is a special phenomenon card. When encountered, PlaneChaser reveals cards until it finds two plane cards.' },
      { text: 'Both planes become active at the same time. Their static abilities both apply to the game.' },
      { text: 'When you roll Chaos, both planes\' chaos abilities trigger one after the other.' },
      { text: 'When anyone planeswalks, you leave both planes and move to a single new one.' },
      { text: 'Both planes are displayed stacked on the game screen. Tap either one to zoom in.' },
    ],
  },
  {
    title: 'Deck Building Rules',
    icon: '📚',
    intro: 'Official Planechase deck construction rules, as used by PlaneChaser\'s shared planar deck.',
    steps: [
      { text: 'The shared planar deck must contain at least 40 cards, or at least 10 × the number of players — whichever is SMALLER (2 players → 20 cards; 4 players → 40 cards).' },
      { text: 'The shared deck cannot contain more phenomenon cards than 2 × the number of players.' },
      { text: 'No two plane or phenomenon cards in a planar deck may share a name.' },
      { text: 'In PlaneChaser, you choose which planes appear in your deck — use all 86+ available planes or curate a smaller set.' },
      { text: 'Decks are saved to your account and can be selected at game setup.' },
      { text: 'The "Random" option at setup shuffles all available planes without needing a saved deck.' },
      { text: 'Preset decks are available as starting points. One click to start with a curated set.' },
      { text: 'Some chaos effects reveal or rearrange the top cards of the planar deck. When this happens, you can choose to put them on top or on the bottom.' },
    ],
  },
  {
    title: 'Individual Deck Planechase — Coming Soon',
    icon: '🚧',
    intro: 'A planned future variant where each player builds and plays their own plane deck.',
    steps: [
      { text: 'Individual Deck Planechase (each player building and drawing from their own smaller plane deck) is a planned future variant. PlaneChaser currently supports the shared-deck format described above.' },
    ],
  },
]

export const ARCHENEMY_SECTIONS: RulesSection[] = [
  {
    title: 'Archenemy Mode',
    icon: '⚔️',
    intro: 'One dominant player faces the rest of the pod as a team, using the official Archenemy format.',
    steps: [
      { text: 'Each pod has a conquest threshold (configurable in pod settings). When a player crosses it, they become the Archenemy.' },
      { text: 'Archenemy mode pits 1 Archenemy against a team of the other players (3+ players total).' },
      { text: 'Team members use standard 60+ card decks and start at 20 life each, with separate life totals.' },
      { text: 'The Archenemy uses a standard 60+ card deck plus a scheme deck of 20+ oversized scheme cards (max 2 copies of any one scheme).' },
      { text: 'The Archenemy starts at 40 life and always goes first — and still draws a card on their first draw step.' },
      { text: 'At the start of the Archenemy\'s first main phase each turn, they reveal the top card of their scheme deck and set it in motion.' },
      { text: 'One-shot schemes trigger immediately, then go to the bottom of the scheme deck. Ongoing schemes stay face-up and active until an ability says to "abandon" them, then they go to the bottom.' },
      { text: 'The team takes a simultaneous turn (like Two-Headed Giant), sharing beginning, main, and combat phases.' },
      { text: 'The Archenemy declares attackers and chooses which player or planeswalker each creature attacks; the team declares blockers together and may block for allies.' },
      { text: 'A team member reduced to 0 life is removed from the game. Play continues until the Archenemy loses, or all team members have lost.' },
      { text: 'If the team defeats the Archenemy, each team member can steal one of the Archenemy\'s conquered planes.' },
      { text: 'If the Archenemy wins, they remain dominant and the meta-game continues.' },
    ],
  },
  {
    title: 'Supervillain Rumble Variant',
    icon: '🦹',
    intro: 'A free-for-all variant where every player is their own Archenemy.',
    steps: [
      { text: 'Supervillain Rumble is played with 3+ players in a free-for-all — every player is an archenemy with their own scheme deck.' },
      { text: 'Each player starts at 40 life.' },
      { text: 'The starting player is determined randomly.' },
      { text: 'At the start of each player\'s first main phase, that player sets a scheme in motion from their own scheme deck.' },
    ],
  },
]

export const HUB_SECTIONS: RulesSection[] = [
  {
    title: 'Conquest System',
    icon: '👑',
    intro: 'Claim planes by winning games and build your collection over time.',
    steps: [
      { text: 'When a player wins a Commander game, they may claim the current plane as conquered.' },
      { text: 'Conquered planes appear in your profile collection and count toward pod leaderboards.' },
      { text: 'Each conquest records who you took it from (if anyone) and which pod it belongs to.' },
      { text: 'Conquered planes are removed from future game decks by default, making the pool smaller over time.' },
      { text: 'Earn conquest achievements like First Conquest (your first plane), Conqueror (5 planes), and Planar Dominion (conquer all 185).' },
    ],
  },
  {
    title: 'Pods & Playgroups',
    icon: '👥',
    intro: 'Group up with friends to share conquests and track leaderboards.',
    steps: [
      { text: 'Create a pod and invite friends using a shareable invite code.' },
      { text: 'Pod members share a conquest pool. Conquests and leaderboards are tracked per-pod.' },
      { text: 'Start games directly from a pod with pre-selected members.' },
      { text: 'Pod owners can configure the Archenemy threshold, manage members, and regenerate invite codes.' },
      { text: 'You can belong to multiple pods. Each one tracks its own conquest separately.' },
    ],
  },
]
