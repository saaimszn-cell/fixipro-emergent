import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Menu, Wrench, Sun, Moon } from "lucide-react";

export function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem("sh-theme") === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("sh-theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, setDark];
}

export function ThemeToggle() {
  const [dark, setDark] = useTheme();
  return (
    <button data-testid="theme-toggle" onClick={() => setDark(!dark)} aria-label="Toggle theme"
      className="h-9 w-9 flex items-center justify-center border border-border bg-background/60 backdrop-blur transition-colors duration-200 hover:bg-secondary">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

const NAV = [
  { to: "/services", label: "Services" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/coverage", label: "Coverage" },
  { to: "/blog", label: "Blog" },
];

export function Logo({ light }) {
  return (
    <Link to="/" data-testid="logo-link" className="flex items-center gap-2 shrink-0">
      <span className={`h-8 w-8 flex items-center justify-center ${light ? "bg-white text-slate-900" : "bg-primary text-primary-foreground"}`}>
        <Wrench className="h-4.5 w-4.5 h-5 w-5" aria-hidden />
      </span>
      <span className={`font-display font-extrabold text-lg tracking-tight ${light ? "text-white" : ""}`}>
        ServiceHub<span className="text-accent">.</span>
      </span>
    </Link>
  );
}

export default function PublicLayout() {
  const { user, homeFor } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-black/5 dark:border-white/10 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl saturate-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Logo />
          <nav className="hidden lg:flex items-center gap-1" data-testid="desktop-nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} data-testid={`nav-${n.label.toLowerCase().replaceAll(" ", "-")}`}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm font-medium transition-colors duration-200 hover:text-accent ${isActive ? "text-accent" : "text-foreground/80"}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button data-testid="nav-dashboard-btn" onClick={() => navigate(homeFor(user))} className="rounded-none">
                Dashboard
              </Button>
            ) : (
              <>
                <Button data-testid="nav-login-btn" variant="ghost" onClick={() => navigate("/login")} className="hidden sm:inline-flex rounded-none">
                  Log in
                </Button>
                <Button data-testid="nav-get-started-btn" onClick={() => navigate("/register")} className="rounded-none bg-accent hover:bg-accent/90 text-white">
                  Get started
                </Button>
              </>
            )}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button data-testid="mobile-menu-btn" className="lg:hidden h-9 w-9 flex items-center justify-center border border-border" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <nav className="flex flex-col gap-1 mt-8">
                  {[...NAV, { to: "/become-provider", label: "Become a provider" }, { to: "/contact", label: "Contact" }].map((n) => (
                    <Link key={n.to} to={n.to} onClick={() => setOpen(false)} data-testid={`mnav-${n.label.toLowerCase().replaceAll(" ", "-")}`}
                      className="px-3 py-3 text-base font-medium border-b border-border transition-colors duration-200 hover:text-accent">
                      {n.label}
                    </Link>
                  ))}
                  {!user && (
                    <Button data-testid="mnav-login-btn" onClick={() => { setOpen(false); navigate("/login"); }} className="mt-4 rounded-none">
                      Log in
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-slate-950 text-slate-300 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <p className="font-display font-black text-4xl sm:text-6xl tracking-tight text-white leading-none">
            Every home deserves<br />a trusted pair of hands<span className="text-accent">.</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-14 text-sm">
            <div>
              <p className="label-caps text-slate-500 mb-4">Marketplace</p>
              <ul className="space-y-2.5">
                <li><Link data-testid="footer-services" to="/services" className="transition-colors duration-200 hover:text-white">All services</Link></li>
                <li><Link data-testid="footer-coverage" to="/coverage" className="transition-colors duration-200 hover:text-white">Coverage areas</Link></li>
                <li><Link data-testid="footer-pricing" to="/pricing" className="transition-colors duration-200 hover:text-white">Pricing</Link></li>
                <li><Link data-testid="footer-reviews" to="/reviews" className="transition-colors duration-200 hover:text-white">Reviews</Link></li>
              </ul>
            </div>
            <div>
              <p className="label-caps text-slate-500 mb-4">Company</p>
              <ul className="space-y-2.5">
                <li><Link data-testid="footer-about" to="/about" className="transition-colors duration-200 hover:text-white">About us</Link></li>
                <li><Link data-testid="footer-careers" to="/coming-soon" className="transition-colors duration-200 hover:text-white">Careers</Link></li>
                <li><Link data-testid="footer-blog" to="/blog" className="transition-colors duration-200 hover:text-white">Blog</Link></li>
                <li><Link data-testid="footer-contact" to="/contact" className="transition-colors duration-200 hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <p className="label-caps text-slate-500 mb-4">Professionals</p>
              <ul className="space-y-2.5">
                <li><Link data-testid="footer-become-provider" to="/become-provider" className="transition-colors duration-200 hover:text-white">Become a provider</Link></li>
                <li><Link data-testid="footer-how-it-works" to="/how-it-works" className="transition-colors duration-200 hover:text-white">How it works</Link></li>
                <li><Link data-testid="footer-faq" to="/faq" className="transition-colors duration-200 hover:text-white">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <p className="label-caps text-slate-500 mb-4">Legal</p>
              <ul className="space-y-2.5">
                <li><Link data-testid="footer-privacy" to="/legal/privacy-policy" className="transition-colors duration-200 hover:text-white">Privacy policy</Link></li>
                <li><Link data-testid="footer-terms" to="/legal/terms" className="transition-colors duration-200 hover:text-white">Terms & conditions</Link></li>
                <li><Link data-testid="footer-cookies" to="/legal/cookies" className="transition-colors duration-200 hover:text-white">Cookie policy</Link></li>
                <li><Link data-testid="footer-accessibility" to="/legal/accessibility" className="transition-colors duration-200 hover:text-white">Accessibility</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-14 pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 ServiceHub Ltd · example.co.uk · Internal testing build — not for production use.</p>
            <p>Made for UK homes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
