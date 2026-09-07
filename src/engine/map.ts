/**
 * The agent relationship map. Two agents are related when they share tools; the more tools they
 * share, the stronger the edge. This produces the nodes and edges the Agent Map view renders
 * (React Flow), clustered implicitly by capability overlap. Deterministic and derived from the
 * fleet.
 */

import type { AgentRecord } from "./types";

export interface MapNode {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly icon: string;
}

export interface MapEdge {
  readonly from: string;
  readonly to: string;
  /** Number of shared tools - the edge weight. */
  readonly weight: number;
  readonly sharedTools: readonly string[];
}

export interface AgentMap {
  readonly nodes: readonly MapNode[];
  readonly edges: readonly MapEdge[];
}

/** Build the relationship map. An edge is added when two agents share >= `minShared` tools. */
export function buildMap(fleet: readonly AgentRecord[], minShared = 1): AgentMap {
  const nodes: MapNode[] = fleet.map((r) => ({ id: r.agent.id, name: r.agent.name, status: r.agent.status, icon: r.agent.icon }));

  const edges: MapEdge[] = [];
  for (let i = 0; i < fleet.length; i++) {
    for (let j = i + 1; j < fleet.length; j++) {
      const a = fleet[i]!;
      const b = fleet[j]!;
      const aTools = new Set(a.agent.tools);
      const shared = b.agent.tools.filter((t) => aTools.has(t));
      if (shared.length >= minShared) {
        edges.push({ from: a.agent.id, to: b.agent.id, weight: shared.length, sharedTools: shared });
      }
    }
  }

  return { nodes, edges };
}
