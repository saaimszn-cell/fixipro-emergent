import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import api, { errMsg } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Logo } from "../../components/PublicLayout";
import { Wrench, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

function AuthShell({ title, sub, children, testid }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="flex flex-col justify-center px-6 sm:px-16 py-12" data-testid={testid}>
        <Logo />
        <div className="mt-10 max-w-md w-full">
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight">{title}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 mb-8">{sub}</p>
          {children}
        </div>
      </div>
      <div className="hidden lg:block relative grain-overlay">
        <img src="https://images.pexels.com/photos/36990157/pexels-photo-36990157.png" alt="A warm UK suburban home"
          className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="label-caps text-white/60">Trusted across the UK</p>
          <p className="font-display font-bold text-2xl mt-2 max-w-sm">Vetted handymen for every corner of your home.</p>
        </div>
      </div>
    </div>
  );
}

function GoogleButton({ role = "customer", testid }) {
  const start = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + `/oauth/callback?role=${role}`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <button type="button" data-testid={testid} onClick={start}
      className="w-full h-11 border border-border bg-card flex items-center justify-center gap-3 text-sm font-medium transition-colors duration-200 hover:bg-secondary">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
      Continue with Google
    </button>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex-1 border-t border-border" /> or continue with <span className="flex-1 border-t border-border" />
    </div>
  );
}

export function AuthCallback() {
  const { setUser, homeFor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const sessionId = (location.hash.split("session_id=")[1] || "").split("&")[0];
    const role = new URLSearchParams(location.search).get("role") || "customer";
    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id: sessionId, role });
        setUser(data);
        toast.success(`Welcome, ${data.name.split(" ")[0]}`);
        navigate(homeFor(data), { replace: true, state: { user: data } });
      } catch (e) {
        toast.error(errMsg(e, "Google sign-in failed"));
        navigate("/login", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="auth-callback" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Signing you in with Google…</p>
    </div>
  );
}

export function Login() {
  const { setUser, homeFor } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      setUser(data);
      toast.success(`Welcome back, ${data.name.split(" ")[0]}`);
      navigate(params.get("next") || homeFor(data));
    } catch (err) {
      setError(errMsg(err, "Login failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" sub="Log in to manage your jobs, quotes and messages." testid="login-page">
      <form onSubmit={submit} className="space-y-5">
        {error && <div data-testid="login-error" className="border border-destructive/50 bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>}
        <div className="space-y-2">
          <Label htmlFor="email" className="label-caps">Email</Label>
          <Input data-testid="login-email" id="email" type="email" required autoComplete="email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-2xl h-11" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="password" className="label-caps">Password</Label>
            <Link to="/forgot-password" data-testid="forgot-password-link" className="text-xs text-accent hover:underline">Forgot password?</Link>
          </div>
          <Input data-testid="login-password" id="password" type="password" required autoComplete="current-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-2xl h-11" />
        </div>
        <Button data-testid="login-submit" disabled={busy} className="w-full h-11 rounded-2xl bg-accent hover:bg-accent/90 text-white">
          {busy ? "Logging in…" : "Log in"}
        </Button>
        <OrDivider />
        <GoogleButton testid="google-login-btn" />
        <p className="text-sm text-muted-foreground">
          New to FixiPro? <Link to="/register" data-testid="register-link" className="text-accent font-medium hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { setUser, homeFor } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/register", form);
      setUser(data);
      toast.success("Account created. Welcome to FixiPro!");
      navigate(homeFor(data));
    } catch (err) {
      setError(errMsg(err, "Registration failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" sub="Book trusted local handymen — or become one." testid="register-page">
      <form onSubmit={submit} className="space-y-5">
        {error && <div data-testid="register-error" className="border border-destructive/50 bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>}
        <div className="grid grid-cols-2 gap-2" data-testid="role-picker">
          {[{ v: "customer", label: "I need work done" }, { v: "provider", label: "I'm a handyman" }].map((r) => (
            <button type="button" key={r.v} data-testid={`role-${r.v}`}
              onClick={() => setForm({ ...form, role: r.v })}
              className={`border px-4 py-3 text-sm font-medium text-left transition-colors duration-200 ${
                form.role === r.v ? "border-accent bg-accent/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/40"}`}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name" className="label-caps">Full name</Label>
          <Input data-testid="register-name" id="name" required minLength={2}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-2xl h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="remail" className="label-caps">Email</Label>
          <Input data-testid="register-email" id="remail" type="email" required autoComplete="email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-2xl h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rpassword" className="label-caps">Password</Label>
          <Input data-testid="register-password" id="rpassword" type="password" required minLength={8} autoComplete="new-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-2xl h-11" />
          <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
        </div>
        <Button data-testid="register-submit" disabled={busy} className="w-full h-11 rounded-2xl bg-accent hover:bg-accent/90 text-white">
          {busy ? "Creating account…" : "Create account"}
        </Button>
        <OrDivider />
        <GoogleButton testid="google-register-btn" role={form.role} />
        <p className="text-sm text-muted-foreground">
          Already have an account? <Link to="/login" data-testid="login-link" className="text-accent font-medium hover:underline">Log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setDone(true);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Reset your password" sub="We'll email you a secure reset link." testid="forgot-page">
      {done ? (
        <div data-testid="forgot-success" className="border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-sm">
          If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox (and the server logs in this testing build).
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="femail" className="label-caps">Email</Label>
            <Input data-testid="forgot-email" id="femail" type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-2xl h-11" />
          </div>
          <Button data-testid="forgot-submit" disabled={busy} className="w-full h-11 rounded-2xl">
            {busy ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <Link to="/login" data-testid="back-to-login" className="inline-flex items-center gap-2 text-sm text-muted-foreground mt-6 hover:text-foreground transition-colors duration-200">
        <ArrowLeft className="h-4 w-4" /> Back to login
      </Link>
    </AuthShell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token: params.get("token") || "", password });
      toast.success("Password updated. Please log in.");
      navigate("/login");
    } catch (err) {
      setError(errMsg(err, "Reset failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Choose a new password" sub="Minimum 8 characters." testid="reset-page">
      <form onSubmit={submit} className="space-y-5">
        {error && <div data-testid="reset-error" className="border border-destructive/50 bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>}
        <div className="space-y-2">
          <Label htmlFor="npass" className="label-caps">New password</Label>
          <Input data-testid="reset-password-input" id="npass" type="password" required minLength={8}
            value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-2xl h-11" />
        </div>
        <Button data-testid="reset-submit" disabled={busy} className="w-full h-11 rounded-2xl">
          {busy ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}
