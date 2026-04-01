import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="p-4 p-md-5 bg-white border rounded-3 shadow-sm">
          <div className="text-uppercase small text-muted fw-semibold mb-2">
            Optical Network Parameter Prediction
          </div>

          <h1 className="h3 fw-bold mb-2">
            Predict optical network behavior from topology input.
          </h1>

          <p className="text-muted mb-4" style={{ maxWidth: 760 }}>
            This tool uses machine learning and geometric network features to estimate
            Johnson SB distribution parameters from node locations. Upload a CSV of
            network nodes, preview the topology on a map, run inference, and review
            predicted parameters alongside an early-stage cost estimate.
          </p>

          <div className="d-flex flex-wrap gap-2">
            <Link to="/estimate" className="btn btn-dark">
              Open estimator
            </Link>
            <button className="btn btn-outline-secondary" type="button" disabled>
              Sample workflow coming soon
            </button>
          </div>
        </div>
      </div>

      <div className="col-12 col-md-4">
        <div className="bg-white border rounded-3 p-3 shadow-sm h-100">
          <div className="fw-semibold">1. Upload topology</div>
          <div className="text-muted small mt-1">
            Import node coordinates from CSV and prepare them for model input.
          </div>
        </div>
      </div>

      <div className="col-12 col-md-4">
        <div className="bg-white border rounded-3 p-3 shadow-sm h-100">
          <div className="fw-semibold">2. Run prediction</div>
          <div className="text-muted small mt-1">
            Generate Johnson SB parameters from geometric and topology-based features.
          </div>
        </div>
      </div>

      <div className="col-12 col-md-4">
        <div className="bg-white border rounded-3 p-3 shadow-sm h-100">
          <div className="fw-semibold">3. Review results</div>
          <div className="text-muted small mt-1">
            Inspect predicted parameters, map the uploaded nodes, and view a rough cost estimate.
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="bg-white border rounded-3 p-4 shadow-sm">
          <div className="fw-semibold mb-2">Interpretation</div>
          <div className="text-muted small" style={{ maxWidth: 900 }}>
          These Johnson SB parameters describe the predicted shortest-path length
          distribution of the uploaded topology. The distribution is then used to
          estimate how many paths fall into different distance ranges, which supports
          the equipment cost calculation.
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="bg-white border rounded-3 p-4 shadow-sm">
          <div className="fw-semibold mb-2">What this project does</div>
          <div className="text-muted small" style={{ maxWidth: 900 }}>
            The goal of this project is to support early-stage optical network analysis
            by connecting network topology to predicted shortest-path distribution behavior.
            Instead of requiring a fully built graph and detailed simulation workflow up front,
            this estimator provides a faster way to move from node placement to useful model outputs.
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="bg-white border rounded-3 p-4 shadow-sm">
          <div className="fw-semibold mb-2">Current Limitations</div>
          <div className="text-muted small" style={{ maxWidth: 900 }}>
          <li>Some topology inputs are still approximated using geometric features only.</li>
          <li>The cost estimate focuses on equipment, not full fiber construction.</li>
          <li>The model is intended for early-stage comparison, not final deployment planning.</li>
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="bg-white border rounded-3 p-4 shadow-sm">
          <div className="fw-semibold mb-2">How the cost estimate works</div>
          <p className="text-muted small mb-3" style={{ maxWidth: 900 }}>
            The estimator does not assign cost directly from the uploaded node coordinates. First,
            the topology is converted into geometric features and passed into the machine learning
            model. The model predicts four Johnson SB distribution parameters that describe the
            expected shortest-path length behavior of the network.
          </p>
          <p className="text-muted small mb-3" style={{ maxWidth: 900 }}>
            Using the predicted distribution, the application estimates how many paths fall into
            different distance ranges. These ranges correspond to different modulation formats,
            such as 16QAM, 8QAM, QPSK, and BPSK. From there, the system can estimate the type of
            transponders/receivers required and how many optical boosters may be needed along
            longer paths.
          </p>
          <p className="text-muted small mb-0" style={{ maxWidth: 900 }}>
            The final result is an early-stage equipment cost estimate based on predicted network
            behavior, rather than a full physical construction estimate. This makes it useful for
            comparing candidate topologies before detailed simulation or deployment planning.
          </p>
        </div>
      </div>
    </div>
  );
}