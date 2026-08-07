import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import api from "../../lib/api";
import { CountUp, LiveTicker, Tilt, ReviewMarquee } from "../../components/motion";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { ArrowRight, ShieldCheck, Star, Wrench, Zap, Sparkles, Leaf, Paintbrush, Hammer, Drill, Plug, BadgeCheck, Smartphone, Search, CheckCircle2, TrendingUp } from "lucide-react";

const ICONS = { Wrench, Zap, Sparkles, Leaf, Paintbrush, Hammer, Drill, Plug };

const POPULAR = [
  { label: "Plumbing", to: "/services?category=plumbing" },
  { label: "Electrical", to: "/services?category=electrical" },
  { label: "Painting", to: "/services?category=painting-decorating" },
  { label: "Carpentry", to: "/services?category=handyman" },
  { label: "Emergency repair", to: "/services?q=emergency" },
  { label: "Flat-pack assembly", to: "/services/furniture-assembly" },
];
const TRENDING = [
  { label: "Boiler repair", to: "/services/boiler-service" },
  { label: "Socket installation", to: "/services/socket-switch-installation" },
  { label: "Leak repair", to: "/services/leak-repair" },
  { label: "Fence repair", to: "/services?q=fence" },
  { label: "Bathroom tiling", to: "/services?q=tiling" },
  { label: "End of tenancy clean", to: "/services/end-of-tenancy-clean" },
];

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } } };

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [svc, setSvc] = useState("");
  const [postcode, setPostcode] = useState("");
  const [q, setQ] = useState("");
  const [reviews, setReviews] = useState([]);
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const cardY = useTransform(scrollY, [0, 500], [0, -36]);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
    api.get("/stats/public").then((r) => setStats(r.data)).catch(() => {});
    api.get("/reviews/public").then((r) => setReviews(r.data)).catch(() => {});
  }, []);

  const search = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (svc) params.set("category", svc);
    if (q) params.set("q", q);
    const qs = params.toString();
    navigate(qs ? `/services?${qs}` : "/services");
  };

  return (
    <div data-testid="home-page">
      <section className="relative overflow-hidden hero-gradient">
        <div className="hero-mesh" aria-hidden="true"><span /><span /><span /></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 grid lg:grid-cols-12 gap-10 items-center">
          <motion.div initial="hidden" animate="show" variants={fadeUp} className="lg:col-span-6">
            <span data-testid="hero-badge" className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-700 text-blue-700 dark:text-blue-300 text-xs font-semibold px-4 py-2 rounded-full soft-card">
              <ShieldCheck className="h-3.5 w-3.5" /> UK's trusted handyman marketplace
            </span>
            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] mt-5" style={{ perspective: "900px" }}>
              {"Book trusted handyman services across the UK".split(" ").map((w, i) => (
                <motion.span key={i} className="inline-block mr-[0.26em]"
                  initial={{ opacity: 0, y: 26, rotateX: 45 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ delay: 0.2 + i * 0.055, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                  {w}
                </motion.span>
              ))}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-5 max-w-xl leading-relaxed">
              Verified professionals, transparent quotes, and secure bookings — designed for homeowners who expect premium service.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-8 max-w-md" data-testid="hero-checklist">
              {["Verified handymen", "Fast quotes", "Same-day availability", "Secure payments"].map((f) => (
                <p key={f} className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-5 w-5 text-accent shrink-0" /> {f}
                </p>
              ))}
            </div>
            <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground" data-testid="hero-stats">
              <span><strong className="text-foreground font-display font-bold"><CountUp to={stats?.jobs_completed ?? 1240} />+</strong> jobs done</span>
              <span><strong className="text-foreground font-display font-bold"><CountUp to={stats?.avg_rating ?? 4.8} decimals={1} />/5</strong> average</span>
              <span className="hidden sm:inline"><strong className="text-foreground font-display font-bold"><CountUp to={20} /></strong> UK cities</span>
            </div>
            <LiveTicker />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="lg:col-span-6" style={{ y: cardY }}>
            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl soft-card p-6 sm:p-8" data-testid="hero-search-card">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-accent text-white flex items-center justify-center shrink-0"><Search className="h-5 w-5" /></span>
                <div>
                  <h2 className="font-display font-bold text-lg leading-tight">Find the right service for your home</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Enter your UK postcode first, then service or category</p>
                </div>
              </div>
              <form onSubmit={search} className="mt-5 space-y-4" data-testid="hero-search">
                <Input data-testid="hero-q" placeholder="e.g. leak repair, socket installation" value={q}
                  onChange={(e) => setQ(e.target.value)} className="rounded-xl h-12 bg-background" />
                <div>
                  <p className="label-caps text-muted-foreground mb-1.5">UK postcode</p>
                  <Input data-testid="hero-postcode" placeholder="e.g. SW1A 1AA" value={postcode}
                    onChange={(e) => setPostcode(e.target.value)} className="rounded-xl h-12 bg-background" />
                </div>
                <div>
                  <p className="label-caps text-muted-foreground mb-1.5">Category</p>
                  <Select value={svc} onValueChange={setSvc}>
                    <SelectTrigger data-testid="hero-service-select" className="rounded-xl h-12 bg-background">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.slug} value={c.slug} data-testid={`hero-cat-${c.slug}`}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button data-testid="hero-search-btn" type="submit" className="w-full rounded-full h-12 bg-accent hover:bg-accent/90 text-white font-semibold">
                  Search services
                </Button>
              </form>
              <div className="mt-6">
                <p className="label-caps text-muted-foreground mb-2">Popular searches</p>
                <div className="flex flex-wrap gap-2" data-testid="popular-searches">
                  {POPULAR.map((p) => (
                    <Link key={p.label} to={p.to} data-testid={`popular-${p.label.toLowerCase().replaceAll(" ", "-")}`}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border border-border transition-colors duration-200 hover:border-accent hover:text-accent">
                      {p.label}
                    </Link>
                  ))}
                </div>
                <p className="label-caps text-muted-foreground mt-5 mb-2 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-accent" /> Trending now</p>
                <div className="flex flex-wrap gap-2" data-testid="trending-searches">
                  {TRENDING.map((p) => (
                    <Link key={p.label} to={p.to} data-testid={`trending-${p.label.toLowerCase().replaceAll(" ", "-")}`}
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300 transition-colors duration-200 hover:bg-accent hover:text-white">
                      {p.label}
                    </Link>
                  ))}
                </div>
                <Link to="/services" data-testid="advanced-search" className="text-xs font-semibold text-accent mt-4 inline-block">Advanced search</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="label-caps text-accent">Browse</p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mt-2">What needs doing?</h2>
          </div>
          <Link to="/services" data-testid="view-all-services" className="text-sm font-medium text-accent hidden sm:flex items-center gap-1 hover:gap-2 transition-[gap] duration-200">
            All services <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((c, i) => {
            const Icon = ICONS[c.icon] || Wrench;
            return (
              <motion.div key={c.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.5 }}>
                <Tilt>
                <Link to={`/services?category=${c.slug}`} data-testid={`cat-card-${c.slug}`}
                  className="group relative block h-56 overflow-hidden border border-black/5 rounded-2xl">
                  <img src={c.image} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />
                  <div className="absolute bottom-0 p-5 text-white">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" aria-hidden />
                      <h3 className="font-display font-bold text-xl">{c.name}</h3>
                    </div>
                    <p className="text-sm text-white/75 mt-1">{c.service_count} services available</p>
                  </div>
                </Link>
                </Tilt>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-950 text-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="label-caps text-accent">The process</p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mt-2">Three steps. Zero hassle.</h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {[
              { n: "01", t: "Describe your job", d: "Tell us what needs fixing, where you are, and when it suits you. Takes two minutes." },
              { n: "02", t: "Compare quotes", d: "Vetted local professionals send clear, fixed quotes. Chat with them before you decide." },
              { n: "03", t: "Book & pay securely", d: "Accept the best quote, pay by card through Stripe, and rate the work when it's done." },
            ].map((s, i) => (
              <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="border border-white/10 p-8">
                <p className="font-display font-black text-5xl text-accent">{s.n}</p>
                <h3 className="font-display font-bold text-xl mt-4">{s.t}</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6">
          <p className="label-caps text-accent flex items-center gap-2"><Smartphone className="h-4 w-4" /> On the go</p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mt-2">Your jobs, in your pocket.</h2>
          <p className="text-muted-foreground mt-4 max-w-md leading-relaxed">
            Track requests, chat with your professional and approve quotes from anywhere. Interact with the 3D preview — drag it around.
          </p>
          <div className="mt-6 flex flex-col gap-3 max-w-md">
            {["Real-time job status updates", "Instant quote notifications", "Secure in-app payments"].map((f) => (
              <p key={f} className="flex items-center gap-2 text-sm"><BadgeCheck className="h-4 w-4 text-accent shrink-0" /> {f}</p>
            ))}
          </div>
          <Button data-testid="app-cta" onClick={() => navigate("/register")} className="mt-8 rounded-2xl h-11 bg-primary text-primary-foreground">
            Try it free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="lg:col-span-6 border border-border bg-card h-[420px] sm:h-[520px] overflow-hidden relative" data-testid="spline-iphone-embed">
          <iframe
            src="https://my.spline.design/iphone13copy-hUW6nwfGOESZ89MOCjs7jNxN/"
            title="FixiPro mobile app 3D preview"
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>
      </section>

      <section className="py-16 sm:py-24 border-y border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10 flex items-end justify-between">
          <div>
            <p className="label-caps text-accent">Live reviews</p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mt-2">Rated by real customers</h2>
          </div>
          <Link to="/reviews" data-testid="all-reviews-link" className="text-sm font-medium text-accent hidden sm:block">All reviews</Link>
        </div>
        <ReviewMarquee reviews={reviews} />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="border border-border bg-card p-8 sm:p-12 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight">Are you a handyman?</h2>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Join {stats?.providers ?? "hundreds of"}+ verified handymen winning local work on FixiPro. Free to join — pay only when you earn.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <Button data-testid="provider-cta" onClick={() => navigate("/become-provider")} className="rounded-2xl h-12 px-8 bg-accent hover:bg-accent/90 text-white">
              Become a Handyman <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
