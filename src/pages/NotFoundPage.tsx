import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="bg-white border rounded-3 p-4 shadow-sm">
      <h1 className="h5 fw-bold">Page not found</h1>
      <p className="text-muted">That route doesn’t exist.</p>
      <Link to="/" className="btn btn-dark btn-sm">
        Go home
      </Link>
    </div>
  );
}
