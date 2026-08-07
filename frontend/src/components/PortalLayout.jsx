import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import {
  LayoutDashboard, ClipboardList, PlusCircle, CreditCard, FileText, Star, MessageSquare,
  Bell, Heart, LifeBuoy, Settings, Briefcase, CalendarDays, ShieldCheck, Wallet, Users,
  UserCog, BarChart3, ScrollText, Sparkles, Phone, Menu, LogOut, ChevronRight, Bot,
  FolderCog, Building2, Inbox,
} from "lucide-react";
import { Logo, ThemeToggle } from "./PublicLayout";

const NAVS = {
  customer: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/dashboard/requests", label: "My Requests", icon: ClipboardList },
    { to: "/dashboard/requests/new", label: "New Request", icon: PlusCircle },
    { to: "/dashboard/quotes", label: "Quotes", icon: FileText },
    { to: "/dashboard/payments", label: "Payments", icon: CreditCard },
    { to: "/dashboard/invoices", label: "Invoices", icon: FileText },
    { to: "/dashboard/reviews", label: "Reviews", icon: Star },
    { to: "/dashboard/messages", label: "Messages", icon: MessageSquare },
    { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
    { to: "/dashboard/favourites", label: "Favourite Handymen", icon: Heart },
    { to: "/dashboard/assistant", label: "AI Assistant", icon: Bot },
    { to: "/dashboard/support", label: "Support", icon: LifeBuoy },
    { to: "/dashboard/settings", label: "Settings", icon: Settings },
  ],
  provider: [
    { to: "/pro", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/pro/browse", label: "Job Requests", icon: Inbox },
    { to: "/pro/jobs", label: "My Jobs", icon: Briefcase },
    { to: "/pro/quotes", label: "My Quotes", icon: FileText },
    { to: "/pro/earnings", label: "Earnings & Wallet", icon: Wallet },
    { to: "/pro/calendar", label: "Availability", icon: CalendarDays },
    { to: "/pro/verification", label: "Verification", icon: ShieldCheck },
    { to: "/pro/profile", label: "Business Profile", icon: Building2 },
    { to: "/pro/reviews", label: "Reviews", icon: Star },
    { to: "/pro/messages", label: "Messages", icon: MessageSquare },
    { to: "/pro/notifications", label: "Notifications", icon: Bell },
    { to: "/pro/assistant", label: "AI Assistant", icon: Bot },
    { to: "/pro/support", label: "Support", icon: LifeBuoy },
    { to: "/pro/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/providers", label: "Handymen", icon: ShieldCheck },
    { to: "/admin/jobs", label: "Jobs & Requests", icon: Briefcase },
    { to: "/admin/payments", label: "Payments", icon: CreditCard },
    { to: "/admin/reviews", label: "Reviews", icon: Star },
    { to: "/admin/support", label: "Support Tickets", icon: LifeBuoy },
    { to: "/admin/categories", label: "Services & Categories", icon: FolderCog },
    { to: "/admin/blog", label: "Blog", icon: FileText },
    { to: "/admin/cms", label: "CMS Pages", icon: ScrollText },
    { to: "/admin/templates", label: "Message Templates", icon: MessageSquare },
    { to: "/admin/comms", label: "Comms & WhatsApp", icon: Phone },
    { to: "/admin/ai", label: "AI Control Centre", icon: Bot },
    { to: "/admin/reports", label: "Reports & Analytics", icon: BarChart3 },
    { to: "/admin/audit", label: "Audit Logs", icon: ScrollText },
    { to: "/admin/settings", label: "System Settings", icon: Settings },
  ],
};

export default function PortalLayout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get("/notifications").then((res) => {
      setUnread(res.data.filter((n) => !n.read).length);
    }).catch(() => {});
  }, []);

  const items = NAVS[role] || NAVS.customer;
  const base = role === "admin" ? "/admin" : role === "provider" ? "/pro" : "/dashboard";
  const notifPath = `${base}/notifications`;

  const NavItems = ({ onClick }) => (
    <nav className="flex flex-col gap-0.5">
      {items.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} onClick={onClick}
          data-testid={`side-${n.label.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 text-sm font-medium border-l-2 transition-colors duration-200 ${
              isActive ? "border-accent text-foreground bg-secondary/70" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"}`}>
          <n.icon className="h-4 w-4 shrink-0" aria-hidden />
          {n.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card sticky top-0 h-screen">
        <div className="h-16 flex items-center px-5 border-b border-border">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-2">
          <NavItems />
        </div>
        <div className="p-4 border-t border-border">
          <Button data-testid="sidebar-logout-btn" variant="outline" className="w-full rounded-none justify-start gap-2"
            onClick={async () => { await logout(); navigate("/login"); }}>
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button data-testid="portal-mobile-menu" className="lg:hidden h-9 w-9 flex items-center justify-center border border-border" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <Logo />
                <div className="mt-6"><NavItems onClick={() => setOpen(false)} /></div>
              </SheetContent>
            </Sheet>
            <p className="label-caps text-muted-foreground hidden sm:block">
              {role === "admin" ? "Control Centre" : role === "provider" ? "Handyman Portal" : "My Account"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to={notifPath} data-testid="notif-bell" className="relative h-9 w-9 flex items-center justify-center border border-border transition-colors duration-200 hover:bg-secondary">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span data-testid="notif-unread-count" className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 bg-accent text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                  {unread}
                </span>
              )}
            </Link>
            <div className="hidden sm:flex items-center gap-2 pl-2">
              <div className="h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-sm" data-testid="user-avatar">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold" data-testid="user-name">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize flex items-center gap-1" data-testid="user-role">
                  {user?.role?.replace("_", " ")} <ChevronRight className="h-3 w-3" />
                </p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
