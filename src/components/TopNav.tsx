import { NavLink } from "react-router-dom";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <li className="nav-item">
      <NavLink
        to={to}
        end={to === "/"}
        className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
      >
        {label}
      </NavLink>
    </li>
  );
}

export default function TopNav() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
      <div className="container">
        <NavLink to="/" className="navbar-brand fw-semibold">
          OptiNet Estimator
        </NavLink>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
          aria-controls="mainNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <NavItem to="/" label="Home" />
            <NavItem to="/estimate" label="Estimator" />
            <NavItem to="/about" label="About" />
          </ul>

          <div className="d-flex gap-2">
            <button className="btn btn-outline-light btn-sm" type="button" disabled>
              Demo
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
