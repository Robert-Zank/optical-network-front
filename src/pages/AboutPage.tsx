export default function AboutPage() {
  return (
    <div className="bg-white border rounded-3 p-4 shadow-sm">
      <h1 className="h4 fw-bold mb-2">About</h1>
      <p className="text-muted mb-0">
        This tool estimates optical network characteristics and costs from topology geometry using an ML model that
        predicts Johnson SB distribution parameters and related shortest-path statistics.
      </p>
    </div>
  );
}
