import type { PredictionResponse } from "../../api/modelApi_calls";

interface CostBreakdownTableProps {
  costEstimate: PredictionResponse["cost_estimate"] | null;
}

export default function CostBreakdownTable({
  costEstimate,
}: CostBreakdownTableProps) {
  return (
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
  );
}