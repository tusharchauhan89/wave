import "./MobileNav.css";
import { NavLink } from "react-router-dom";
import { House, Search, Library, Heart } from "lucide-react";

export default function MobileNav() {
  return (
    <nav className="mobile-nav">
      <NavLink to="/" end className="mobile-nav-item">
        <House size={22} />
        <span>Home</span>
      </NavLink>

      <NavLink to="/search" className="mobile-nav-item">
        <Search size={22} />
        <span>Search</span>
      </NavLink>

      <NavLink to="/liked" className="mobile-nav-item">
        <Heart size={22} />
        <span>Liked</span>
      </NavLink>

      <NavLink to="/library" className="mobile-nav-item">
        <Library size={22} />
        <span>Library</span>
      </NavLink>
    </nav>
  );
}