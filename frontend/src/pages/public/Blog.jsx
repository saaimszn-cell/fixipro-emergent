import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { fmtDate } from "../../lib/api";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function BlogList() {
  const [posts, setPosts] = useState([]);
  useEffect(() => { api.get("/blog").then((r) => setPosts(r.data)).catch(() => {}); }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16" data-testid="blog-page">
      <p className="label-caps text-accent">Journal</p>
      <h1 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight mt-2">Advice from the trade</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {posts.map((p) => (
          <Link key={p.slug} to={`/blog/${p.slug}`} data-testid={`blog-card-${p.slug}`}
            className="group border border-border bg-card overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg">
            <div className="h-48 overflow-hidden">
              <img src={p.image} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="p-5">
              <p className="text-xs text-muted-foreground">{fmtDate(p.created_at)} · {p.author}</p>
              <h2 className="font-display font-bold text-lg mt-2 leading-snug">{p.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{p.excerpt}</p>
              <p className="text-sm font-medium text-accent mt-3 flex items-center gap-1 group-hover:gap-2 transition-[gap] duration-200">
                Read <ArrowRight className="h-4 w-4" />
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    api.get(`/blog/${slug}`).then((r) => setPost(r.data)).catch(() => setMissing(true));
  }, [slug]);

  if (missing) return <div className="max-w-3xl mx-auto px-6 py-24" data-testid="post-not-found">Post not found. <Link to="/blog" className="text-accent">Back to blog</Link></div>;
  if (!post) return <div className="max-w-3xl mx-auto px-6 py-24 text-muted-foreground">Loading…</div>;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12" data-testid="blog-post-page">
      <Link to="/blog" data-testid="back-to-blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
        <ArrowLeft className="h-4 w-4" /> All articles
      </Link>
      <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mt-6 leading-tight">{post.title}</h1>
      <p className="text-sm text-muted-foreground mt-3">{fmtDate(post.created_at)} · {post.author}</p>
      <img src={post.image} alt={post.title} className="w-full h-64 sm:h-96 object-cover border border-black/5 mt-8" />
      <div className="mt-8 text-base sm:text-lg text-muted-foreground leading-relaxed space-y-4">
        {post.content.split("\n").map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </article>
  );
}
