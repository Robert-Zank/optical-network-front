import * as turf from '@turf/turf';

// variables related to geographic calculations
export interface GeoFeatures {
  nodeCount: number;
  convexArea: number;
  perimeter: number;
}

// interface for a geographic node (latitude and longitude)
export interface Node {
  lat: number;
  lng: number;
}

// function to calculate geographic features from a list of nodes
export const calculateGeoFeatures = (nodes: Node[]): GeoFeatures => {
  if (nodes.length < 3) throw new Error("Need at least 3 nodes");

  const points = nodes.map(n => turf.point([n.lng, n.lat]));
  const hull = turf.convex(turf.featureCollection(points));

  if (!hull) throw new Error("Invalid geometry");

  // calculate and return the geographic features
  return {
    nodeCount: nodes.length,
    convexArea: turf.area(hull),
    perimeter: turf.length(hull, { units: 'meters' })
  };
};