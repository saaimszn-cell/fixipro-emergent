import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

export function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const isMock = params.get("mock") === "1";
  const [state, setState] = useState("checking");
  const [jobId, setJobId] = useState(null);

  useEffect(() => {
    if (!sessionId) { setState("missing"); return; }

    const confirmMockThenPoll = async () => {
      if (isMock) {
        try {
          await api.post(`/payments/mock/${sessionId}/confirm`);
        } catch {}
      }
      let attempts = 0;
      const poll = async () => {
        try {
          const { data } = await api.get(`/payments/status/${sessionId}`);
          if (data.payment_status === "paid") {
            setJobId(data.job_id);
            setState("paid");
            return;
          }
          if (attempts++ < 8) setTimeout(poll, 2000);
          else setState("pending");
        } catch { setState("missing"); }
      };
      poll();
    };
    confirmMockThenPoll();
  }, [sessionId, isMock]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6" data-testid="payment-success-page">
      <div className="max-w-md w-full border border-border bg-card p-10 text-center">
        {state === "checking" && (
          <>
            <div className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <h1 className="font-display font-bold text-xl mt-6">Confirming payment…</h1>
            {isMock && <p className="text-xs text-muted-foreground mt-2">MOCK payment — no card was charged.</p>}
          </>
        )}
        {state === "paid" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" data-testid="paid-icon" />
            <h1 className="font-display font-extrabold text-2xl mt-4">Payment confirmed</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Funds are safely in escrow. Your 6-digit completion code is now shown on your job page — give it to the handyman only when the work is done.
            </p>
            <Link to="/dashboard/requests"><Button data-testid="goto-payments" className="mt-6 rounded-none bg-accent hover:bg-accent/90 text-white w-full">Back to my jobs</Button></Link>
          </>
        )}
        {state === "pending" && (
          <>
            <h1 className="font-display font-bold text-xl">Almost there</h1>
            <p className="text-sm text-muted-foreground mt-2">Payment is processing — check your jobs page in a moment.</p>
            <Link to="/dashboard/requests"><Button data-testid="goto-payments-pending" className="mt-6 rounded-none w-full">My requests</Button></Link>
          </>
        )}
        {state === "missing" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="font-display font-bold text-xl mt-4">We couldn't verify that payment</h1>
            <Link to="/dashboard/payments"><Button data-testid="goto-payments-missing" className="mt-6 rounded-none w-full">Check payment status</Button></Link>
          </>
        )}
      </div>
    </div>
  );
}

export function PaymentCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6" data-testid="payment-cancel-page">
      <div className="max-w-md w-full border border-border bg-card p-10 text-center">
        <XCircle className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="font-display font-extrabold text-2xl mt-4">Payment cancelled</h1>
        <p className="text-sm text-muted-foreground mt-2">No charge was made. Your quote is still accepted — you can pay whenever you're ready.</p>
        <Link to="/dashboard/requests"><Button data-testid="back-to-requests" className="mt-6 rounded-none bg-accent hover:bg-accent/90 text-white w-full">Back to my requests</Button></Link>
      </div>
    </div>
  );
}
