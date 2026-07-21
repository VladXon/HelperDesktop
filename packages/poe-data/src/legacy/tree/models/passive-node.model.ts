import type { Modifier } from '../../items/modifier.model.js';

export type PassiveNodeType = 'notable' | 'small' | 'keystone' | 'mastery' | 'jewelSocket';

export interface PassiveNode {
  id: number;
  name: string;
  type: PassiveNodeType;
  stats: Modifier[];
  allocated: boolean;
}
