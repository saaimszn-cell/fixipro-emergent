import { useEffect, useState } from "react";
import api, { errMsg, fmtDate } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Switch } from "../../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { StatusBadge, EmptyState, PageHeader } from "../../components/shared";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

const MODULES = {
  categories: {
    title: "Services & categories", collection: "categories",
    sub: "Marketplace categories and the services under them.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "image", label: "Image URL", type: "text" },
    ],
    columns: [{ key: "name", label: "Name" }, { key: "slug", label: "Slug" }],
  },
  blog: {
    title: "Blog management", collection: "blog_posts",
    sub: "Articles shown on the public blog.",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", required: true },
      { key: "excerpt", label: "Excerpt", type: "text" },
      { key: "content", label: "Content", type: "textarea", required: true },
      { key: "image", label: "Image URL", type: "text" },
      { key: "author", label: "Author", type: "text" },
    ],
    columns: [{ key: "title", label: "Title" }, { key: "author", label: "Author" }],
  },
  cms: {
    title: "CMS pages", collection: "cms_pages",
    sub: "Legal and informational pages on the public site.",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", required: true },
      { key: "content", label: "Content", type: "textarea", required: true },
      { key: "seo_title", label: "SEO title", type: "text" },
      { key: "seo_desc", label: "SEO description", type: "textarea" },
    ],
    columns: [{ key: "title", label: "Title" }, { key: "slug", label: "Slug" }],
  },
};

