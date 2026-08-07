import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import { Mail, LifeBuoy, Wrench, Briefcase } from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "Customer support", message: "" });
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setSent(true);
    toast.success("Message received. We'll reply within one working day.");
  };

  const CARDS = [
    { icon: LifeBuoy, t: "Customer support", d: "Help with quotes, bookings, and account questions." },
    { icon: Wrench, t: "Handyman enquiries", d: "Support for professionals joining or using the platform." },
    { icon: Briefcase, t: "Business & partnerships", d: "Media, partnerships, and commercial enquiries." },
    { icon: Mail, t: "Email", d: "support@fixipro.co.uk" },
  ];

  return (
    <div className="section-tint" data-testid="contact-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <p className="label-caps text-accent">Contact</p>
        <h1 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight mt-2">We're here to help</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl">Reach the FixiPro team for support, handyman onboarding, or general enquiries.</p>

        <div className="grid lg:grid-cols-12 gap-8 mt-12">
          <div className="lg:col-span-5 space-y-4">
            {CARDS.map((c) => (
              <div key={c.t} data-testid={`contact-card-${c.t.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`}
                className="bg-white dark:bg-slate-900 border border-border rounded-2xl soft-card p-5 flex items-start gap-4">
                <span className="h-10 w-10 shrink-0 rounded-xl bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <c.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-sm">{c.t}</p>
                  <p className="text-sm text-muted-foreground mt-1">{c.d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-7">
            {sent ? (
              <div data-testid="contact-success" className="bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-2xl soft-card p-8">
                <h2 className="font-display font-bold text-xl">Thanks, {form.name.split(" ")[0]}.</h2>
                <p className="text-sm text-muted-foreground mt-2">Your {form.subject.toLowerCase()} message is in our queue. Expect a reply at {form.email} shortly.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="bg-white dark:bg-slate-900 border border-border rounded-2xl soft-card p-6 sm:p-8 space-y-5">
                <h2 className="font-display font-bold text-xl">Send a message</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="cname" className="label-caps">Full name</Label>
                    <Input data-testid="contact-name" id="cname" required value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cemail" className="label-caps">Email</Label>
                    <Input data-testid="contact-email" id="cemail" type="email" required value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl h-11" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="label-caps">Subject</Label>
                  <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                    <SelectTrigger data-testid="contact-subject" className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Customer support", "Handyman onboarding", "Business & partnerships", "General enquiry"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cmsg" className="label-caps">Message</Label>
                  <Textarea data-testid="contact-message" id="cmsg" required minLength={10} rows={5} value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })} className="rounded-xl" />
                </div>
                <Button data-testid="contact-submit" type="submit" className="rounded-full h-11 bg-accent hover:bg-accent/90 text-white px-8">Send message</Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
