import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollProgress, CursorGlow } from "./motion";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Menu, Wrench, Zap, Sparkles, Leaf, Paintbrush, Hammer, Drill, Plug, Sun, Moon, ChevronDown, Search, MapPin, MessageCircle, User } from "lucide-react";

const MEGA_ICONS = { Wrench, Zap, Sparkles, Leaf, Paintbrush, Hammer, Drill, Plug };

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
  { to: "/how-it-works", label: "How It Works" },
  { to: "/become-provider", label: "Handyman" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Help & Support" },
];

export function Logo({ light }) {
  return (
    <Link to="/" data-testid="logo-link" className="flex items-center gap-2.5 shrink-0">
      <span className={`h-9 w-9 rounded-full flex items-center justify-center font-display font-black text-sm ${light ? "bg-white text-blue-600" : "bg-accent text-white"}`}>
        FP
      </span>
      <span className="leading-none">
        <span className={`block font-display font-extrabold text-lg tracking-tight ${light ? "text-white" : ""}`}>
          FixiPro<span className="text-accent">.co.uk</span>
        </span>
        <span className={`block text-[9px] font-bold tracking-[0.25em] mt-0.5 ${light ? "text-white/60" : "text-muted-foreground"}`}>UK MARKETPLACE</span>
      </span>
    </Link>
  );
}

export default function PublicLayout() {
  const { user, homeFor } = useAuth();
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/categories").then((r) => setCats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ScrollProgress />
      <CursorGlow />
      <div className="bg-slate-900 text-slate-300 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 hidden sm:flex items-center justify-between">
          <span>Available 24/7 · UK handyman marketplace</span>
          <span className="flex items-center gap-5">
            <Link to="/contact" data-testid="topbar-whatsapp" className="flex items-center gap-1.5 transition-colors duration-200 hover:text-white">
              <MessageCircle className="h-3.5 w-3.5" /> Chat on WhatsApp
            </Link>
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> London, UK</span>
          </span>
        </div>
      </div>
      <header className="sticky top-0 z-50 border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl saturate-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between gap-4">
          <Logo />
          <nav className="hidden lg:flex items-center gap-1" data-testid="desktop-nav">
            <div className="relative group">
              <button data-testid="nav-services" className="px-4 py-2 text-sm font-medium rounded-full flex items-center gap-1.5 transition-colors duration-200 hover:text-accent text-foreground/80">
                Services <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <div className="absolute left-0 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-50">
                <div className="w-[580px] bg-white dark:bg-slate-900 border border-border rounded-2xl soft-card p-6" data-testid="services-mega-menu">
                  <div className="flex items-center justify-between mb-4">
                    <p className="label-caps text-muted-foreground">Service categories</p>
                    <Link to="/services" data-testid="mega-view-all" className="text-xs font-semibold text-accent">View all</Link>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {cats.map((c) => {
                      const Icon = MEGA_ICONS[c.icon] || Wrench;
                      return (
                        <Link key={c.slug} to={`/services?category=${c.slug}`} data-testid={`mega-${c.slug}`}
                          className="flex items-start gap-3 p-3 rounded-xl transition-colors duration-200 hover:bg-blue-50 dark:hover:bg-slate-800">
                          <span className="h-9 w-9 shrink-0 rounded-lg bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{c.name}</span>
                            <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.description}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} data-testid={`nav-${n.label.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 hover:text-accent ${isActive ? "bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300" : "text-foreground/80"}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <button data-testid="nav-search-icon" onClick={() => navigate("/services")} aria-label="Search services"
              className="h-9 w-9 hidden sm:flex items-center justify-center rounded-full transition-colors duration-200 hover:bg-secondary">
              <Search className="h-4 w-4" />
            </button>
            <ThemeToggle />
            {user ? (
              <Button data-testid="nav-dashboard-btn" onClick={() => navigate(homeFor(user))} className="rounded-full bg-accent hover:bg-accent/90 text-white">
                Dashboard
              </Button>
            ) : (
              <>
                <button data-testid="nav-account-icon" onClick={() => navigate("/login")} aria-label="Account"
                  className="h-9 w-9 hidden sm:flex items-center justify-center rounded-full transition-colors duration-200 hover:bg-secondary">
                  <User className="h-4 w-4" />
                </button>
                <button data-testid="nav-login-btn" onClick={() => navigate("/login")}
                  className="hidden sm:inline-flex px-3 py-2 text-sm font-medium transition-colors duration-200 hover:text-accent">
                  Login
                </button>
                <Button data-testid="nav-register-btn" onClick={() => navigate("/register")} className="rounded-full bg-accent hover:bg-accent/90 text-white px-5">
                  Register
                </Button>
              </>
            )}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button data-testid="mobile-menu-btn" className="lg:hidden h-9 w-9 flex items-center justify-center border border-border rounded-full" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <nav className="flex flex-col gap-1 mt-8">
                  {[{ to: "/services", label: "Services" }, ...NAV, { to: "/pricing", label: "Pricing" }, { to: "/blog", label: "Blog" }].map((n) => (
                    <Link key={n.to} to={n.to} onClick={() => setOpen(false)} data-testid={`mnav-${n.label.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`}
                      className="px-3 py-3 text-base font-medium border-b border-border transition-colors duration-200 hover:text-accent">
                      {n.label}
                    </Link>
                  ))}
                  {!user && (
                    <Button data-testid="mnav-login-btn" onClick={() => { setOpen(false); navigate("/login"); }} className="mt-4 rounded-full">
                      Login
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={window.location.pathname}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
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
              <p className="label-caps text-slate-500 mb-4">Handymen</p>
              <ul className="space-y-2.5">
                <li><Link data-testid="footer-become-provider" to="/become-provider" className="transition-colors duration-200 hover:text-white">Become a Handyman</Link></li>
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
            <p>© 2026 FixiPro Ltd · fixipro.co.uk · Internal testing build — not for production use.</p>
            <p>Made for UK homes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
