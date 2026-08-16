import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { errMsg, fmtDate, fmtGBP } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { StatusBadge, StatCard, EmptyState, PageHeader } from "../../components/shared";
import { toast } from "sonner";
import { ClipboardList, CreditCard, FileText, PlusCircle, ArrowRight, Star, CheckCircle2 } from "lucide-react";

export function CustomerDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    api.get("/requests/mine").then((r) => setRequests(r.data)).catch(() => {});
    api.get("/jobs/mine").then((r) => setJobs(r.data)).catch(() => {});
    api.get("/payments/mine").then((r) => setPayments(r.data)).catch(() => {});
  }, []);

  const active = requests.filter((r) => ["open", "quoted"].includes(r.status)).length;
  const spent = payments.filter((p) => p.payment_status === "paid").reduce((s, p) => s + p.amount, 0);

  return (
    <div data-testid="customer-dashboard">
      <PageHeader title={`Hello, ${user?.name?.split(" ")[0]}`} sub="Here's what's happening with your jobs.">
        <Link to="/dashboard/requests/new">
          <Button data-testid="dash-new-request" className="rounded-none bg-accent hover:bg-accent/90 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> New request
          </Button>
        </Link>
      </PageHeader>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard testid="stat-active" icon={ClipboardList} label="Active requests" value={active} />
        <StatCard testid="stat-jobs" icon={CheckCircle2} label="Jobs in progress" value={jobs.filter((j) => ["scheduled", "in_progress"].includes(j.status)).length} />
        <StatCard testid="stat-completed" icon={Star} label="Completed" value={jobs.filter((j) => j.status === "completed").length} />
        <StatCard testid="stat-spent" icon={CreditCard} label="Total spent" value={fmtGBP(spent)} />
      </div>

      <h2 className="font-display font-bold text-xl mt-10 mb-4">Recent requests</h2>
      {requests.length === 0 ? (
        <EmptyState title="No requests yet" hint="Post your first job and get quotes from vetted local pros."
          action={<Link to="/dashboard/requests/new"><Button data-testid="empty-new-request" className="rounded-none bg-accent hover:bg-accent/90 text-white">Post a job</Button></Link>} />
      ) : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead><TableHead>Service</TableHead><TableHead>Quotes</TableHead>
                <TableHead>Status</TableHead><TableHead>Posted</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.slice(0, 6).map((r) => (
                <TableRow key={r.id} data-testid={`dash-request-${r.id}`}>
                  <TableCell className="font-medium max-w-[220px] truncate">{r.title}</TableCell>
                  <TableCell className="text-muted-foreground">{r.service_name}</TableCell>
                  <TableCell>{r.quote_count}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                  <TableCell>
                    <Link to={`/dashboard/requests/${r.id}`} data-testid={`view-request-${r.id}`}
                      className="text-accent text-sm font-medium flex items-center gap-1 hover:gap-2 transition-[gap] duration-200">
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function NewRequest() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({
    service_id: params.get("service") || "", title: "", description: "",
    postcode: "", city: "", address: "", budget: "",
    urgency: "flexible", preferred_date: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/services").then((r) => setServices(r.data)).catch(() => {});
    api.get("/coverage").then((r) => setCities(r.data.cities || [])).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, budget: parseFloat(form.budget) };
      const { data } = await api.post("/requests", payload);
      toast.success("Job posted — verified handymen nearby have been notified.");
      navigate(`/dashboard/requests/${data.id}`);
    } catch (err) {
      toast.error(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div data-testid="new-request-page" className="max-w-2xl">
      <PageHeader title="Post a job" sub="Describe the work — the first verified handyman in your area can claim it instantly." />
      <form onSubmit={submit} className="border border-border bg-card p-6 sm:p-8 space-y-5">
        <div className="space-y-2">
          <Label className="label-caps">Service</Label>
          <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })} required>
            <SelectTrigger data-testid="req-service" className="rounded-none h-11"><SelectValue placeholder="Choose a service…" /></SelectTrigger>
            <SelectContent>
              {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="label-caps">Job title</Label>
          <Input data-testid="req-title" required minLength={5} placeholder="e.g. Kitchen tap leaking at the base"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-none h-11" />
        </div>
        <div className="space-y-2">
          <Label className="label-caps">Description</Label>
          <Textarea data-testid="req-description" required minLength={10} rows={5}
            placeholder="What's wrong, where, access details, anything the handyman should know…"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-none" />
        </div>
        <div className="space-y-2">
          <Label className="label-caps">Full address (revealed to the handyman only after you pay)</Label>
          <Input data-testid="req-address" required minLength={4} maxLength={200}
            placeholder="12 Rowan Way, Innsworth" value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-none h-11" />
          <p className="text-xs text-muted-foreground">
            Handymen see only the city and postcode until you accept and pay. After payment your full address becomes visible to the assigned handyman.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="label-caps">Postcode</Label>
            <Input data-testid="req-postcode" required placeholder="GL3 1DP" value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value })} className="rounded-none h-11" />
          </div>
          <div className="space-y-2">
            <Label className="label-caps">City / Area</Label>
            <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
              <SelectTrigger data-testid="req-city" className="rounded-none h-11"><SelectValue placeholder="Pick your area…" /></SelectTrigger>
              <SelectContent>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="label-caps">Your budget (£)</Label>
          <Input data-testid="req-budget" type="number" min="1" step="0.01" required
            placeholder="e.g. 120" value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })} className="rounded-none h-11" />
          <p className="text-xs text-muted-foreground">
            The first handyman who claims your job accepts this price. You pay only this amount — the handyman receives 85% after our 15% platform fee.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="label-caps">Urgency</Label>
            <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
              <SelectTrigger data-testid="req-urgency" className="rounded-none h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="emergency">Emergency — ASAP</SelectItem>
                <SelectItem value="soon">Within a few days</SelectItem>
                <SelectItem value="flexible">I'm flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="label-caps">Preferred date</Label>
            <Input data-testid="req-date" type="date" value={form.preferred_date}
              onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} className="rounded-none h-11" />
          </div>
        </div>
        <Button data-testid="req-submit" type="submit" disabled={busy} className="rounded-none h-11 px-8 bg-accent hover:bg-accent/90 text-white">
          {busy ? "Posting…" : "Post job"}
        </Button>
      </form>
    </div>
  );
}

