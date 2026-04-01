import type { PredictionResponse } from "../../api/modelApi_calls";

interface AssumptionsCardProps {
  assumptions: PredictionResponse["cost_estimate"]["assumptions"] | null;
}

export default function AssumptionsCard({
  assumptions,
}: AssumptionsCardProps) {
  if (!assumptions) {
    return (
      <div className="bg-white border rounded-3 p-3 shadow-sm mb-3">
        <div className="fw-semibold">Current Assumptions</div>
        <div className="text-muted small mt-2">
          Assumptions will appear after a prediction is generated.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-3 p-3 shadow-sm mb-3">
      <div className="fw-semibold">Current Assumptions</div>

      <div className="mt-3">
        <div className="small fw-semibold">Path Ranges (km)</div>
        <ul className="small text-muted mb-0 mt-2">
          <li>
            16QAM: {assumptions.path_ranges_km["16QAM"][0]} –{" "}
            {assumptions.path_ranges_km["16QAM"][1]} km
          </li>
          <li>
            8QAM: {assumptions.path_ranges_km["8QAM"][0]} –{" "}
            {assumptions.path_ranges_km["8QAM"][1]} km
          </li>
          <li>
            QPSK: {assumptions.path_ranges_km["QPSK"][0]} –{" "}
            {assumptions.path_ranges_km["QPSK"][1]} km
          </li>
          <li>
            BPSK: {assumptions.path_ranges_km["BPSK"][0]} –{" "}
            {assumptions.path_ranges_km["BPSK"][1]} km
          </li>
        </ul>
      </div>

      <div className="mt-3">
        <div className="small fw-semibold">Boosters Per Bucket</div>
        <ul className="small text-muted mb-0 mt-2">
          <li>16QAM: {assumptions.boosters_per_bucket["16QAM"]}</li>
          <li>8QAM: {assumptions.boosters_per_bucket["8QAM"]}</li>
          <li>QPSK: {assumptions.boosters_per_bucket["QPSK"]}</li>
          <li>BPSK: {assumptions.boosters_per_bucket["BPSK"]}</li>
        </ul>
      </div>

      <div className="mt-3">
        <div className="small fw-semibold">Cost Assumptions</div>
        <ul className="small text-muted mb-0 mt-2">
          <li>Booster cost: ${assumptions.booster_cost.toLocaleString()}</li>
          <li>
            16QAM transponder cost: $
            {assumptions.transponder_costs["16QAM"].toLocaleString()}
          </li>
          <li>
            8QAM transponder cost: $
            {assumptions.transponder_costs["8QAM"].toLocaleString()}
          </li>
          <li>
            QPSK transponder cost: $
            {assumptions.transponder_costs["QPSK"].toLocaleString()}
          </li>
          <li>
            BPSK transponder cost: $
            {assumptions.transponder_costs["BPSK"].toLocaleString()}
          </li>
        </ul>
      </div>
    </div>
  );
}