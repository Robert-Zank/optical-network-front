export interface Node {
  id: number | string
  lat: number
  lng: number
}

//list of nodes -> geo features for ML model input
export interface GeoFeatures {

  numNodes: number
  numCenterNodes: number
  numPeripheryNodes: number
  centralityRatio: number

  convexArea: number
  sqrtConvexArea: number
  perimeter: number

  tRatio: number
  perimeterSqrtAreaRatio: number
  mstTotalLength: number
  mstCV: number
  meanNNDistKm: number
  centroidCV: number
  shapeFactor: number
  nodeDensityNodesPerKm2: number
  avgUnweightedPath: number
  degCV: number
  avgClusteringCoeff: number
  graphDiameter: number
  convexAreaBin: number
  perimeterBin: number

}

// Below are all the geometric calculations needed to compute the features from a list of nodes.

// Distance between two nodes
function distance(a: Node, b: Node) {
  const dx = a.lng - b.lng
  const dy = a.lat - b.lat
  return Math.sqrt(dx * dx + dy * dy)
}


// Polygon area (Shoelace formula)
function polygonArea(points: Node[]) {

  let area = 0

  for (let i = 0; i < points.length; i++) {

    const j = (i + 1) % points.length

    area +=
      points[i].lng * points[j].lat -
      points[j].lng * points[i].lat
  }

  return Math.abs(area / 2)
}


// Polygon perimeter
function polygonPerimeter(points: Node[]) {

  let p = 0

  for (let i = 0; i < points.length; i++) {

    const j = (i + 1) % points.length
    p += distance(points[i], points[j])

  }

  return p
}


// For now assume center/periphery split
function estimateCentrality(nodes: Node[]) {

  const numNodes = nodes.length

  const numCenterNodes = Math.max(1, Math.floor(numNodes * 0.2))
  const numPeripheryNodes = numNodes - numCenterNodes

  const centralityRatio = numCenterNodes / numNodes

  return { numCenterNodes, numPeripheryNodes, centralityRatio }
}


// Helper: Euclidean distance between two nodes
const getDist = (a: Node, b: Node) => {
    return Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2));
};

export function calculateMSTLength(nodes: Node[]): number {
    if (nodes.length <= 1) return 0;

    const edges: { u: number, v: number, dist: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            edges.push({ u: i, v: j, dist: getDist(nodes[i], nodes[j]) });
        }
    }

    // Sort edges by distance
    edges.sort((a, b) => a.dist - b.dist);

    const parent = Array.from({ length: nodes.length }, (_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));

    let mstLength = 0;
    let edgesCount = 0;

    for (const edge of edges) {
        const rootU = find(edge.u);
        const rootV = find(edge.v);
        if (rootU !== rootV) {
            mstLength += edge.dist;
            parent[rootU] = rootV;
            edgesCount++;
            if (edgesCount === nodes.length - 1) break;
        }
    }
    return mstLength;
}

export function calculateMST_CV(edges: number[]): number {
    if (edges.length === 0) return 0;
    
    const mean = edges.reduce((a, b) => a + b, 0) / edges.length;
    const variance = edges.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / edges.length;
    const stdDev = Math.sqrt(variance);
    
    return mean === 0 ? 0 : stdDev / mean;
}


export function calculateMeanNNDist(nodes: Node[]): number {
    const n = nodes.length;
    if (n <= 1) return 0;

    const nearestNeighborDists: number[] = [];

    for (let i = 0; i < n; i++) {
        let minEdge = Infinity;

        for (let j = 0; j < n; j++) {
            // Skip distance to self
            if (i === j) continue;

            const d = Math.sqrt(
                Math.pow(nodes[i].lng - nodes[j].lng, 2) + 
                Math.pow(nodes[i].lat - nodes[j].lat, 2)
            );

            if (d < minEdge) {
                minEdge = d;
            }
        }
        nearestNeighborDists.push(minEdge);
    }

    // np.mean(nearest_neighbor_dists)
    const sum = nearestNeighborDists.reduce((a, b) => a + b, 0);
    return sum / n;
}

