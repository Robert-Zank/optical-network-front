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

// --- Chart Modal Component ---
const ChartModal = ({ chartData, metrics, onClose }: { chartData: any; metrics: any; onClose: () => void }) => {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: "top" as const, 
        align: 'end' as const,
        labels: {
          boxWidth: 14,
          padding: 20,
          font: { size: 13 }
        }
      },
      title: { 
        display: true, 
        text: `ML Model Validation: KS P-Value = ${metrics?.predictedPValue.toFixed(4)}`,
        font: { size: 16, weight: "bold" as const }
      },
    },
    scales: {
      x: { 
        title: { 
          display: true, 
          text: "Shortest Path Length (km)",
          font: { size: 13, weight: "bold" as const }
        },
        stacked: false,
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { 
          display: true, 
          text: "Probability Density",
          font: { size: 13, weight: "bold" as const }
        },
        min: 0,
        ticks: { 
          callback: (value: any) => {
            if (typeof value === 'number') {
              return value.toExponential(4);
            }
            return value;
          },
          maxRotation: 0
        }
      }
    },
  };

  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        <div style={modalHeader}>
          <h2>Distribution Fit Analysis</h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        
        <div style={{ height: "500px", marginBottom: "20px" }}>
          <Line data={chartData} options={chartOptions} />
        </div>

        <div style={interpretationBox}>
          <h3>📊 How to Interpret This Chart</h3>
          
          <div style={interpretSection}>
            <h4 style={{ color: "#333", marginTop: "0px", marginBottom: "8px" }}>🔵 Blue Histogram Bars (Observed Data)</h4>
            <p style={interpretText}>
              These bars represent the <strong>actual distribution</strong> of shortest path lengths in your network. The height of each bar shows the <strong>density</strong> (frequency) of paths within that distance range. The bars show what your real data looks like without any assumptions.
            </p>
          </div>

          <div style={interpretSection}>
            <h4 style={{ color: "#c41e3a", marginTop: "0px", marginBottom: "8px" }}>🔴 Red Curve (Johnson SB Fit)</h4>
            <p style={interpretText}>
              This smooth curve is a <strong>mathematical model</strong> fitted to your observed data using a Johnson SB distribution. It represents the theoretical probability density function that best explains your network. If the curve matches the bars closely, your data follows a predictable pattern.
            </p>
          </div>

          <div style={interpretSection}>
            <h4 style={{ color: "#1976d2", marginTop: "0px", marginBottom: "8px" }}>📈 KS P-Value (Goodness of Fit)</h4>
            <p style={interpretText}>
              The <strong>Kolmogorov-Smirnov (KS) test</strong> measures how well the red curve matches the blue bars. The p-value tells you the confidence level:
            </p>
            <ul style={interpretList}>
              <li><strong>P-Value {'>'} 0.05:</strong> ✅ <strong>Good fit!</strong> The model accurately describes your network. The differences are just random variation.</li>
              <li><strong>P-Value {'<'} 0.05:</strong> ❌ <strong>Poor fit.</strong> The model doesn't match your data well. Your network may have unusual characteristics.</li>
            </ul>
          </div>

          <div style={interpretSection}>
            <h4 style={{ color: "#333", marginTop: "0px", marginBottom: "8px" }}>⚙️ Model Parameters (The Formula)</h4>
            <p style={{ ...interpretText, fontSize: "0.9rem", marginBottom: "8px" }}>These 4 numbers describe the exact shape and position of the red curve:</p>
            <ul style={interpretList}>
              <li><strong>γ (gamma):</strong> First shape parameter - controls how skewed the left side is</li>
              <li><strong>δ (delta):</strong> Second shape parameter - controls overall spread and peak height</li>
              <li><strong>λ (lambda):</strong> Scale parameter - stretches or compresses the curve horizontally (larger = wider spread)</li>
              <li><strong>ξ (xi):</strong> Location parameter - shifts the entire curve left or right (the minimum possible path length)</li>
            </ul>
          </div>

          <div style={{ ...interpretSection, backgroundColor: "#f0f7ff", borderLeft: "4px solid #1976d2", padding: "12px", marginTop: "15px" }}>
            <h4 style={{ color: "#1976d2", margin: "0 0 8px 0" }}>💡 What This Means for Your Network</h4>
            <p style={{ ...interpretText, margin: 0 }}>
              <strong>A good fit (p-value {'>'}  0.05)</strong> means your network has a consistent, predictable path distribution. This is valuable for network design, capacity planning, and forecasting. You can confidently use this model to predict future network behavior.
              <br /><br />
              <strong>A poor fit (p-value {'<'} 0.05)</strong> suggests your network has irregular characteristics—perhaps hub-and-spoke topology, unexpected bottlenecks, or uneven node placement. Consider investigating why the pattern doesn't match.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

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
            <p>Gamma: {prediction[0].toFixed(4)}</p>
            <p>Delta: {prediction[1].toFixed(4)}</p>
            <p>Lambda: {prediction[2].toFixed(4)}</p>
            <p>Xi: {prediction[3].toFixed(4)}</p>
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
  const [showChartModal, setShowChartModal] = useState(false);

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
  // --- THE CORE LOGIC ADDITION (FIXED) ---
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
    const xMin = Math.floor(Math.min(...edges) / 100) * 100; // Snap to nearest 100
    const xMax = Math.ceil(Math.max(...edges) / 100) * 100;
    
    // 4. Create bins (like histogram bars in the image)
    const numBins = 30; // ~30 bars like in reference image
    const binSize = (xMax - xMin) / numBins;
    
    // Create bin edges and labels
    const binLabels: number[] = [];
    const histogramData: number[] = [];
    
    for (let i = 0; i < numBins; i++) {
      const binCenter = xMin + (i + 0.5) * binSize;
      binLabels.push(Math.round(binCenter));
      
      // Count edges that fall in this bin
      const binStart = xMin + i * binSize;
      const binEnd = xMin + (i + 1) * binSize;
      const countInBin = edges.filter(e => e >= binStart && e < binEnd).length;
      
      // Convert count to density: count / (total edges * bin width)
      const density = countInBin / (edges.length * binSize);
      histogramData.push(density);
    }

    // 5. Generate smooth curve points on the same x-axis as bins
    const curvePoints = binLabels.map(johnsonsbPDF);

    // 6. Final Chart.js data object
    const finalData = {
      labels: binLabels, // Distance values (km) on X-axis
      datasets: [
        {
          type: "bar" as const, // Mixed chart type
          label: "Observed",
          data: histogramData,
          backgroundColor: "rgba(100, 149, 237, 0.5)", // Light blue with good transparency
          borderColor: "rgba(100, 149, 237, 0.7)",
          borderWidth: 0.5,
          borderRadius: 0,
          order: 2, // Plot this first (underneath)
        },
        {
          type: "line" as const,
          label: "Johnson SB Fit",
          data: curvePoints,
          borderColor: "rgb(255, 0, 0)", // Bright red
          backgroundColor: "transparent",
          borderWidth: 3,
          fill: false,
          pointRadius: 0, // Turn off data points for smooth curve
          pointHoverRadius: 0,
          tension: 0.4, // Smooth the line
          order: 1, // Plot this over the histogram
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
      setShowChartModal(true);
    } catch (err) {
      alert("Validation failed.");
    } finally {
      setLoading(false);
    }
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
        
        {metrics && (
          <div style={{ ...resultCard, borderLeft: `5px solid ${metrics.predictedPValue > 0.05 ? "#4CAF50" : "#ff4444"}`, padding: '10px' }}>
            
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
                <tr><td style={{ padding: "4px" }}>Gamma(Shape 1)</td><td>{metrics.predicted[0].toFixed(3)}</td><td>{metrics.trueParams[0].toFixed(3)}</td></tr>
                <tr><td style={{ padding: "4px" }}>Delta (Shape 2)</td><td>{metrics.predicted[1].toFixed(3)}</td><td>{metrics.trueParams[1].toFixed(3)}</td></tr>
                <tr><td style={{ padding: "4px" }}>Lambda (Scale)</td><td>{metrics.predicted[2].toFixed(1)}</td><td>{metrics.trueParams[2].toFixed(1)}</td></tr>
                <tr><td style={{ padding: "4px" }}>Xi (Loc)</td><td>{metrics.predicted[3].toFixed(1)}</td><td>{metrics.trueParams[3].toFixed(1)}</td></tr>
              </tbody>
            </table>

            <div style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
              <strong>KS Verdict: {metrics.predictedPValue > 0.05 ? "✅ Consistent" : "❌ Inconsistent"}</strong>
              <p style={{ fontSize: '0.8rem', color: '#666' }}>Max Deviation ($D$): {metrics.statistic.toFixed(4)}</p>
            </div>

            <button 
              onClick={() => setShowChartModal(true)} 
              style={{ ...btnStyle("#1976d2"), marginTop: "15px" }}
            >
              📈 View Full Chart & Analysis
            </button>
          </div>
        )}
      </div>

      {showChartModal && metrics && chartData && (
        <ChartModal 
          chartData={chartData} 
          metrics={metrics} 
          onClose={() => setShowChartModal(false)} 
        />
      )}
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
});
const statBox: React.CSSProperties = { padding: "10px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px", margin: "10px 0", fontSize: "0.9rem" };
const resultCard: React.CSSProperties = { marginTop: "20px", padding: "15px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", fontSize: "0.9rem" };

// Modal Styles
const modalOverlay: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalContent: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: "12px",
  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
  maxWidth: "1000px",
  width: "90%",
  maxHeight: "90vh",
  overflow: "auto",
  padding: "0",
};

const modalHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "20px",
  borderBottom: "1px solid #eee",
  backgroundColor: "#f9f9f9",
  position: "sticky",
  top: 0,
};

const closeBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: "28px",
  cursor: "pointer",
  color: "#666",
  padding: "0",
  width: "40px",
  height: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const interpretationBox: React.CSSProperties = {
  padding: "20px",
  backgroundColor: "#fafafa",
};

const interpretSection: React.CSSProperties = {
  marginBottom: "16px",
};

const interpretText: React.CSSProperties = {
  margin: "0 0 8px 0",
  fontSize: "0.95rem",
  lineHeight: "1.6",
  color: "#444",
};

const interpretList: React.CSSProperties = {
  margin: "8px 0",
  paddingLeft: "20px",
  fontSize: "0.9rem",
  lineHeight: "1.7",
  color: "#555",
};

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