import { Outlet } from "react-router-dom";
import TopNav from "../components/TopNav";
import Footer from "../components/Footer";

export default function AppLayout() {
  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <TopNav />
      <main className="flex-grow-1">
        <div className="container py-4">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
