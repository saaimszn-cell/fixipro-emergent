import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Reveal({ children, delay = 0, y = 22, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({ to = 0, decimals = 0, duration = 1100 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduced()) {
      setVal(to);
      return;
    }
    let raf;
    const start = performance.now();
    const step = (t) => {
      const p = Math.min((t - start) / duration, 1);
      setVal(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return (
    <span ref={ref}>
      {val.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}

export function Tilt({ children, className = "", max = 6 }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el || reduced()) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      className={`transition-transform duration-200 will-change-transform ${className}`}>
      {children}
    </div>
  );
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      data-testid="scroll-progress"
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[3px] z-[70] origin-left bg-accent"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

export function CursorGlow() {
  const ref = useRef(null);
  useEffect(() => {
    if (reduced() || !window.matchMedia("(pointer: fine)").matches) return;
    const el = ref.current;
    let x = -500, y = -500, tx = -500, ty = -500, raf;
    const move = (e) => { tx = e.clientX; ty = e.clientY; };
    const loop = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      if (el) el.style.transform = `translate(${x - 170}px, ${y - 170}px)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", move, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener("mousemove", move); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} className="cursor-glow hidden lg:block" aria-hidden="true" />;
}

const ACTIVITY = [
  { name: "Sarah", city: "Cardiff", job: "booked a plumber" },
  { name: "James", city: "Manchester", job: "accepted an electrical quote" },
  { name: "Priya", city: "London", job: "left a 5-star review" },
  { name: "Tom", city: "Leeds", job: "booked an end of tenancy clean" },
  { name: "Aisha", city: "Birmingham", job: "scheduled a garden clearance" },
  { name: "Dan", city: "Bristol", job: "got 3 quotes for a boiler service" },
];

export function LiveTicker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    const t = setInterval(() => setI((v) => (v + 1) % ACTIVITY.length), 4200);
    return () => clearInterval(t);
  }, []);
  const a = ACTIVITY[i];
  return (
    <div data-testid="live-ticker"
      className="mt-7 inline-flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-border rounded-full px-4 py-2 soft-card text-sm">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <AnimatePresence mode="wait">
        <motion.span key={i}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}>
          <strong>{a.name}</strong> in {a.city} just {a.job}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

const FALLBACK_REVIEWS = [
  { id: "f1", customer_name: "Priya S.", rating: 5, comment: "Boiler fixed same day — the quote matched the bill to the penny.", service_name: "Boiler Service" },
  { id: "f2", customer_name: "Martin K.", rating: 5, comment: "End-of-tenancy clean got my full deposit back.", service_name: "End of Tenancy Clean" },
  { id: "f3", customer_name: "Aoife D.", rating: 4, comment: "EV charger installed neatly in one morning.", service_name: "EV Charger Installation" },
  { id: "f4", customer_name: "Liam W.", rating: 5, comment: "Leaky tap sorted within the hour. Brilliant comms.", service_name: "Leak Repair" },
  { id: "f5", customer_name: "Hannah G.", rating: 5, comment: "Garden clearance was fast, tidy and fairly priced.", service_name: "Garden Clearance" },
];

export function ReviewMarquee({ reviews = [] }) {
  const items = reviews.length ? reviews : FALLBACK_REVIEWS;
  const doubled = [...items, ...items];
  return (
    <div className="marquee overflow-hidden" data-testid="review-marquee" aria-label="Customer reviews carousel">
      <div className="marquee-track flex gap-4 w-max px-4 py-2">
        {doubled.map((r, i) => (
          <div key={`${r.id}-${i}`}
            className="w-72 shrink-0 bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 soft-card">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} className={`h-3.5 w-3.5 ${s < r.rating ? "text-amber-500 fill-amber-500" : "text-border"}`} />
              ))}
            </div>
            <p className="text-sm mt-3 leading-relaxed line-clamp-3">“{r.comment}”</p>
            <p className="text-xs text-muted-foreground mt-3">{r.customer_name} · {r.service_name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
