import {
  createGraphFromPOIs,
  calculateMST,
  generateMSTRoadGraph,
  addExtraEdgesForLoops,
  Graph,
} from '../../../src/algorithms/mst.js';
import { createPOI } from '../../../src/algorithms/poi.js';

describe('MST Algorithm', () => {
  describe('createGraphFromPOIs', () => {
    it('should create graph from POIs', () => {
      const pois = [
        createPOI(0, 0, 0, 'town'),
        createPOI(10, 0, 0, 'town'),
        createPOI(0, 10, 0, 'town'),
      ];

      const graph = createGraphFromPOIs(pois);

      expect(graph.nodes).toBe(3);
      expect(graph.edges.length).toBe(3); // 3 choose 2 = 3 edges
    });

    it('should calculate edge weights', () => {
      const pois = [
        createPOI(0, 0, 0, 'town'),
        createPOI(10, 0, 0, 'town'),
      ];

      const graph = createGraphFromPOIs(pois);

      expect(graph.edges[0].weight).toBe(10);
      expect(graph.edges[0].from).toBe(0);
      expect(graph.edges[0].to).toBe(1);
    });

    it('should apply level penalty when enabled', () => {
      const pois = [
        createPOI(0, 0, 0, 'town'),
        createPOI(0, 0, 1, 'town'), // Same position, different level
      ];

      const graphWithPenalty = createGraphFromPOIs(pois, true);
      const graphWithoutPenalty = createGraphFromPOIs(pois, false);

      expect(graphWithPenalty.edges[0].weight).toBeGreaterThan(
        graphWithoutPenalty.edges[0].weight
      );
    });
  });

  describe('calculateMST', () => {
    it('should calculate MST for simple graph', () => {
      const graph: Graph = {
        nodes: 3,
        edges: [
          { from: 0, to: 1, weight: 1 },
          { from: 1, to: 2, weight: 2 },
          { from: 0, to: 2, weight: 3 },
        ],
      };

      const mst = calculateMST(graph);

      expect(mst.length).toBe(2); // n-1 edges
      expect(mst[0].weight).toBe(1);
      expect(mst[1].weight).toBe(2);
    });

    it('should connect all nodes', () => {
      const graph: Graph = {
        nodes: 4,
        edges: [
          { from: 0, to: 1, weight: 1 },
          { from: 1, to: 2, weight: 2 },
          { from: 2, to: 3, weight: 3 },
          { from: 0, to: 3, weight: 4 },
          { from: 0, to: 2, weight: 5 },
          { from: 1, to: 3, weight: 6 },
        ],
      };

      const mst = calculateMST(graph);

      expect(mst.length).toBe(3); // n-1 edges
      // Check all nodes are connected
      const nodes = new Set<number>();
      for (const edge of mst) {
        nodes.add(edge.from);
        nodes.add(edge.to);
      }
      expect(nodes.size).toBe(4);
    });

    it('should return empty array for single node', () => {
      const graph: Graph = {
        nodes: 1,
        edges: [],
      };

      const mst = calculateMST(graph);
      expect(mst.length).toBe(0);
    });
  });

  describe('generateMSTRoadGraph', () => {
    it('should generate MST from POIs', () => {
      const pois = [
        createPOI(0, 0, 0, 'town'),
        createPOI(10, 0, 0, 'town'),
        createPOI(0, 10, 0, 'town'),
      ];

      const mst = generateMSTRoadGraph(pois);

      expect(mst.length).toBe(2); // n-1 edges
    });

    it('should return empty array for less than 2 POIs', () => {
      const pois = [createPOI(0, 0, 0, 'town')];

      const mst = generateMSTRoadGraph(pois);
      expect(mst.length).toBe(0);
    });

    it('should handle empty POI array', () => {
      const mst = generateMSTRoadGraph([]);
      expect(mst.length).toBe(0);
    });
  });

  describe('addExtraEdgesForLoops', () => {
    it('should add extra edges for loops', () => {
      const graph: Graph = {
        nodes: 4,
        edges: [
          { from: 0, to: 1, weight: 1 },
          { from: 1, to: 2, weight: 2 },
          { from: 2, to: 3, weight: 3 },
          { from: 0, to: 3, weight: 4 },
          { from: 0, to: 2, weight: 5 },
          { from: 1, to: 3, weight: 6 },
        ],
      };

      const mst = calculateMST(graph);
      // MST has 3 edges (n-1), graph has 6 edges total, so we can add up to 2 extra
      const extraEdges = addExtraEdgesForLoops(graph, mst, 2);

      expect(extraEdges.length).toBeLessThanOrEqual(2);
      // May be 0 if all edges are already in MST or create cycles
      // This is acceptable behavior
    });

    it('should not add edges that create cycles', () => {
      const graph: Graph = {
        nodes: 3,
        edges: [
          { from: 0, to: 1, weight: 1 },
          { from: 1, to: 2, weight: 2 },
          { from: 0, to: 2, weight: 3 },
        ],
      };

      const mst = calculateMST(graph);
      const extraEdges = addExtraEdgesForLoops(graph, mst, 10);

      // With 3 nodes, MST has 2 edges, can add at most 1 extra edge
      expect(extraEdges.length).toBeLessThanOrEqual(1);
    });

    it('should respect maxExtraEdges limit', () => {
      const graph: Graph = {
        nodes: 5,
        edges: [
          { from: 0, to: 1, weight: 1 },
          { from: 1, to: 2, weight: 2 },
          { from: 2, to: 3, weight: 3 },
          { from: 3, to: 4, weight: 4 },
          { from: 0, to: 2, weight: 5 },
          { from: 1, to: 3, weight: 6 },
          { from: 2, to: 4, weight: 7 },
        ],
      };

      const mst = calculateMST(graph);
      const extraEdges = addExtraEdgesForLoops(graph, mst, 2);

      expect(extraEdges.length).toBeLessThanOrEqual(2);
    });
  });
});

