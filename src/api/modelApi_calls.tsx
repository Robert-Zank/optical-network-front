import { calculateGeoFeatures } from "../utils/geoUtils";
import type { Node, GeoFeatures } from "../utils/geoUtils";

export interface PredictionResponse {
  result: [number, number, number, number];
  cost_estimate: {
    total_paths: number;
    probabilities: {
      "16QAM": number;
      "8QAM": number;
      "QPSK": number;
      "BPSK": number;
    };
    path_counts: {
      "16QAM": number;
      "8QAM": number;
      "QPSK": number;
      "BPSK": number;
    };
    booster_counts: {
      "16QAM": number;
      "8QAM": number;
      "QPSK": number;
      "BPSK": number;
    };
    costs: {
      transponders: number;
      boosters: number;
      total: number;
    };
    assumptions: {
      path_ranges_km: {
        "16QAM": [number, number];
        "8QAM": [number, number];
        "QPSK": [number, number];
        "BPSK": [number, number];
      };
      boosters_per_bucket: {
        "16QAM": number;
        "8QAM": number;
        "QPSK": number;
        "BPSK": number;
      };
      booster_cost: number;
      transponder_costs: {
        "16QAM": number;
        "8QAM": number;
        "QPSK": number;
        "BPSK": number;
      };
    };
  };
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
        edge_Density_km_per_km2: features.convexArea > 0 ? features.mstTotalLength / features.convexArea : 0,
        MST_Length_km : features.mstTotalLength,
        MST_CV: features.mstCV,
        Meannndist_Km: features.meanNNDistKm, 
        Centroid_CV: features.centroidCV, 
        Shape_Factor: features.shapeFactor, 
        node_density_nodes_per_km2: features.nodeDensityNodesPerKm2,
        avg_unweighted_path : features.avgUnweightedPath,
        deg_cv : features.degCV,
        avg_clustering_coeff : features.avgClusteringCoeff,
        graph_diameter : features.graphDiameter,
        convex_area_bin : features.convexAreaBin,
        perimeter_bin : features.perimeterBin,
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