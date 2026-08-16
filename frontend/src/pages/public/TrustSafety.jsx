import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../../lib/api";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { toast } from "sonner";
import { ShieldCheck, Lock, AlertOctagon, Scale, KeyRound, HeartHandshake } from "lucide-react";

const CARDS = [
  { icon: ShieldCheck, t: "Verified handymen only", d: "Every handyman completes ID checks, insurance verification and trade certification review before they can claim their first job." },
  { icon: Lock, t: "Escrow-protected payments", d: "Your money goes into escrow, not the handyman's pocket. Nothing is released until you personally hand over your completion code." },
  { icon: KeyRound, t: "6-digit completion codes", d: "Only you can see it. Only you can share it. No code = no payout, so a job that isn't finished doesn't get paid." },
  { icon: HeartHandshake, t: "Human mediation", d: "If something goes wrong, our trust team reviews the messages, timeline and evidence — and can refund your escrow." },
  { icon: Scale, t: "Legal recourse", d: "For serious misconduct we cooperate fully with UK police and courts, providing account, message and payment records under lawful request." },
  { icon: AlertOctagon, t: "Report a problem 24/7", d: "Any safety, fraud or damage concern goes straight to our Trust & Safety team. All reports are triaged within one working day." },
];

export default function TrustSafety() {
  const [content, setContent] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", subject: "Report a problem", message: "", company: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api.get("/pages/trust-safety").then((r) => setContent(r.data)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/comms/contact", form);
      setSent(true);
      toast.success("Report received — our trust team will be in touch shortly.");
    } catch (err) {
      toast.error(errMsg(err, "Could not send your report. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="trust-safety-page" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <p className="label-caps text-accent">Customer Trustworthy</p>
      <h1 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight mt-2">
        Trust & Safety
      </h1>
      <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
        FixiPro is built on trust. Every part of the platform — verification, escrow, completion codes and dispute mediation — exists to protect customers and honest handymen. Here's exactly how.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
        {CARDS.map((c, i) => (
          <motion.div key={c.t} data-testid={`trust-card-${i}`}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="border border-border bg-card rounded-2xl soft-card p-6">
            <span className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <c.icon className="h-5 w-5" aria-hidden />
            </span>
            <p className="font-display font-bold text-lg tracking-tight mt-4">{c.t}</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.d}</p>
          </motion.div>
        ))}
      </div>

      {content && (
        <div className="mt-12 border border-border bg-card rounded-2xl p-6 sm:p-8" data-testid="trust-longform">
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{content.content}</p>
        </div>
      )}

      <div id="report" className="mt-14 border-2 border-accent/40 bg-accent/5 rounded-2xl p-6 sm:p-8" data-testid="trust-report-block">
        <p className="label-caps text-accent">Report a problem</p>
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight mt-2">
          Something feel wrong? Tell us.
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Fraud, no-show, damage, safety concern or anything else. Reports go directly to our trust team. All submissions are rate-limited and honeypot-protected.
        </p>

        {sent ? (
          <div data-testid="trust-report-success" className="mt-6 border border-emerald-500/40 bg-white dark:bg-slate-900 rounded-xl p-6">
            <p className="font-display font-bold text-lg">Thanks — we've received your report.</p>
            <p className="text-sm text-muted-foreground mt-2">Trust & Safety will reply within one working day. If it's urgent and involves a live safety issue, please also call the emergency services.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid sm:grid-cols-2 gap-4">
            <input type="text" name="company" tabIndex="-1" autoComplete="off"
              value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />
            <div className="space-y-2">
              <Label className="label-caps">Your name</Label>
              <Input data-testid="trust-report-name" required minLength={2} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label className="label-caps">Email</Label>
              <Input data-testid="trust-report-email" type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl h-11" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label className="label-caps">Details</Label>
              <Textarea data-testid="trust-report-message" required minLength={10} rows={5}
                placeholder="What happened? Include the job title, handyman name and any dates that help."
                value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="rounded-xl" />
            </div>
            <Button data-testid="trust-report-submit" type="submit" disabled={busy}
              className="sm:col-span-2 rounded-full h-11 bg-accent hover:bg-accent/90 text-white">
              {busy ? "Sending…" : "Send report"}
            </Button>
          </form>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-8">
        Prefer email? Reach us at <Link to="/contact" className="text-accent hover:underline">/contact</Link>.
      </p>
    </div>
  );
}