export function getCV(values: number[]): number {
  if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

// Helper to get MST edges for CV and Topology
export function getMSTEdgeWeights(nodes: Node[]): { weights: number[], adj: number[][] } {
  const n = nodes.length;
  const edges: { u: number, v: number, dist: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      edges.push({ u: i, v: j, dist: Math.sqrt(Math.pow(nodes[i].lat - nodes[j].lat, 2) + Math.pow(nodes[i].lng - nodes[j].lng, 2)) });
    }
  }
  edges.sort((a, b) => a.dist - b.dist);

  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  
  const weights: number[] = [];
  const adj: number[][] = Array.from({ length: n }, () => []);

  for (const edge of edges) {
    const rootU = find(edge.u);
    const rootV = find(edge.v);
    if (rootU !== rootV) {
      weights.push(edge.dist);
      adj[edge.u].push(edge.v);
      adj[edge.v].push(edge.u);
      parent[rootU] = rootV;
    }
  }
  return { weights, adj };
}


// Main function to calculate all geo features from a list of nodes

export function calculateGeoFeatures(nodes: Node[]): GeoFeatures {

  if (nodes.length < 3) throw new Error("Need at least 3 nodes")

  const numNodes = nodes.length

  const convexArea = polygonArea(nodes)
  const perimeter = polygonPerimeter(nodes)

  const sqrtConvexArea = Math.sqrt(convexArea)

  const tRatio = perimeter / convexArea

  const perimeterSqrtAreaRatio = perimeter / sqrtConvexArea

  const { numCenterNodes, numPeripheryNodes, centralityRatio } =
    estimateCentrality(nodes)

  // Compute MST length and CV
  const { weights: mstWeights, adj: mstAdj } = getMSTEdgeWeights(nodes);
  const mstTotalLength = mstWeights.reduce((a, b) => a + b, 0);
  const mstCV = getCV(mstWeights);

  const meanNNDistKm = calculateMeanNNDist(nodes);

  // centroid CV
  const avgLat = nodes.reduce((s, n) => s + n.lat, 0) / numNodes;
  const avgLng = nodes.reduce((s, n) => s + n.lng, 0) / numNodes;
  const distsToCentroid = nodes.map(n => Math.sqrt(Math.pow(n.lat - avgLat, 2) + Math.pow(n.lng - avgLng, 2)));
  const centroidCV = getCV(distsToCentroid);

  const shapeFactor = convexArea > 0 ? Math.pow(perimeter, 2) / convexArea : 0;;
  const nodeDensityNodesPerKm2 = convexArea > 0 ? numNodes / convexArea : 0;
  const avgClusteringCoeff = 0; // Placeholder

  const degrees = mstAdj.map(neighbors => neighbors.length);
  const degCV = getCV(degrees);

  let totalPathLength = 0;
  let maxDist = 0;
  for (let i = 0; i < numNodes; i++) {
    const dists = new Array(numNodes).fill(-1);
    const queue = [i];
    dists[i] = 0;
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const v of mstAdj[u]) {
        if (dists[v] === -1) {
          dists[v] = dists[u] + 1;
          totalPathLength += dists[v];
          maxDist = Math.max(maxDist, dists[v]);
          queue.push(v);
        }
      }
    }
  }
  const avgUnweightedPath = totalPathLength / (numNodes * (numNodes - 1));
  const graphDiameter = maxDist;
  const convexAreaBin = Math.floor(convexArea / 500);
  const perimeterBin = Math.floor(perimeter / 100);


  return {

    numNodes,
    numCenterNodes,
    numPeripheryNodes,
    centralityRatio,

    convexArea,
    sqrtConvexArea,
    perimeter,

    tRatio,
    perimeterSqrtAreaRatio,
    mstTotalLength,
    mstCV,
    meanNNDistKm,
    centroidCV,
    shapeFactor,
    nodeDensityNodesPerKm2,
    avgUnweightedPath,
    degCV,
    avgClusteringCoeff,
    graphDiameter,
    convexAreaBin,
    perimeterBin,
  }
}