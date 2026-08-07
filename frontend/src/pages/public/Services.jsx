import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { Input } from "../../components/ui/input";
import { Search, ArrowRight, Star } from "lucide-react";

export default function ServicesPage() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [q, setQ] = useState(params.get("q") || "");
  const [loading, setLoading] = useState(true);
  const category = params.get("category") || "";

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api.get("/services", { params: { category, q } }).then((r) => setServices(r.data)).catch(() => {}).finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [category, q]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16" data-testid="services-page">
      <p className="label-caps text-accent">Marketplace</p>
      <h1 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight mt-2">Services & categories</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">Custom quotes from vetted local handymen. Pick a service, post your job, and compare offers as they arrive live.</p>

      <div className="mt-8 flex flex-col lg:flex-row gap-4 lg:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input data-testid="service-search" placeholder="Search services…" value={q}
            onChange={(e) => setQ(e.target.value)} className="rounded-full h-11 pl-9 bg-card" />
        </div>
        <div className="flex flex-wrap gap-2" data-testid="category-filters">
          <button data-testid="filter-all" onClick={() => setParams({})}
            className={`px-4 h-9 text-sm font-medium border transition-colors duration-200 ${!category ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"}`}>
            All
          </button>
          {categories.map((c) => (
            <button key={c.slug} data-testid={`filter-${c.slug}`} onClick={() => setParams({ category: c.slug })}
              className={`px-4 h-9 text-sm font-medium border transition-colors duration-200 ${category === c.slug ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"}`}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10" data-testid="services-grid">
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} data-testid={`service-skeleton-${i}`} className="border border-border rounded-2xl overflow-hidden bg-card">
            <div className="h-40 shimmer" />
            <div className="p-5 space-y-3"><div className="h-3 w-24 shimmer rounded" /><div className="h-5 w-40 shimmer rounded" /><div className="h-4 w-32 shimmer rounded" /></div>
          </div>
        ))}
        {services.map((s) => (
          <Link key={s.slug} to={`/services/${s.slug}`} data-testid={`service-card-${s.slug}`}
            className="group border border-border bg-card rounded-2xl overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg">
            <div className="h-40 overflow-hidden">
              <img src={s.image} alt={s.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="p-5">
              <p className="label-caps text-muted-foreground">{s.category_slug?.replaceAll("-", " ")}</p>
              <h3 className="font-display font-bold text-lg mt-1 flex items-center justify-between gap-2">
                {s.name}
                <ArrowRight className="h-4 w-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </h3>
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm text-muted-foreground">Custom quotes per job</p>
                <p className="flex items-center gap-1 text-sm"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> {s.rating}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!loading && services.length === 0 && (
        <div data-testid="no-services" className="border border-dashed p-14 text-center text-muted-foreground mt-10">
          No services match your search.
        </div>
      )}
    </div>
  );
}
