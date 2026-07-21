import type { PassiveNodeDto, ClusterJewelDto } from './node.dto.js';

export interface ParsedTreeDto {
  version: string;
  nodes: PassiveNodeDto[];
  masteryChoices: Record<number, string>;
  keystones: string[];
  clusterJewels: ClusterJewelDto[];
  ascendancyNodes: { name: string; effects: string[] }[];
  ascendancyClassName: string;
}
