import os
from datetime import datetime, timezone, timedelta
from core import db, hash_password, verify_password, now


CATEGORIES = [
    {"name": "Plumbing", "slug": "plumbing", "icon": "Wrench", "description": "Leaks, boilers, bathrooms and everything in between.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg"},
    {"name": "Electrical", "slug": "electrical", "icon": "Zap", "description": "Certified electricians for wiring, fuse boards and installs.",
     "image": "https://images.pexels.com/photos/33694016/pexels-photo-33694016.jpeg"},
    {"name": "Cleaning", "slug": "cleaning", "icon": "Sparkles", "description": "Domestic, end-of-tenancy and deep cleaning services.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg"},
    {"name": "Gardening", "slug": "gardening", "icon": "Leaf", "description": "Lawn care, landscaping, fencing and tidy-ups.",
     "image": "https://images.pexels.com/photos/36990157/pexels-photo-36990157.png"},
    {"name": "Painting & Decorating", "slug": "painting-decorating", "icon": "Paintbrush", "description": "Interior and exterior painting by tidy professionals.",
     "image": "https://images.pexels.com/photos/31671971/pexels-photo-31671971.jpeg"},
    {"name": "Handyman", "slug": "handyman", "icon": "Hammer", "description": "Flat-pack, mounting, repairs and odd jobs done right.",
     "image": "https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg"},
]

SERVICES = [
    ("plumbing", "Leak Repair", "leak-repair", 85, "per visit"),
    ("plumbing", "Boiler Service", "boiler-service", 110, "per service"),
    ("plumbing", "Bathroom Installation", "bathroom-installation", 2500, "per project"),
    ("electrical", "Fuse Board Upgrade", "fuse-board-upgrade", 450, "per job"),
    ("electrical", "Socket & Switch Installation", "socket-switch-installation", 70, "per point"),
    ("electrical", "EV Charger Installation", "ev-charger-installation", 800, "per install"),
    ("cleaning", "Regular Domestic Cleaning", "regular-domestic-cleaning", 18, "per hour"),
    ("cleaning", "End of Tenancy Clean", "end-of-tenancy-clean", 220, "per property"),
    ("cleaning", "Deep Clean", "deep-clean", 160, "per visit"),
    ("gardening", "Lawn Care & Mowing", "lawn-care-mowing", 35, "per visit"),
    ("gardening", "Garden Clearance", "garden-clearance", 180, "per job"),
    ("painting-decorating", "Interior Painting", "interior-painting", 320, "per room"),
    ("painting-decorating", "Exterior Painting", "exterior-painting", 1200, "per property"),
    ("handyman", "Furniture Assembly", "furniture-assembly", 55, "per item"),
    ("handyman", "TV & Shelf Mounting", "tv-shelf-mounting", 60, "per job"),
]

FAQS = [
    {"question": "How do I book a service?", "answer": "Create a free account, describe your job, and receive quotes from vetted local professionals. Accept the quote you like and pay securely online.", "category": "Customers"},
    {"question": "Are professionals vetted?", "answer": "Yes. Every provider passes ID verification, insurance checks and qualification reviews before they can quote on jobs.", "category": "Customers"},
    {"question": "When do I pay?", "answer": "You only pay once you accept a quote. Funds are processed securely via Stripe and your receipt is available in your account.", "category": "Payments"},
    {"question": "Can I cancel a request?", "answer": "You can cancel any request before a job starts from your dashboard, free of charge.", "category": "Customers"},
    {"question": "How much does it cost to join as a provider?", "answer": "Joining is free. We charge a small service fee on completed jobs only.", "category": "Providers"},
    {"question": "How do providers get paid?", "answer": "Earnings land in your wallet after each completed job. Request a withdrawal any time from your provider dashboard.", "category": "Providers"},
]

BLOG_POSTS = [
    {"title": "10 questions to ask before hiring a plumber", "slug": "questions-before-hiring-plumber",
     "excerpt": "Avoid cowboys and costly surprises with these essential questions.",
     "content": "Hiring a plumber is about trust. Ask about Gas Safe registration, insurance, written quotes, guarantees on workmanship, and references. A professional will happily answer all of these. On ServiceHub, every plumber is pre-vetted so you can skip the guesswork.",
     "image": "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg", "author": "ServiceHub Editorial"},
    {"title": "The true cost of an end-of-tenancy clean in 2026", "slug": "end-of-tenancy-clean-cost-2026",
     "excerpt": "What landlords expect, what it costs, and how to get your deposit back.",
     "content": "End-of-tenancy cleans typically range from £150 to £300 depending on property size. Professional cleaning with a checklist aligned to letting agent standards dramatically improves your chances of a full deposit return.",
     "image": "https://images.pexels.com/photos/6195274/pexels-photo-6195274.jpeg", "author": "ServiceHub Editorial"},
    {"title": "EV chargers at home: what UK homeowners need to know", "slug": "ev-chargers-at-home-uk-guide",
     "excerpt": "Grants, installation costs and choosing the right charger for your driveway.",
     "content": "Home EV charger installation in the UK typically costs £800-£1,200 including the unit. Always use an OZEV-approved installer and check your fuse board capacity first.",
     "image": "https://images.pexels.com/photos/17018103/pexels-photo-17018103.jpeg", "author": "ServiceHub Editorial"},
]

