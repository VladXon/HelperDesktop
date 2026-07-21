export interface GggCharacter {
  name: string;
  league: string;
  class: string;
  level: number;
}

export interface GggCharacterDetail {
  character: {
    name: string;
    league: string;
    classId: number;
    ascendancyClass: number;
    class: string;
    level: number;
    experience: number;
  };
  items: Array<{
    id: string;
    name: string;
    typeLine: string;
    inventoryId: string;
    frameType: number;
    icon?: string;
    socketedItems?: Array<{
      id: string;
      typeLine: string;
      support?: boolean;
      properties?: Array<{ name: string; values: Array<[string, number]>; displayMode: number; type: number }>;
      requirements?: Array<{ name: string; values: Array<[string, number]>; displayMode: number }>;
      explicitMods?: string[];
      frameType: number;
      socket?: number;
    }>;
    properties?: Array<{ name: string; values: Array<[string, number]>; displayMode: number; type: number }>;
    requirements?: Array<{ name: string; values: Array<[string, number]>; displayMode: number }>;
    explicitMods?: string[];
    implicitMods?: string[];
    craftedMods?: string[];
    enchantMods?: string[];
    sockets?: Array<{ group: number; attr: string; sColour: string }>;
    socket?: number;
  }>;
  jewels?: Array<unknown>;
}

export interface PoeDataProvider {
  getAccountName(poesessid: string): Promise<string>;
  getCharacters(poesessid: string): Promise<GggCharacter[]>;
  getCharacterDetail(poesessid: string, characterName: string): Promise<GggCharacterDetail>;
}
