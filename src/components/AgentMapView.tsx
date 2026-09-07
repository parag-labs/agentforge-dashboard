"use client";

import { useMemo } from "react";
import { ReactFlow, Background, Controls, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildMap, type AgentRecord } from "@/engine";

/** The agent relationship map: nodes are agents, edges are shared tools. */
export function AgentMapView({ fleet, onSelect }: { fleet: readonly AgentRecord[]; onSelect: (id: string) => void }) {
  const { nodes, edges } = useMemo(() => {
    const map = buildMap(fleet);
    // Arrange nodes on a circle for a clean, readable layout.
    const n = map.nodes.length;
    const R = Math.max(200, n * 34);
    const rfNodes: Node[] = map.nodes.map((node, i) => {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      return {
        id: node.id,
        position: { x: 300 + Math.cos(a) * R, y: 300 + Math.sin(a) * R },
        data: { label: `${node.icon}  ${node.name}` },
        className: `st-${node.status}`,
      };
    });
    const rfEdges: Edge[] = map.edges.map((e, i) => ({
      id: `e${i}`,
      source: e.from,
      target: e.to,
      label: e.weight > 1 ? `${e.weight} tools` : e.sharedTools[0],
      style: { strokeWidth: Math.min(4, e.weight) },
    }));
    return { nodes: rfNodes, edges: rfEdges };
  }, [fleet]);

  return (
    <div style={{ height: 560 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => onSelect(node.id)}
        nodesDraggable
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
