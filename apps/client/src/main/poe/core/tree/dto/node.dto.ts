export interface PassiveNodeDto {
  id: number;
  name: string;
  type: 'notable' | 'small' | 'keystone' | 'mastery' | 'jewelSocket';
  stats: string[];
  isAllocated: boolean;
}

export interface ClusterJewelDto {
  socketNodeId: number;
  type: 'small' | 'medium' | 'large';
  passives: number[];
  notables: string[];
}
