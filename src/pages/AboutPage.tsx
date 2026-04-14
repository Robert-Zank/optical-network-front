import React, { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import * as XLSX from "xlsx";
import "leaflet/dist/leaflet.css";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// API Imports (Adjust paths if your folder structure is different)
import { runModel, runKSTest } from "../api/modelApi_calls";

// --- Leaflet Icon Fix ---
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Helper Components ---

// Auto-zooms map to fit nodes from Excel
function MapBoundsSetter({ nodes }: { nodes: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (nodes.length > 0) {
      const bounds = L.latLngBounds(nodes.map((n) => [n.lat, n.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [nodes, map]);
  return null;
}

// Captures clicks only in the Manual Planner
function NodeCollector({ setNodes }: { setNodes: React.Dispatch<React.SetStateAction<any[]>> }) {
  useMapEvents({
    click(e) {
      setNodes((prev) => [
        ...prev,
        { id: prev.length + 1, lat: e.latlng.lat, lng: e.latlng.lng },
      ]);
    },
  });
  return null;
}

// --- Sub-Component 1: Manual Planner ---
const ManualPlanner = () => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    if (nodes.length < 3) return alert("Add at least 3 nodes to the map.");
    setLoading(true);
    try {
      const res = await runModel(nodes);
      setPrediction(res.result);
    } catch (err) {
      alert("Prediction failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={layoutGrid}>
      <div style={mapWrapper}>
        <MapContainer center={[39.5, -98]} zoom={4} style={{ height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <NodeCollector setNodes={setNodes} />
          {nodes.map((n, i) => <Marker key={i} position={[n.lat, n.lng]} />)}
        </MapContainer>
      </div>
      <div style={sidebarStyle}>
        <h3>📍 Manual Planner</h3>
        <p style={{ fontSize: "0.9rem", color: "#666" }}>Click on the map to place nodes manually and predict network parameters.</p>
        <div style={statBox}>Nodes Placed: <strong>{nodes.length}</strong></div>
        <button onClick={handleRun} disabled={loading} style={btnStyle(loading ? "#ccc" : "#4CAF50")}>
          {loading ? "Calculating..." : "Predict Parameters"}
        </button>
        <button onClick={() => { setNodes([]); setPrediction(null); }} style={btnStyle("#ff4444")}>Clear Map</button>
        
        {prediction && (
          <div style={resultCard}>
            <h4>Predicted Params</h4>
            <p>$\gamma$: {prediction[0].toFixed(4)}</p>
            <p>$\delta$: {prediction[1].toFixed(4)}</p>
            <p>$\lambda$: {prediction[2].toFixed(4)}</p>
            <p>$\xi$: {prediction[3].toFixed(4)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Sub-Component 2: Network Validator ---
const NetworkValidator = () => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<number[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [chartData, setChartData] = useState<any>(null);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      
      const wsNodes = wb.Sheets[wb.SheetNames[0]];
      const rawNodes = XLSX.utils.sheet_to_json(wsNodes) as any[];
      setNodes(rawNodes.map((n) => ({ 
        id: n.Node_ID, 
        lat: parseFloat(n.Latitude), 
        lng: parseFloat(n.Longitude) 
      })).filter(n => !isNaN(n.lat)));

      const wsEdges = wb.Sheets[wb.SheetNames[1]];
      if (wsEdges) {
        const rawEdges = XLSX.utils.sheet_to_json(wsEdges) as any[];
        setEdges(rawEdges.map(e => parseFloat(e["Computed Length (km)"])).filter(l => !isNaN(l)));
      }
    };
    reader.readAsBinaryString(file);
  };
  
  // -----------------------------------
  // --- THE CORE LOGIC ADDITION ---
  // When metrics are updated, generate the chart data points
  useEffect(() => {
    if (!metrics || edges.length === 0) return;

    // 1. Get fit parameters: [gamma, delta, lam, xi]
    const [gamma, delta, lam, xi] = metrics.predicted;

    // 2. Define the PDF function mathematically (Matches your image's red curve)
    const johnsonsbPDF = (x: number): number => {
      // Safety guard: JohnsonSB is only defined within [xi, xi+lam]
      if (x <= xi || x >= xi + lam) return 0;
      
      // Calculate normalized value 'z'
      const z = (x - xi) / lam;
      
      // Formula for PDF (probability density function)
      const term1 = delta / (lam * z * (1 - z) * Math.sqrt(2 * Math.PI));
      const power = gamma + delta * Math.log(z / (1 - z));
      const term2 = Math.exp(-0.5 * power * power);
      
      return term1 * term2;
    };

    // 3. Define the domain for plotting (X-axis range)
    // Create an array of distance points from 'minEdge' to 'maxEdge'
    const xMin = Math.floor(Math.min(...edges) / 100) * 100; // Snap to nearest 100
    const xMax = Math.ceil(Math.max(...edges) / 100) * 100;
    
    const xLabels: number[] = [];
    const numPoints = 100; // Number of points on the curve
    const step = (xMax - xMin) / numPoints;
    
    for (let i = 0; i < numPoints; i++) {
        xLabels.push(Math.round(xMin + (i * step)));
    }

    // 4. Calculate curve points (Y-values for the red curve)
    const curvePoints = xLabels.map(johnsonsbPDF);

    // 5. Calculate Histogram data (The blue bars)
    // We must manually bin the raw edge data and calculate density.
    const numBins = 30; // Matches your image bin count
    const binSize = (xMax - xMin) / numBins;
    const histogramDensities = new Array(xLabels.length).fill(0); // For plotting, we map this to xLabels
    
    // Safety check: ensure binSize is positive
    if (binSize > 0) {
        for (const edge of edges) {
            // Find which chart label (x point) this edge is closest to
            // This is a simplification for plotting a 'mixed' chart, 
            // mapping bars onto a continuous curve axis.
            const labelIndex = Math.min(xLabels.length - 1, Math.floor((edge - xMin) / (step * (numPoints / numBins))));
            
            // Increment the count. For true 'density', you'd divide by (edges.length * binSize).
            // Here, we just count for simple plotting (matches image's 'Observed' style)
            if (labelIndex >= 0) {
                histogramDensities[labelIndex]++;
            }
        }
    }

    // 6. Final Chart.js data object
    const finalData = {
      labels: xLabels, // Distance values (km) on X-axis
      datasets: [
        {
          type: "bar" as const, // Mixed chart type
          label: "Observed",
          data: histogramDensities,
          backgroundColor: "rgba(100, 149, 237, 0.4)", // Light blue like image
          borderColor: "rgba(100, 149, 237, 1)",
          borderWidth: 1,
          order: 2, // Plot this first (underneath)
          yAxisID: "yHistogram", // We use a separate axis for the bars count
        },
        {
          type: "line" as const,
          label: "Johnson SB Fit",
          data: curvePoints,
          borderColor: "rgba(255, 0, 0, 1)", // Bright red like image
          backgroundColor: "rgba(255, 0, 0, 0)", // No fill
          borderWidth: 2,
          pointRadius: 0, // Turn off data points for smooth curve
          tension: 0.4, // Smooth the line
          order: 1, // Plot this over the histogram
          yAxisID: "yDensity", // The true probability density scale
        },
      ],
    };

    setChartData(finalData);

  }, [metrics, edges]);
  // --- END OF CORE LOGIC ADDITION ---

  const handleValidate = async () => {
    if (nodes.length === 0 || edges.length === 0) return alert("Please upload a valid Excel file first.");
    setLoading(true);
    try {
      const modelRes = await runModel(nodes);
      // Ensure we send predicted_params: [gamma, delta, lambda, xi]
      const ksRes = await runKSTest({ nodes, edges, predicted_params: modelRes.result });
      setMetrics(ksRes);
    } catch (err) {
      alert("Validation failed.");
    } finally {
      setLoading(false);
    }
  };

  // Define Chart Options (axis labels, legend placement, etc.)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Stretch to container
    plugins: {
      legend: { position: "top" as const, align: 'end' as const },
      title: { 
        display: true, 
        text: `ML Model Validation: KS P-Value = ${metrics?.predictedPValue.toFixed(4)}` 
      },
    },
    scales: {
      x: { title: { display: true, text: "Shortest Path Length (km)" } },
      yDensity: { // Axis for the continuous red curve
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: { display: true, text: "Probability Density" },
          min: 0,
          max: 0.0004, // Snaps max like image
          ticks: { callback: (value: any) => value.toFixed(5) }
      },
      yHistogram: { // Axis for the light-blue bars
          type: 'linear' as const,
          display: false, // Hide this axis to match image style
          position: 'right' as const,
          min: 0,
      }
    },
  };

  return (
    <div style={layoutGrid}>
      <div style={mapWrapper}>
        <MapContainer center={[39.5, -98]} zoom={4} style={{ height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapBoundsSetter nodes={nodes} />
          {nodes.map((n, i) => <Marker key={i} position={[n.lat, n.lng]} />)}
        </MapContainer>
      </div>
      <div style={sidebarStyle}>
        <h3>📊 Network Validator</h3>
        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ marginBottom: "10px", width: "100%" }} />
        <div style={statBox}>
          Nodes: <strong>{nodes.length}</strong><br/>
          Edges: <strong>{edges.length}</strong>
        </div>
        <button onClick={handleValidate} disabled={loading} style={btnStyle(loading ? "#ccc" : "#2196F3")}>
          {loading ? "Validating..." : "Run KS Test"}
        </button>
        
        {metrics && chartData && (
          <div style={{ ...resultCard, borderLeft: `5px solid ${metrics.predictedPValue > 0.05 ? "#4CAF50" : "#ff4444"}`, padding: '10px' }}>
            
            {/* --- ADD THE CHART CONTAINER --- */}
            <div style={{ height: "250px", position: "relative", marginBottom: '15px' }}>
                <Line data={chartData} options={chartOptions} />
            </div>
            {/* --- END CHART CONTAINER --- */}

            <h4>Parameter Breakdown</h4>
            <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse", marginBottom: "15px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #eee", textAlign: "left" }}>
                  <th style={{ padding: "4px" }}>Param</th>
                  <th style={{ padding: "4px" }}>ML Pred</th>
                  <th style={{ padding: "4px" }}>True</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ padding: "4px" }}>$\gamma$ (Shape 1)</td><td>{metrics.predicted[0].toFixed(3)}</td><td>{metrics.trueParams[0].toFixed(3)}</td></tr>
                <tr><td style={{ padding: "4px" }}>$\delta$ (Shape 2)</td><td>{metrics.predicted[1].toFixed(3)}</td><td>{metrics.trueParams[1].toFixed(3)}</td></tr>
                <tr><td style={{ padding: "4px" }}>$\lambda$ (Scale)</td><td>{metrics.predicted[2].toFixed(1)}</td><td>{metrics.trueParams[2].toFixed(1)}</td></tr>
                <tr><td style={{ padding: "4px" }}>$\xi$ (Loc)</td><td>{metrics.predicted[3].toFixed(1)}</td><td>{metrics.trueParams[3].toFixed(1)}</td></tr>
              </tbody>
            </table>

            <div style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
              <strong>KS Verdict: {metrics.predictedPValue > 0.05 ? "✅ Consistent" : "❌ Inconsistent"}</strong>
              <p style={{ fontSize: '0.8rem', color: '#666' }}>Max Deviation ($D$): {metrics.statistic.toFixed(4)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---
export default function NetworkDashboard() {
  const [activeTab, setActiveTab] = useState<"manual" | "validation">("manual");

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <header style={{ textAlign: "center", marginBottom: "30px" }}>
        <h1 style={{ color: "#333" }}>Network Optimization Dashboard</h1>
        <div style={tabContainer}>
          <button style={activeTab === "manual" ? activeTabBtn : tabBtn} onClick={() => setActiveTab("manual")}>
            📍 Manual Planning
          </button>
          <button style={activeTab === "validation" ? activeTabBtn : tabBtn} onClick={() => setActiveTab("validation")}>
            📊 Network Validation
          </button>
        </div>
      </header>

      {activeTab === "manual" ? <ManualPlanner /> : <NetworkValidator />}
    </div>
  );
}

// --- Styles ---
const layoutGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px" };
const mapWrapper: React.CSSProperties = { height: "550px", borderRadius: "12px", overflow: "hidden", border: "1px solid #ddd", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" };
const sidebarStyle: React.CSSProperties = { padding: "20px", background: "#f9f9f9", borderRadius: "12px", border: "1px solid #eee" };
const tabContainer: React.CSSProperties = { display: "inline-flex", background: "#eee", padding: "5px", borderRadius: "10px", marginTop: "10px" };
const tabBtn: React.CSSProperties = { padding: "10px 20px", border: "none", background: "none", cursor: "pointer", fontWeight: "bold", color: "#666" };
const activeTabBtn: React.CSSProperties = { ...tabBtn, background: "#fff", borderRadius: "8px", color: "#000", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" };
const btnStyle = (bg: string): React.CSSProperties => ({ 
  width: "100%", 
  padding: "12px", 
  backgroundColor: bg, 
  color: "white", 
  border: "none", 
  borderRadius: "8px", 
  fontWeight: "bold", 
  cursor: "pointer", 
  marginTop: "10px" 
});const statBox: React.CSSProperties = { padding: "10px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px", margin: "10px 0", fontSize: "0.9rem" };
const resultCard: React.CSSProperties = { marginTop: "20px", padding: "15px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", fontSize: "0.9rem" };

// import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
// import { useState } from "react";
// import "leaflet/dist/leaflet.css";
// import L from "leaflet";

// // Import your API calls (Ensure you create the runKSTest endpoint on your backend)
// import { runModel } from "../api/modelApi_calls";

// // Fix for Leaflet invisible marker issue
// import icon from "leaflet/dist/images/marker-icon.png";
// import iconShadow from "leaflet/dist/images/marker-shadow.png";

// let DefaultIcon = L.icon({
//   iconUrl: icon,
//   shadowUrl: iconShadow,
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
// });
// L.Marker.prototype.options.icon = DefaultIcon;

// // Node collector for map clicks
// function NodeCollector({
//   setNodes,
// }: {
//   setNodes: React.Dispatch<
//     React.SetStateAction<{ id: number | string; lat: number; lng: number }[]>
//   >;
// }) {
//   useMapEvents({
//     click(e) {
//       setNodes((prev) => [
//         ...prev,
//         { id: prev.length, lat: e.latlng.lat, lng: e.latlng.lng },
//       ]);
//     },
//   });
//   return null;
// }

// // Main Map page
// export default function MapInput() {
//   const [nodes, setNodes] = useState<
//     { id: number | string; lat: number; lng: number }[]
//   >([]);
//   const [result, setResult] = useState<[number, number, number, number] | null>(
//     null
//   );
  
//   // NEW: State to hold KS test results
//   const [ksMetrics, setKsMetrics] = useState<{
//     statistic: number;
//     predictedPValue: number;
//     truePValue: number;
//   } | null>(null);

//   // Clear nodes & result
//   const handleClear = () => {
//     setNodes([]);
//     setResult(null);
//     setKsMetrics(null);
//   };

//   // Run the ML model AND the KS Test
//   const handleRunModel = async () => {
//     if (nodes.length < 3) {
//       alert("Please add at least 3 nodes.");
//       return;
//     }

//     try {
//       // 1. Get the 4 predicted parameters [gamma, delta, lambda, xi]
//       const output = await runModel(nodes);
//       setResult(output.result);

//       // 2. Pass nodes and predicted params to backend to run the KS Test
//       // The backend needs to calculate the true network paths to get the 'truePValue'
//       // const ksOutput = await runKSTest({
//       //   nodes: nodes,
//       //   predictedParams: output.result
//       // });
      
//       // setKsMetrics({
//       //   statistic: ksOutput.statistic,
//       //   predictedPValue: ksOutput.predictedPValue,
//       //   truePValue: ksOutput.truePValue
//       // });

//     } catch (err) {
//       console.error(err);
//       alert("Error running model or KS test. Check console.");
//     }
//   };

//   return (
//     <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
//       <h2>Select Nodes on the Map</h2>

//       {/* Map wrapper */}
//       <div
//         style={{
//           height: 400,
//           width: "100%",
//           border: "2px solid #ddd",
//           borderRadius: 12,
//         }}
//       >
//         <MapContainer
//           center={[39.5, -98]}
//           zoom={4}
//           style={{ height: "100%", width: "100%" }}
//         >
//           <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
//           <NodeCollector setNodes={setNodes} />
//           {nodes.map((node, i) => (
//             <Marker key={i} position={[node.lat, node.lng]} />
//           ))}
//         </MapContainer>
//       </div>

//       {/* Buttons */}
//       <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
//         <button
//           onClick={handleRunModel}
//           style={{
//             padding: "8px 16px",
//             backgroundColor: "#4CAF50",
//             color: "white",
//             border: "none",
//             borderRadius: "4px",
//             cursor: "pointer"
//           }}
//         >
//           Run Model & Validate
//         </button>
//         <button
//           onClick={handleClear}
//           style={{
//             padding: "8px 16px",
//             backgroundColor: "#ff4444",
//             color: "white",
//             border: "none",
//             borderRadius: "4px",
//             cursor: "pointer"
//           }}
//         >
//           Clear
//         </button>
//       </div>

//       {/* Display collected nodes */}
//       <div style={{ marginTop: 10 }}>
//         <h4>Nodes Collected: {nodes.length}</h4>
//         <ul style={{ maxHeight: "100px", overflowY: "auto" }}>
//           {nodes.map((n, i) => (
//             <li key={i}>
//               {n.lat.toFixed(4)}, {n.lng.toFixed(4)}
//             </li>
//           ))}
//         </ul>
//       </div>

//       {/* Display model results & KS Test validation */}
//       {result && (
//         <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
          
//           {/* Parameters Card */}
//           <div
//             style={{
//               flex: 1,
//               padding: 15,
//               border: "1px solid #ccc",
//               borderRadius: 6,
//               backgroundColor: "#f0f8ff",
//             }}
//           >
//             <h3>Predicted Parameters</h3>
//             <p><strong>γ (Gamma):</strong> {result[0].toFixed(4)}</p>
//             <p><strong>δ (Delta):</strong> {result[1].toFixed(4)}</p>
//             <p><strong>λ (Lambda):</strong> {result[2].toFixed(4)}</p>
//             <p><strong>ξ (Xi):</strong> {result[3].toFixed(4)}</p>
//           </div>

//           {/* KS Test Card */}
//           {ksMetrics && (
//             <div
//               style={{
//                 flex: 1,
//                 padding: 15,
//                 border: "1px solid #ccc",
//                 borderRadius: 6,
//                 backgroundColor: "#fff0f0",
//               }}
//             >
//               <h3>KS Test Validation</h3>
//               <p><strong>Test Statistic (D):</strong> {ksMetrics.statistic.toFixed(4)}</p>
//               <hr style={{ margin: "10px 0" }}/>
//               <p>
//                 <strong>Predicted p-value:</strong> {ksMetrics.predictedPValue.toFixed(4)}
//                 <br/>
//                 <span style={{ fontSize: "0.85em", color: "#666" }}>
//                   (Fit of ML params against true topology)
//                 </span>
//               </p>
//               <p>
//                 <strong>True p-value:</strong> {ksMetrics.truePValue.toFixed(4)}
//                 <br/>
//                 <span style={{ fontSize: "0.85em", color: "#666" }}>
//                   (Fit of exact params against true topology)
//                 </span>
//               </p>
//             </div>
//           )}

//         </div>
//       )}
//     </div>
//   );
// }