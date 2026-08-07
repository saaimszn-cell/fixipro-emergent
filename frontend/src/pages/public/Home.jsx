import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { ArrowRight, ShieldCheck, Star, Wrench, Zap, Sparkles, Leaf, Paintbrush, Hammer, BadgeCheck, Smartphone } from "lucide-react";

const ICONS = { Wrench, Zap, Sparkles, Leaf, Paintbrush, Hammer };

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } } };

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [svc, setSvc] = useState("");
  const [postcode, setPostcode] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
    api.get("/stats/public").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const search = (e) => {
    e.preventDefault();
    navigate(svc ? `/services?category=${svc}` : "/services");
  };

  return (
    <div data-testid="home-page">
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 grid lg:grid-cols-12 gap-10 items-center">
          <motion.div initial="hidden" animate="show" variants={fadeUp} className="lg:col-span-7">
            <p className="label-caps text-accent flex items-center gap-2">
              <span className="h-2 w-2 bg-accent animate-pulse-dot" /> Trusted UK marketplace
            </p>
            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.02] mt-4">
              Home repairs,<br />handled properly<span className="text-accent">.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-5 max-w-xl leading-relaxed">
              Post a job in minutes, compare quotes from vetted local professionals, and pay securely — all in one place.
            </p>
            <form onSubmit={search} className="mt-8 flex flex-col sm:flex-row gap-2 max-w-xl" data-testid="hero-search">
              <Select value={svc} onValueChange={setSvc}>
                <SelectTrigger data-testid="hero-service-select" className="rounded-none h-12 sm:w-56 bg-card">
                  <SelectValue placeholder="What do you need?" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug} data-testid={`hero-cat-${c.slug}`}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input data-testid="hero-postcode" placeholder="Postcode" value={postcode}
                onChange={(e) => setPostcode(e.target.value)} className="rounded-none h-12 sm:w-40 bg-card" />
              <Button data-testid="hero-search-btn" type="submit" className="rounded-none h-12 px-6 bg-accent hover:bg-accent/90 text-white">
                Get quotes <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
            <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-accent" /> Vetted & insured</span>
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-accent" /> {stats?.avg_rating ?? 4.8}/5 average</span>
              <span className="hidden sm:flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-accent" /> Workmanship promise</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-5 relative grain-overlay">
            <img src="https://images.pexels.com/photos/36990157/pexels-photo-36990157.png" alt="A UK suburban home in warm sunlight"
              className="w-full h-72 sm:h-[26rem] object-cover border border-black/5" />
            <div className="absolute -bottom-6 -left-4 sm:-left-8 bg-card border border-border p-4 sm:p-5 shadow-xl max-w-[240px]">
              <p className="font-display font-extrabold text-3xl">{(stats?.jobs_completed ?? 1240).toLocaleString()}+</p>
              <p className="text-xs text-muted-foreground mt-1">jobs completed by local pros this year</p>
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
                <Link to={`/services?category=${c.slug}`} data-testid={`cat-card-${c.slug}`}
                  className="group relative block h-56 overflow-hidden border border-black/5">
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
          <Button data-testid="app-cta" onClick={() => navigate("/register")} className="mt-8 rounded-none h-11 bg-primary text-primary-foreground">
            Try it free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="lg:col-span-6 border border-border bg-card h-[420px] sm:h-[520px] overflow-hidden relative" data-testid="spline-iphone-embed">
          <iframe
            src="https://my.spline.design/iphone13copy-hUW6nwfGOESZ89MOCjs7jNxN/"
            title="ServiceHub mobile app 3D preview"
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="border border-border bg-card p-8 sm:p-12 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight">Are you a tradesperson?</h2>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Join {stats?.providers ?? "hundreds of"}+ verified professionals winning local work on ServiceHub. Free to join — pay only when you earn.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <Button data-testid="provider-cta" onClick={() => navigate("/become-provider")} className="rounded-none h-12 px-8 bg-accent hover:bg-accent/90 text-white">
              Become a provider <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