const FILTERS = ["all", "open", "quoted", "accepted", "completed", "cancelled"];

export function MyRequests() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  useEffect(() => { api.get("/requests/mine").then((r) => setItems(r.data)).catch(() => {}); }, []);
  const shown = items.filter((r) => {
    if (filter === "all") return true;
    if (filter === "completed") return r.status === "completed" || r.job?.status === "completed";
    return r.status === filter;
  });
  return (
    <div data-testid="my-requests-page">
      <PageHeader title="My requests" sub="Track every job from posting to completion.">
        <Link to="/dashboard/requests/new"><Button data-testid="requests-new-btn" className="rounded-none bg-accent hover:bg-accent/90 text-white"><PlusCircle className="mr-2 h-4 w-4" /> New request</Button></Link>
      </PageHeader>
      <div className="flex flex-wrap gap-2 mb-5" data-testid="request-filters">
        {FILTERS.map((f) => (
          <button key={f} data-testid={`filter-${f}`} onClick={() => setFilter(f)}
            className={`px-4 h-9 text-sm font-medium border capitalize transition-colors duration-200 ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"}`}>
            {f}
          </button>
        ))}
      </div>
      {shown.length === 0 ? <EmptyState title="Nothing here" hint="No requests match this filter." /> : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Job</TableHead><TableHead>Service</TableHead><TableHead>Quotes</TableHead><TableHead>Status</TableHead><TableHead>Posted</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={r.id} data-testid={`request-row-${r.id}`}>
                  <TableCell className="font-medium max-w-[240px] truncate">{r.title}</TableCell>
                  <TableCell className="text-muted-foreground">{r.service_name}</TableCell>
                  <TableCell>{r.quote_count}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                  <TableCell><Link to={`/dashboard/requests/${r.id}`} data-testid={`open-request-${r.id}`} className="text-accent text-sm font-medium">Open</Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function QuotesPage() {
  const [requests, setRequests] = useState([]);
  useEffect(() => { api.get("/requests/mine").then((r) => setRequests(r.data.filter((x) => x.quote_count > 0))).catch(() => {}); }, []);
  return (
    <div data-testid="quotes-page">
      <PageHeader title="Quotes" sub="Requests that have received custom quotes from handymen." />
      {requests.length === 0 ? <EmptyState title="No quotes yet" hint="When pros quote on your requests, they'll show up here." /> : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Link key={r.id} to={`/dashboard/requests/${r.id}`} data-testid={`quote-req-${r.id}`}
              className="flex items-center justify-between border border-border bg-card p-5 transition-colors duration-200 hover:border-accent">
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.service_name} · posted {fmtDate(r.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-accent/10 text-accent font-bold text-sm px-3 py-1.5">{r.quote_count} quote{r.quote_count !== 1 ? "s" : ""}</span>
                <StatusBadge status={r.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function PaymentsPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/payments/mine").then((r) => setItems(r.data)).catch(() => {}); }, []);
  return (
    <div data-testid="payments-page">
      <PageHeader title="Payments" sub="All your checkout sessions and their status." />
      {items.length === 0 ? <EmptyState title="No payments yet" hint="When you pay for an accepted quote, it appears here." /> : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} data-testid={`payment-${p.id}`}>
                  <TableCell className="font-medium max-w-[260px] truncate">{p.title || "—"}</TableCell>
                  <TableCell>{fmtGBP(p.amount)}</TableCell>
                  <TableCell><StatusBadge status={p.payment_status} /></TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(p.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function InvoicesPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/invoices/mine").then((r) => setItems(r.data)).catch(() => {}); }, []);
  return (
    <div data-testid="invoices-page">
      <PageHeader title="Invoices" sub="Receipts for completed payments." />
      {items.length === 0 ? <EmptyState title="No invoices" hint="Paid jobs generate invoices automatically." /> : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Job</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} data-testid={`invoice-${p.id}`}>
                  <TableCell className="font-mono text-sm">{p.invoice_no}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{p.title}</TableCell>
                  <TableCell>{fmtGBP(p.amount)}</TableCell>
                  <TableCell><StatusBadge status={p.payment_status} /></TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(p.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function Favourites() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/favourites").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const remove = async (id) => {
    await api.delete(`/favourites/${id}`);
    toast.success("Removed from favourites");
    load();
  };
  return (
    <div data-testid="favourites-page">
      <PageHeader title="Favourite handymen" sub="Your go-to handymen, one tap away." />
      {items.length === 0 ? <EmptyState title="No favourites yet" hint="Save great handymen after a job to rebook them quickly." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <div key={p.id} data-testid={`fav-${p.user_id}`} className="border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <span className="h-11 w-11 bg-primary text-primary-foreground flex items-center justify-center font-display font-bold">{(p.business_name || p.name || "?")[0]}</span>
                <div>
                  <p className="font-semibold">{p.business_name || p.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {p.rating} · {p.jobs_done} jobs</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{p.bio}</p>
              <Button data-testid={`fav-remove-${p.user_id}`} variant="outline" size="sm" onClick={() => remove(p.user_id)} className="mt-4 rounded-none">Remove</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
