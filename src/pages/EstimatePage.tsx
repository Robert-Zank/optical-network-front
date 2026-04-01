import { useMemo, useState } from "react";
import { runModel, type PredictionResponse } from "../api/modelApi_calls";
import type { Node } from "../utils/geoUtils";
import TopologyUpload from "../components/inputs/TopologyUpload";
import TopologyMapPreview from "../components/inputs/TopologyMapPreview";
import ResultsSummaryCards from "../components/interpretation/ResultsSummaryCards";
import JohnsonSBTable from "../components/interpretation/JohnsonSBTable";
import CostBreakdownTable from "../components/interpretation/CostBreakdownTable";
import AssumptionsCard from "../components/interpretation/AssumptionsCard";

export default function EstimatePage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [showAssumptions, setShowAssumptions] = useState(false);

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
    setPrediction(null);
  };

  const handleReset = () => {
    setNodes([]);
    setError(null);
    setPrediction(null);
    setShowAssumptions(false);
  };

  const handleGenerateEstimate = async () => {
    if (nodes.length < 3) {
      setError("At least 3 nodes are required to generate an estimate.");
      return;
    }

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
    <>
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
            <div className="d-flex justify-content-between align-items-center">
              <div className="fw-semibold">Results</div>
              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={() => setShowAssumptions(true)}
              >
                View Assumptions
              </button>
            </div>

            <div className="text-muted small mt-1">
              Predicted parameters and equipment cost summary will appear here.
            </div>

            <ResultsSummaryCards prediction={prediction} />
            <JohnsonSBTable params={prediction?.result ?? null} />
            <CostBreakdownTable costEstimate={prediction?.cost_estimate ?? null} />
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

      {showAssumptions && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            zIndex: 1050,
          }}
          onClick={() => setShowAssumptions(false)}
        >
          <div
            className="bg-white rounded-3 shadow p-3"
            style={{
              width: "min(700px, 92vw)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="fw-semibold">Current Assumptions</div>
              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={() => setShowAssumptions(false)}
              >
                Close
              </button>
            </div>

            <AssumptionsCard
              assumptions={prediction?.cost_estimate.assumptions ?? null}
            />
          </div>
        </div>
      )}
    </>
  );
}