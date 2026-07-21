import type { PassiveNode } from './passive-node.model.js';
import type { Modifier } from '../../items/modifier.model.js';

export interface KeystoneEffect {
  name: string;
  effects: string[];
  tags: string[];
}

export interface MasteryEffect {
  key: string;
  stat: string;
  value: number;
  type: 'flat' | 'increased' | 'more';
}

export interface AscendancyNode {
  name: string;
  effects: string[];
}

export interface ClusterJewelSummary {
  socketNodeId: number;
  type: 'small' | 'medium' | 'large';
  nodes: PassiveNode[];
  notables: string[];
}

export interface PassiveTree {
  version: string;
  nodes: PassiveNode[];
  keystones: KeystoneEffect[];
  masteries: Modifier[];
  ascendancy: AscendancyNode[];
  clusterJewels: ClusterJewelSummary[];
}
