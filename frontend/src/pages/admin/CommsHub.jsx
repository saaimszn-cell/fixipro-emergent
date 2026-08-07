import { useEffect, useRef, useState } from "react";
import api, { errMsg } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { StatusBadge, PageHeader } from "../../components/shared";
import { toast } from "sonner";
import { Phone, Mail, MessageSquare, Users, Send, Bot, UserCog, Plug, Unplug } from "lucide-react";

const CHANNEL_ICONS = { whatsapp: Phone, email: Mail, sms: MessageSquare, internal: Users, push: MessageSquare };

export default function CommsHub() {
  const [integrations, setIntegrations] = useState(null);
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);
  const [channel, setChannel] = useState("all");
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  const loadIntegrations = () => api.get("/comms/integrations").then((r) => setIntegrations(r.data)).catch(() => {});
  const loadConvs = () => api.get("/comms/conversations", { params: { channel: channel === "all" ? "" : channel } })
    .then((r) => setConvs(r.data)).catch(() => {});
  useEffect(() => { loadIntegrations(); }, []);
  useEffect(() => { loadConvs(); }, [channel]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages?.length]);

  const openConv = async (c) => {
    try {
      const { data } = await api.get(`/comms/conversations/${c.id}`);
      setActive(data);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const toggleWhatsApp = async () => {
    try {
      if (integrations.whatsapp.connected) {
        await api.post("/comms/integrations/whatsapp/disconnect");
        toast.success("WhatsApp disconnected (stub)");
      } else {
        await api.post("/comms/integrations/whatsapp/connect", {});
        toast.success("WhatsApp connected (stub mode — no live messages)");
      }
      loadIntegrations();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    try {
      await api.post(`/comms/conversations/${active.id}/messages`, { text });
      setText("");
      openConv(active);
    } catch (err) { toast.error(errMsg(err)); }
  };

  const simulate = async () => {
    try {
      const { data } = await api.post(`/comms/conversations/${active.id}/simulate-inbound`, { text: "Is anyone available this weekend?" });
      setActive(data);
      loadConvs();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const handover = async (toAgent) => {
    try {
      await api.post(`/comms/conversations/${active.id}/handover`, { to_agent: toAgent });
      toast.success(toAgent ? "Handed to live agent" : "Returned to AI assistant");
      openConv(active);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const bubble = (m) => {
    if (m.from === "customer") return "bg-secondary self-start";
    if (m.from === "ai") return "bg-indigo-100 dark:bg-indigo-950 self-start";
    return "bg-primary text-primary-foreground self-end";
  };

  return (
    <div data-testid="comms-hub-page">
      <PageHeader title="Comms & WhatsApp" sub="Multi-channel messaging hub — WhatsApp runs in stub mode for internal testing." />

      {integrations && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-testid="integrations-panel">
          <div className="border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-accent" /> WhatsApp Business</p>
              <span data-testid="wa-status" className={`h-2.5 w-2.5 rounded-full ${integrations.whatsapp.connected ? "bg-emerald-500" : "bg-slate-400"}`} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{integrations.whatsapp.note}</p>
            <Button data-testid="wa-toggle" size="sm" onClick={toggleWhatsApp} variant={integrations.whatsapp.connected ? "outline" : "default"} className="mt-3 rounded-none w-full">
              {integrations.whatsapp.connected ? <><Unplug className="mr-2 h-3.5 w-3.5" /> Disconnect</> : <><Plug className="mr-2 h-3.5 w-3.5" /> Connect (stub)</>}
            </Button>
          </div>
          {["email", "sms", "push"].map((k) => (
            <div key={k} className="border border-border bg-card p-5" data-testid={`integration-${k}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm capitalize flex items-center gap-2">
                  {k === "email" ? <Mail className="h-4 w-4 text-accent" /> : <MessageSquare className="h-4 w-4 text-accent" />} {k === "sms" ? "SMS" : k === "push" ? "Push" : "Email"}
                </p>
                <span className={`h-2.5 w-2.5 rounded-full ${integrations[k].connected ? "bg-emerald-500" : "bg-slate-400"}`} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{integrations[k].note || integrations[k].provider || "—"}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4" data-testid="channel-filters">
        {["all", "whatsapp", "email", "internal"].map((c) => (
          <button key={c} data-testid={`chan-${c}`} onClick={() => setChannel(c)}
            className={`px-4 h-9 text-sm font-medium border capitalize transition-colors duration-200 ${channel === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-4 border border-border bg-card min-h-[540px]">
        <div className="lg:col-span-4 border-r border-border overflow-y-auto max-h-[540px]">
          <p className="label-caps text-muted-foreground p-4 border-b border-border">Conversations</p>
          {convs.map((c) => {
            const Icon = CHANNEL_ICONS[c.channel] || MessageSquare;
            return (
              <button key={c.id} data-testid={`comm-${c.id}`} onClick={() => openConv(c)}
                className={`w-full text-left px-4 py-3 border-b border-border transition-colors duration-200 hover:bg-secondary/50 ${active?.id === c.id ? "bg-secondary/70" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm flex items-center gap-2 truncate"><Icon className="h-3.5 w-3.5 shrink-0" /> {c.contact_name}</p>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1">{c.messages?.[c.messages.length - 1]?.text}</p>
              </button>
            );
          })}
        </div>
        <div className="lg:col-span-8 flex flex-col">
          {active ? (
            <>
              <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm" data-testid="active-comm-name">{active.contact_name}</p>
                  <p className="text-xs text-muted-foreground">{active.contact} · {active.channel}</p>
                </div>
                <div className="flex gap-2">
                  {active.handover ? (
                    <Button data-testid="return-to-ai" size="sm" variant="outline" onClick={() => handover(false)} className="rounded-none">
                      <Bot className="mr-1.5 h-3.5 w-3.5" /> Return to AI
                    </Button>
                  ) : (
                    <Button data-testid="handover-agent" size="sm" variant="outline" onClick={() => handover(true)} className="rounded-none">
                      <UserCog className="mr-1.5 h-3.5 w-3.5" /> Live agent handover
                    </Button>
                  )}
                  <Button data-testid="simulate-inbound" size="sm" variant="outline" onClick={simulate} className="rounded-none">Simulate inbound</Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 chat-scroll max-h-[380px]" data-testid="comm-messages">
                {active.messages?.map((m, i) => (
                  <div key={i} className={`max-w-[75%] px-4 py-2.5 text-sm ${bubble(m)}`}>
                    {m.from === "ai" && <p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Bot className="h-3 w-3" /> AI assistant</p>}
                    {m.from === "agent" && <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">{m.author || "Agent"}</p>}
                    <p>{m.text}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} className="p-4 border-t border-border flex gap-2">
                <Input data-testid="comm-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply as agent…" className="rounded-none" />
                <Button data-testid="comm-send" type="submit" className="rounded-none bg-accent hover:bg-accent/90 text-white"><Send className="h-4 w-4" /></Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8">Select a conversation to review.</div>
          )}
        </div>
      </div>
    </div>
  );
}
