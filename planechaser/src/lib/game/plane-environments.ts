/**
 * Environment type categorizations for Planechase plane cards.
 * Used for ambient sound design — each plane maps to an environment
 * that determines the background audio loop.
 *
 * Source: Scryfall API (type:plane, game:paper, unique cards, 185 total)
 */

export type EnvironmentType =
  | 'gothic'
  | 'jungle'
  | 'wasteland'
  | 'city'
  | 'volcanic'
  | 'ethereal'
  | 'arctic'
  | 'forest'
  | 'underwater'
  | 'mechanical'
  | 'desert'
  | 'celestial'
  | 'swamp'
  | 'battlefield';

export const PLANE_ENVIRONMENTS: Record<string, EnvironmentType> = {
  // --- Dominaria ---
  'Academy at Tolaria West': 'ethereal',
  'Isle of Vesuva': 'underwater',
  'Krosa': 'forest',
  'Llanowar': 'forest',
  'New Argive': 'mechanical',
  'Otaria': 'battlefield',
  'Riptide Island': 'underwater',
  'Shiv': 'volcanic',
  'Talon Gates': 'ethereal',

  // --- Ravnica ---
  'Agyrem': 'celestial',
  'Grand Ossuary': 'gothic',
  'Izzet Steam Maze': 'mechanical',
  'Kilnspire District': 'volcanic',
  'Orzhova': 'gothic',
  'Prahv': 'city',
  'Selesnya Loft Gardens': 'forest',
  'Undercity Reaches': 'city',

  // --- Zendikar ---
  'Akoum': 'volcanic',
  'Hedron Fields of Agadeem': 'wasteland',
  'Murasa': 'jungle',
  'Tazeem': 'forest',

  // --- Alara ---
  'Bant': 'celestial',
  'Esper': 'mechanical',
  'Grixis': 'swamp',
  'Jund': 'volcanic',
  'Naya': 'jungle',

  // --- Innistrad ---
  'Gavony': 'gothic',
  'Kessig': 'gothic',
  'Nephalia': 'gothic',
  'Stensia': 'gothic',
  "Sorin's Remastered Manor": 'gothic',

  // --- Mirrodin ---
  'Glimmervoid Basin': 'mechanical',
  'Panopticon': 'mechanical',
  'Quicksilver Sea': 'mechanical',

  // --- New Phyrexia ---
  'Furnace Layer': 'volcanic',
  "Norn's Dominion": 'mechanical',
  "Norn's Seedcore": 'mechanical',

  // --- Kamigawa ---
  'Minamo': 'ethereal',
  'Orochi Colony': 'jungle',
  'Sokenzan': 'volcanic',
  'Takenuma': 'swamp',
  'Towashi': 'city',

  // --- Lorwyn / Shadowmoor ---
  'Glen Elendra': 'forest',
  'Goldmeadow': 'forest',
  "Raven's Run": 'gothic',
  'Velis Vel': 'volcanic',

  // --- Kaldheim ---
  'Immersturm': 'battlefield',
  'Littjara': 'arctic',
  'Skybreen': 'arctic',

  // --- Theros ---
  'Nyx': 'celestial',

  // --- Ixalan ---
  'Oteclán': 'jungle',
  "Raiders' Allegiance": 'underwater',

  // --- Ikoria ---
  'Ketria': 'jungle',

  // --- Eldraine ---
  'The Wilds': 'forest',

  // --- Amonkhet ---
  'Naktamun': 'desert',

  // --- Capenna ---
  'The Caldaia': 'city',

  // --- Arcavios ---
  'Strixhaven': 'city',

  // --- Bloomburrow ---
  'Welcome to Valley': 'forest',

  // --- Fiora ---
  'Paliano': 'city',

  // --- Thunder Junction ---
  'High Noon At Thunder Junction': 'desert',
  'Tarnation': 'desert',

  // --- Duskmourn ---
  'Pursued by Something': 'gothic',
  'No Way Out (Playtest)': 'gothic',

  // --- Other MTG Worlds ---
  'Aretopolis': 'city',             // Kephalai
  'Astral Arena': 'ethereal',       // Kolbahan
  'Bloodhill Bastion': 'battlefield', // Equilor
  'Celestine Reef': 'underwater',   // Luvion
  'Edge of Malacol': 'jungle',      // Belenon
  'Eloren Wilds': 'forest',         // Shandalar
  'Enigma Ridges': 'ethereal',      // Echoir
  'Event Horizon': 'ethereal',      // Blind Eternities
  'Feeding Grounds': 'jungle',      // Muraganda
  'Fields of Summer': 'celestial',  // Moag
  'Grove of the Dreampods': 'forest', // Fabacin
  'Horizon Boughs': 'forest',       // Pyrulea
  'Inys Haen': 'forest',            // Cridhe
  'Kharasha Foothills': 'battlefield', // Mongseng
  'Lair of the Ashen Idol': 'volcanic', // Azgol
  'Lethe Lake': 'ethereal',         // Arkhos
  'Megaflora Jungle': 'jungle',     // Gargantikar
  'Mirrored Depths': 'ethereal',    // Karsus
  'Mount Keralia': 'volcanic',      // Regatha
  'Naar Isle': 'volcanic',          // Wildfire
  'Onakke Catacomb': 'swamp',       // Shandalar
  'Pools of Becoming': 'ethereal',  // Bolas's Meditation Realm
  'Sanctum of Serra': 'celestial',  // Serra's Realm
  'Sea of Sand': 'desert',          // Rabiah
  'Stairs to Infinity': 'ethereal', // Xerex
  'Stronghold Furnace': 'volcanic', // Rath
  'Tember City': 'city',            // Kinshala
  'Ten Wizards Mountain': 'volcanic', // Shenmeng
  'The Aether Flues': 'ethereal',   // Iquatana
  'The Pit': 'swamp',               // The Abyss
  'The Western Cloud': 'desert',    // Gobakhan
  'The Zephyr Maze': 'ethereal',    // Kyneth
  'Trail of the Mage-Rings': 'ethereal', // Vryn
  'Truga Jungle': 'jungle',         // Ergamon
  'Turri Island': 'jungle',         // Ir
  'Unyaro': 'forest',               // Zhalfir
  "Valor's Reach": 'battlefield',   // Kylem
  'Windriddle Palaces': 'ethereal', // Belenon
  'Ghirapur': 'city',               // Avishkar
  'Ghirapur Grand Prix': 'city',    // Avishkar
  'Gardens of Tranquil Repose': 'swamp', // Necros
  'Shrinking Plane': 'ethereal',    // Foldaria
  'Multiversal High Council': 'celestial', // Universia Beyondia
  "New Player's Journey": 'forest', // Foundations

  // --- Secret Lair / Un-set / MagicCon promos ---
  'Artist Alley (Plane)': 'city',
  'Black Lotus Lounge': 'city',
  'Deceptive Divination': 'ethereal',
  'Fblthp: Completely, Utterly, Totally Lost': 'city',
  'Game Knights Live': 'battlefield',
  'Happy Yargle Day!': 'swamp',
  'Imaginary Friends (Plane)': 'ethereal',
  "Li'l Giri Saves the Day": 'forest',
  'Math is for Blockers (Plane)': 'ethereal',
  'Mycosynthwave': 'mechanical',
  'Pin Collector\'s Booth': 'city',
  'sAnS mERcY': 'wasteland',
  'The Command Zone': 'city',
  'The Pro Tour': 'battlefield',
  'We Hope You Like Squirrels': 'forest',
  'Finally! Left-Handed Magic Cards': 'ethereal',

  // --- Doctor Who / Universes Beyond (Earth + Sci-fi) ---
  "Amy's Home": 'city',
  'Antarctic Research Base': 'arctic',
  'Aplan Mortarium': 'gothic',          // Alfava Metraxis
  'Bad Wolf Bay': 'wasteland',
  'Besieged Viking Village': 'battlefield',
  'Bowie Base One': 'mechanical',       // Mars
  'City of the Daleks': 'mechanical',   // Skaro
  'Coal Hill School': 'city',
  'Dalek Intensive Care': 'mechanical', // The Dalek Asylum
  "Asmoranomardicadaistinaculdacar's Kitchen": 'volcanic', // Hell
  'Hotel of Fears': 'gothic',          // Spacecraft
  'Kerblam! Warehouse': 'mechanical',  // Kandoka
  'Lake Silencio': 'wasteland',
  'Mondassian Colony Ship': 'mechanical', // Spacecraft
  'Ood Sphere': 'ethereal',            // Horsehead Nebula
  'Pompeii': 'volcanic',
  'Prime Minister\'s Cabinet Room': 'city',
  'Singing Towers of Darillium': 'celestial', // Darillium
  'Spectrox Mines': 'volcanic',        // Androzani Minor
  'Stormcage Containment Facility': 'mechanical',
  'TARDIS Bay': 'mechanical',          // Gallifrey
  'The Cave of Skulls': 'wasteland',
  'The Cheetah Planet': 'wasteland',   // Outside Mutter's Spiral
  'The Moonbase': 'mechanical',        // Moon
  'The Pyramid of Mars': 'desert',     // Mars
  'Two Streams Facility': 'mechanical', // Apalapucia
  'UNIT Headquarters': 'city',
  'New New York': 'city',              // New Earth
  'North Pole Research Base': 'arctic',
  'Temple of Atropos': 'celestial',    // Time

  // --- Las Vegas / MagicCon Planes ---
  'Circus of the Sun': 'city',
  'Elvish Impersonation Contest': 'forest',
  "Jalira's Show": 'ethereal',
  "Preston's Stage": 'city',
  'Mojave Desert': 'desert',
  'The Sphere': 'city',

  // --- Chicago Planes ---
  'City Hall': 'city',
  'Shy Town': 'city',
  'Sky Deck': 'city',
  'The Bean': 'city',
  'The Windy City': 'city',

  // --- Amsterdam Planes ---
  'Bicycle Rack': 'city',
  'Stroopwafel Cafe': 'city',
  'Windmill Farm': 'forest',

  // --- Other Unique Planes ---
  'Clamilton Estate': 'underwater',    // Clamhattan
  'Cliffside Market': 'city',         // Mercadia

  // --- Missing "The" planes ---
  'The Dark Barony': 'gothic',         // Ulgrotha
  'The Dining Car': 'city',            // Muraganda (train setting)
  "The Doctor's Childhood Barn": 'wasteland', // Gallifrey
  "The Doctor's Tomb": 'gothic',       // Trenzalore
  'The Drum, Mining Facility': 'mechanical', // Spacecraft
  'The Eon Fog': 'ethereal',           // Equilor
  'The Fertile Lands of Saulvinia': 'jungle', // Saulvinia
  'The Food Court': 'city',            // MagicCon
  'The Fourth Sphere': 'mechanical',   // Phyrexia
  'The Golden City of Orazca': 'city', // Ixalan
  'The Great Aerie': 'celestial',      // Tarkir
  'The Great Forest': 'forest',        // Lorwyn
  'The Hippodrome': 'city',            // Segovia
  'The Lux Foundation Library': 'city', // Earth (Torchwood)
  'The Maelstrom': 'ethereal',         // Alara
  'The Matrix of Time': 'ethereal',    // Gallifrey
} as const;

