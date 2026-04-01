import { useMemo, useState } from "react";
import { runModel, type PredictionResponse } from "../api/modelApi_calls";
import type { Node } from "../utils/geoUtils";
import TopologyUpload from "../components/TopologyUpload";
import TopologyMapPreview from "../components/TopologyMapPreview";

export default function EstimatePage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const params = prediction?.result ?? null;
  const costEstimate = prediction?.cost_estimate ?? null;
  const estimatedCost = costEstimate?.costs.total ?? null;

  const handleLoadSample = () => {
    setNodes(sampleNodes);
    setError(null);
    setPrediction(null);
  };

  const handleReset = () => {
    setNodes([]);
    setError(null);
    setPrediction(null);
  };

  const handleGenerateEstimate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await runModel(nodes);
      setPrediction(response);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while generating the estimate.";

      setError(message);
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-2">
          <div>
            <h1 className="h4 fw-bold mb-1">Estimator</h1>
            <div className="text-muted">
              Input topology → run inference → view results.
            </div>
          </div>

          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={handleReset}
            >
              Reset
            </button>

            <button
              className="btn btn-dark btn-sm"
              type="button"
              onClick={handleLoadSample}
            >
              Load sample
            </button>
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-5">
        <TopologyUpload nodes={nodes} setNodes={setNodes} />

        <div className="bg-white border rounded-3 p-3 shadow-sm">
          <div className="fw-semibold">2. Run</div>

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
            Predicted parameters and cost summary will appear here.
          </div>

          <div className="row g-2 mt-3">
            <div className="col-12 col-md-4">
              <div className="border rounded-3 p-3 h-100">
                <div className="text-muted small">Estimated Cost</div>
                <div className="fw-bold">
                  {estimatedCost !== null
                    ? `$${estimatedCost.toLocaleString()}`
                    : "—"}
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="border rounded-3 p-3 h-100">
                <div className="text-muted small">Total Paths</div>
                <div className="fw-bold">
                  {costEstimate ? costEstimate.total_paths.toLocaleString() : "—"}
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="border rounded-3 p-3 h-100">
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

          <div className="mt-3 border rounded-3 p-3">
            <div className="fw-semibold small">Cost Breakdown</div>

            {!costEstimate ? (
              <div className="text-muted small mt-1">
                No cost breakdown available yet.
              </div>
            ) : (
              <div className="table-responsive mt-2">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Probability</th>
                      <th>Path Count</th>
                      <th>Booster Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>16QAM</td>
                      <td>{costEstimate.probabilities["16QAM"].toFixed(4)}</td>
                      <td>{costEstimate.path_counts["16QAM"]}</td>
                      <td>{costEstimate.booster_counts["16QAM"]}</td>
                    </tr>
                    <tr>
                      <td>8QAM</td>
                      <td>{costEstimate.probabilities["8QAM"].toFixed(4)}</td>
                      <td>{costEstimate.path_counts["8QAM"]}</td>
                      <td>{costEstimate.booster_counts["8QAM"]}</td>
                    </tr>
                    <tr>
                      <td>QPSK</td>
                      <td>{costEstimate.probabilities["QPSK"].toFixed(4)}</td>
                      <td>{costEstimate.path_counts["QPSK"]}</td>
                      <td>{costEstimate.booster_counts["QPSK"]}</td>
                    </tr>
                    <tr>
                      <td>BPSK</td>
                      <td>{costEstimate.probabilities["BPSK"].toFixed(4)}</td>
                      <td>{costEstimate.path_counts["BPSK"]}</td>
                      <td>{costEstimate.booster_counts["BPSK"]}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-3 pt-3 border-top">
                  <div className="row g-2">
                    <div className="col-12 col-md-4">
                      <div className="small text-muted">Transponder Cost</div>
                      <div className="fw-semibold">
                        ${costEstimate.costs.transponders.toLocaleString()}
                      </div>
                    </div>

                    <div className="col-12 col-md-4">
                      <div className="small text-muted">Booster Cost</div>
                      <div className="fw-semibold">
                        ${costEstimate.costs.boosters.toLocaleString()}
                      </div>
                    </div>

                    <div className="col-12 col-md-4">
                      <div className="small text-muted">Total Cost</div>
                      <div className="fw-semibold">
                        ${costEstimate.costs.total.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
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