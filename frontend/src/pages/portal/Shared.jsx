import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { errMsg, fmtDate, fmtGBP } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { StatusBadge, EmptyState, PageHeader } from "../../components/shared";
import { toast } from "sonner";
import { Send, Star } from "lucide-react";

export function Messages() {
  const { user } = useAuth();
  const { convId } = useParams();
  const navigate = useNavigate();
  const [convs, setConvs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [active, setActive] = useState(null);
  const bottomRef = useRef(null);
  const base = user?.role === "provider" ? "/pro" : "/dashboard";

  const loadConvs = () => api.get("/conversations").then((r) => setConvs(r.data)).catch(() => {});
  useEffect(() => { loadConvs(); }, []);

  useEffect(() => {
    if (!convId) return;
    const conv = convs.find((c) => c.id === convId);
    setActive(conv || { id: convId });
    api.get(`/conversations/${convId}/messages`).then((r) => setMessages(r.data)).catch(() => {});
  }, [convId, convs.length]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !convId) return;
    try {
      const { data } = await api.post(`/conversations/${convId}/messages`, { text });
      setMessages((m) => [...m, data]);
      setText("");
      loadConvs();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div data-testid="messages-page">
      <PageHeader title="Messages" sub="Chat with the other party on your jobs." />
      <div className="grid lg:grid-cols-12 gap-4 border border-border bg-card min-h-[520px]">
        <div className="lg:col-span-4 border-r border-border">
          <p className="label-caps text-muted-foreground p-4 border-b border-border">Conversations</p>
          {convs.length === 0 && <p className="text-sm text-muted-foreground p-4">No conversations yet.</p>}
          {convs.map((c) => (
            <button key={c.id} data-testid={`conv-${c.id}`} onClick={() => navigate(`${base}/messages/${c.id}`)}
              className={`w-full text-left px-4 py-3 border-b border-border transition-colors duration-200 hover:bg-secondary/50 ${c.id === convId ? "bg-secondary/70" : ""}`}>
              <div className="flex justify-between items-center gap-2">
                <p className="font-medium text-sm truncate">{c.other_name || "Conversation"}</p>
                {c.unread > 0 && <span className="h-5 min-w-5 px-1 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">{c.unread}</span>}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message || "No messages yet"}</p>
            </button>
          ))}
        </div>
        <div className="lg:col-span-8 flex flex-col">
          {convId ? (
            <>
              <p className="p-4 border-b border-border font-semibold" data-testid="active-conv-name">{active?.other_name || "Conversation"}</p>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scroll max-h-[420px]" data-testid="message-list">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === user.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 text-sm ${m.sender_id === user.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                      <p>{m.text}</p>
                      <p className={`text-[10px] mt-1 ${m.sender_id === user.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{fmtDate(m.created_at)}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} className="p-4 border-t border-border flex gap-2">
                <Input data-testid="message-input" value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message…" className="rounded-none" />
                <Button data-testid="message-send" type="submit" className="rounded-none bg-accent hover:bg-accent/90 text-white">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-8">Select a conversation to start chatting.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Notifications() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/notifications").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const markAll = async () => { await api.post("/notifications/read-all"); load(); };
  const markOne = async (n) => {
    if (!n.read) await api.post(`/notifications/${n.id}/read`);
    if (n.link) window.location.href = n.link;
    else load();
  };
  return (
    <div data-testid="notifications-page">
      <PageHeader title="Notifications" sub="Everything that needs your attention.">
        <Button data-testid="mark-all-read" variant="outline" onClick={markAll} className="rounded-none">Mark all read</Button>
      </PageHeader>
      {items.length === 0 ? <EmptyState title="All caught up" hint="New quotes, messages and job updates will appear here." /> : (
        <div className="border border-border bg-card divide-y divide-border">
          {items.map((n) => (
            <button key={n.id} data-testid={`notif-${n.id}`} onClick={() => markOne(n)}
              className={`w-full text-left px-5 py-4 flex gap-3 transition-colors duration-200 hover:bg-secondary/50 ${!n.read ? "bg-accent/5" : ""}`}>
              <span className={`h-2 w-2 mt-2 rounded-full shrink-0 ${!n.read ? "bg-accent" : "bg-border"}`} />
              <div className="min-w-0">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">{fmtDate(n.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [pw, setPw] = useState({ old_password: "", new_password: "" });
  const [tfa, setTfa] = useState(!!user?.two_factor_enabled);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put("/auth/profile", profile);
      setUser(data);
      toast.success("Profile updated");
    } catch (err) { toast.error(errMsg(err)); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/change-password", pw);
      toast.success("Password changed");
      setPw({ old_password: "", new_password: "" });
    } catch (err) { toast.error(errMsg(err)); }
  };

  const toggle2fa = async (v) => {
    setTfa(v);
    try {
      await api.post("/auth/security/2fa", { enabled: v });
      toast.success(v ? "Two-factor enabled" : "Two-factor disabled");
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div data-testid="settings-page">
      <PageHeader title="Settings" sub="Profile, security and account preferences." />
      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={saveProfile} className="border border-border bg-card p-6 space-y-4">
          <h2 className="font-display font-bold text-lg">Profile</h2>
          <div className="space-y-2">
            <Label className="label-caps">Name</Label>
            <Input data-testid="settings-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="rounded-none" />
          </div>
          <div className="space-y-2">
            <Label className="label-caps">Phone</Label>
            <Input data-testid="settings-phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="rounded-none" />
          </div>
          <div className="space-y-2">
            <Label className="label-caps">Email</Label>
            <Input value={user?.email} disabled className="rounded-none bg-muted" data-testid="settings-email" />
          </div>
          <Button data-testid="settings-save" type="submit" className="rounded-none">Save changes</Button>
        </form>

        <div className="space-y-6">
          <form onSubmit={changePw} className="border border-border bg-card p-6 space-y-4">
            <h2 className="font-display font-bold text-lg">Change password</h2>
            <div className="space-y-2">
              <Label className="label-caps">Current password</Label>
              <Input data-testid="settings-old-pw" type="password" required value={pw.old_password}
                onChange={(e) => setPw({ ...pw, old_password: e.target.value })} className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label className="label-caps">New password</Label>
              <Input data-testid="settings-new-pw" type="password" required minLength={8} value={pw.new_password}
                onChange={(e) => setPw({ ...pw, new_password: e.target.value })} className="rounded-none" />
            </div>
            <Button data-testid="settings-pw-save" type="submit" variant="outline" className="rounded-none">Update password</Button>
          </form>

          <div className="border border-border bg-card p-6 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-lg">Two-factor authentication</h2>
              <p className="text-sm text-muted-foreground mt-1">Extra verification step at login.</p>
            </div>
            <Switch data-testid="settings-2fa" checked={tfa} onCheckedChange={toggle2fa} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Support() {
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ subject: "", message: "", priority: "normal" });
  const [open, setOpen] = useState(false);
  const [replyFor, setReplyFor] = useState(null);
  const [replyText, setReplyText] = useState("");
  const load = () => api.get("/support/tickets").then((r) => setTickets(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/support/tickets", form);
      toast.success("Ticket created");
      setOpen(false);
      setForm({ subject: "", message: "", priority: "normal" });
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const reply = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/support/tickets/${replyFor.id}/reply`, { text: replyText });
      toast.success("Reply sent");
      setReplyFor(null);
      setReplyText("");
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div data-testid="support-page">
      <PageHeader title="Support" sub="Raise a ticket and track our replies.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="new-ticket-btn" className="rounded-none bg-accent hover:bg-accent/90 text-white">New ticket</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New support ticket</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <Input data-testid="ticket-subject" placeholder="Subject" required value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-none" />
              <Textarea data-testid="ticket-message" placeholder="Describe the issue…" required minLength={10} rows={4}
                value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="rounded-none" />
              <Button data-testid="ticket-submit" type="submit" className="rounded-none w-full">Submit ticket</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>
      {tickets.length === 0 ? <EmptyState title="No tickets" hint="Need help? Open a ticket and the team will jump in." /> : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} data-testid={`ticket-${t.id}`} className="border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{t.subject}</p>
                <StatusBadge status={t.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-2">{t.message}</p>
              {t.replies?.map((r, i) => (
                <div key={i} className="mt-3 border-l-2 border-accent pl-3 text-sm">
                  <p className="font-medium">{r.author} <span className="text-xs text-muted-foreground capitalize">({r.role})</span></p>
                  <p className="text-muted-foreground">{r.text}</p>
                </div>
              ))}
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">{fmtDate(t.created_at)}</p>
                <Dialog open={replyFor?.id === t.id} onOpenChange={(v) => setReplyFor(v ? t : null)}>
                  <DialogTrigger asChild><Button data-testid={`ticket-reply-${t.id}`} variant="outline" size="sm" className="rounded-none">Reply</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Reply: {t.subject}</DialogTitle></DialogHeader>
                    <form onSubmit={reply} className="space-y-4">
                      <Textarea data-testid="reply-text" rows={4} required value={replyText}
                        onChange={(e) => setReplyText(e.target.value)} className="rounded-none" />
                      <Button data-testid="reply-submit" type="submit" className="rounded-none w-full">Send reply</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MyReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [form, setForm] = useState({ job_id: "", rating: 5, comment: "" });
  const [open, setOpen] = useState(false);
  const load = () => {
    api.get("/reviews/mine").then((r) => setReviews(r.data)).catch(() => {});
    if (user?.role === "customer") {
      api.get("/jobs/mine").then((r) => {
        setPendingJobs(r.data.filter((j) => j.status === "completed" && !j.reviewed));
      }).catch(() => {});
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/reviews", form);
      toast.success("Review published. Thank you!");
      setOpen(false);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div data-testid="reviews-mine-page">
      <PageHeader title="Reviews" sub={user?.role === "provider" ? "What customers say about your work." : "Reviews you've left for professionals."}>
        {user?.role === "customer" && pendingJobs.length > 0 && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button data-testid="leave-review-btn" className="rounded-none bg-accent hover:bg-accent/90 text-white">Leave a review</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Review a completed job</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="label-caps">Job</Label>
                  <select data-testid="review-job-select" required value={form.job_id}
                    onChange={(e) => setForm({ ...form, job_id: e.target.value })}
                    className="w-full h-10 border border-input bg-background px-3 text-sm">
                    <option value="">Select a job…</option>
                    {pendingJobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {fmtGBP(j.amount)}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="label-caps">Rating</Label>
                  <div className="flex gap-1" data-testid="review-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button type="button" key={n} data-testid={`star-${n}`} onClick={() => setForm({ ...form, rating: n })}>
                        <Star className={`h-7 w-7 ${n <= form.rating ? "text-amber-500 fill-amber-500" : "text-border"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea data-testid="review-comment" placeholder="How was the work?" rows={4} value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })} className="rounded-none" />
                <Button data-testid="review-submit" type="submit" className="rounded-none w-full">Publish review</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>
      {reviews.length === 0 ? <EmptyState title="No reviews yet" hint={user?.role === "customer" ? "Completed jobs can be reviewed here." : "Reviews from customers will appear here."} /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <div key={r.id} data-testid={`my-review-${r.id}`} className="border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r.rating ? "text-amber-500 fill-amber-500" : "text-border"}`} />
                  ))}
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-sm mt-3">{r.comment || "—"}</p>
              <p className="text-xs text-muted-foreground mt-3">{r.service_name} · {r.customer_name} · {fmtDate(r.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
