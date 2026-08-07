import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { errMsg, fmtDate, fmtGBP } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { StatusBadge, PageHeader } from "../../components/shared";
import { toast } from "sonner";
import { CalendarDays, MapPin, Play, CheckCircle2, MessageSquare, Heart } from "lucide-react";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState(null);
  const [job, setJob] = useState(null);

  useEffect(() => {
    api.get("/jobs/mine").then((r) => {
      setJobs(r.data);
      setJob(r.data.find((j) => j.id === id) || null);
    }).catch((e) => toast.error(errMsg(e)));
  }, [id]);

  if (jobs && !job) return <div className="text-muted-foreground p-8" data-testid="job-not-found">Job not found.</div>;
  if (!job) return <div className="text-muted-foreground p-8">Loading…</div>;

  const setStatus = async (status) => {
    try {
      await api.post(`/jobs/${id}/status`, { status });
      toast.success(`Job marked as ${status.replaceAll("_", " ")}`);
      const { data } = await api.get("/jobs/mine");
      setJob(data.find((j) => j.id === id));
    } catch (e) { toast.error(errMsg(e)); }
  };

  const chat = async () => {
    try {
      const { data } = await api.post("/conversations", { user_id: job.customer_id });
      navigate(`/pro/messages/${data.id}`);
    } catch (e) { toast.error(errMsg(e)); }
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
          <div className="border border-border bg-card p-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
            {job.scheduled_date && <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-accent" /> Scheduled: {fmtDate(job.scheduled_date)}</span>}
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-accent" /> Payment: {job.paid ? "Received" : "Awaiting customer payment"}</span>
          </div>
        </div>
        <div className="lg:col-span-5 space-y-4">
          <div className="border border-border bg-card p-6">
            <p className="label-caps text-muted-foreground mb-4">Actions</p>
            <div className="space-y-2">
              {job.status === "scheduled" && (
                <Button data-testid="start-job-btn" onClick={() => setStatus("in_progress")} className="w-full rounded-none">
                  <Play className="mr-2 h-4 w-4" /> Start job
                </Button>
              )}
              {job.status === "in_progress" && (
                <Button data-testid="complete-job-btn" onClick={() => setStatus("completed")} className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark complete
                </Button>
              )}
              {job.status === "awaiting_payment" && (
                <p className="text-sm text-muted-foreground border border-dashed p-4">Waiting for the customer to pay before scheduling.</p>
              )}
              {job.status === "completed" && (
                <p className="text-sm text-emerald-600 border border-emerald-500/40 bg-emerald-500/10 p-4">Job complete — earnings added to your wallet.</p>
              )}
              <Button data-testid="message-customer-btn" variant="outline" onClick={chat} className="w-full rounded-none">
                <MessageSquare className="mr-2 h-4 w-4" /> Message customer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
