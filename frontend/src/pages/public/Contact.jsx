import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { toast } from "sonner";
import { Mail, MapPin, Phone } from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setSent(true);
    toast.success("Message received. We'll reply within one working day.");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid lg:grid-cols-12 gap-12" data-testid="contact-page">
      <div className="lg:col-span-5">
        <p className="label-caps text-accent">Contact</p>
        <h1 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight mt-2">Talk to a human</h1>
        <p className="text-muted-foreground mt-4 leading-relaxed">Questions about a booking, verification, or partnership? We reply within one working day.</p>
        <div className="mt-8 space-y-4 text-sm">
          <p className="flex items-center gap-3"><Mail className="h-4 w-4 text-accent" /> support@example.co.uk</p>
          <p className="flex items-center gap-3"><Phone className="h-4 w-4 text-accent" /> +44 20 7946 0958</p>
          <p className="flex items-center gap-3"><MapPin className="h-4 w-4 text-accent" /> 1 Example Street, London E1 6AN</p>
        </div>
      </div>
      <div className="lg:col-span-7">
        {sent ? (
          <div data-testid="contact-success" className="border border-emerald-500/40 bg-emerald-500/10 p-8">
            <h2 className="font-display font-bold text-xl">Thanks, {form.name.split(" ")[0]}.</h2>
            <p className="text-sm text-muted-foreground mt-2">Your message is in our queue. Expect a reply at {form.email} shortly.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="border border-border bg-card p-6 sm:p-8 space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="cname" className="label-caps">Name</Label>
                <Input data-testid="contact-name" id="cname" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-none h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cemail" className="label-caps">Email</Label>
                <Input data-testid="contact-email" id="cemail" type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-none h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cmsg" className="label-caps">Message</Label>
              <Textarea data-testid="contact-message" id="cmsg" required minLength={10} rows={6} value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })} className="rounded-none" />
            </div>
            <Button data-testid="contact-submit" type="submit" className="rounded-none h-11 bg-accent hover:bg-accent/90 text-white px-8">Send message</Button>
          </form>
        )}
      </div>
    </div>
  );
}