function GenericModule({ config, testid }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [open, setOpen] = useState(false);
  const load = () => api.get(`/admin/collection/${config.collection}`).then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, [config.collection]);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.patch(`/admin/collection/${config.collection}/${editing.id}`, form);
      else await api.post(`/admin/collection/${config.collection}`, form);
      toast.success(editing ? "Updated" : "Created");
      setOpen(false);
      setEditing(null);
      setForm({});
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const remove = async (item) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await api.delete(`/admin/collection/${config.collection}/${item.id}`);
      toast.success("Deleted");
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div data-testid={testid}>
      <PageHeader title={config.title} sub={config.sub}>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({}); } }}>
          <DialogTrigger asChild><Button data-testid={`${testid}-add`} className="rounded-none bg-accent hover:bg-accent/90 text-white"><Plus className="mr-2 h-4 w-4" /> Add new</Button></DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} — {config.title}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-4">
              {config.fields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <p className="label-caps">{f.label}</p>
                  {f.type === "textarea" ? (
                    <Textarea data-testid={`field-${f.key}`} rows={4} required={f.required} value={form[f.key] || ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="rounded-none" />
                  ) : (
                    <Input data-testid={`field-${f.key}`} required={f.required} value={form[f.key] || ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="rounded-none" />
                  )}
                </div>
              ))}
              <Button data-testid="module-save" type="submit" className="rounded-none w-full">{editing ? "Save changes" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>
      {items.length === 0 ? <EmptyState title="Nothing here yet" /> : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {config.columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
                <TableHead>Updated</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} data-testid={`${testid}-row-${item.id}`}>
                  {config.columns.map((c) => <TableCell key={c.key} className="max-w-[260px] truncate font-medium">{item[c.key]}</TableCell>)}
                  <TableCell className="text-muted-foreground">{fmtDate(item.updated_at || item.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button data-testid={`edit-${item.id}`} variant="ghost" size="sm"
                        onClick={() => { setEditing(item); setForm({ ...item }); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button data-testid={`delete-${item.id}`} variant="ghost" size="sm" onClick={() => remove(item)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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

export const AdminCategories = () => <GenericModule config={MODULES.categories} testid="admin-categories" />;
export const AdminBlog = () => <GenericModule config={MODULES.blog} testid="admin-blog" />;
export const AdminCms = () => <GenericModule config={MODULES.cms} testid="admin-cms" />;

const TEMPLATE_GROUPS = [
  { key: "email_templates", label: "Email templates" },
  { key: "sms_templates", label: "SMS templates" },
  { key: "push_templates", label: "Push notification templates" },
];

export function AdminTemplates() {
  const [groups, setGroups] = useState({});
  useEffect(() => {
    TEMPLATE_GROUPS.forEach((g) => {
      api.get(`/admin/collection/${g.key}`).then((r) => setGroups((prev) => ({ ...prev, [g.key]: r.data }))).catch(() => {});
    });
  }, []);
  return (
    <div data-testid="admin-templates-page">
      <PageHeader title="Message templates" sub="Email, SMS and push copy used across the platform." />
      <div className="space-y-8">
        {TEMPLATE_GROUPS.map((g) => (
          <div key={g.key}>
            <h2 className="font-display font-bold text-xl mb-3">{g.label}</h2>
            {(groups[g.key] || []).length === 0 ? <p className="text-sm text-muted-foreground border border-dashed p-6">No templates.</p> : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(groups[g.key] || []).map((t) => (
                  <div key={t.id} data-testid={`template-${t.name}`} className="border border-border bg-card p-5">
                    <p className="font-semibold text-sm">{t.name}</p>
                    {t.subject && <p className="text-xs text-muted-foreground mt-1">Subject: {t.subject}</p>}
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{t.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminReviews() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/admin/collection/reviews").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const moderate = async (r, status) => {
    try {
      await api.patch(`/admin/collection/reviews/${r.id}`, { status });
      toast.success(`Review ${status}`);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div data-testid="admin-reviews-page">
      <PageHeader title="Review moderation" sub="Publish or hide customer reviews." />
      {items.length === 0 ? <EmptyState title="No reviews yet" /> : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} data-testid={`admin-review-${r.id}`} className="border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium text-sm">{r.customer_name} · {r.rating}/5 · {r.service_name}</p>
                <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                {r.status !== "published" && <Button data-testid={`publish-${r.id}`} size="sm" onClick={() => moderate(r, "published")} className="rounded-none">Publish</Button>}
                {r.status !== "hidden" && <Button data-testid={`hide-${r.id}`} size="sm" variant="outline" onClick={() => moderate(r, "hidden")} className="rounded-none">Hide</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminSupport() {
  const [items, setItems] = useState([]);
  const [replyFor, setReplyFor] = useState(null);
  const [text, setText] = useState("");
  const load = () => api.get("/support/tickets").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const reply = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/support/tickets/${replyFor.id}/reply`, { text, status: "answered" });
      toast.success("Reply sent");
      setReplyFor(null);
      setText("");
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <div data-testid="admin-support-page">
      <PageHeader title="Support tickets" sub="Customer and provider issues." />
      {items.length === 0 ? <EmptyState title="No tickets" hint="Support requests will appear here." /> : (
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t.id} data-testid={`admin-ticket-${t.id}`} className="border border-border bg-card p-5">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-semibold">{t.subject} <span className="text-xs text-muted-foreground font-normal">— {t.user_name} ({t.user_role})</span></p>
                <StatusBadge status={t.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-2">{t.message}</p>
              {t.replies?.map((r, i) => (
                <div key={i} className="mt-2 border-l-2 border-accent pl-3 text-sm">
                  <span className="font-medium">{r.author}:</span> <span className="text-muted-foreground">{r.text}</span>
                </div>
              ))}
              <Dialog open={replyFor?.id === t.id} onOpenChange={(v) => setReplyFor(v ? t : null)}>
                <DialogTrigger asChild><Button data-testid={`reply-ticket-${t.id}`} variant="outline" size="sm" className="mt-3 rounded-none">Reply & mark answered</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Reply to {t.user_name}</DialogTitle></DialogHeader>
                  <form onSubmit={reply} className="space-y-4">
                    <Textarea data-testid="admin-reply-text" rows={4} required value={text} onChange={(e) => setText(e.target.value)} className="rounded-none" />
                    <Button data-testid="admin-reply-submit" type="submit" className="rounded-none w-full">Send reply</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminAudit() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/admin/audit-logs").then((r) => setItems(r.data)).catch(() => {}); }, []);
  return (
    <div data-testid="admin-audit-page">
      <PageHeader title="Audit logs" sub="Every sensitive action on the platform." />
      {items.length === 0 ? <EmptyState title="No audit events yet" /> : (
        <div className="border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>When</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((l) => (
                <TableRow key={l.id} data-testid={`audit-${l.id}`}>
                  <TableCell className="font-medium">{l.actor_name}</TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell className="text-muted-foreground">{l.entity} {l.entity_id ? `· ${l.entity_id.slice(0, 8)}…` : ""}</TableCell>
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

export function AdminSettings() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/admin/collection/settings").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const save = async (s, value) => {
    try {
      await api.patch(`/admin/collection/settings/${s.id}`, { value });
      toast.success(`Saved ${s.key}`);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div data-testid="admin-settings-page">
      <PageHeader title="System settings" sub="Platform-wide configuration." />
      <div className="space-y-3 max-w-2xl">
        {items.filter((s) => s.key !== "whatsapp_integration").map((s) => (
          <div key={s.id} data-testid={`setting-${s.key}`} className="border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm font-mono">{s.key}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{Array.isArray(s.value) ? `${s.value.length} items` : String(s.value)}</p>
            </div>
            {typeof s.value === "boolean" ? (
              <Switch data-testid={`setting-switch-${s.key}`} checked={s.value} onCheckedChange={(v) => save(s, v)} />
            ) : typeof s.value === "number" ? (
              <Input data-testid={`setting-input-${s.key}`} type="number" defaultValue={s.value} className="rounded-none w-28"
                onBlur={(e) => save(s, parseFloat(e.target.value))} />
            ) : typeof s.value === "string" ? (
              <Input data-testid={`setting-input-${s.key}`} defaultValue={s.value} className="rounded-none w-64"
                onBlur={(e) => e.target.value !== s.value && save(s, e.target.value)} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
