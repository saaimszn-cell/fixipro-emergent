import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg, fmtDate, fmtGBP } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { StatusBadge, StatCard, EmptyState, PageHeader } from "../../components/shared";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, ShieldCheck, Briefcase, CreditCard, Star, LifeBuoy } from "lucide-react";

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/admin/reports/revenue").then((r) => setRevenue(r.data)).catch(() => {});
    api.get("/admin/reports/overview").then((r) => setOverview(r.data)).catch(() => {});
  }, []);

  if (!stats) return <div className="text-muted-foreground p-8">Loading…</div>;
  const COLORS = ["#0F172A", "#FF3B30", "#0E7C6B", "#D9A420", "#8B93A7"];

  return (
    <div data-testid="admin-dashboard">
      <PageHeader title="Control Centre" sub="Platform health at a glance." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard testid="ad-users" icon={Users} label="Total users" value={stats.users} hint={`${stats.customers} customers · ${stats.providers} providers`} />
        <StatCard testid="ad-pending" icon={ShieldCheck} label="Pending verifications" value={stats.pending_verifications} />
        <StatCard testid="ad-jobs" icon={Briefcase} label="Jobs" value={stats.jobs} hint={`${stats.active_jobs} active · ${stats.completed_jobs} completed`} />
        <StatCard testid="ad-revenue" icon={CreditCard} label="Revenue" value={fmtGBP(stats.revenue)} hint={`${stats.transactions} paid transactions`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <div className="border border-border bg-card p-6" data-testid="revenue-chart">
          <p className="label-caps text-muted-foreground mb-4">Revenue by month</p>
          {revenue?.by_month?.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenue.by_month}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmtGBP(v)} />
                <Bar dataKey="revenue" fill="#0F172A" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground py-16 text-center">Revenue appears once payments complete.</p>}
        </div>
        <div className="border border-border bg-card p-6" data-testid="category-chart">
          <p className="label-caps text-muted-foreground mb-4">Requests by category</p>
          {overview?.requests_by_category?.some((c) => c.requests > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={overview.requests_by_category} dataKey="requests" nameKey="name" outerRadius={90} label={(e) => e.name}>
                  {overview.requests_by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground py-16 text-center">Requests by category will chart here.</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        <Link to="/admin/reviews" className="border border-border bg-card p-5 flex items-center justify-between transition-colors duration-200 hover:border-accent" data-testid="ad-link-reviews">
          <span className="flex items-center gap-2 text-sm font-medium"><Star className="h-4 w-4 text-accent" /> Reviews</span>
          <span className="font-display font-bold">{stats.reviews}</span>
        </Link>
        <Link to="/admin/support" className="border border-border bg-card p-5 flex items-center justify-between transition-colors duration-200 hover:border-accent" data-testid="ad-link-support">
          <span className="flex items-center gap-2 text-sm font-medium"><LifeBuoy className="h-4 w-4 text-accent" /> Open tickets</span>
          <span className="font-display font-bold">{stats.open_tickets}</span>
        </Link>
        <Link to="/admin/jobs" className="border border-border bg-card p-5 flex items-center justify-between transition-colors duration-200 hover:border-accent" data-testid="ad-link-requests">
          <span className="flex items-center gap-2 text-sm font-medium"><Briefcase className="h-4 w-4 text-accent" /> Open requests</span>
          <span className="font-display font-bold">{stats.open_requests}</span>
        </Link>
      </div>
    </div>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("all");
  const [q, setQ] = useState("");
  const load = () => api.get("/admin/users", { params: { role: role === "all" ? "" : role, q } })
    .then((r) => setUsers(r.data)).catch(() => {});
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [role, q]);

  const patch = async (u, body) => {
    try {
      await api.patch(`/admin/users/${u.id}`, body);
      toast.success("User updated");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div data-testid="admin-users-page">
      <PageHeader title="User management" sub="Customers, providers and staff accounts." />
      <div className="flex flex-wrap gap-3 mb-5">
        <Input data-testid="user-search" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-none max-w-xs bg-card" />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger data-testid="role-filter" className="rounded-none w-44 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="provider">Providers</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell className="capitalize">{u.role.replace("_", " ")}</TableCell>
                <TableCell><StatusBadge status={u.status} /></TableCell>
                <TableCell className="text-muted-foreground">{fmtDate(u.created_at)}</TableCell>
                <TableCell>
                  {u.role !== "super_admin" && (
                    <Button data-testid={`toggle-status-${u.id}`} variant="outline" size="sm" className="rounded-none"
                      onClick={() => patch(u, { status: u.status === "suspended" ? "active" : "suspended" })}>
                      {u.status === "suspended" ? "Reactivate" : "Suspend"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function AdminProviders() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("all");
  const load = () => api.get("/admin/providers", { params: { status: status === "all" ? "" : status } })
    .then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, [status]);

  const verify = async (p, approve) => {
    try {
      await api.post(`/admin/providers/${p.id}/verify`, { approve });
      toast.success(approve ? "Provider approved" : "Provider rejected");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div data-testid="admin-providers-page">
      <PageHeader title="Provider management" sub="Verification queue and provider accounts.">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="prov-status-filter" className="rounded-none w-44 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>
      {items.length === 0 ? <EmptyState title="No providers" hint="Provider signups and verification requests appear here." /> : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} data-testid={`provider-${p.id}`} className="border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{p.business_name || p.owner_name}</p>
                  <p className="text-sm text-muted-foreground">{p.email} · {p.coverage?.join(", ") || "no coverage set"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.documents?.length || 0} documents · rating {p.rating} · {p.jobs_done} jobs</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.verification_status} />
                  {p.verification_status !== "approved" && (
                    <Button data-testid={`approve-${p.id}`} size="sm" onClick={() => verify(p, true)} className="rounded-none bg-emerald-600 hover:bg-emerald-700 text-white">Approve</Button>
                  )}
                  {p.verification_status !== "rejected" && (
                    <Button data-testid={`reject-${p.id}`} size="sm" variant="outline" onClick={() => verify(p, false)}
                      className="rounded-none border-destructive/50 text-destructive hover:bg-destructive/10">Reject</Button>
                  )}
                </div>
              </div>
              {p.documents?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {p.documents.map((d, i) => (
                    <span key={i} className="text-xs border border-border px-2.5 py-1.5">{d.name} <span className="text-muted-foreground capitalize">({d.type})</span></span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminJobs() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/requests/mine").then((r) => setItems(r.data)).catch(() => {}); }, []);
  return (
    <div data-testid="admin-jobs-page">
      <PageHeader title="Jobs & requests" sub="Every request across the marketplace." />
      {items.length === 0 ? <EmptyState title="No requests yet" /> : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Service</TableHead><TableHead>Postcode</TableHead><TableHead>Quotes</TableHead><TableHead>Status</TableHead><TableHead>Posted</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id} data-testid={`admin-request-${r.id}`}>
                  <TableCell className="font-medium max-w-[240px] truncate">{r.title}</TableCell>
                  <TableCell className="text-muted-foreground">{r.service_name}</TableCell>
                  <TableCell>{r.postcode}</TableCell>
                  <TableCell>{r.quote_count}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function AdminPayments() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/payments/mine").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const refund = async (p) => {
    if (!window.confirm(`Refund ${fmtGBP(p.amount)}?`)) return;
    try {
      await api.post(`/payments/${p.session_id}/refund`);
      toast.success("Refunded");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div data-testid="admin-payments-page">
      <PageHeader title="Payments & refunds" sub="All Stripe transactions on the platform." />
      {items.length === 0 ? <EmptyState title="No transactions" hint="Payments appear here once customers check out." /> : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Session</TableHead><TableHead>Date</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} data-testid={`admin-payment-${p.id}`}>
                  <TableCell className="font-medium max-w-[220px] truncate">{p.title || "—"}</TableCell>
                  <TableCell>{fmtGBP(p.amount)}</TableCell>
                  <TableCell><StatusBadge status={p.payment_status} /></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.session_id.slice(0, 20)}…</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(p.created_at)}</TableCell>
                  <TableCell>
                    {p.payment_status === "paid" && (
                      <Button data-testid={`refund-${p.id}`} variant="outline" size="sm" onClick={() => refund(p)}
                        className="rounded-none border-destructive/50 text-destructive hover:bg-destructive/10">Refund</Button>
                    )}
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

export function AdminReports() {
  const [revenue, setRevenue] = useState(null);
  const [overview, setOverview] = useState(null);
  useEffect(() => {
    api.get("/admin/reports/revenue").then((r) => setRevenue(r.data)).catch(() => {});
    api.get("/admin/reports/overview").then((r) => setOverview(r.data)).catch(() => {});
  }, []);
  return (
    <div data-testid="admin-reports-page">
      <PageHeader title="Reports & analytics" sub="Revenue, fees and marketplace activity." />
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard testid="rep-gross" icon={CreditCard} label="Gross revenue" value={fmtGBP(revenue?.gross_revenue)} />
        <StatCard testid="rep-fees" icon={CreditCard} label="Platform fees (10%)" value={fmtGBP(revenue?.platform_fees)} />
        <StatCard testid="rep-txns" icon={Briefcase} label="Paid transactions" value={revenue?.transactions ?? 0} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <div className="border border-border bg-card p-6">
          <p className="label-caps text-muted-foreground mb-4">Requests by status</p>
          <div className="space-y-3">
            {(overview?.requests_by_status || []).map((s) => (
              <div key={s.status} className="flex items-center justify-between" data-testid={`status-rep-${s.status}`}>
                <StatusBadge status={s.status} />
                <span className="font-display font-bold">{s.count}</span>
              </div>
            ))}
            {!(overview?.requests_by_status || []).length && <p className="text-sm text-muted-foreground">No data yet.</p>}
          </div>
        </div>
        <div className="border border-border bg-card p-6">
          <p className="label-caps text-muted-foreground mb-4">Monthly revenue</p>
          <div className="space-y-3">
            {(revenue?.by_month || []).map((m) => (
              <div key={m.month} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{m.month}</span>
                <span className="font-semibold">{fmtGBP(m.revenue)}</span>
              </div>
            ))}
            {!(revenue?.by_month || []).length && <p className="text-sm text-muted-foreground">No revenue yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
