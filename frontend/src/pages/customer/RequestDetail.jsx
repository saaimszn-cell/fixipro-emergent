import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { errMsg, fmtDate, fmtGBP } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { StatusBadge, PageHeader } from "../../components/shared";
import { toast } from "sonner";
import { CreditCard, MapPin, CalendarDays, KeyRound, Copy, MessageSquare, Phone, Lock } from "lucide-react";

export default function RequestDetail({ providerView = false }) {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [req, setReq] = useState(null);
  const [claimBusy, setClaimBusy] = useState(false);

  const load = () => api.get(`/requests/${id}`).then((r) => setReq(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, [id]);

  // Live polling so customers see the "handyman claimed" state instantly
  useEffect(() => {
    if (!req) return;
    if (["completed", "cancelled"].includes(req.status)) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req?.status, id]);

  if (!req) return <div className="text-muted-foreground p-8">Loading…</div>;

  const paid = req.payment && req.payment.payment_status === "paid";
  const needsPayment = req.job && req.job.status === "awaiting_payment" && !paid;
  const isCustomer = user?.role === "customer";
  const isProvider = user?.role === "provider";
  const isMyClaim = isProvider && req.claimed_by === user.id;

  const pay = async () => {
    try {
      const acceptedQuote = req.quotes.find((q) => q.status === "accepted");
      if (!acceptedQuote) return toast.error("No accepted quote to pay for.");
      const { data } = await api.post("/payments/checkout", { quote_id: acceptedQuote.id, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error(errMsg(e)); }
  };

  const claim = async () => {
    setClaimBusy(true);
    try {
      await api.post(`/requests/${id}/claim`);
      toast.success("Job claimed. The customer has been notified to pay.");
      load();
    } catch (e) { toast.error(errMsg(e)); }
    setClaimBusy(false);
  };

  const cancel = async () => {
    try {
      await api.post(`/requests/${id}/cancel`);
      toast.success("Request cancelled");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const startChat = async (otherId) => {
    try {
      const { data } = await api.post("/conversations", { user_id: otherId });
      navigate(`${providerView ? "/pro" : "/dashboard"}/messages/${data.id}`);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const copyCode = () => {
    if (!req.completion_code) return;
    navigator.clipboard.writeText(req.completion_code);
    toast.success("Completion code copied");
  };

  return (
    <div data-testid="request-detail-page">
      <PageHeader title={req.title} sub={`${req.service_name} · posted ${fmtDate(req.created_at)}`}>
        <StatusBadge status={req.status} />
      </PageHeader>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="border border-border bg-card p-6">
            <p className="label-caps text-muted-foreground mb-2">Job details</p>
            <p className="text-sm leading-relaxed whitespace-pre-line">{req.description}</p>
            <div className="flex flex-wrap gap-5 mt-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-accent" /> {req.city || "—"} · {req.postcode}</span>
              {req.preferred_date && <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-accent" /> {fmtDate(req.preferred_date)}</span>}
              {req.budget > 0 && <span>Budget: <strong className="text-foreground">{fmtGBP(req.budget)}</strong></span>}
              <span className="capitalize">Urgency: {req.urgency}</span>
            </div>

            {/* Address section — visible to customer always, to provider only after payment */}
            {(isCustomer || isMyClaim) && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="label-caps text-muted-foreground mb-1.5">Address</p>
                {isCustomer && (
                  <p className="text-sm" data-testid="address-customer-view">
                    {req.address || <span className="text-muted-foreground italic">No address on record</span>}
                    <span className="ml-2 text-xs text-muted-foreground">(shared with handyman after payment)</span>
                  </p>
                )}
                {isProvider && isMyClaim && paid && req.address && (
                  <p className="text-sm font-semibold" data-testid="address-provider-view">
                    {req.address}
                  </p>
                )}
                {isProvider && isMyClaim && !paid && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2" data-testid="address-locked">
                    <Lock className="h-3.5 w-3.5" /> Full address unlocks once the customer's payment is confirmed.
                  </p>
                )}
              </div>
            )}

            {/* Contact reveal after payment */}
            {paid && (
              <div className="mt-4 border-t border-border pt-4 grid sm:grid-cols-2 gap-4">
                {isCustomer && req.provider_phone && (
                  <div data-testid="provider-phone-reveal">
                    <p className="label-caps text-muted-foreground mb-1">Handyman phone</p>
                    <a href={`tel:${req.provider_phone}`} className="text-sm font-semibold text-accent flex items-center gap-2">
                      <Phone className="h-4 w-4" /> {req.provider_phone}
                    </a>
                  </div>
                )}
                {isProvider && isMyClaim && req.customer_phone && (
                  <div data-testid="customer-phone-reveal">
                    <p className="label-caps text-muted-foreground mb-1">Customer phone</p>
                    <a href={`tel:${req.customer_phone}`} className="text-sm font-semibold text-accent flex items-center gap-2">
                      <Phone className="h-4 w-4" /> {req.customer_phone}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {req.job && (
            <div className="border border-border bg-card p-6" data-testid="job-panel">
              <div className="flex items-center justify-between">
                <p className="label-caps text-muted-foreground">Job status</p>
                <StatusBadge status={req.job.status} />
              </div>
              <div className="mt-4 space-y-2">
                {(req.job.timeline || []).map((t, i) => (
                  <p key={i} className="text-sm flex justify-between border-b border-border pb-2">
                    <span className="capitalize font-medium">{t.status.replaceAll("_", " ")}</span>
                    <span className="text-muted-foreground">{fmtDate(t.at)}</span>
                  </p>
                ))}
              </div>

              {needsPayment && isCustomer && (
                <div className="mt-5">
                  <Button data-testid="pay-now-btn" onClick={pay} className="rounded-none bg-accent hover:bg-accent/90 text-white">
                    <CreditCard className="mr-2 h-4 w-4" /> Pay {fmtGBP(req.job.amount)} securely
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Funds are held in escrow. Nothing is released to {req.provider_name || "the handyman"} until you personally hand over your 6-digit completion code once the work is done.
                  </p>
                </div>
              )}

              {/* Completion code — shown ONLY to the customer, ONLY after payment */}
              {isCustomer && paid && req.completion_code && (
                <div className="mt-6 border-2 border-accent bg-accent/5 rounded-xl p-5" data-testid="completion-code-box">
                  <p className="label-caps text-accent flex items-center gap-2"><KeyRound className="h-4 w-4" /> Your completion code</p>
                  <div className="flex items-center gap-3 mt-3">
                    <p data-testid="completion-code-value" className="font-mono font-black text-4xl tracking-[0.4em] text-foreground select-all">
                      {req.completion_code}
                    </p>
                    <Button variant="outline" size="sm" onClick={copyCode} data-testid="copy-code-btn" className="rounded-none">
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    Read this out to the handyman <strong>only when the work is finished to your satisfaction</strong>.
                    Once they enter it correctly, {fmtGBP(req.job.amount * 0.85)} is released to their wallet and 15% goes to FixiPro.
                  </p>
                </div>
              )}

              {/* Chat button — only enabled after payment */}
              {req.job && (paid || user?.role === "admin" || user?.role === "super_admin") && (
                <Button data-testid="chat-other-btn" variant="outline" onClick={() => startChat(providerView ? req.customer_id : req.job.provider_id)} className="mt-4 mr-2 rounded-none">
                  <MessageSquare className="mr-2 h-4 w-4" /> Message {providerView ? "customer" : "handyman"}
                </Button>
              )}
              {req.job && !paid && (
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Live chat unlocks once payment is confirmed.
                </p>
              )}
            </div>
          )}

          {!providerView && ["open", "quoted"].includes(req.status) && (
            <Button data-testid="cancel-request-btn" variant="outline" onClick={cancel}
              className="rounded-none border-destructive/50 text-destructive hover:bg-destructive/10">
              Cancel request
            </Button>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          {/* Provider claim panel */}
          {providerView && ["open", "quoted"].includes(req.status) && !req.claimed_by && (
            <div className="border-2 border-accent bg-accent/5 rounded-xl p-5" data-testid="claim-panel">
              <p className="label-caps text-accent">First come, first served</p>
              <p className="font-display font-black text-3xl mt-2">{fmtGBP(req.budget)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Customer budget — you receive {fmtGBP((req.budget || 0) * 0.85)} after our 15% fee.
              </p>
              <Button data-testid="claim-job-btn" onClick={claim} disabled={claimBusy}
                className="mt-4 w-full rounded-none bg-accent hover:bg-accent/90 text-white h-11">
                {claimBusy ? "Claiming…" : "Claim this job"}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Claiming commits you to attending at the customer's location and completing the work. Their exact address is revealed once they pay.
              </p>
            </div>
          )}

          {providerView && req.claimed_by && req.claimed_by !== user?.id && (
            <div className="border border-border bg-card p-5" data-testid="already-claimed">
              <p className="label-caps text-muted-foreground">Status</p>
              <p className="mt-2 text-sm">This job has already been claimed by another handyman.</p>
            </div>
          )}

          {isCustomer && !req.claimed_by && ["open", "quoted"].includes(req.status) && (
            <div className="border border-dashed border-border bg-card p-5" data-testid="waiting-for-claim">
              <p className="label-caps text-muted-foreground">Live</p>
              <p className="mt-2 text-sm">Waiting for a verified handyman to claim your job. You'll be notified as soon as it happens.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
