import { useEffect, useState } from "react";
import api, { errMsg, fmtDate } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { EmptyState, PageHeader } from "../../components/shared";
import { toast } from "sonner";
import { Bot } from "lucide-react";

export default function AdminAi() {
  const [configs, setConfigs] = useState([]);
  const [logs, setLogs] = useState([]);
  const load = () => {
    api.get("/admin/collection/ai_configs").then((r) => setConfigs(r.data)).catch(() => {});
    api.get("/admin/ai/logs").then((r) => setLogs(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const save = async (cfg, patch) => {
    try {
      await api.patch(`/admin/collection/ai_configs/${cfg.id}`, patch);
      toast.success(`${cfg.name} updated`);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div data-testid="admin-ai-page">
      <PageHeader title="AI Control Centre" sub="Configure assistants, prompts and monitor usage." />
      <div className="grid lg:grid-cols-2 gap-4">
        {configs.map((c) => (
          <div key={c.id} data-testid={`ai-config-${c.key}`} className="border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 bg-primary text-primary-foreground flex items-center justify-center"><Bot className="h-4 w-4" /></span>
                <div>
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{c.key}</p>
                </div>
              </div>
              <Switch data-testid={`ai-enabled-${c.key}`} checked={!!c.enabled} onCheckedChange={(v) => save(c, { enabled: v })} />
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <p className="label-caps text-muted-foreground mb-1.5">Model</p>
                <Select value={c.model || "gpt-5.4"} onValueChange={(v) => save(c, { model: v })}>
                  <SelectTrigger data-testid={`ai-model-${c.key}`} className="rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["gpt-5.4", "gpt-5.4-mini", "gpt-5.5", "gpt-4.1"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="label-caps text-muted-foreground mb-1.5">System prompt</p>
                <Textarea data-testid={`ai-prompt-${c.key}`} rows={4} defaultValue={c.system_prompt} className="rounded-none text-sm"
                  onBlur={(e) => e.target.value !== c.system_prompt && save(c, { system_prompt: e.target.value })} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-display font-bold text-xl mt-10 mb-4">AI usage logs</h2>
      {logs.length === 0 ? <EmptyState title="No AI activity yet" hint="Assistant chats, quote drafts and matches will be logged here." /> : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Feature</TableHead><TableHead>Summary</TableHead><TableHead>When</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id} data-testid={`ai-log-${l.id}`}>
                  <TableCell className="font-mono text-sm">{l.feature}</TableCell>
                  <TableCell className="max-w-[360px] truncate text-muted-foreground">{l.summary}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(l.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
