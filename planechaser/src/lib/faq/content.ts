export interface FAQSection {
  title: string
  icon: string
  items: { question: string; answer: string }[]
}

export const FAQ_SECTIONS: FAQSection[] = [
  {
    title: 'Getting Started',
    icon: '🎲',
    items: [
      {
        question: 'What is Planechase?',
        answer: 'Planechase is a casual Magic: The Gathering format where players traverse the Blind Eternities, visiting different planes of the multiverse. Each plane has unique effects that modify gameplay. Players roll the planar die to trigger chaos effects or planeswalk to new planes.',
      },
      {
        question: 'How do I start a game?',
        answer: 'Tap "Start Playing" from the home screen. Choose your deck type (Random or Saved Deck), set the number of players, and tap "Start Game." If you\'re in a pod, you can also start from the pod page using "Start with Pod" to auto-populate players.',
      },
      {
        question: 'What\'s the difference between "Start with Pod" and "Play in this Pod"?',
        answer: '"Start with Pod" begins a new Planechase game session with your pod members pre-selected. "Play in this Pod" sets the pod as your active pod for conquest tracking, so any game you play will count toward that pod\'s leaderboard.',
      },
    ],
  },
  {
    title: 'Gameplay',
    icon: '⚔️',
    items: [
      {
        question: 'How does the planar die work?',
        answer: 'The planar die has 6 faces: 4 blank, 1 planeswalk (✦), and 1 chaos (🌀). Your first roll each turn is free. Each additional roll costs 1 more mana than the last (2nd roll = 1 mana, 3rd = 2 mana, etc.). The cost resets when the turn changes.',
      },
      {
        question: 'What happens on a Planeswalk roll?',
        answer: 'When you roll the planeswalk symbol (✦), you leave the current plane and travel to the next one in the deck. The current plane\'s effects end and the new plane\'s effects begin immediately.',
      },
      {
        question: 'What happens on a Chaos roll?',
        answer: 'When you roll chaos (🌀), the current plane\'s chaos ability triggers. Each plane has a unique chaos effect. Read the card text to see what happens. The chaos overlay shows you the effect.',
      },
      {
        question: 'When should I end my turn?',
        answer: 'Tap "Next Turn →" when you\'re done rolling the planar die for your turn. This passes control to the next player in turn order and resets the roll cost to 0.',
      },
      {
        question: 'What are Phenomena?',
        answer: 'Phenomena are special cards in the planar deck that trigger a one-time effect when you planeswalk to them, then immediately move you to the next plane. They don\'t stay in play like regular planes.',
      },
    ],
  },
  {
    title: 'Conquest & Pods',
    icon: '🏆',
    items: [
      {
        question: 'What is the Conquest system?',
        answer: 'PlaneChaser adds a persistent meta-game on top of Planechase. When your Commander game ends, the winner "conquers" whichever plane is currently active. Conquered planes are tracked on your profile and your pod\'s leaderboard.',
      },
      {
        question: 'What is a Pod?',
        answer: 'A pod is your regular playgroup. Create one, invite friends via invite code, and track your conquest standings together. When one player conquers enough planes (set by the archenemy threshold), they become the Archenemy.',
      },
      {
        question: 'What happens when someone becomes the Archenemy?',
        answer: 'When a player reaches the pod\'s archenemy threshold, the next game becomes an Archenemy showdown. The archenemy plays against the rest of the pod with a scheme deck, creating an asymmetric game experience.',
      },
    ],
  },
  {
    title: 'Game Controls',
    icon: '🎮',
    items: [
      {
        question: 'What do the Game Controls do?',
        answer: 'Expand the Game Controls toolbar during a game for advanced actions: Undo (revert last action), Shuffle (randomize remaining deck), Reset Rolls (set roll cost back to 0), Planeswalk (manually move to next plane), and Chaos (manually trigger the current plane\'s chaos effect).',
      },
      {
        question: 'Can I go back to a previous plane?',
        answer: 'Use the Undo button in the Game Controls toolbar to revert recent actions, including planeswalks. You can also tap plane names in the breadcrumb trail to preview visited planes (this doesn\'t navigate back, just shows the card).',
      },
    ],
  },
  {
    title: 'Decks',
    icon: '📚',
    items: [
      {
        question: 'What\'s the difference between Random and Saved Deck?',
        answer: 'Random mode pulls a set number of planes from the full catalog for a one-off game. Saved Deck mode uses a deck you\'ve built in the Deck Builder, letting you curate which planes you play with. You can exclude planes you\'ve already conquered.',
      },
      {
        question: 'How many planes should my deck have?',
        answer: 'The minimum is 10. For a typical 4-player game, 30-40 planes gives a good variety without the game dragging. The Random mode defaults to 40.',
      },
    ],
  },
]
