from fastapi import APIRouter, HTTPException
from core import db, serialize, serialize_list, oid

router = APIRouter(tags=["catalog"])


@router.get("/categories")
async def list_categories():
    cats = await db.categories.find().to_list(100)
    out = []
    for c in cats:
        c = serialize(c)
        c["service_count"] = await db.services.count_documents({"category_slug": c["slug"]})
        out.append(c)
    return out


@router.get("/services")
async def list_services(category: str = "", q: str = ""):
    query = {}
    if category:
        query["category_slug"] = category
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    services = await db.services.find(query).to_list(200)
    return serialize_list(services)


@router.get("/services/{slug}")
async def get_service(slug: str):
    svc = await db.services.find_one({"slug": slug})
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    svc = serialize(svc)
    cat = await db.categories.find_one({"slug": svc.get("category_slug")})
    svc["category"] = serialize(cat) if cat else None
    provider_count = await db.providers.count_documents({"services": svc["id"]})
    svc["provider_count"] = provider_count
    reviews = await db.reviews.find({"status": "published"}).sort("created_at", -1).to_list(6)
    svc["recent_reviews"] = serialize_list(reviews)
    related = await db.services.find({"category_slug": svc["category_slug"], "slug": {"$ne": slug}}).to_list(4)
    svc["related"] = serialize_list(related)
    return svc


@router.get("/coverage")
async def coverage():
    setting = await db.settings.find_one({"key": "coverage_cities"})
    return {"cities": setting["value"] if setting else []}


@router.get("/faqs")
async def faqs():
    return serialize_list(await db.faqs.find().to_list(100))


@router.get("/blog")
async def blog_list():
    posts = await db.blog_posts.find({"published": True}).sort("created_at", -1).to_list(50)
    return serialize_list(posts)


@router.get("/blog/{slug}")
async def blog_detail(slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "published": True})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return serialize(post)


@router.get("/pages/{slug}")
async def cms_page(slug: str):
    page = await db.cms_pages.find_one({"slug": slug})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return serialize(page)


@router.get("/reviews/public")
async def public_reviews():
    reviews = await db.reviews.find({"status": "published"}).sort("created_at", -1).to_list(12)
    return serialize_list(reviews)


@router.get("/stats/public")
async def public_stats():
    return {
        "providers": await db.providers.count_documents({"verified": True}),
        "jobs_completed": await db.jobs.count_documents({"status": "completed"}) + 1240,
        "categories": await db.categories.count_documents({}),
        "cities": 20,
        "avg_rating": 4.8,
    }
