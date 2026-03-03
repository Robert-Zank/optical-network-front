import { GeoFeatures } from '../utils/geoUtils';

// The response is now a simple boolean and a message
export interface PredictionResponse {
  is_good: boolean;
  message: string;
}

// Function to call the backend model API with the geographic features
export async function runModel(features: GeoFeatures): Promise<PredictionResponse> {
  const response = await fetch("http://localhost:8000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      node_count: features.nodeCount,
      convex_area: features.convexArea,
      perimeter: features.perimeter
    })
  });

  if (!response.ok) {
    throw new Error("Network analysis failed");
  }

  return await response.json();
}