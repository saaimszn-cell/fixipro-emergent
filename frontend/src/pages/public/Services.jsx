import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { Input } from "../../components/ui/input";
import { Search, ChevronDown, MapPin, ArrowRight } from "lucide-react";

/**
 * Public "All Services" page.
 * Shows only the 42 top-level categories. Clicking a category expands the
 * full child-service list underneath. Search filters both category names
 * and their child services.
 */
export default function ServicesPage() {
  const [params] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState(params.get("q") || "");
  const [openSlugs, setOpenSlugs] = useState(() => new Set(params.get("category") ? [params.get("category")] : []));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/categories")
      .then((r) => setCategories(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return categories;
    return categories
      .map((c) => {
        const nameMatch = c.name.toLowerCase().includes(needle);
        const matchedServices = (c.services_list || []).filter((s) => s.toLowerCase().includes(needle));
        if (nameMatch || matchedServices.length) {
          return { ...c, _matched_services: nameMatch ? (c.services_list || []) : matchedServices };
        }
        return null;
      })
      .filter(Boolean);
  }, [categories, q]);

  const toggle = (slug) => {
    setOpenSlugs((s) => {
      const next = new Set(s);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16" data-testid="services-page">
      <p className="label-caps text-accent">Marketplace</p>
      <h1 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight mt-2">
        All services
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">
        Browse our full catalogue of {categories.length} service categories. Click any category to see the exact jobs handymen can quote on.
      </p>

      <div className="mt-8 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input data-testid="service-search" placeholder="Search services or categories…" value={q}
          onChange={(e) => setQ(e.target.value)} className="rounded-full h-11 pl-9 bg-card" />
      </div>

      <div className="mt-8 space-y-3" data-testid="categories-list">
        {loading && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl shimmer" data-testid={`cat-skeleton-${i}`} />
        ))}
        {!loading && filtered.length === 0 && (
          <div data-testid="no-services" className="border border-dashed p-14 text-center text-muted-foreground rounded-2xl">
            No categories match "{q}".
          </div>
        )}
        {filtered.map((c) => {
          const isOpen = openSlugs.has(c.slug) || Boolean(q.trim());
          const shownServices = c._matched_services || c.services_list || [];
          return (
            <div key={c.slug} data-testid={`cat-${c.slug}`}
              className="border border-border bg-card rounded-2xl overflow-hidden transition-shadow duration-200 hover:shadow-md">
              <button type="button" data-testid={`cat-toggle-${c.slug}`} onClick={() => toggle(c.slug)}
                className="w-full flex items-center gap-4 p-4 sm:p-5 text-left transition-colors duration-200 hover:bg-blue-50/50 dark:hover:bg-slate-800/50">
                <span className="h-11 w-11 shrink-0 rounded-xl bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-display font-black">
                  {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-display font-bold text-base sm:text-lg tracking-tight">{c.name}</span>
                  <span className="block text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                    {c.description || `${(c.services_list || []).length} services included`}
                  </span>
                </span>
                <span className="shrink-0 hidden sm:inline text-xs font-semibold text-muted-foreground">
                  {(c.services_list || []).length} services
                </span>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-border p-4 sm:p-5 bg-blue-50/30 dark:bg-slate-900/40" data-testid={`cat-body-${c.slug}`}>
                  {shownServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">More sub-services coming soon.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {shownServices.map((s) => (
                        <div key={s} data-testid={`svc-${c.slug}-${s}`}
                          className="flex items-center gap-2 text-sm bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                          <span className="truncate">{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Available in Innsworth, Forres and Elgin
                    </p>
                    <Link to="/register" data-testid={`cat-cta-${c.slug}`}
                      className="text-sm font-semibold text-accent inline-flex items-center gap-1 hover:gap-1.5 transition-[gap] duration-200">
                      Post a job in this category <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
