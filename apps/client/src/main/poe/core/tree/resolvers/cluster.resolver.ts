import type { ClusterJewelSummary } from '../models/passive-tree.model.js';
import type { PassiveNode } from '../models/passive-node.model.js';
import { resolveNode } from './node.resolver.js';

export function resolveClusterJewel(
  socketNodeId: number,
  type: 'small' | 'medium' | 'large',
  nodeDtos: PassiveNode[],
  notables: string[],
): ClusterJewelSummary {
  const nodes: PassiveNode[] = [];

  for (const node of nodeDtos) {
    nodes.push({
      id: node.id,
      name: node.name,
      type: node.type,
      stats: node.stats,
      allocated: node.allocated,
    });
  }

  return {
    socketNodeId,
    type,
    nodes,
    notables,
  };
}

export function resolveClusterJewels(
  clusters: { socketNodeId: number; type: 'small' | 'medium' | 'large'; nodes: PassiveNode[]; notables: string[] }[],
): ClusterJewelSummary[] {
  return clusters.map((c) => resolveClusterJewel(c.socketNodeId, c.type, c.nodes, c.notables));
}
