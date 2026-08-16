import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api, { errMsg, fmtDate, fmtGBP } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { StatusBadge, PageHeader } from "../../components/shared";
import { toast } from "sonner";
import { CalendarDays, MapPin, Play, MessageSquare, KeyRound, Phone, Lock } from "lucide-react";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [request, setRequest] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const loadJob = async () => {
    try {
      const r = await api.get("/jobs/mine");
      const found = r.data.find((j) => j.id === id) || null;
      setJob(found);
      if (found?.request_id) {
        try {
          const req = await api.get(`/requests/${found.request_id}`);
          setRequest(req.data);
        } catch {}
      }
    } catch (e) { toast.error(errMsg(e)); }
  };

  useEffect(() => { loadJob(); }, [id]);

  if (!job) return <div className="text-muted-foreground p-8" data-testid="job-loading">Loading…</div>;

  const paid = request?.payment && request.payment.payment_status === "paid";
  const address = request?.address;

  const setStatus = async (status) => {
    try {
      await api.post(`/jobs/${id}/status`, { status });
      toast.success(`Job marked as ${status.replaceAll("_", " ")}`);
      loadJob();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const chat = async () => {
    try {
      const { data } = await api.post("/conversations", { user_id: job.customer_id });
      navigate(`/pro/messages/${data.id}`);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code from the customer.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/jobs/${id}/verify-code`, { code });
      toast.success(`Payment released: ${fmtGBP(data.net_paid)} added to your wallet.`);
      setCode("");
      loadJob();
    } catch (e) {
      toast.error(errMsg(e, "Incorrect code."));
    } finally { setBusy(false); }
  };

  const timeline = [...(job.timeline || [])].reverse();

  return (
    <div data-testid="job-detail-page">
      <PageHeader title={job.title} sub={`${job.service_name} · ${fmtGBP(job.amount)}`}>
        <StatusBadge status={job.status} />
      </PageHeader>
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="border border-border bg-card p-6">
            <p className="label-caps text-muted-foreground mb-3">Timeline</p>
            {timeline.length === 0 ? <p className="text-sm text-muted-foreground">No events yet.</p> : (
              <div className="space-y-3">
                {timeline.map((t, i) => (
                  <div key={i} className="flex items-center justify-between border-l-2 border-accent pl-4 py-1">
                    <p className="text-sm font-medium capitalize">{t.status.replaceAll("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(t.at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Address + phone reveal, gated on payment */}
          <div className="border border-border bg-card p-6" data-testid="customer-contact-panel">
            <p className="label-caps text-muted-foreground mb-3">Customer contact</p>
            {paid ? (
              <div className="space-y-3 text-sm">
                {address && (
                  <p className="flex items-center gap-2" data-testid="job-address">
                    <MapPin className="h-4 w-4 text-accent" /> <strong>{address}</strong>
                  </p>
                )}
                {request?.customer_phone && (
                  <a href={`tel:${request.customer_phone}`} data-testid="job-customer-phone"
                    className="flex items-center gap-2 text-accent font-semibold">
                    <Phone className="h-4 w-4" /> {request.customer_phone}
                  </a>
                )}
                {!address && !request?.customer_phone && (
                  <p className="text-sm text-muted-foreground">Contact details will be visible shortly.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2" data-testid="contact-locked">
                <Lock className="h-4 w-4" /> Address and phone unlock once the customer's payment is confirmed.
              </p>
            )}
          </div>

          <div className="border border-border bg-card p-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
            {job.scheduled_date && <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-accent" /> Scheduled: {fmtDate(job.scheduled_date)}</span>}
            <span className="flex items-center gap-1.5">Payment: {job.paid ? <span className="text-emerald-600 font-semibold">Received (in escrow)</span> : "Awaiting customer payment"}</span>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="border border-border bg-card p-6">
            <p className="label-caps text-muted-foreground mb-4">Actions</p>
            <div className="space-y-2">
              {job.status === "awaiting_payment" && (
                <p className="text-sm text-muted-foreground border border-dashed p-4">Waiting for the customer to pay before scheduling.</p>
              )}
              {job.status === "scheduled" && (
                <Button data-testid="start-job-btn" onClick={() => setStatus("in_progress")} className="w-full rounded-none">
                  <Play className="mr-2 h-4 w-4" /> Start job
                </Button>
              )}
              {job.status === "completed" && (
                <p className="text-sm text-emerald-600 border border-emerald-500/40 bg-emerald-500/10 p-4">Job complete — earnings added to your wallet.</p>
              )}
              {paid && ["scheduled", "in_progress"].includes(job.status) && (
                <Button data-testid="message-customer-btn" variant="outline" onClick={chat} className="w-full rounded-none">
                  <MessageSquare className="mr-2 h-4 w-4" /> Message customer
                </Button>
              )}
              {!paid && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Live chat is unlocked after the customer pays.
                </p>
              )}
            </div>
          </div>

          {/* Completion code entry — release escrow */}
          {paid && job.status !== "completed" && (
            <div className="border-2 border-accent bg-accent/5 rounded-xl p-6" data-testid="complete-job-panel">
              <p className="label-caps text-accent flex items-center gap-2"><KeyRound className="h-4 w-4" /> Enter completion code</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Once the work is done, ask the customer to read out the 6-digit completion code from their dashboard. Enter it here to release your payout.
              </p>
              <form onSubmit={verifyCode} className="mt-4 space-y-3">
                <Label className="label-caps">6-digit code</Label>
                <Input data-testid="completion-code-input"
                  inputMode="numeric" pattern="\d{6}" maxLength={6}
                  placeholder="123456"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="rounded-none h-11 font-mono text-lg tracking-[0.4em] text-center" />
                <Button data-testid="verify-code-btn" type="submit" disabled={busy || code.length !== 6}
                  className="w-full rounded-none bg-accent hover:bg-accent/90 text-white h-11">
                  {busy ? "Verifying…" : "Complete job & release payment"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  5 failed attempts locks the code for 30 minutes. Never accept a code by text or over the phone before the work is done.
                </p>
              </form>
            </div>
          )}

          {job.status === "completed" && (
            <div className="border border-border bg-card p-6 text-center" data-testid="job-complete-summary">
              <p className="label-caps text-muted-foreground">Payout</p>
              <p className="font-display font-black text-3xl mt-2">{fmtGBP(job.amount * 0.85)}</p>
              <p className="text-xs text-muted-foreground mt-1">Added to your wallet. FixiPro kept 15% ({fmtGBP(job.amount * 0.15)}).</p>
              <Link to="/pro/earnings"><Button variant="outline" className="rounded-none mt-4" data-testid="view-earnings-btn">View earnings</Button></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
