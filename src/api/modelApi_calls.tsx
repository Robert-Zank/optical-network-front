import { calculateGeoFeatures } from "../utils/geoUtils";
import type { Node, GeoFeatures } from "../utils/geoUtils";

export interface PredictionResponse {
  result: [number, number, number, number]; // gamma, delta, lambda, xi
}

export async function runModel(nodes: Node[]): Promise<PredictionResponse> {
  // 1. Guard against empty nodes before even trying the fetch
  if (nodes.length === 0) {
    throw new Error("No nodes selected on the map.");
  }

  const features: GeoFeatures = calculateGeoFeatures(nodes);

  try {
    
    const response = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json" 
      },
      body: JSON.stringify({
        num_nodes: features.numNodes,
        num_center_nodes: features.numCenterNodes,
        centrality_ratio: features.centralityRatio,
        num_periphery_nodes: features.numPeripheryNodes,
        convex_area: features.convexArea,
        sqrt_convex_area: features.sqrtConvexArea,
        t_ratio: features.tRatio,
        perimeter_sqrtarea_ratio: features.perimeterSqrtAreaRatio,
        perimeter: features.perimeter,
      }),
    });

    // 3. Handle specific HTTP errors (like 422 Validation Error)
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error("Backend Error Detail:", errorBody);
      throw new Error(`Server Error: ${response.status}`);
    }

    return await response.json();
    
  } catch (error) {
    // This catches "Failed to fetch" (network down, CORS, etc.)
    console.error("Connection Refused. Ensure FastAPI is running on port 8000.");
    throw error; 
  }
}