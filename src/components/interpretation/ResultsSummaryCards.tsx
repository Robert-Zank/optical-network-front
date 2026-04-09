import type { PredictionResponse } from "../../api/modelApi_calls";

interface ResultsSummaryCardsProps {
  prediction: PredictionResponse | null;
}

export default function ResultsSummaryCards({
  prediction,
}: ResultsSummaryCardsProps) {
  const costEstimate = prediction?.cost_estimate ?? null;
  const estimatedCost = costEstimate?.costs.total ?? null;

  return (
    <div className="row g-2 mt-3">
      <div className="col-12 col-md-6">
        <div className="border rounded-3 p-3 h-100">
          <div className="text-muted small">Estimated Equipment Cost</div>
          <div className="fw-bold">
            {estimatedCost !== null ? `$${estimatedCost.toLocaleString()}` : "—"}
          </div>
        </div>
      </div>

      <div className="col-12 col-md-6">
        <div className="border rounded-3 p-3 h-100">
          <div className="text-muted small">Total Paths</div>
          <div className="fw-bold">
            {costEstimate ? costEstimate.total_paths.toLocaleString() : "—"}
          </div>
        </div>
      </div>

    </div>
  );
}