import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, ArrowUpRight, Headphones } from "lucide-react";
import { usePlayer } from "./player";

export function Brand() {
  const { catalog } = usePlayer();
  return (
    <img
      className="official-logo"
      src={catalog?.settings.logo_url || "/assets/brand/as-salaam-logo.png"}
      alt="As-Salaam Institute"
      width="118"
      height="126"
    />
  );
}

export function Header() {
  const home = useLocation({ select: (location) => location.pathname === "/" });
  const [menu, setMenu] = useState(false);
  const { current, open } = usePlayer();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={"site-header " + (home ? "header-over-film" : "header-on-paper")}>
        <Link
          to="/"
          aria-label="As-Salaam Institute home"
          className="brand-link"
          onClick={() => setMenu(false)}
        >
          <Brand />
        </Link>
        <nav className={menu ? "navigation is-open" : "navigation"} aria-label="Main navigation">
          <Link to="/" onClick={() => setMenu(false)}>
            The journey
          </Link>
          <Link to="/surahs" onClick={() => setMenu(false)}>
            Surah library
          </Link>
          <Link to="/recitations" onClick={() => setMenu(false)}>
            Recordings
          </Link>
          <Link to="/about" onClick={() => setMenu(false)}>
            About
          </Link>
        </nav>
        {current ? (
          <button className="header-listen" onClick={open}>
            <Headphones size={15} /> Now playing
          </button>
        ) : (
          <a className="header-listen" href={home ? "#featured" : "/recitations"}>
            Listen now <ArrowUpRight size={15} />
          </a>
        )}
        <button
          className="menu-toggle"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
    </>
  );
}

export function Footer() {
  return (
    <footer className="archive-footer">
      <Brand />
      <div>
        <p>A space for the Qur'an.</p>
        <span>Listen. Reflect. Remember.</span>
      </div>
      <nav aria-label="Footer">
        <Link to="/surahs">Surah library</Link>
        <Link to="/admin">
          Owner sign in <ArrowUpRight size={13} />
        </Link>
      </nav>
    </footer>
  );
}
