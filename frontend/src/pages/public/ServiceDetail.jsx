import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api, { fmtDate } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { BadgeCheck, ShieldCheck, Star, ArrowLeft, ArrowRight } from "lucide-react";

export default function ServiceDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [svc, setSvc] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setSvc(null);
    api.get(`/services/${slug}`).then((r) => setSvc(r.data)).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center" data-testid="service-not-found">
        <h1 className="font-display font-extrabold text-3xl">Service not found</h1>
        <Button onClick={() => navigate("/services")} className="mt-6 rounded-full">Browse services</Button>
      </div>
    );
  }
  if (!svc) return <div className="max-w-7xl mx-auto px-6 py-24 text-muted-foreground">Loading…</div>;

  const cta = () => {
    if (user?.role === "customer") navigate(`/dashboard/requests/new?service=${svc.id}`);
    else navigate("/register");
  };

  return (
    <div data-testid="service-detail-page">
      <section className="relative h-64 sm:h-80 overflow-hidden">
        <img src={svc.image} alt={svc.name} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
        <div className="absolute bottom-0 max-w-7xl mx-auto px-4 sm:px-6 pb-8 left-0 right-0">
          <Link to="/services" data-testid="back-to-services" className="inline-flex items-center gap-2 text-white/70 text-sm hover:text-white transition-colors duration-200 mb-3">
            <ArrowLeft className="h-4 w-4" /> All services
          </Link>
          <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight">{svc.name}</h1>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{svc.description}</p>
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            {[
              { icon: BadgeCheck, t: "Vetted pros", d: `${svc.provider_count} verified handymen` },
              { icon: ShieldCheck, t: "Insured work", d: "Public liability cover required" },
              { icon: Star, t: `${svc.rating}/5 rated`, d: "From verified customer reviews" },
            ].map((f) => (
              <div key={f.t} className="border border-border p-5 bg-card">
                <f.icon className="h-5 w-5 text-accent" />
                <p className="font-semibold text-sm mt-2">{f.t}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.d}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display font-bold text-xl mt-12 mb-4">Recent customer reviews</h2>
          {svc.recent_reviews?.length ? (
            <div className="space-y-4" data-testid="service-reviews">
              {svc.recent_reviews.map((r) => (
                <div key={r.id} className="border border-border p-5 bg-card">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? "text-amber-500 fill-amber-500" : "text-border"}`} />
                    ))}
                    <span className="text-sm font-medium ml-2">{r.customer_name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{fmtDate(r.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{r.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground border border-dashed p-6">No published reviews yet — be the first to book and review.</p>
          )}
        </div>

        <aside className="lg:col-span-5">
          <div className="border border-border bg-card p-6 sm:p-8 sticky top-24">
            <p className="label-caps text-muted-foreground">Live custom quotes</p>
            <p className="font-display font-black text-3xl mt-1">Handymen set the price</p>
            <p className="text-sm text-muted-foreground">Post your job and compare custom quotes as they arrive live — the quote you accept becomes the agreed price.</p>
            <Button data-testid="request-service-btn" onClick={cta} className="w-full mt-6 h-12 rounded-full bg-accent hover:bg-accent/90 text-white">
              Request this service <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              Free to post. You only pay when you accept a quote. All payments secured by Stripe.
            </p>
          </div>

          {svc.related?.length > 0 && (
            <div className="mt-8">
              <p className="label-caps text-muted-foreground mb-3">Related services</p>
              <div className="space-y-2">
                {svc.related.map((r) => (
                  <Link key={r.slug} to={`/services/${r.slug}`} data-testid={`related-${r.slug}`}
                    className="flex items-center justify-between border border-border bg-card px-4 py-3 text-sm font-medium transition-colors duration-200 hover:border-accent">
                    {r.name}
                    <span className="text-muted-foreground">Get quotes</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
