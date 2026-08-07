import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { errMsg, fmtDate, fmtGBP } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { StatusBadge, PageHeader } from "../../components/shared";
import { toast } from "sonner";
import { Star, Bot, CreditCard, MapPin, CalendarDays } from "lucide-react";

export default function RequestDetail({ providerView = false }) {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [req, setReq] = useState(null);
  const [quoteForm, setQuoteForm] = useState({ amount: "", message: "" });
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const prevQuotes = useRef(null);

  const load = () => api.get(`/requests/${id}`).then((r) => {
    setReq(r.data);
    if (prevQuotes.current === null) prevQuotes.current = r.data.quotes.length;
  }).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, [id]);

  // Live quote updates: poll while the request is open so customers see new quotes without refreshing
  useEffect(() => {
    if (!req || !["open", "quoted"].includes(req.status)) return;
    const t = setInterval(async () => {
      try {
        const { data } = await api.get(`/requests/${id}`);
        if (prevQuotes.current !== null && data.quotes.length > prevQuotes.current) {
          toast.success(`${data.quotes.length - prevQuotes.current} new quote${data.quotes.length - prevQuotes.current > 1 ? "s" : ""} just arrived`);
        }
        prevQuotes.current = data.quotes.length;
        setReq(data);
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [req?.status, id]);

  if (!req) return <div className="text-muted-foreground p-8">Loading…</div>;

  const acceptedQuote = req.quotes.find((q) => q.status === "accepted");
  const needsPayment = req.job && req.job.status === "awaiting_payment" && !req.payment;

  const accept = async (quoteId) => {
    try {
      await api.post(`/quotes/${quoteId}/accept`);
      toast.success("Quote accepted. Please complete payment to schedule the job.");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const decline = async (quoteId) => {
    try {
      await api.post(`/quotes/${quoteId}/decline`);
      toast.success("Quote declined");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const pay = async () => {
    try {
      const { data } = await api.post("/payments/checkout", { quote_id: acceptedQuote.id, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error(errMsg(e)); }
  };

  const cancel = async () => {
    try {
      await api.post(`/requests/${id}/cancel`);
      toast.success("Request cancelled");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const submitQuote = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/requests/${id}/quotes`, { amount: parseFloat(quoteForm.amount), message: quoteForm.message });
      toast.success("Quote sent to the customer");
      setQuoteOpen(false);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const aiAssist = async () => {
    setAiBusy(true);
    try {
      const { data } = await api.post("/ai/quote-assist", { request_id: id });
      setQuoteForm((f) => ({ ...f, message: data.suggestion }));
      toast.success("AI suggestion added — edit before sending");
    } catch (e) { toast.error(errMsg(e)); }
    setAiBusy(false);
  };

  const startChat = async (otherId) => {
    try {
      const { data } = await api.post("/conversations", { user_id: otherId });
      navigate(`${providerView ? "/pro" : "/dashboard"}/messages/${data.id}`);
    } catch (e) { toast.error(errMsg(e)); }
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
              <span className="capitalize">Urgency: {req.urgency}</span>
            </div>
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
              {needsPayment && user.role === "customer" && (
                <Button data-testid="pay-now-btn" onClick={pay} className="mt-5 rounded-none bg-accent hover:bg-accent/90 text-white">
                  <CreditCard className="mr-2 h-4 w-4" /> Pay {fmtGBP(req.job.amount)} securely
                </Button>
              )}
              {needsPayment && user.role === "customer" && (
                <p className="text-xs text-muted-foreground mt-2">You pay the agreed quote price of {fmtGBP(req.job.amount)} — the handyman receives 85% after FixiPro's 15% platform commission.</p>
              )}
              <Button data-testid="chat-other-btn" variant="outline" onClick={() => startChat(providerView ? req.customer_id : req.job.provider_id)} className="mt-4 ml-0 mr-2 rounded-none">
                Message {providerView ? "customer" : "provider"}
              </Button>
            </div>
          )}

          {!providerView && ["open", "quoted"].includes(req.status) && (
            <Button data-testid="cancel-request-btn" variant="outline" onClick={cancel}
              className="rounded-none border-destructive/50 text-destructive hover:bg-destructive/10">
              Cancel request
            </Button>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="flex items-center justify-between mb-3">
            <p className="label-caps text-muted-foreground">Quotes ({req.quotes.length})</p>
            <div className="flex items-center gap-3">
              {["open", "quoted"].includes(req.status) && (
                <span data-testid="live-quotes-indicator" className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-dot" /> Live
                </span>
              )}
            {providerView && ["open", "quoted"].includes(req.status) && (
              <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
                <DialogTrigger asChild><Button data-testid="send-quote-btn" className="rounded-none bg-accent hover:bg-accent/90 text-white" size="sm">Send quote</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Quote on this job</DialogTitle></DialogHeader>
                  <Button data-testid="ai-quote-assist" variant="outline" onClick={aiAssist} disabled={aiBusy} className="rounded-none w-full">
                    <Bot className="mr-2 h-4 w-4" /> {aiBusy ? "Thinking…" : "Draft with AI"}
                  </Button>
                  <form onSubmit={submitQuote} className="space-y-4">
                    <div className="space-y-2">
                      <p className="label-caps">Amount (£)</p>
                      <Input data-testid="quote-amount" type="number" min="1" step="0.01" required value={quoteForm.amount}
                        onChange={(e) => setQuoteForm({ ...quoteForm, amount: e.target.value })} className="rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <p className="label-caps">Message to customer</p>
                      <Textarea data-testid="quote-message" rows={4} value={quoteForm.message}
                        onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })} className="rounded-none" />
                    </div>
                    <Button data-testid="quote-submit" type="submit" className="rounded-none w-full">Send quote</Button>
                    <p className="text-xs text-muted-foreground">You receive 85% of the agreed price — FixiPro retains a 15% platform commission on completed jobs.</p>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            </div>
          </div>

          {req.quotes.length === 0 ? (
            <div className="border border-dashed p-8 text-sm text-muted-foreground" data-testid="no-quotes">
              {providerView ? "Be the first to quote on this job." : "Custom quotes from handymen will appear here live — usually within a few hours."}
            </div>
          ) : (
            <div className="space-y-3">
              {req.quotes.map((q) => (
                <div key={q.id} data-testid={`quote-${q.id}`} className={`border bg-card p-5 ${q.status === "accepted" ? "border-emerald-500" : "border-border"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{q.provider_name}</p>
                    <StatusBadge status={q.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {q.provider_rating ?? "New"} · {fmtDate(q.created_at)}
                  </p>
                  <p className="font-display font-black text-2xl mt-3">{fmtGBP(q.amount)}</p>
                  {q.message && <p className="text-sm text-muted-foreground mt-2">{q.message}</p>}
                  {!providerView && q.status === "pending" && ["quoted", "open"].includes(req.status) && (
                    <div className="flex gap-2 mt-4">
                      <Button data-testid={`accept-quote-${q.id}`} onClick={() => accept(q.id)} size="sm" className="rounded-none bg-accent hover:bg-accent/90 text-white">Accept</Button>
                      <Button data-testid={`decline-quote-${q.id}`} onClick={() => decline(q.id)} size="sm" variant="outline" className="rounded-none">Decline</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
