import type { GggCharacterDetail } from '../../ggg-client.js';

export const DEADEYE_RANGER: GggCharacterDetail = {
  character: {
    name: 'VladSpeedRunner',
    league: 'Settlers',
    classId: 2,
    ascendancyClass: 2,
    class: 'Ranger',
    level: 94,
    experience: 4250000000,
  },
  items: [
    {
      id: 'weapon-1',
      name: '',
      typeLine: 'Spine Bow',
      inventoryId: 'Weapon',
      frameType: 2,
      sockets: [
        { group: 0, attr: 'G', sColour: 'G' },
        { group: 0, attr: 'G', sColour: 'G' },
        { group: 0, attr: 'G', sColour: 'G' },
        { group: 0, attr: 'R', sColour: 'R' },
        { group: 0, attr: 'R', sColour: 'R' },
        { group: 0, attr: 'R', sColour: 'R' },
      ],
      socketedItems: [
        {
          id: 'gem-tornado-shot',
          typeLine: 'Tornado Shot',
          frameType: 4,
          properties: [
            { name: 'Level', values: [['21', 0]], displayMode: 0, type: 0 },
            { name: 'Quality', values: [['+23%', 1]], displayMode: 0, type: 0 },
          ],
          socket: 0,
        },
        {
          id: 'gem-gmp',
          typeLine: 'Greater Multiple Projectiles Support',
          frameType: 4,
          support: true,
          properties: [
            { name: 'Level', values: [['21', 0]], displayMode: 0, type: 0 },
            { name: 'Quality', values: [['+20%', 1]], displayMode: 0, type: 0 },
          ],
          socket: 1,
        },
        {
          id: 'gem-aw-ele-dmg',
          typeLine: 'Awakened Elemental Damage with Attacks Support',
          frameType: 4,
          support: true,
          properties: [
            { name: 'Level', values: [['5', 0]], displayMode: 0, type: 0 },
            { name: 'Quality', values: [['+10%', 1]], displayMode: 0, type: 0 },
          ],
          socket: 2,
        },
        {
          id: 'gem-inspiration',
          typeLine: 'Inspiration Support',
          frameType: 4,
          support: true,
          properties: [
            { name: 'Level', values: [['21', 0]], displayMode: 0, type: 0 },
            { name: 'Quality', values: [['+20%', 1]], displayMode: 0, type: 0 },
          ],
          socket: 3,
        },
        {
          id: 'gem-trinity',
          typeLine: 'Trinity Support',
          frameType: 4,
          support: true,
          properties: [
            { name: 'Level', values: [['20', 0]], displayMode: 0, type: 0 },
            { name: 'Quality', values: [['0%', 0]], displayMode: 0, type: 0 },
          ],
          socket: 4,
        },
        {
          id: 'gem-mirage-archer',
          typeLine: 'Mirage Archer Support',
          frameType: 4,
          support: true,
          properties: [
            { name: 'Level', values: [['21', 0]], displayMode: 0, type: 0 },
            { name: 'Quality', values: [['+20%', 1]], displayMode: 0, type: 0 },
          ],
          socket: 5,
        },
      ],
      explicitMods: [
        'Adds 45 to 89 Fire Damage',
        'Adds 12 to 24 Cold Damage',
        '23% increased Attack Speed',
        'Bow Attacks fire an additional Arrow',
        'Gain 15% of Physical Damage as Extra Fire Damage',
      ],
      properties: [
        { name: 'Bow', values: [['', 0]], displayMode: 0, type: 0 },
        { name: 'Physical Damage', values: [['90-180', 1]], displayMode: 0, type: 0 },
        { name: 'Elemental Damage', values: [['57-113', 1]], displayMode: 0, type: 0 },
        { name: 'Critical Strike Chance', values: [['6.5%', 1]], displayMode: 0, type: 0 },
        { name: 'Attacks per Second', values: [['1.65', 1]], displayMode: 0, type: 0 },
      ],
    },
    {
      id: 'body-armour-1',
      name: 'Hyrri\'s Ire',
      typeLine: 'Zodiac Leather',
      inventoryId: 'BodyArmour',
      frameType: 3,
      sockets: [
        { group: 0, attr: 'G', sColour: 'G' },
        { group: 0, attr: 'G', sColour: 'G' },
        { group: 0, attr: 'G', sColour: 'G' },
        { group: 0, attr: 'G', sColour: 'G' },
        { group: 0, attr: 'G', sColour: 'G' },
      ],
      socketedItems: [
        {
          id: 'gem-grace',
          typeLine: 'Grace',
          frameType: 4,
          properties: [
            { name: 'Level', values: [['21', 0]], displayMode: 0, type: 0 },
            { name: 'Quality', values: [['+23%', 1]], displayMode: 0, type: 0 },
          ],
          socket: 0,
        },
      ],
      explicitMods: [
        'Socketed Gems are Supported by Level 25 Ice Bite',
        'Adds 35 to 65 Cold Damage to Attacks',
        '+150 Dexterity',
        '25% increased Dexterity',
      ],
      implicitMods: ['+30 to Dexterity'],
      properties: [
        { name: 'Evasion Rating', values: [['1892', 1]], displayMode: 0, type: 17 },
        { name: 'Quality', values: [['+20%', 1]], displayMode: 0, type: 0 },
      ],
    },
    {
      id: 'ring-1',
      name: 'Berek\'s Respite',
      typeLine: 'Two-Stone Ring',
      inventoryId: 'Ring',
      frameType: 3,
      explicitMods: [
        '+20% to Fire and Lightning Resistances',
        'Adds 15 to 25 Fire Damage to Attacks',
        '+30 to maximum Life',
      ],
      implicitMods: ['+14% to Fire and Lightning Resistances'],
      properties: [],
      sockets: [],
    },
    {
      id: 'ring-2',
      name: 'Taming',
      typeLine: 'Prismatic Ring',
      inventoryId: 'Ring2',
      frameType: 3,
      explicitMods: [
        '30% increased Elemental Damage',
        '10% chance to Freeze, Shock and Ignite',
        '30% increased Elemental Damage with Attack Skills',
      ],
      implicitMods: ['+12% to all Elemental Resistances'],
      properties: [],
      sockets: [],
    },
    {
      id: 'amulet-1',
      name: '',
      typeLine: 'Onyx Amulet',
      inventoryId: 'Amulet',
      frameType: 2,
      explicitMods: [
        '+45 to maximum Life',
        'Adds 10 to 20 Fire Damage to Attacks',
        '15% increased Global Critical Strike Chance',
        '+40% to Cold Resistance',
      ],
      implicitMods: ['+18 to all Attributes'],
      properties: [],
      sockets: [],
    },
    {
      id: 'gloves-1',
      name: '',
      typeLine: 'Gripped Gloves',
      inventoryId: 'Gloves',
      frameType: 2,
      sockets: [
        { group: 0, attr: 'G', sColour: 'G' },
        { group: 0, attr: 'G', sColour: 'G' },
        { group: 0, attr: 'R', sColour: 'R' },
      ],
      socketedItems: [
        {
          id: 'gem-steelskin',
          typeLine: 'Steelskin',
          frameType: 4,
          properties: [
            { name: 'Level', values: [['16', 0]], displayMode: 0, type: 0 },
            { name: 'Quality', values: [['+20%', 1]], displayMode: 0, type: 0 },
          ],
          socket: 0,
        },
        {
          id: 'gem-cwdt',
          typeLine: 'Cast when Damage Taken Support',
          frameType: 4,
          support: true,
          properties: [
            { name: 'Level', values: [['13', 0]], displayMode: 0, type: 0 },
            { name: 'Quality', values: [['0%', 0]], displayMode: 0, type: 0 },
          ],
          socket: 1,
        },
      ],
      explicitMods: [
        '+75 to maximum Life',
        '25% increased Evasion Rating',
        '+40% to Fire Resistance',
        '12% increased Attack Speed',
      ],
      properties: [
        { name: 'Evasion Rating', values: [['245', 1]], displayMode: 0, type: 17 },
      ],
    },
    {
      id: 'boots-1',
      name: '',
      typeLine: 'Two-Toned Boots',
      inventoryId: 'Boots',
      frameType: 2,
      sockets: [
        { group: 0, attr: 'G', sColour: 'G' },
        { group: 0, attr: 'G', sColour: 'G' },
        { group: 0, attr: 'R', sColour: 'R' },
      ],
      socketedItems: [
        {
          id: 'gem-hatred',
          typeLine: 'Hatred',
          frameType: 4,
          properties: [
            { name: 'Level', values: [['21', 0]], displayMode: 0, type: 0 },
          ],
          socket: 0,
        },
      ],
      explicitMods: [
        '+70 to maximum Life',
        '30% increased Movement Speed',
        '+35% to Lightning Resistance',
        '+35% to Cold Resistance',
      ],
      properties: [
        { name: 'Evasion Rating', values: [['189', 1]], displayMode: 0, type: 17 },
        { name: 'Energy Shield', values: [['42', 1]], displayMode: 0, type: 18 },
      ],
    },
    {
      id: 'helmet-1',
      name: '',
      typeLine: 'Lion Pelt',
      inventoryId: 'Helm',
      frameType: 2,
      sockets: [
        { group: 0, attr: 'G', sColour: 'G' },
        { group: 0, attr: 'G', sColour: 'G' },
        { group: 0, attr: 'G', sColour: 'G' },
      ],
      socketedItems: [
        {
          id: 'gem-anger',
          typeLine: 'Anger',
          frameType: 4,
          properties: [
            { name: 'Level', values: [['21', 0]], displayMode: 0, type: 0 },
          ],
          socket: 0,
        },
      ],
      explicitMods: [
        '+90 to maximum Life',
        '+45% to Fire Resistance',
        'Nearby Enemies have -9% to Fire Resistance',
      ],
      properties: [
        { name: 'Evasion Rating', values: [['512', 1]], displayMode: 0, type: 17 },
      ],
    },
    {
      id: 'flask-1',
      name: 'Divine Life Flask',
      typeLine: 'Divine Life Flask',
      inventoryId: 'Flask',
      frameType: 0,
      explicitMods: ['50% increased Amount Recovered', 'Instant Recovery'],
      properties: [
        { name: 'Recovers 2400 Life over 3.5 seconds', values: [['', 0]], displayMode: 0, type: 0 },
      ],
      sockets: [],
    },
  ],
};

