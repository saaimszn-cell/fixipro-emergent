import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";

export function LegalPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setPage(null);
    setMissing(false);
    api.get(`/pages/${slug}`).then((r) => setPage(r.data)).catch(() => setMissing(true));
  }, [slug]);

  if (missing) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24" data-testid="legal-not-found">
        <h1 className="font-display font-extrabold text-3xl">Page not found</h1>
        <Link to="/" className="text-accent text-sm mt-4 inline-block">Back home</Link>
      </div>
    );
  }
  if (!page) return <div className="max-w-3xl mx-auto px-6 py-24 text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16" data-testid={`legal-${slug}`}>
      <p className="label-caps text-accent">Legal</p>
      <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mt-2">{page.title}</h1>
      <p className="text-muted-foreground leading-relaxed mt-6 whitespace-pre-line">{page.content}</p>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-24 sm:py-32" data-testid="not-found-page">
      <p className="font-display font-black text-7xl sm:text-8xl text-accent">404</p>
      <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mt-4">This page has wandered off.</h1>
      <p className="text-muted-foreground mt-3 max-w-md">The link may be broken, or the page may have moved. Let's get you back on track.</p>
      <Link to="/"><Button data-testid="nf-home-btn" className="mt-8 rounded-none bg-accent hover:bg-accent/90 text-white">Back to homepage</Button></Link>
    </div>
  );
}
