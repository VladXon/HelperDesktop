export interface ParsedTreeDto {
  version: string;
  allocatedNodes: number[];
  masteryChoices: Record<number, string>;
  keystones: string[];
  ascendancyNodes: string[];
}
