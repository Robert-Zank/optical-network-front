export default function Footer() {
  return (
    <footer className="border-top bg-white">
      <div className="container py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
        <div className="text-muted small">
          © {new Date().getFullYear()} OptiNet Estimator
        </div>
        <div className="text-muted small">React • TypeScript • Bootstrap</div>
      </div>
    </footer>
  );
}