CMS_PAGES = [
    {"slug": "privacy-policy", "title": "Privacy Policy",
     "content": "We collect only the data needed to operate the marketplace: account details, job information and payment records processed by Stripe. We never sell your data. You may request a copy or deletion of your data at any time via your account settings or by contacting privacy@example.co.uk."},
    {"slug": "terms", "title": "Terms & Conditions",
     "content": "ServiceHub is a marketplace connecting customers with independent service providers. Quotes are provided by professionals, not ServiceHub. Payment is taken on quote acceptance and work is guaranteed under our workmanship promise. Disputes are handled through our resolution centre."},
    {"slug": "cookies", "title": "Cookie Policy",
     "content": "We use essential cookies for authentication and security, plus optional analytics cookies to improve the product. You can manage preferences at any time."},
    {"slug": "accessibility", "title": "Accessibility Statement",
     "content": "We are committed to WCAG 2.1 AA compliance. If you encounter any accessibility barriers, contact accessibility@example.co.uk and we will resolve them promptly."},
]

EMAIL_TEMPLATES = [
    {"name": "welcome", "subject": "Welcome to ServiceHub", "body": "Hi {{name}}, welcome aboard. Post your first job and get quotes in minutes.", "channel": "email"},
    {"name": "quote_received", "subject": "You have a new quote", "body": "Hi {{name}}, {{provider}} quoted £{{amount}} on your job '{{job}}'.", "channel": "email"},
    {"name": "job_completed", "subject": "Job marked complete", "body": "Hi {{name}}, your job '{{job}}' is complete. Please leave a review.", "channel": "email"},
]

SMS_TEMPLATES = [
    {"name": "quote_received_sms", "subject": "", "body": "ServiceHub: new quote of £{{amount}} for '{{job}}'. View: {{link}}", "channel": "sms"},
    {"name": "booking_reminder", "subject": "", "body": "ServiceHub: reminder — {{provider}} arrives {{date}} for '{{job}}'.", "channel": "sms"},
]

PUSH_TEMPLATES = [
    {"name": "new_message", "subject": "New message", "body": "{{sender}} sent you a message.", "channel": "push"},
    {"name": "job_status", "subject": "Job update", "body": "'{{job}}' is now {{status}}.", "channel": "push"},
]

AI_CONFIGS = [
    {"key": "customer_assistant", "name": "Customer AI Assistant", "model": "gpt-5.4", "enabled": True,
     "system_prompt": "You are ServiceHub's customer assistant for a UK home services marketplace. Help customers describe their job, understand pricing, and navigate booking. Be concise, friendly, British English."},
    {"key": "provider_assistant", "name": "Provider AI Assistant", "model": "gpt-5.4", "enabled": True,
     "system_prompt": "You are ServiceHub's provider assistant. Help tradespeople write winning quotes, price jobs fairly for the UK market, and manage their schedule. Be concise and practical."},
    {"key": "admin_assistant", "name": "Admin AI Assistant", "model": "gpt-5.4", "enabled": True,
     "system_prompt": "You are ServiceHub's admin assistant. Summarise platform activity, flag anomalies, and help draft announcements. Be precise."},
    {"key": "whatsapp_assistant", "name": "WhatsApp AI Assistant", "model": "gpt-5.4", "enabled": True,
     "system_prompt": "You are ServiceHub's WhatsApp assistant. Qualify leads, answer FAQs, collect job details for quotes, and hand over to a human when asked. Short messages."},
]

COVERAGE = ["London", "Birmingham", "Manchester", "Leeds", "Liverpool", "Bristol", "Sheffield",
            "Newcastle", "Nottingham", "Southampton", "Leicester", "Coventry", "Edinburgh", "Glasgow",
            "Cardiff", "Belfast", "Brighton", "Oxford", "Cambridge", "Reading"]


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Saaim (Owner)", "role": "super_admin", "phone": "+44 20 7946 0000",
            "status": "active", "two_factor_enabled": False, "favourites": [],
            "created_at": now(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})


