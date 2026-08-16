import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg, fmtDate, fmtGBP } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Calendar } from "../../components/ui/calendar";
import { StatusBadge, StatCard, EmptyState, PageHeader } from "../../components/shared";
import { toast } from "sonner";
import { Briefcase, Wallet, Star, FileText, ArrowRight, ShieldCheck, Upload, Plus } from "lucide-react";

export function ProviderDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [open, setOpen] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api.get("/jobs/mine").then((r) => setJobs(r.data)).catch(() => {});
    api.get("/quotes/mine").then((r) => setQuotes(r.data)).catch(() => {});
    api.get("/provider/wallet").then((r) => setWallet(r.data)).catch(() => {});
    api.get("/requests/open").then((r) => setOpen(r.data)).catch(() => {});
    api.get("/provider/profile").then((r) => setProfile(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="provider-dashboard">
      <PageHeader title={`Welcome, ${user?.name?.split(" ")[0]}`} sub={profile?.verified ? "You're verified — quotes are live." : "Complete verification to start quoting."}>
        {!profile?.verified && (
          <Link to="/pro/verification"><Button data-testid="dash-verify-cta" className="rounded-none bg-accent hover:bg-accent/90 text-white"><ShieldCheck className="mr-2 h-4 w-4" /> Get verified</Button></Link>
        )}
      </PageHeader>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard testid="stat-balance" icon={Wallet} label="Wallet balance" value={fmtGBP(wallet?.balance)} hint={`${fmtGBP(wallet?.total_earned)} earned total`} />
        <StatCard testid="stat-active-jobs" icon={Briefcase} label="Active jobs" value={jobs.filter((j) => ["scheduled", "in_progress"].includes(j.status)).length} />
        <StatCard testid="stat-pending-quotes" icon={FileText} label="Pending quotes" value={quotes.filter((q) => q.status === "pending").length} />
        <StatCard testid="stat-rating" icon={Star} label="Rating" value={profile?.rating ?? "—"} hint={`${profile?.jobs_done ?? 0} jobs done`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-10">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl">New job requests</h2>
            <Link to="/pro/browse" className="text-sm text-accent font-medium">View all</Link>
          </div>
          {open.length === 0 ? <EmptyState title="No open requests" hint="New jobs matching your services will appear here." /> : (
            <div className="space-y-3">
              {open.slice(0, 4).map((r) => (
                <Link key={r.id} to={`/pro/browse/${r.id}`} data-testid={`dash-open-${r.id}`}
                  className="block border border-border bg-card p-4 transition-colors duration-200 hover:border-accent">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-semibold text-sm">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{r.service_name} · {r.postcode} · {fmtDate(r.created_at)}</p>
                    </div>
                    {r.already_quoted ? <StatusBadge status="pending" /> : <ArrowRight className="h-4 w-4 text-accent shrink-0 mt-1" />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="font-display font-bold text-xl mb-4">Active jobs</h2>
          {jobs.filter((j) => ["scheduled", "in_progress", "awaiting_payment"].includes(j.status)).length === 0 ? (
            <EmptyState title="No active jobs" hint="Accepted quotes become jobs here." />
          ) : (
            <div className="space-y-3">
              {jobs.filter((j) => ["scheduled", "in_progress", "awaiting_payment"].includes(j.status)).slice(0, 4).map((j) => (
                <Link key={j.id} to={`/pro/jobs/${j.id}`} data-testid={`dash-job-${j.id}`}
                  className="flex items-center justify-between border border-border bg-card p-4 transition-colors duration-200 hover:border-accent">
                  <div>
                    <p className="font-semibold text-sm">{j.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{fmtGBP(j.amount)} · {j.scheduled_date ? fmtDate(j.scheduled_date) : "date TBC"}</p>
                  </div>
                  <StatusBadge status={j.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BrowseJobs() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/requests/open").then((r) => setItems(r.data)).catch(() => {}); }, []);
  return (
    <div data-testid="browse-jobs-page">
      <PageHeader title="Job requests" sub="First come, first served — claim any open request in your coverage area." />
      {items.length === 0 ? <EmptyState title="No open requests" hint="Add more services & coverage areas to see more jobs." /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((r) => (
            <Link key={r.id} to={`/pro/browse/${r.id}`} data-testid={`browse-${r.id}`}
              className="border border-border bg-card p-5 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent">
              <div className="flex justify-between items-start gap-3">
                <p className="font-semibold">{r.title}</p>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.description}</p>
              <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
                <span>{r.service_name} · {r.city || r.postcode}</span>
                {r.budget > 0 && <span className="font-bold text-accent text-sm">{fmtGBP(r.budget)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function MyQuotes() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/quotes/mine").then((r) => setItems(r.data)).catch(() => {}); }, []);
  return (
    <div data-testid="my-quotes-page">
      <PageHeader title="My quotes" sub="Every quote you've sent and its outcome." />
      {items.length === 0 ? <EmptyState title="No quotes sent" hint="Browse open job requests and send your first quote." /> : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Sent</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {items.map((q) => (
                <TableRow key={q.id} data-testid={`quote-row-${q.id}`}>
                  <TableCell className="font-medium max-w-[240px] truncate">{q.request_title}</TableCell>
                  <TableCell>{fmtGBP(q.amount)}</TableCell>
                  <TableCell><StatusBadge status={q.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(q.created_at)}</TableCell>
                  <TableCell><Link to={`/pro/browse/${q.request_id}`} className="text-accent text-sm font-medium">View</Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function MyJobs() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  useEffect(() => { api.get("/jobs/mine").then((r) => setItems(r.data)).catch(() => {}); }, []);
  const shown = items.filter((j) => filter === "all" || j.status === filter ||
    (filter === "active" && ["scheduled", "in_progress", "awaiting_payment"].includes(j.status)));
  return (
    <div data-testid="my-jobs-page">
      <PageHeader title="My jobs" sub="Jobs won through the marketplace." />
      <div className="flex flex-wrap gap-2 mb-5">
        {["all", "active", "awaiting_payment", "scheduled", "in_progress", "completed", "cancelled"].map((f) => (
          <button key={f} data-testid={`job-filter-${f}`} onClick={() => setFilter(f)}
            className={`px-4 h-9 text-sm font-medium border capitalize transition-colors duration-200 ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"}`}>
            {f.replaceAll("_", " ")}
          </button>
        ))}
      </div>
      {shown.length === 0 ? <EmptyState title="No jobs" hint="Accepted quotes become jobs here." /> : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Amount</TableHead><TableHead>Scheduled</TableHead><TableHead>Status</TableHead><TableHead>Paid</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {shown.map((j) => (
                <TableRow key={j.id} data-testid={`job-row-${j.id}`}>
                  <TableCell className="font-medium max-w-[240px] truncate">{j.title}</TableCell>
                  <TableCell>{fmtGBP(j.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{j.scheduled_date ? fmtDate(j.scheduled_date) : "TBC"}</TableCell>
                  <TableCell><StatusBadge status={j.status} /></TableCell>
                  <TableCell>{j.paid ? <StatusBadge status="paid" /> : <span className="text-xs text-muted-foreground">awaiting</span>}</TableCell>
                  <TableCell><Link to={`/pro/jobs/${j.id}`} data-testid={`open-job-${j.id}`} className="text-accent text-sm font-medium">Open</Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function Earnings() {
  const [data, setData] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const load = () => {
    api.get("/provider/earnings").then((r) => setData(r.data)).catch(() => {});
    api.get("/provider/wallet").then((r) => setWallet(r.data)).catch(() => {});
    api.get("/provider/withdrawals").then((r) => setWithdrawals(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const withdraw = async (e) => {
    e.preventDefault();
    try {
      await api.post("/provider/withdrawals", { amount: parseFloat(amount) });
      toast.success("Withdrawal requested");
      setOpen(false);
      setAmount("");
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div data-testid="earnings-page">
      <PageHeader title="Earnings & wallet" sub="15% platform commission is deducted per completed job — payouts shown are your 85%.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="withdraw-btn" className="rounded-none bg-accent hover:bg-accent/90 text-white">Withdraw</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request withdrawal</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Available balance: <strong>{fmtGBP(wallet?.balance)}</strong>. Minimum £10.</p>
            <form onSubmit={withdraw} className="space-y-4 mt-2">
              <Input data-testid="withdraw-amount" type="number" min="10" step="0.01" required value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="Amount (£)" className="rounded-none" />
              <Button data-testid="withdraw-submit" type="submit" className="rounded-none w-full">Request withdrawal</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard testid="wallet-balance" icon={Wallet} label="Available balance" value={fmtGBP(wallet?.balance)} />
        <StatCard testid="wallet-earned" icon={Briefcase} label="Total earned (net)" value={fmtGBP(wallet?.total_earned)} />
        <StatCard testid="wallet-withdrawn" icon={ArrowRight} label="Total withdrawn" value={fmtGBP(wallet?.total_withdrawn)} />
      </div>

      <h2 className="font-display font-bold text-xl mt-10 mb-4">Earnings</h2>
      {!data || data.entries.length === 0 ? <EmptyState title="No earnings yet" hint="Completed jobs pay out here automatically." /> : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Agreed price</TableHead><TableHead>FixiPro fee (15%)</TableHead><TableHead>Your payout</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.entries.map((e) => (
                <TableRow key={e.id} data-testid={`earning-${e.id}`}>
                  <TableCell className="font-medium max-w-[220px] truncate">{e.job_title}</TableCell>
                  <TableCell>{fmtGBP(e.gross)}</TableCell>
                  <TableCell className="text-muted-foreground">−{fmtGBP(e.fee)}</TableCell>
                  <TableCell className="font-semibold">{fmtGBP(e.net)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(e.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <h2 className="font-display font-bold text-xl mt-10 mb-4">Withdrawals</h2>
      {withdrawals.length === 0 ? <EmptyState title="No withdrawals" hint="Request a payout once your balance reaches £10." /> : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Requested</TableHead></TableRow></TableHeader>
            <TableBody>
              {withdrawals.map((w) => (
                <TableRow key={w.id} data-testid={`withdrawal-${w.id}`}>
                  <TableCell className="font-semibold">{fmtGBP(w.amount)}</TableCell>
                  <TableCell><StatusBadge status={w.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(w.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function Availability() {
  const [items, setItems] = useState([]);
  const [date, setDate] = useState(new Date());
  const load = () => api.get("/provider/availability").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const iso = (d) => d.toISOString().slice(0, 10);
  const current = items.find((i) => i.date === iso(date));

  const toggle = async (blocked) => {
    try {
      await api.post("/provider/availability", { date: iso(date), blocked });
      toast.success(blocked ? "Day blocked" : "Day opened");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const blockedDates = items.filter((i) => i.blocked).map((i) => new Date(i.date));

  return (
    <div data-testid="availability-page">
      <PageHeader title="Availability" sub="Block days you can't work. Open days are bookable." />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-border bg-card p-6 flex justify-center">
          <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)}
            modifiers={{ blocked: blockedDates }} modifiersClassNames={{ blocked: "bg-destructive/20 text-destructive" }}
            data-testid="availability-calendar" />
        </div>
        <div className="border border-border bg-card p-6">
          <p className="label-caps text-muted-foreground">Selected day</p>
          <p className="font-display font-bold text-2xl mt-1" data-testid="selected-date">{date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Status: <span className="font-medium">{current?.blocked ? "Blocked" : "Open for bookings"}</span>
          </p>
          <div className="flex gap-2 mt-6">
            <Button data-testid="block-day-btn" variant="outline" onClick={() => toggle(true)} disabled={current?.blocked}
              className="rounded-none border-destructive/50 text-destructive hover:bg-destructive/10">Block this day</Button>
            <Button data-testid="open-day-btn" onClick={() => toggle(false)} disabled={!current?.blocked} className="rounded-none">Mark as available</Button>
          </div>
          <div className="mt-8">
            <p className="label-caps text-muted-foreground mb-3">Blocked days ({items.filter((i) => i.blocked).length})</p>
            <div className="flex flex-wrap gap-2">
              {items.filter((i) => i.blocked).map((i) => (
                <span key={i.id} data-testid={`blocked-${i.date}`} className="text-xs border border-destructive/40 text-destructive px-3 py-1.5">{fmtDate(i.date)}</span>
              ))}
              {items.filter((i) => i.blocked).length === 0 && <p className="text-sm text-muted-foreground">No blocked days — you're fully bookable.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Verification() {
  const [status, setStatus] = useState(null);
  const [docs, setDocs] = useState([{ name: "", type: "insurance" }]);
  const [open, setOpen] = useState(false);
  const load = () => api.get("/provider/verification").then((r) => setStatus(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/provider/verification", { documents: docs.filter((d) => d.name.trim()) });
      toast.success("Documents submitted for review");
      setOpen(false);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div data-testid="verification-page">
      <PageHeader title="Verification & documents" sub="Insurance and certifications build customer trust.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="add-docs-btn" className="rounded-none bg-accent hover:bg-accent/90 text-white"><Upload className="mr-2 h-4 w-4" /> Submit documents</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit verification documents</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              {docs.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <Input data-testid={`doc-name-${i}`} placeholder="Document name (e.g. Public Liability Insurance)" required
                    value={d.name} onChange={(e) => setDocs(docs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="rounded-none" />
                  <Select value={d.type} onValueChange={(v) => setDocs(docs.map((x, j) => j === i ? { ...x, type: v } : x))}>
                    <SelectTrigger data-testid={`doc-type-${i}`} className="rounded-none w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="certification">Certification</SelectItem>
                      <SelectItem value="id">ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <Button type="button" variant="outline" data-testid="add-doc-row" onClick={() => setDocs([...docs, { name: "", type: "insurance" }])} className="rounded-none w-full">
                <Plus className="mr-2 h-4 w-4" /> Add another
              </Button>
              <Button data-testid="docs-submit" type="submit" className="rounded-none w-full">Submit for review</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>
      {status && (
        <div className="border border-border bg-card p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label-caps text-muted-foreground">Verification status</p>
            <p className="font-display font-bold text-2xl mt-1 capitalize" data-testid="verification-status">{status.verification_status}</p>
          </div>
          <StatusBadge status={status.verification_status} />
        </div>
      )}
      {(!status || status.documents.length === 0) ? (
        <EmptyState title="No documents yet" hint="Upload insurance and certifications so customers can trust your work." />
      ) : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Uploaded</TableHead></TableRow></TableHeader>
            <TableBody>
              {status.documents.map((d, i) => (
                <TableRow key={i} data-testid={`doc-row-${i}`}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{d.type}</TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(d.uploaded_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function ProviderProfile() {
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [cities, setCities] = useState([]);
  const [phone, setPhone] = useState("");
  const load = () => api.get("/provider/profile").then((r) => {
    setProfile(r.data);
  }).catch(() => {});
  useEffect(() => {
    load();
    api.get("/services").then((r) => setServices(r.data)).catch(() => {});
    api.get("/coverage").then((r) => setCities(r.data.cities || [])).catch(() => {});
    api.get("/auth/me").then((r) => setPhone(r.data.phone || "")).catch(() => {});
  }, []);
  if (!profile) return <div className="text-muted-foreground p-8">Loading…</div>;

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put("/provider/profile", {
        business_name: profile.business_name, bio: profile.bio,
        availability: profile.availability,
        services: profile.services, coverage: profile.coverage,
      });
      await api.put("/auth/profile", { phone });
      toast.success("Profile saved");
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const toggleIn = (key, val) => {
    const list = profile[key] || [];
    setProfile({ ...profile, [key]: list.includes(val) ? list.filter((x) => x !== val) : [...list, val] });
  };

  return (
    <div data-testid="provider-profile-page" className="max-w-3xl">
      <PageHeader title="Business profile" sub="This is what customers see when you claim their job." />
      <form onSubmit={save} className="border border-border bg-card p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <Label className="label-caps">Business name</Label>
          <Input data-testid="bp-name" value={profile.business_name || ""} onChange={(e) => setProfile({ ...profile, business_name: e.target.value })} className="rounded-none h-11" />
        </div>
        <div className="space-y-2">
          <Label className="label-caps">Phone number (visible to customer after payment)</Label>
          <Input data-testid="bp-phone" type="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)} className="rounded-none h-11"
            placeholder="e.g. 07538 624492" />
        </div>
        <div className="space-y-2">
          <Label className="label-caps">Description of your services</Label>
          <Textarea data-testid="bp-bio" rows={4} value={profile.bio || ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className="rounded-none" />
        </div>
        <div className="space-y-2">
          <Label className="label-caps">Availability</Label>
          <Input data-testid="bp-availability"
            placeholder="e.g. Monday to Saturday, 8am–6pm"
            value={profile.availability || ""}
            onChange={(e) => setProfile({ ...profile, availability: e.target.value })}
            className="rounded-none h-11" />
        </div>
        <div className="space-y-3">
          <Label className="label-caps">Services you offer ({(profile.services || []).length})</Label>
          <div className="flex flex-wrap gap-2" data-testid="bp-services">
            {services.map((s) => (
              <button type="button" key={s.id} data-testid={`bp-svc-${s.slug}`} onClick={() => toggleIn("services", s.id)}
                className={`px-3 py-2 text-sm border transition-colors duration-200 ${(profile.services || []).includes(s.id) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Label className="label-caps">Coverage areas ({(profile.coverage || []).length})</Label>
          <div className="flex flex-wrap gap-2" data-testid="bp-coverage">
            {cities.map((c) => (
              <button type="button" key={c} data-testid={`bp-city-${c}`} onClick={() => toggleIn("coverage", c)}
                className={`px-3 py-2 text-sm border transition-colors duration-200 ${(profile.coverage || []).includes(c) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <Button data-testid="bp-save" type="submit" className="rounded-none h-11 px-8 bg-accent hover:bg-accent/90 text-white">Save profile</Button>
      </form>
    </div>
  );
}
