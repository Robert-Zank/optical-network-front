// export default function AboutPage() {
//   return (
//     <div className="bg-white border rounded-3 p-4 shadow-sm">
//       <h1 className="h4 fw-bold mb-2">About</h1>
//       <p className="text-muted mb-0">
//         This tool estimates optical network characteristics and costs from topology geometry using an ML model that
//         predicts Johnson SB distribution parameters and related shortest-path statistics.
//       </p>
//     </div>
//   );
// }
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Import the runModel function that handles feature calculation + backend call
import { runModel } from "../api/modelApi_calls";

// Fix for Leaflet invisible marker issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Node collector for map clicks
function NodeCollector({ setNodes }: { setNodes: React.Dispatch<React.SetStateAction<{lat:number,lng:number}[]>> }) {
  useMapEvents({
    click(e) {
      setNodes(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
    },
  });
  return null;
}

// Main Map page
export default function MapInput() {
  const [nodes, setNodes] = useState<{lat:number,lng:number}[]>([]);
  const [result, setResult] = useState<[number,number,number,number] | null>(null);

  // Clear nodes & result
  const handleClear = () => {
    setNodes([]);
    setResult(null);
  };

  // Run the ML model
  const handleRunModel = async () => {
    if (nodes.length < 3) {
      alert("Please add at least 3 nodes.");
      return;
    }

    try {
      // Send raw nodes to runModel (it will compute features internally)
      const output = await runModel(nodes);

      // output.result = [gamma, delta, lambda, xi]
      setResult(output.result);
    } catch (err) {
      console.error(err);
      alert("Error running model. Check console.");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h2>Select Nodes on the Map</h2>

      {/* Map wrapper */}
      <div style={{ height: 400, width: "100%", border: "2px solid #ddd", borderRadius: 12 }}>
        <MapContainer center={[39.5, -98]} zoom={4} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <NodeCollector setNodes={setNodes} />
          {nodes.map((node, i) => (
            <Marker key={i} position={[node.lat, node.lng]} />
          ))}
        </MapContainer>
      </div>

      {/* Buttons */}
      <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
        <button onClick={handleRunModel} style={{ padding: "8px 16px", backgroundColor: "#4CAF50", color: "white" }}>
          Run Model
        </button>
        <button onClick={handleClear} style={{ padding: "8px 16px", backgroundColor: "#ff4444", color: "white" }}>
          Clear
        </button>
      </div>

      {/* Display collected nodes */}
      <div style={{ marginTop: 10 }}>
        <h4>Nodes Collected: {nodes.length}</h4>
        <ul>
          {nodes.map((n, i) => (
            <li key={i}>{n.lat.toFixed(4)}, {n.lng.toFixed(4)}</li>
          ))}
        </ul>
      </div>

      {/* Display model results */}
      {result && (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid #ccc", borderRadius: 6, backgroundColor: "#f0f8ff" }}>
          <h3>Model Output</h3>
          <p>γ: {result[0]}</p>
          <p>δ: {result[1]}</p>
          <p>λ: {result[2]}</p>
          <p>ξ: {result[3]}</p>
        </div>
      )}
    </div>
  );
}