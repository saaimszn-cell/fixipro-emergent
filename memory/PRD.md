# FixiPro — UK Handyman Marketplace (PRD)
# (Rebranded from ServiceHub on 2026-08-07: blue #2563EB accent, white/#EFF6FF backgrounds, handyman terminology, hello.fixipro@gmail.com support email)

## Original Problem Statement
Complete marketplace website (development + internal testing only; excludes live deployment/production launch). UK-focused home services + generic multi-category marketplace connecting customers with vetted service providers. Scope pillars: (1) Public website, (2) Authentication, (3) Customer account, (4) Service provider account, (5) Admin & super admin control centre, (6) Shared UI components, (7) Backend APIs, (8) Database, (9) Internal testing, (10) AI & automation platform, (11) Communication & WhatsApp integration (stubbed).

## User Choices (confirmed)
- Domain: Home services (plumbing, cleaning, electrical) UK-focused + generic multi-category
- Auth: JWT custom auth (email/password) + Emergent-managed Google Sign-In (added later)
- Payments: Stripe test mode (claimable sandbox, GB)
- AI: Emergent Universal LLM key, OpenAI text model (gpt-5.4)
- WhatsApp: UI/modules built, live API connection stubbed
- Brand: ServiceHub · example.co.uk · Midnight blue + signal red, Cabinet Grotesk/Satoshi, Swiss high-contrast + warm organic
- Homepage embeds user's Spline 3D iPhone scene (my.spline.design/iphone13copy-hUW6nwfGOESZ89MOCjs7jNxN)

## Architecture
- Backend: FastAPI + Motor (MongoDB) at /app/backend — server.py wires routers: auth, catalog, requests (quotes/jobs), payments (Stripe), engagement (reviews/messages/notifications/favourites/support), provider, admin (generic collection CRUD whitelist + reports + audit), ai (SSE streaming chat, quote-assist, matching), comms (WhatsApp stub hub)
- Frontend: React 19 + CRA/craco + Tailwind + Shadcn at /app/frontend — PublicLayout, PortalLayout (role sidebars), pages grouped: public/, auth/, portal/ (shared), customer/, provider/, admin/
- Auth: JWT httpOnly cookies (access 60m + refresh 7d) OR Google session_token (user_sessions, 7d TTL) — both accepted by get_current_user (cookie → Bearer fallback)
- Payments: Stripe checkout sessions w/ dynamic GBP price_data from accepted quote; webhook /api/stripe/webhook + status polling fallback; refunds admin-side; tax mode = Stripe calculates only (calc_only)
- AI: emergentintegrations LlmChat, SSE streaming, per-assistant configs in ai_configs (model, prompt, enabled), usage logs in ai_logs
- DB (MongoDB test_database): users, providers, categories, services, requests, quotes, jobs, payment_transactions, provider_earnings, withdrawals, reviews, conversations, messages, notifications, support_tickets, availability, blog_posts, cms_pages, faqs, settings, email/sms/push_templates, ai_configs, ai_conversations, ai_logs, comm_conversations, comm_logs, audit_logs, login_attempts, password_reset_tokens, user_sessions

## User Personas
- Customer (Emma Thompson): posts jobs, compares/accepts quotes, pays by card, reviews
- Provider (James Carter / Carter Home Services): verifies, quotes, works jobs, earns to wallet, withdraws
- Admin/Super Admin (saaimszn@gmail.com): full control centre, moderation, CMS, AI config, comms hub

## Implemented (2026-08)
- Public site: home (Spline 3D iPhone embed), services + search/filters, service detail, how-it-works, pricing, FAQ (CMS-driven), about, coverage (20 cities), reviews, become-provider, blog + detail (CMS), contact, legal pages (CMS), coming-soon, 404
- Auth: register/login/logout/refresh/me, forgot/reset (console-logged link), change password, 2FA toggle, brute-force lockout (5 attempts/15 min, XFF-aware), Google OAuth (Emergent-managed) with role selection + email linking
- Customer: dashboard stats, post request, request list w/ filters, request detail (accept/decline quotes, cancel), Stripe checkout + success/cancel pages, payments, invoices, reviews, favourites, messages, notifications, support tickets, settings, AI assistant
- Provider: dashboard, browse matched open requests, AI quote assist, quotes, jobs w/ status pipeline + timeline, earnings (10% fee), wallet, withdrawals (min £10), availability calendar (block days), verification/documents, business profile (services+coverage), messages/notifications/reviews/support/settings, AI assistant
- Admin: dashboard + charts, users (search/suspend), providers (verify/reject + doc review), jobs, payments + refunds, review moderation, support replies, categories/blog/CMS generic CRUD, message templates, reports/revenue, audit logs, system settings, AI control centre (4 assistants, model/prompt/toggle), comms & WhatsApp hub (stub connect, channel filters, simulate inbound, AI auto-reply, live agent handover, comm logs)
- Seed data: 3 accounts, 6 categories, 15 services, FAQs, blog posts, CMS pages, templates, AI configs, demo request + £95 quote, demo comm conversations

## Update 2026-08-07 (iteration 3 — verified 27/27 backend, 13/13 public pages)
- Rebrand: FixiPro everywhere (logo FP tile + FixiPro.co.uk, navy announcement bar, pill nav + Services mega menu with 8 categories incl. new General Repairs & Appliance Repair, browser title)
- Design per user's old-site screenshots: light-blue gradient hero + white rounded search card (postcode/category/popular/trending chips), rounded-2xl soft-card cards, blue/white/near-black palette
- Live quoting: fixed prices removed from public pages; custom handyman quotes; customer request detail polls every 4s with Live indicator + toast on new quotes
- Commission: 15% platform fee (was 10%) — earnings view shows Agreed price / FixiPro fee (15%) / Your payout (85%)
- Contact page: clickable mailto:hello.fixipro@gmail.com + tel:+447538624492 cards, Spline 3D background (spline-viewer, official demo scene), framer-motion depth animations
- Support email setting + DB updated to hello.fixipro@gmail.com
- Lesson: avoid parallel edits to the same file (race clobbered PublicLayout NAV once — fixed)

## Testing Status
- Iteration 1: backend 16/20 (2 test-side endpoint errors, 1 AI-config false alarm, 1 real brute-force bug)
- Iteration 2: backend 21/22, frontend smoke 30+ routes across 3 roles all render, role guards OK, Google callback OK
- Brute-force 500→429 timezone bug FIXED and verified (6th attempt returns 429); same class fixed in reset-password
- Reusable suite: /app/backend/tests/backend_test.py
- NOT yet interactively executed: full Stripe checkout via hosted page, AI SSE stream in browser, WhatsApp simulate-inbound click-through (endpoints covered by pytest; pages render)

## Backlog (prioritized)
- P0: Manual E2E click-through of Stripe payment → job complete → review (test card 4242…); AI chat stream visual check
- P1: /api/provider/stats dedicated endpoint; address book; activity history page; sitemap page; 500 error page
- P2: Real email sending (Resend managed), real 2FA OTP codes, session management list/revoke UI, WhatsApp live API credentials, pagination on admin lists, media library uploads (object storage)
- P3: Homepage builder, automation centre, fraud detection, backup/restore UI, monitoring dashboards

## Next Tasks
1. Interactive E2E of payment + review flows; AI stream verification
2. Address book + activity history (customer scope items)
3. Wire Resend for forgot-password emails
4. Production readiness pass (deployment is explicitly out of scope until requested)
