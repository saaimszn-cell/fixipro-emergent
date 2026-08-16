import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, CheckCircle2, CreditCard, FileText, MapPin, Search, ShieldCheck, Star, UserCheck, Wallet, CalendarClock, TrendingUp, KeyRound } from "lucide-react";

function Hero({ kicker, title, sub, testid, titleClass = "" }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-8" data-testid={testid}>
      <p className="label-caps text-accent">{kicker}</p>
      <h1 className={`font-display font-extrabold text-3xl sm:text-5xl tracking-tight mt-2 max-w-3xl ${titleClass}`}>{title}</h1>
      {sub && <p className="text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl leading-relaxed">{sub}</p>}
    </div>
  );
}

export function HowItWorks() {
  const navigate = useNavigate();
  return (
    <div data-testid="how-it-works-page">
      <Hero kicker="The process" title="How FixiPro works" titleClass="whitespace-nowrap !text-[26px] sm:!text-4xl lg:!text-5xl !max-w-none" sub="From leaky tap to five-star review in five steps — for customers and handymen alike." testid="hiw-hero" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 grid lg:grid-cols-2 gap-12">
        <div>
          <h2 className="font-display font-bold text-2xl mb-6">For customers</h2>
          {[
            { icon: FileText, t: "Post your job", d: "Describe the work, add your postcode, budget and preferred date." },
            { icon: Search, t: "A handyman claims it", d: "Verified local handymen see your job and the first to claim it locks it in." },
            { icon: CreditCard, t: "Pay securely", d: "Pay the agreed budget by card. FixiPro holds the money in escrow — the handyman is not paid yet." },
            { icon: Star, t: "Review the work", d: "Once you've handed over your code, rate your experience — reviews keep the marketplace honest." },
          ].map((s, i) => (
            <motion.div key={s.t} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="flex gap-4 border-l-2 border-accent pl-5 py-4">
              <s.icon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{i + 1}. {s.t}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
              </div>
            </motion.div>
          ))}
          <Button data-testid="hiw-post-job" onClick={() => navigate("/register")} className="mt-6 rounded-2xl bg-accent hover:bg-accent/90 text-white h-11">
            Post a job <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div>
          <h2 className="font-display font-bold text-2xl mb-6">For handymen</h2>
          {[
            { icon: UserCheck, t: "Get verified", d: "Upload ID, insurance and certifications. Approval typically within 48 hours." },
            { icon: CalendarClock, t: "Claim local jobs", d: "Browse open jobs matched to your trade and coverage area — first to claim gets it, at the customer's budget." },
            { icon: MapPin, t: "Address unlocks on payment", d: "The customer's exact address and phone number only appear once their payment clears." },
            { icon: Wallet, t: "Enter the code, get paid", d: "Finish the job, get the customer's 6-digit code, and your 85% payout lands in your wallet instantly." },
          ].map((s, i) => (
            <motion.div key={s.t} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="flex gap-4 border-l-2 border-primary pl-5 py-4">
              <s.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{i + 1}. {s.t}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
              </div>
            </motion.div>
          ))}
          <Button data-testid="hiw-join-provider" variant="outline" onClick={() => navigate("/become-provider")} className="mt-6 rounded-2xl h-11">
            Join as a handyman <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* The completion code, spelled out clearly on its own — this is the crux of the escrow flow */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="border-2 border-accent bg-accent/5 rounded-2xl p-6 sm:p-10" data-testid="hiw-code-explainer">
          <p className="label-caps text-accent flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> The completion code — how your money stays safe
          </p>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight mt-2 max-w-2xl">
            One 6-digit code is what actually releases payment.
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            {[
              { n: "1", t: "You pay, a code appears", d: "The moment your payment clears, a unique 6-digit code shows up on your job page. Only you can see it." },
              { n: "2", t: "The handyman does the job", d: "They cannot see this code. Your money sits safely in escrow the entire time they're working." },
              { n: "3", t: "You hand it over, they get paid", d: "Only when you're happy, read the code out loud. The handyman types it in and their payout is released instantly." },
            ].map((s) => (
              <div key={s.n} className="border border-accent/30 bg-card rounded-xl p-5" data-testid={`hiw-code-step-${s.n}`}>
                <p className="font-display font-black text-2xl text-accent">{s.n}</p>
                <p className="font-semibold text-sm mt-2">{s.t}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            No code, no payout — that's the whole point. If the work isn't finished properly, don't give the code out.
            <Link to="/trust-safety" className="text-accent font-medium hover:underline ml-1">Read more on Trust & Safety →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function Pricing() {
  const navigate = useNavigate();
  return (
    <div data-testid="pricing-page" className="relative overflow-hidden">
      <div className="section-tint relative">
        <div className="absolute inset-0 pointer-events-none" data-testid="pricing-spline-bg" aria-hidden="true">
          <iframe src="https://my.spline.design/thebatmanlogocopy-JbnGxqP5R7C71Z7wcxrIV5Zo/" title="FixiPro 3D emblem"
            className="w-full h-full border-0 opacity-30" loading="lazy" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#EFF6FF]/50 to-[#EFF6FF] pointer-events-none" />
        <div className="relative">
          <Hero kicker="Pricing" title="Free for customers. Fair for handymen." sub="Customers never pay to use FixiPro — just sign up. Handymen pay a simple 15% commission on profit, because we bring you the customers." testid="pricing-hero" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10 grid md:grid-cols-2 gap-6">
        <div className="border border-border bg-card p-8 sm:p-10 rounded-2xl soft-card" data-testid="pricing-customers">
          <p className="label-caps text-accent">Customers</p>
          <p className="font-display font-black text-5xl mt-3">£0</p>
          <p className="text-sm text-muted-foreground mt-1">Just sign up — it's free, forever.</p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Free forever — just create an account", "Post unlimited jobs", "Compare custom quotes as they arrive live", "Pay only the quote you accept, securely by card", "Free cancellation before work starts"].map((f) => (
              <li key={f} className="flex gap-2"><BadgeCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" /> {f}</li>
            ))}
          </ul>
          <Button data-testid="pricing-customer-cta" onClick={() => navigate("/register")} className="mt-8 w-full rounded-full h-11 bg-accent hover:bg-accent/90 text-white">Sign up free</Button>
        </div>
        <div className="border-2 border-primary bg-card p-8 sm:p-10 rounded-2xl soft-card" data-testid="pricing-providers">
          <p className="label-caps text-muted-foreground">Handymen</p>
          <p className="font-display font-black text-5xl mt-3">15%</p>
          <p className="text-sm text-muted-foreground mt-1">commission on your profit from completed jobs — we provide the customers</p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Free to join and get verified", "No subscription — pay only when you earn", "Customers matched to your skills and area", "You keep 85% of every agreed quote", "Wallet payouts from £10, any time"].map((f) => (
              <li key={f} className="flex gap-2"><BadgeCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" /> {f}</li>
            ))}
          </ul>
          <Button data-testid="pricing-provider-cta" onClick={() => navigate("/become-provider")} variant="outline" className="mt-8 w-full rounded-full h-11">Become a Handyman</Button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="border border-border bg-card rounded-2xl soft-card p-8 sm:p-10" data-testid="commission-explainer">
          <p className="label-caps text-accent">How the money flows</p>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight mt-2">One agreed price. One transparent split.</h2>
          <div className="grid sm:grid-cols-4 gap-4 mt-8">
            {[
              { n: "1", t: "Handyman quotes £140", d: "A custom quote for your exact job — no price lists." },
              { n: "2", t: "You accept & pay £140", d: "The accepted quote is the agreed price. Secure Stripe checkout." },
              { n: "3", t: "Handyman receives £119", d: "85% of the agreed price lands in their wallet on completion." },
              { n: "4", t: "FixiPro keeps £21", d: "Our 15% commission for bringing you together — nothing more." },
            ].map((s) => (
              <div key={s.n} className="border border-border rounded-2xl p-5">
                <p className="font-display font-black text-2xl text-accent">{s.n}</p>
                <p className="font-semibold text-sm mt-2">{s.t}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FaqPage() {
  const [faqs, setFaqs] = useState([]);
  useEffect(() => { api.get("/faqs").then((r) => setFaqs(r.data)).catch(() => {}); }, []);
  const groups = [...new Set(faqs.map((f) => f.category))];
  return (
    <div data-testid="faq-page">
      <Hero kicker="Help" title="Frequently asked questions" sub="Everything customers and professionals ask us most." testid="faq-hero" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 space-y-10">
        {groups.map((g) => (
          <div key={g}>
            <h2 className="font-display font-bold text-xl mb-4">{g}</h2>
            <Accordion type="single" collapsible className="border border-border bg-card px-5">
              {faqs.filter((f) => f.category === g).map((f, i) => (
                <AccordionItem key={i} value={`${g}-${i}`} data-testid={`faq-${i}`}>
                  <AccordionTrigger className="text-left font-medium">{f.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
        <p className="text-sm text-muted-foreground">Still stuck? <Link to="/contact" className="text-accent hover:underline">Contact our team</Link>.</p>
      </div>
    </div>
  );
}

export function About() {
  return (
    <div data-testid="about-page">
      <Hero kicker="Our story" title="Built for British homes" sub="FixiPro started with a simple frustration: finding a trustworthy handyman shouldn't take a week of phone calls." testid="about-hero" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 grid lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-5 text-muted-foreground leading-relaxed">
          <p>We verify every professional's identity, insurance and qualifications before they can quote on a single job. We hold payment securely until you're happy. And we publish every review — good or bad.</p>
          <p>Today we cover 20 UK cities with thousands of vetted plumbers, electricians, cleaners, gardeners, decorators and handymen — backed by AI tooling that matches the right pro to the right job in minutes.</p>
          <div className="grid sm:grid-cols-3 gap-4 pt-4">
            {[{ v: "20", l: "UK cities" }, { v: "1,240+", l: "Jobs completed" }, { v: "4.8/5", l: "Average rating" }].map((s) => (
              <div key={s.l} className="border border-border bg-card p-5">
                <p className="font-display font-black text-3xl">{s.v}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
        <motion.img src="https://images.unsplash.com/photo-1783587354617-66b8b7c6a0cb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoYW5keW1hbiUyMHJlcGFpcmluZyUyMGhvbWUlMjBpbnRlcmlvciUyMHRvb2xzfGVufDB8fHx8MTc4NjExODc4NXww&ixlib=rb-4.1.0&q=85" alt="A professional handyman's tools in a bright home renovation"
          className="lg:col-span-5 w-full h-80 object-cover border border-black/5 rounded-2xl soft-card"
          initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: "easeOut" }} />
      </div>
    </div>
  );
}

export function Coverage() {
  const [cities, setCities] = useState([]);
  useEffect(() => { api.get("/coverage").then((r) => setCities(r.data.cities || [])).catch(() => {}); }, []);
  return (
    <div data-testid="coverage-page">
      <Hero kicker="Where we work" title="Coverage areas" sub="FixiPro is live in three UK areas today — with more launching soon." testid="coverage-hero" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid sm:grid-cols-3 gap-4" data-testid="coverage-grid">
          {cities.map((c) => (
            <div key={c} data-testid={`coverage-card-${c.toLowerCase()}`}
              className="border border-border bg-card rounded-2xl soft-card p-6 flex items-center gap-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent">
              <span className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <MapPin className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display font-bold text-lg tracking-tight">{c}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Verified local handymen</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 border-2 border-dashed border-accent/40 bg-accent/5 rounded-2xl p-8 text-center" data-testid="coverage-coming-soon-banner">
          <p className="label-caps text-accent flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse-dot" /> Expanding fast
          </p>
          <p className="font-display font-black text-2xl sm:text-3xl tracking-tight mt-2">
            Other areas coming soon!
          </p>
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
            We're onboarding verified handymen across more UK towns. Register your interest and we'll message you the moment we launch near you.
          </p>
          <Link to="/contact">
            <Button data-testid="coverage-contact-cta" className="mt-6 rounded-full bg-accent hover:bg-accent/90 text-white px-6">
              Request your area
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => { api.get("/reviews/public").then((r) => setReviews(r.data)).catch(() => {}); }, []);
  const fallback = [
    { id: "f1", customer_name: "Priya S.", rating: 5, comment: "Boiler fixed same day. The quote matched the final bill to the penny.", service_name: "Boiler Service" },
    { id: "f2", customer_name: "Martin K.", rating: 5, comment: "End-of-tenancy clean got my full deposit back. Worth every penny.", service_name: "End of Tenancy Clean" },
    { id: "f3", customer_name: "Aoife D.", rating: 4, comment: "EV charger installed neatly in one morning. Great communication.", service_name: "EV Charger Installation" },
  ];
  const list = reviews.length ? reviews : fallback;
  return (
    <div data-testid="reviews-page">
      <Hero kicker="Verified reviews" title="What customers say" sub="Every review comes from a completed, paid job. We never edit or remove honest feedback." testid="reviews-hero" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((r) => (
          <div key={r.id} data-testid={`review-${r.id}`} className="border border-border bg-card p-6">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < r.rating ? "text-amber-500 fill-amber-500" : "text-border"}`} />
              ))}
            </div>
            <p className="text-sm mt-3 leading-relaxed">“{r.comment}”</p>
            <p className="text-xs text-muted-foreground mt-4">{r.customer_name} · {r.service_name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BecomeProvider() {
  const navigate = useNavigate();
  return (
    <div data-testid="become-provider-page">
      <Hero kicker="For handymen" title="Win local work, on your terms" sub="Free to join. No subscription. Just a steady stream of jobs in the areas you choose." testid="bp-hero" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight mb-6">Why join FixiPro?</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            "Qualified leads matched to your skills and coverage area",
            "Professional profile with reviews and verification badges",
            "Transparent quoting and secure payment workflow",
            "Tools to manage jobs, availability, and customer communication",
          ].map((t, i) => (
            <motion.div key={t} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              className="border border-border bg-card p-5 rounded-2xl flex items-center gap-3 soft-card">
              <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
              <p className="text-sm font-medium">{t}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-12 bg-slate-950 text-white p-8 sm:p-12 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight">Ready in three steps</h2>
            <p className="text-slate-400 mt-3 max-w-xl">Create your account, upload your insurance and certificates, and start quoting. Most pros are approved within 48 hours.</p>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <Button data-testid="bp-register-cta" onClick={() => navigate("/register")} className="rounded-2xl h-12 px-8 bg-accent hover:bg-accent/90 text-white">
              Join free today <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComingSoon() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-24 sm:py-32 text-left" data-testid="coming-soon-page">
      <p className="label-caps text-accent flex items-center gap-2"><span className="h-2 w-2 bg-accent animate-pulse-dot" /> In the works</p>
      <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight mt-3">Coming soon</h1>
      <p className="text-muted-foreground mt-4 max-w-md">This section is being polished for launch. The rest of the marketplace is fully functional — take a look around.</p>
      <Link to="/"><Button data-testid="cs-home-btn" className="mt-8 rounded-2xl bg-accent hover:bg-accent/90 text-white">Back home</Button></Link>
    </div>
  );
}
