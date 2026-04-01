import { useMemo, useState } from "react";
import { runModel, type PredictionResponse } from "../api/modelApi_calls";
import type { Node } from "../utils/geoUtils";
import TopologyUpload from "../components/TopologyUpload";
import TopologyMapPreview from "../components/TopologyMapPreview";

export default function EstimatePage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [fiberCost, setFiberCost] = useState<number>(12000);
  const [contingency, setContingency] = useState<number>(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<[number, number, number, number] | null>(null);

  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);

  const sampleNodes: Node[] = useMemo(
    () => [
      { id: 1, lat: 39.5101, lng: -84.7429 },
      { id: 2, lat: 39.5155, lng: -84.7302 },
      { id: 3, lat: 39.5012, lng: -84.7211 },
      { id: 4, lat: 39.4978, lng: -84.7484 },
    ],
    []
  );

  const handleLoadSample = () => {
    setNodes(sampleNodes);
    setError(null);
    setParams(null);
  };

  const handleReset = () => {
    setNodes([]);
    setFiberCost(12000);
    setContingency(10);
    setParams(null);
    setError(null);
  };

  const handleGenerateEstimate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await runModel(nodes);
      setPrediction(response);
      setParams(response.result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong while generating the estimate.";
      setError(message);
      setParams(null);
    } finally {
      setLoading(false);
    }
  };

  const estimatedCost = useMemo(() => {
    if (!params) return "—";

    const fiberLengthKm = 0;
    const subtotal = fiberLengthKm * fiberCost;
    const total = subtotal * (1 + contingency / 100);

    return `$${total.toLocaleString()}`;
  }, [params, fiberCost, contingency]);

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-2">
          <div>
            <h1 className="h4 fw-bold mb-1">Estimator</h1>
            <div className="text-muted">Input topology → run inference → view results.</div>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" type="button" onClick={handleReset}>
              Reset
            </button>
            <button className="btn btn-dark btn-sm" type="button" onClick={handleLoadSample}>
              Load sample
            </button>
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-5">
        <TopologyUpload nodes={nodes} setNodes={setNodes} />

        <div className="bg-white border rounded-3 p-3 shadow-sm mb-3">
          <div className="fw-semibold">2. Cost Model</div>
          <div className="row g-2 mt-1">
            <div className="col-12">
              <label className="form-label small mb-1">Fiber cost ($/km)</label>
              <input
                className="form-control"
                type="number"
                placeholder="e.g., 12000"
                value={fiberCost}
                onChange={(e) => setFiberCost(Number(e.target.value))}
              />
            </div>
            <div className="col-12">
              <label className="form-label small mb-1">Contingency (%)</label>
              <input
                className="form-control"
                type="number"
                placeholder="e.g., 10"
                value={contingency}
                onChange={(e) => setContingency(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-3 p-3 shadow-sm">
          <div className="fw-semibold">3. Run</div>
          <button
            className="btn btn-dark w-100 mt-3"
            type="button"
            onClick={handleGenerateEstimate}
            disabled={loading || nodes.length === 0}
          >
            {loading ? "Generating..." : "Generate estimate"}
          </button>

          <div className="text-muted small mt-2">
            Upload a CSV or load sample nodes, then run the model.
          </div>

          {error && <div className="text-danger small mt-2">{error}</div>}
        </div>
      </div>

      <div className="col-12 col-lg-7">
        <div className="bg-white border rounded-3 p-3 shadow-sm mb-3">
          <div className="fw-semibold">Results</div>
          <div className="text-muted small mt-1">
            Predicted parameters + cost summary will appear here.
          </div>

          <div className="row g-2 mt-3">
            <div className="col-12 col-md-4">
              <div className="border rounded-3 p-3">
                <div className="text-muted small">Estimated Cost</div>
                <div className="fw-bold">
                  {prediction
                    ? `$${prediction.cost_estimate.costs.total.toLocaleString()}`
                    : "—"}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="border rounded-3 p-3">
                <div className="text-muted small">KSS</div>
                <div className="fw-bold">—</div>
              </div>
            </div>
          </div>

          <div className="mt-3 border rounded-3 p-3">
            <div className="fw-semibold small">Johnson SB Parameters</div>

            {!params ? (
              <div className="text-muted small mt-1">No prediction yet.</div>
            ) : (
              <div className="table-responsive mt-2">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Gamma</td>
                      <td>{params[0].toFixed(4)}</td>
                    </tr>
                    <tr>
                      <td>Delta</td>
                      <td>{params[1].toFixed(4)}</td>
                    </tr>
                    <tr>
                      <td>Lambda</td>
                      <td>{params[2].toFixed(4)}</td>
                    </tr>
                    <tr>
                      <td>Xi</td>
                      <td>{params[3].toFixed(4)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-3 p-3 shadow-sm">
          <div className="fw-semibold">Topology Preview</div>
          <div className="text-muted small mt-1">
            Uploaded node locations will appear here.
          </div>
          <div className="mt-3">
            <TopologyMapPreview nodes={nodes} />
          </div>
        </div>
      </div>
    </div>
  );
}