export const EMPTY_CHARACTER: GggCharacterDetail = {
  character: {
    name: 'FreshStart',
    league: 'Standard',
    classId: 1,
    ascendancyClass: 0,
    class: 'Marauder',
    level: 2,
    experience: 500,
  },
  items: [],
};

export const MINIMAL_CHARACTER: GggCharacterDetail = {
  character: {
    name: 'MinimalTest',
    league: 'Hardcore',
    classId: 3,
    ascendancyClass: 0,
    class: 'Witch',
    level: 50,
    experience: 150000000,
  },
  items: [
    {
      id: 'staff-1',
      name: '',
      typeLine: 'Primitive Staff',
      inventoryId: 'Weapon',
      frameType: 0,
      sockets: [],
      explicitMods: [],
      properties: [],
    },
  ],
};

export const CORRUPTED_ITEM: GggCharacterDetail = {
  character: {
    name: 'CorruptedTest',
    league: 'Settlers',
    classId: 4,
    ascendancyClass: 1,
    class: 'Duelist',
    level: 75,
    experience: 500000000,
  },
  items: [
    {
      id: 'corrupted-chest',
      name: 'Tabula Rasa',
      typeLine: 'Simple Robe',
      inventoryId: 'BodyArmour',
      frameType: 3,
      sockets: [
        { group: 0, attr: 'W', sColour: 'W' },
        { group: 0, attr: 'W', sColour: 'W' },
        { group: 0, attr: 'W', sColour: 'W' },
        { group: 0, attr: 'W', sColour: 'W' },
        { group: 0, attr: 'W', sColour: 'W' },
        { group: 0, attr: 'W', sColour: 'W' },
      ],
      explicitMods: ['Item has no level requirement and Energy Shield'],
      implicitMods: ['Corrupted'],
      properties: [],
    },
  ],
};
