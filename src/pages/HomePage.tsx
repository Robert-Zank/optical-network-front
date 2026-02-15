import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="p-4 p-md-5 bg-white border rounded-3 shadow-sm">
          <h1 className="h3 fw-bold mb-2">Estimate optical networks fast.</h1>
          <p className="text-muted mb-4" style={{ maxWidth: 720 }}>
            Upload node locations, construct a graph, and generate predicted Johnson SB parameters plus a rough cost
            estimate based on shortest-path behavior.
          </p>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/estimate" className="btn btn-dark">
              Start estimate
            </Link>
            <button className="btn btn-outline-secondary" type="button" disabled>
              Use sample data (soon)
            </button>
          </div>
        </div>
      </div>

      <div className="col-12 col-md-4">
        <div className="bg-white border rounded-3 p-3 shadow-sm h-100">
          <div className="fw-semibold">Topology input</div>
          <div className="text-muted small mt-1">CSV upload and validation.</div>
        </div>
      </div>
      <div className="col-12 col-md-4">
        <div className="bg-white border rounded-3 p-3 shadow-sm h-100">
          <div className="fw-semibold">Model inference</div>
          <div className="text-muted small mt-1">Predict Johnson SB parameters.</div>
        </div>
      </div>
      <div className="col-12 col-md-4">
        <div className="bg-white border rounded-3 p-3 shadow-sm h-100">
          <div className="fw-semibold">Export</div>
          <div className="text-muted small mt-1">Download JSON/CSV (later).</div>
        </div>
      </div>
    </div>
  );
}
