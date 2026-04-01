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

  const mstTotalLength = calculateMSTLength(nodes)
  const mstCV = 0;//calculateMST_CV(mst); // Placeholder, compute if needed
  const meanNNDistKm = calculateMeanNNDist(nodes); // Placeholder, compute if needed
  const centroidCV = 0; // Placeholder, compute if needed
  const shapeFactor = convexArea > 0 ? Math.pow(perimeter, 2) / convexArea : 0;;
  const nodeDensityNodesPerKm2 = 0; // Placeholder, compute if needed
  const avgUnweightedPath = 0; // Placeholder, compute if needed
  const degCV = 0; // Placeholder, compute if needed
  const avgClusteringCoeff = 0; // Placeholder, compute if needed
  const graphDiameter = 0; // Placeholder, compute if needed
  const convexAreaBin = 0; // Placeholder, compute if needed
  const perimeterBin = 0; // Placeholder, compute if needed


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