export const AMBIENT_URLS: Record<EnvironmentType, string> = {
  gothic: 'https://cdn.freesound.org/previews/617/617747_2282212-lq.mp3',
  jungle: 'https://cdn.freesound.org/previews/749/749737_16219462-lq.mp3',
  wasteland: 'https://cdn.freesound.org/previews/567/567550_11664190-lq.mp3',
  city: 'https://cdn.freesound.org/previews/543/543510_1648170-lq.mp3',
  volcanic: 'https://cdn.freesound.org/previews/474/474852_9395330-lq.mp3',
  ethereal: 'https://cdn.freesound.org/previews/825/825435_7038073-lq.mp3',
  arctic: 'https://cdn.freesound.org/previews/608/608270_2282212-lq.mp3',
  forest: 'https://cdn.freesound.org/previews/800/800712_12846320-lq.mp3',
  underwater: 'https://cdn.freesound.org/previews/706/706096_9034501-lq.mp3',
  mechanical: 'https://cdn.freesound.org/previews/269/269597_4965320-lq.mp3',
  desert: 'https://cdn.freesound.org/previews/843/843326_1648170-lq.mp3',
  celestial: 'https://cdn.freesound.org/previews/744/744115_16085323-lq.mp3',
  swamp: 'https://cdn.freesound.org/previews/99/99193_1163166-lq.mp3',
  battlefield: 'https://cdn.freesound.org/previews/542/542827_3377875-lq.mp3',
};

export function getPlaneEnvironment(planeName: string): EnvironmentType {
  return PLANE_ENVIRONMENTS[planeName] ?? 'ethereal';
}
