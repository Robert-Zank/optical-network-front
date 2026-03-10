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
    
    // make the POST request to the FastAPI backend
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
        edge_Density_km_per_km2: 0,
        MST_Length_km : 0,
        MST_CV: 0, // Placeholder, compute if needed
        Meannndist_Km: 0, // Placeholder, compute if needed
        Centroid_CV: 0, // Placeholder, compute if needed
        Shape_Factor: 0, // Placeholder, compute if needed
        node_density_nodes_per_km2: 0,
        avg_unweighted_path : 0,
        deg_cv : 0,
        avg_clustering_coeff : 0,
        graph_diameter : 0,
        convex_area_bin : 0,
        perimeter_bin : 0,
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
    // This catches "Failed to fetch" (the server never got to start)
    console.error("Connection Refused. Ensure FastAPI is running on port 8000.");
    throw error; 
  }
}