async def seed_demo_users():
    if await db.users.count_documents({"email": "customer@example.com"}) == 0:
        await db.users.insert_one({
            "email": "customer@example.com", "password_hash": hash_password("Customer@123"),
            "name": "Emma Thompson", "role": "customer", "phone": "+44 7700 900123",
            "status": "active", "two_factor_enabled": False, "favourites": [], "created_at": now(),
        })
    if await db.users.count_documents({"email": "provider@example.com"}) == 0:
        res = await db.users.insert_one({
            "email": "provider@example.com", "password_hash": hash_password("Provider@123"),
            "name": "James Carter", "role": "provider", "phone": "+44 7700 900456",
            "status": "active", "two_factor_enabled": False, "favourites": [], "created_at": now(),
        })
        await db.providers.insert_one({
            "user_id": str(res.inserted_id), "business_name": "Carter Home Services Ltd",
            "bio": "Gas Safe registered plumber and general home services specialist with 12 years of experience across London.",
            "services": [], "coverage": ["London", "Reading"], "verified": True,
            "verification_status": "approved", "documents": [
                {"name": "Public Liability Insurance", "type": "insurance", "status": "approved", "uploaded_at": now()},
                {"name": "Gas Safe Certificate", "type": "certification", "status": "approved", "uploaded_at": now()},
            ],
            "insurance": {"provider": "AXA", "policy_no": "AX-8842-UK", "expires": "2027-01-01", "status": "valid"},
            "certifications": ["Gas Safe Registered", "NVQ Level 3 Plumbing"],
            "rating": 4.8, "jobs_done": 0, "created_at": now(),
        })


async def seed_catalog():
    if await db.categories.count_documents({}) > 0:
        return
    cat_ids = {}
    for c in CATEGORIES:
        res = await db.categories.insert_one({**c, "created_at": now()})
        cat_ids[c["slug"]] = str(res.inserted_id)
    cat_images = {c["slug"]: c["image"] for c in CATEGORIES}
    for cat_slug, name, slug, price, unit in SERVICES:
        await db.services.insert_one({
            "category_id": cat_ids[cat_slug], "category_slug": cat_slug, "name": name, "slug": slug,
            "description": f"Professional {name.lower()} by vetted, insured local specialists. Upfront pricing, workmanship guaranteed.",
            "base_price": price, "unit": unit, "image": cat_images[cat_slug],
            "rating": 4.6, "jobs_completed": 0, "created_at": now(),
        })


async def seed_content():
    if await db.blog_posts.count_documents({}) == 0:
        for p in BLOG_POSTS:
            await db.blog_posts.insert_one({**p, "published": True, "created_at": now()})
    if await db.cms_pages.count_documents({}) == 0:
        for p in CMS_PAGES:
            await db.cms_pages.insert_one({**p, "seo_title": p["title"] + " | ServiceHub",
                                           "seo_desc": p["content"][:150], "updated_at": now()})
    if await db.faqs.count_documents({}) == 0:
        for f in FAQS:
            await db.faqs.insert_one(f)
    if await db.email_templates.count_documents({}) == 0:
        await db.email_templates.insert_many(EMAIL_TEMPLATES)
        await db.sms_templates.insert_many(SMS_TEMPLATES)
        await db.push_templates.insert_many(PUSH_TEMPLATES)
    if await db.ai_configs.count_documents({}) == 0:
        await db.ai_configs.insert_many(AI_CONFIGS)
    if await db.settings.count_documents({}) == 0:
        await db.settings.insert_many([
            {"key": "platform_fee_pct", "value": 10},
            {"key": "site_name", "value": "ServiceHub"},
            {"key": "support_email", "value": "support@example.co.uk"},
            {"key": "maintenance_mode", "value": False},
            {"key": "coverage_cities", "value": COVERAGE},
        ])


async def seed_demo_marketplace():
    if await db.requests.count_documents({}) > 0:
        return
    customer = await db.users.find_one({"email": "customer@example.com"})
    provider_user = await db.users.find_one({"email": "provider@example.com"})
    provider = await db.providers.find_one({"user_id": str(provider_user["_id"])})
    service = await db.services.find_one({"slug": "leak-repair"})
    if not (customer and provider_user and provider and service):
        return
    req = await db.requests.insert_one({
        "customer_id": str(customer["_id"]), "service_id": str(service["_id"]),
        "service_name": service["name"], "category_slug": "plumbing",
        "title": "Kitchen tap leaking at the base",
        "description": "Mixer tap drips constantly and leaks at the base when running. Need it repaired or replaced this week.",
        "postcode": "E1 6AN", "city": "London", "urgency": "soon",
        "preferred_date": (now() + timedelta(days=3)).date().isoformat(),
        "status": "quoted", "created_at": now() - timedelta(days=1),
    })
    quote = await db.quotes.insert_one({
        "request_id": str(req.inserted_id), "provider_id": str(provider_user["_id"]),
        "provider_name": "Carter Home Services Ltd", "amount": 95.0,
        "message": "Includes new cartridge and resealing. 1-hour job, guaranteed for 12 months.",
        "status": "pending", "created_at": now() - timedelta(hours=20),
    })
    await db.providers.update_one({"_id": provider["_id"]},
                                  {"$set": {"services": [str(service["_id"])]}})


async def seed_indexes():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.services.create_index("slug", unique=True)
    await db.categories.create_index("slug", unique=True)
    await db.notifications.create_index("user_id")
    await db.messages.create_index("conversation_id")
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)


async def run_seed():
    await seed_admin()
    await seed_demo_users()
    await seed_catalog()
    await seed_content()
    await seed_demo_marketplace()
    await seed_indexes()
