export default function EstimatePage() {
  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-2">
          <div>
            <h1 className="h4 fw-bold mb-1">Estimator</h1>
            <div className="text-muted">Input topology → run inference → view results.</div>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" type="button">
              Reset
            </button>
            <button className="btn btn-dark btn-sm" type="button">
              Load sample
            </button>
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-5">
        <div className="bg-white border rounded-3 p-3 shadow-sm mb-3">
          <div className="fw-semibold">1. Topology Input</div>
          <div className="text-muted small mt-1">CSV upload + table editor will go here.</div>
          <div className="border rounded-3 p-4 mt-3 text-muted small text-center">
            Upload placeholder
          </div>
        </div>

        <div className="bg-white border rounded-3 p-3 shadow-sm mb-3">
          <div className="fw-semibold">2. Cost Model</div>
          <div className="row g-2 mt-1">
            <div className="col-12">
              <label className="form-label small mb-1">Fiber cost ($/km)</label>
              <input className="form-control" type="number" placeholder="e.g., 12000" />
            </div>
            <div className="col-12">
              <label className="form-label small mb-1">Contingency (%)</label>
              <input className="form-control" type="number" placeholder="e.g., 10" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-3 p-3 shadow-sm">
          <div className="fw-semibold">3. Run</div>
          <button className="btn btn-dark w-100 mt-3" type="button">
            Generate estimate
          </button>
          <div className="text-muted small mt-2">
            Next: wire this to your FastAPI endpoint.
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-7">
        <div className="bg-white border rounded-3 p-3 shadow-sm">
          <div className="fw-semibold">Results</div>
          <div className="text-muted small mt-1">Predicted parameters + cost summary will appear here.</div>

          <div className="row g-2 mt-3">
            <div className="col-12 col-md-4">
              <div className="border rounded-3 p-3">
                <div className="text-muted small">Estimated Cost</div>
                <div className="fw-bold">—</div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="border rounded-3 p-3">
                <div className="text-muted small">Fiber Length</div>
                <div className="fw-bold">—</div>
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
            <div className="text-muted small mt-1">Table/chart placeholder.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
