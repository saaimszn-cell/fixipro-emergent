import { useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import { PageHeader } from "../../components/shared";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Bot, Send, User } from "lucide-react";

export default function AiAssistant({ assistant = "customer" }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get("/ai/conversations").then((r) => {
      setHistory(r.data.filter((c) => c.assistant === assistant));
    }).catch(() => {});
  }, [assistant]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadSession = async (sid) => {
    try {
      const { data } = await api.get(`/ai/conversations/${sid}`);
      setSessionId(sid);
      setMessages(data.messages || []);
    } catch {}
  };

  const send = async (e) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: msg }, { role: "assistant", text: "" }]);
    try {
      const res = await fetch(`${api.defaults.baseURL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg, session_id: sessionId, assistant }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const payload = JSON.parse(part.slice(6));
          if (payload.delta) {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: "assistant", text: copy[copy.length - 1].text + payload.delta };
              return copy;
            });
          }
          if (payload.session_id && !sessionId) setSessionId(payload.session_id);
          if (payload.error) {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: "assistant", text: `Error: ${payload.error}` };
              return copy;
            });
          }
        }
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", text: "Connection error. Please try again." };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid={`ai-assistant-${assistant}`}>
      <PageHeader title="AI Assistant" sub={`Powered by GPT — your ${assistant === "provider" ? "quoting and scheduling" : assistant} copilot.`}>
        {sessionId && (
          <Button data-testid="new-chat-btn" variant="outline" className="rounded-none"
            onClick={() => { setSessionId(""); setMessages([]); }}>
            New chat
          </Button>
        )}
      </PageHeader>
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 border border-border bg-card max-h-[560px] overflow-y-auto">
          <p className="label-caps text-muted-foreground p-4 border-b border-border">History</p>
          {history.length === 0 && <p className="text-xs text-muted-foreground p-4">Past conversations appear here.</p>}
          {history.map((c) => (
            <button key={c.session_id} data-testid={`ai-hist-${c.session_id}`} onClick={() => loadSession(c.session_id)}
              className={`w-full text-left px-4 py-3 border-b border-border text-sm transition-colors duration-200 hover:bg-secondary/50 ${c.session_id === sessionId ? "bg-secondary/70" : ""}`}>
              Chat · {new Date(c.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </button>
          ))}
        </div>
        <div className="lg:col-span-9 border border-border bg-card flex flex-col h-[560px]">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <span className="h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center"><Bot className="h-4 w-4" /></span>
            <div>
              <p className="font-semibold text-sm">ServiceHub Assistant</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" /> Online
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll" data-testid="ai-messages">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-start justify-center gap-3 text-muted-foreground">
                <p className="font-display font-bold text-lg text-foreground">How can I help?</p>
                <div className="flex flex-wrap gap-2">
                  {(assistant === "provider"
                    ? ["Draft a quote for a bathroom refit", "What should I charge for a fuse board upgrade?"]
                    : ["How much does a boiler service cost?", "Help me describe a leaking tap job"]).map((s) => (
                    <button key={s} data-testid={`suggestion-${s.slice(0, 12)}`} onClick={() => setInput(s)}
                      className="border border-border px-3 py-2 text-sm transition-colors duration-200 hover:border-accent hover:text-accent">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && <span className="h-7 w-7 shrink-0 bg-primary text-primary-foreground flex items-center justify-center"><Bot className="h-3.5 w-3.5" /></span>}
                <div className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  {m.text || (busy && i === messages.length - 1 ? "…" : m.text)}
                </div>
                {m.role === "user" && <span className="h-7 w-7 shrink-0 bg-accent text-white flex items-center justify-center"><User className="h-3.5 w-3.5" /></span>}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="p-4 border-t border-border flex gap-2">
            <Textarea data-testid="ai-input" value={input} onChange={(e) => setInput(e.target.value)} rows={1}
              placeholder="Ask anything…" className="rounded-none resize-none"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }} />
            <Button data-testid="ai-send" type="submit" disabled={busy} className="rounded-none bg-accent hover:bg-accent/90 text-white self-end">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
