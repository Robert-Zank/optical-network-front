import { useState } from "react";
import type { Node } from "../../utils/geoUtils";

interface TopologyUploadProps {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

function parseCsvToNodes(csvText: string): Node[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const idIndex = headers.findIndex((h) => h === "id" || h === "node_id");
  const latIndex = headers.findIndex((h) => h === "lat" || h === "latitude");
  const lngIndex = headers.findIndex(
    (h) => h === "lng" || h === "lon" || h === "longitude"
  );

  if (latIndex === -1 || lngIndex === -1) {
    throw new Error("CSV must contain latitude and longitude columns.");
  }

  const parsedNodes: Node[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());

    const lat = Number(cols[latIndex]);
    const lng = Number(cols[lngIndex]);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new Error(`Invalid latitude/longitude on row ${i + 1}.`);
    }

    const rawId = idIndex >= 0 ? cols[idIndex] : String(i);

    parsedNodes.push({
      id: rawId === "" ? i : Number.isNaN(Number(rawId)) ? rawId : Number(rawId),
      lat,
      lng,
    });
  }

  if (parsedNodes.length < 3) {
    throw new Error("CSV must contain at least 3 nodes.");
  }

  const ids = new Set<string>();
  const coords = new Set<string>();

  for (const node of parsedNodes) {
    const idKey = String(node.id);
    const coordKey = `${node.lat},${node.lng}`;

    if (ids.has(idKey)) {
      throw new Error(`Duplicate node id found: ${node.id}`);
    }
    ids.add(idKey);

    if (coords.has(coordKey)) {
      throw new Error(`Duplicate coordinates found for node ${node.id}`);
    }
    coords.add(coordKey);

    if (node.lat < -90 || node.lat > 90) {
      throw new Error(`Invalid latitude for node ${node.id}`);
    }

    if (node.lng < -180 || node.lng > 180) {
      throw new Error(`Invalid longitude for node ${node.id}`);
    }
  }

  return parsedNodes;
}

export default function TopologyUpload({
  nodes,
  setNodes,
}: TopologyUploadProps) {
  const [fileName, setFileName] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsedNodes = parseCsvToNodes(text);
      setNodes(parsedNodes);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to parse CSV file.";
      setUploadError(message);
      setNodes([]);
    }
  };

  const handleClear = () => {
    setNodes([]);
    setFileName("");
    setUploadError(null);
  };

  return (
    <div className="bg-white border rounded-3 p-3 shadow-sm mb-3">
      <div className="fw-semibold">1. Topology Input</div>
      <div className="text-muted small mt-1">
        Upload a CSV with node coordinates.
      </div>

      <div className="mt-3">
        <input
          className="form-control"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
        />
      </div>

      <div className="small text-muted mt-2">
        Expected columns: <code>id, lat, lng</code>
      </div>

      {fileName && (
        <div className="mt-3 small">
          <span className="fw-semibold">Loaded file:</span> {fileName}
        </div>
      )}

      {uploadError && (
        <div className="alert alert-danger mt-3 mb-0 py-2">{uploadError}</div>
      )}

      {!uploadError && nodes.length > 0 && (
        <div className="mt-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="small">
              <span className="fw-semibold">Nodes loaded:</span> {nodes.length}
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={handleClear}
            >
              Clear
            </button>
          </div>

          <div className="table-responsive border rounded-3">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                </tr>
              </thead>
              <tbody>
                {nodes.slice(0, 5).map((node) => (
                  <tr key={String(node.id)}>
                    <td>{node.id}</td>
                    <td>{node.lat}</td>
                    <td>{node.lng}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {nodes.length > 5 && (
            <div className="small text-muted mt-2">
              Showing first 5 rows only.
            </div>
          )}
        </div>
      )}
    </div>
  );
}