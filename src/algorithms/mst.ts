/**
 * Minimum Spanning Tree (MST) algorithm for road network generation.
 * Uses Kruskal's algorithm to find the minimum cost tree connecting all nodes.
 */

import { POINode, weightedDistanceBetweenPOIs } from './poi.js';

/**
 * Edge in the graph.
 */
export interface GraphEdge {
  /** Source node index */
  from: number;
  /** Target node index */
  to: number;
  /** Edge weight (distance) */
  weight: number;
}

/**
 * Graph structure for MST calculation.
 */
export interface Graph {
  /** Number of nodes */
  nodes: number;
  /** List of edges */
  edges: GraphEdge[];
}

/**
 * Creates a graph from POI nodes.
 * Calculates all pairwise distances as edge weights.
 *
 * @param pois - Array of POI nodes
 * @param useLevelPenalty - Whether to apply level difference penalty (default: true)
 * @returns Graph structure
 */
export function createGraphFromPOIs(pois: POINode[], useLevelPenalty: boolean = true): Graph {
  const edges: GraphEdge[] = [];

  for (let i = 0; i < pois.length; i++) {
    for (let j = i + 1; j < pois.length; j++) {
      const weight = useLevelPenalty
        ? weightedDistanceBetweenPOIs(pois[i], pois[j])
        : weightedDistanceBetweenPOIs(pois[i], pois[j], 0);

      edges.push({
        from: i,
        to: j,
        weight,
      });
    }
  }

  return {
    nodes: pois.length,
    edges,
  };
}

/**
 * Union-Find data structure for Kruskal's algorithm.
 */
class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }

  union(x: number, y: number): boolean {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) {
      return false; // Already in same set
    }

    // Union by rank
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }

    return true;
  }
}

/**
 * Calculates Minimum Spanning Tree using Kruskal's algorithm.
 *
 * @param graph - Graph structure
 * @returns Array of edges forming the MST
 */
export function calculateMST(graph: Graph): GraphEdge[] {
  // Sort edges by weight
  const sortedEdges = [...graph.edges].sort((a, b) => a.weight - b.weight);

  const mst: GraphEdge[] = [];
  const uf = new UnionFind(graph.nodes);

  for (const edge of sortedEdges) {
    if (uf.union(edge.from, edge.to)) {
      mst.push(edge);
      // MST has n-1 edges for n nodes
      if (mst.length === graph.nodes - 1) {
        break;
      }
    }
  }

  return mst;
}

/**
 * Generates MST road graph from POI nodes.
 *
 * @param pois - Array of POI nodes
 * @param useLevelPenalty - Whether to apply level difference penalty (default: true)
 * @returns Array of edges representing roads to build
 */
export function generateMSTRoadGraph(
  pois: POINode[],
  useLevelPenalty: boolean = true
): GraphEdge[] {
  if (pois.length < 2) {
    return [];
  }

  const graph = createGraphFromPOIs(pois, useLevelPenalty);
  return calculateMST(graph);
}

/**
 * Adds extra edges to MST for loops and alternate routes.
 * Selects edges with lowest weight that don't create cycles.
 *
 * @param graph - Full graph structure
 * @param mst - Existing MST edges
 * @param maxExtraEdges - Maximum number of extra edges to add (default: 3)
 * @returns Additional edges to add
 */
export function addExtraEdgesForLoops(
  graph: Graph,
  mst: GraphEdge[],
  maxExtraEdges: number = 3
): GraphEdge[] {
  const extraEdges: GraphEdge[] = [];
  const mstSet = new Set(mst.map((e) => `${e.from}-${e.to}`));

  // Sort all edges by weight
  const sortedEdges = [...graph.edges]
    .filter((e) => {
      const key1 = `${e.from}-${e.to}`;
      const key2 = `${e.to}-${e.from}`;
      return !mstSet.has(key1) && !mstSet.has(key2);
    })
    .sort((a, b) => a.weight - b.weight);

  // Use Union-Find to check for cycles
  const uf = new UnionFind(graph.nodes);
  // Add existing MST edges to Union-Find
  for (const edge of mst) {
    uf.union(edge.from, edge.to);
  }

  // Add extra edges that don't create cycles
  for (const edge of sortedEdges) {
    if (extraEdges.length >= maxExtraEdges) {
      break;
    }

    if (uf.union(edge.from, edge.to)) {
      extraEdges.push(edge);
    }
  }

  return extraEdges;
}

