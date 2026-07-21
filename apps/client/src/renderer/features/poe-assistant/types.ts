export interface CurrencyInfo {
  id: string;
  name: string;
  tradeId: string;
  icon: string;
}

export interface ExchangeListing {
  price: number;
  currency: string;
  amount: number;
  accountName: string;
}

export interface ExchangeRateResult {
  listings: ExchangeListing[];
  total: number;
}

export interface ItemSearchResult {
  id: string;
  items: unknown[];
  total: number;
}

export interface SessionStatus {
  configured: boolean;
  valid: boolean;
  accountName: string | null;
}

export const TOP_CURRENCIES: CurrencyInfo[] = [
  { id: 'divine', name: 'Divine Orb', tradeId: 'divine', icon: 'CurrencyDivine' },
  { id: 'chaos', name: 'Chaos Orb', tradeId: 'chaos', icon: 'CurrencyRerollRare' },
  { id: 'exalted', name: 'Exalted Orb', tradeId: 'exalted', icon: 'CurrencyAddModToRare' },
  { id: 'mirror', name: 'Mirror of Kalandra', tradeId: 'mirror', icon: 'CurrencyDuplicate' },
  { id: 'annul', name: 'Orb of Annulment', tradeId: 'annul', icon: 'CurrencyRemoveMod' },
  { id: 'ancient', name: 'Ancient Orb', tradeId: 'ancient', icon: 'CurrencyConvertToNormal' },
  { id: 'vaal', name: 'Vaal Orb', tradeId: 'vaal', icon: 'CurrencyVaal' },
  { id: 'regal', name: 'Regal Orb', tradeId: 'regal', icon: 'CurrencyUpgradeMagicToRare' },
  { id: 'gemcutter', name: 'Gemcutter\'s Prism', tradeId: 'gemcutter', icon: 'CurrencyGemQuality' },
  { id: 'blessing', name: 'Blessed Orb', tradeId: 'blessing', icon: 'CurrencyImplicitMod' },
  { id: 'cartographer', name: 'Cartographer\'s Chisel', tradeId: 'cartographer', icon: 'CurrencyMapQuality' },
  { id: 'fusing', name: 'Orb of Fusing', tradeId: 'fusing', icon: 'CurrencyConvertToLinks' },
  { id: 'alchemy', name: 'Orb of Alchemy', tradeId: 'alchemy', icon: 'CurrencyUpgradeToRare' },
  { id: 'alteration', name: 'Orb of Alteration', tradeId: 'alteration', icon: 'CurrencyConvertToMagic' },
  { id: 'chromatic', name: 'Chromatic Orb', tradeId: 'chromatic', icon: 'CurrencyRerollSocketColours' },
  { id: 'jeweller', name: 'Jeweller\'s Orb', tradeId: 'jeweller', icon: 'CurrencyRerollSocketNumbers' },
  { id: 'scouring', name: 'Orb of Scouring', tradeId: 'scouring', icon: 'CurrencyConvertToNormal' },
  { id: 'regret', name: 'Orb of Regret', tradeId: 'regret', icon: 'CurrencyPassiveSkillRefund' },
  { id: 'chance', name: 'Orb of Chance', tradeId: 'chance', icon: 'CurrencyUpgradeRandomly' },
  { id: 'glassblower', name: 'Glassblower\'s Bauble', tradeId: 'glassblower', icon: 'CurrencyFlaskQuality' },
];

export const ITEM_CATEGORIES = [
  { type: 'Currency', label: 'Currency' },
  { type: 'Fragment', label: 'Fragments' },
  { type: 'Scarab', label: 'Scarabs' },
  { type: 'DivinationCard', label: 'Divination Cards' },
  { type: 'Essence', label: 'Essences' },
  { type: 'UniqueMap', label: 'Unique Maps' },
  { type: 'UniqueWeapon', label: 'Unique Weapons' },
  { type: 'UniqueArmour', label: 'Unique Armours' },
  { type: 'UniqueAccessory', label: 'Unique Accessories' },
  { type: 'UniqueFlask', label: 'Unique Flasks' },
  { type: 'UniqueJewel', label: 'Unique Jewels' },
  { type: 'SkillGem', label: 'Skill Gems' },
  { type: 'ClusterJewel', label: 'Cluster Jewels' },
  { type: 'Map', label: 'Maps' },
  { type: 'Beast', label: 'Beasts' },
  { type: 'Fossil', label: 'Fossils' },
  { type: 'Resonator', label: 'Resonators' },
  { type: 'Oil', label: 'Oils' },
  { type: 'Incubator', label: 'Incubators' },
  { type: 'DeliriumOrb', label: 'Delirium Orbs' },
  { type: 'Invitation', label: 'Invitations' },
  { type: 'Memory', label: 'Memories' },
] as const;
