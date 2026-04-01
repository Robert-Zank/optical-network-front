export default function AssumptionsCard() {
  return (
    <div className="bg-white border rounded-3 p-3 shadow-sm mb-3">
      <div className="fw-semibold">Current Assumptions</div>
      <ul className="small text-muted mb-0 mt-2">
        <li>Booster spacing is approximated at 80 km.</li>
        <li>Path ranges are grouped into 16QAM, 8QAM, QPSK, and BPSK buckets.</li>
        <li>Equipment costs are modeled as early-stage estimates, not vendor quotes.</li>
      </ul>
    </div>
  );
}