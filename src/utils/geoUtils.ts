export interface Node {
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

  return {

    numNodes,
    numCenterNodes,
    numPeripheryNodes,
    centralityRatio,

    convexArea,
    sqrtConvexArea,
    perimeter,

    tRatio,
    perimeterSqrtAreaRatio
  }
}