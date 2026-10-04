"""Ferixas production commerce API.

Neon PostgreSQL is the source of truth. Cloudinary and Resend are optional
adapters enabled by environment variables; the catalogue seed is intentionally
small and only exists to make the customer UI usable before merchant uploads.
"""
from __future__ import annotations

import hashlib, hmac, json, os, secrets, uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ferixas-dev.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

FREE_SHIPPING_OVER = 120.0
TAX_RATE = 0.075
SESSION_DAYS = 30
ROOT = Path(__file__).resolve().parent
SEED_PATH = ROOT / "seed.json"

class Base(DeclarativeBase): pass
class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    phone: Mapped[str] = mapped_column(String(40), default="")
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class SessionToken(Base):
    __tablename__ = "sessions"
    token: Mapped[str] = mapped_column(String(96), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class Catalog(Base):
    __tablename__ = "catalog_records"
    key: Mapped[str] = mapped_column(String(180), primary_key=True)
    kind: Mapped[str] = mapped_column(String(30), index=True)
    slug: Mapped[str] = mapped_column(String(180), index=True)
    data: Mapped[dict] = mapped_column(JSON)

class Address(Base):
    __tablename__ = "addresses"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    data: Mapped[dict] = mapped_column(JSON)

class Cart(Base):
    __tablename__ = "carts"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    lines: Mapped[list] = mapped_column(JSON, default=list)

class Wishlist(Base):
    __tablename__ = "wishlists"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    product_ids: Mapped[list] = mapped_column(JSON, default=list)

class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    product_id: Mapped[str] = mapped_column(String(180), index=True)
    data: Mapped[dict] = mapped_column(JSON)

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    data: Mapped[dict] = mapped_column(JSON)
    placed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
class LoginIn(BaseModel):
    email: EmailStr
    password: str
class CartItemIn(BaseModel):
    productId: str
    variant: Optional[str] = None
    qty: int = Field(default=1, ge=1, le=99)
    cartId: Optional[str] = None
class CartQtyIn(BaseModel):
    key: str
    qty: int = Field(ge=0, le=99)
    cartId: Optional[str] = None
class CartKeyIn(BaseModel):
    key: str
    cartId: Optional[str] = None
class AddressIn(BaseModel):
    id: Optional[str] = None
    label: str = "Home"
    name: str
    phone: str = ""
    line1: str
    line2: Optional[str] = None
    city: str
    region: str = ""
    postcode: str = ""
    country: str
    isDefault: bool = False
class AddressPatchIn(BaseModel):
    id: str
    label: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    line1: Optional[str] = None
    line2: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    postcode: Optional[str] = None
    country: Optional[str] = None
    isDefault: Optional[bool] = None
class IdIn(BaseModel):
    id: str
class ProductIn(BaseModel):
    productId: str
class ReorderIn(BaseModel):
    orderId: str
    cartId: Optional[str] = None
class SettingsIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    marketingEmails: Optional[bool] = None
    orderEmails: Optional[bool] = None
    smsUpdates: Optional[bool] = None
    profilePublic: Optional[bool] = None
class ReviewIn(BaseModel):
    productId: str
    rating: int = Field(ge=1, le=5)
    title: str = ""
    body: str = ""
class ReviewPatchIn(BaseModel):
    id: str
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    title: Optional[str] = None
    body: Optional[str] = None
class CheckoutIn(BaseModel):
    addressId: str
    shippingMethod: str = "standard"
    paymentMethod: str = "card"
    note: Optional[str] = None
    cartId: Optional[str] = None

app = FastAPI(title="Ferixas Commerce API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "*").split(","), allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

@app.middleware("http")
async def carry_frontend_credentials(request: Request, call_next):
    """Accept the session/cart transport used by the marketplace frontend.

    Reads carry credentials in query parameters; writes carry them in JSON. The
    middleware normalizes both forms into the headers used by the route handlers.
    """
    session = request.query_params.get("session")
    cart_id = request.query_params.get("cartId")
    if request.method in {"POST", "PATCH", "PUT", "DELETE"}:
        raw = await request.body()
        if raw:
            try:
                payload = json.loads(raw)
            except (TypeError, ValueError):
                payload = {}
            if isinstance(payload, dict):
                session = payload.get("session") or session
                cart_id = payload.get("cartId") or cart_id
        async def receive():
            return {"type": "http.request", "body": raw, "more_body": False}
        request._receive = receive
    headers = list(request.scope["headers"])
    if session: headers.append((b"x-ferix-session", str(session).encode()))
    if cart_id: headers.append((b"x-ferix-cart", str(cart_id).encode()))
    request.scope["headers"] = headers
    return await call_next(request)

def now(): return datetime.now(timezone.utc)
def initials(name): return "".join(p[0].upper() for p in name.split()[:2]) or "F"
def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return salt.hex() + ":" + digest.hex()
def verify_password(password, stored):
    try:
        salt, digest = stored.split(":", 1)
        actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1).hex()
        return hmac.compare_digest(actual, digest)
    except Exception: return False
def public_user(u: User):
    return {"id": u.id, "name": u.name, "email": u.email, "phone": u.phone, "createdAt": u.created_at.isoformat(), "segment": "returning", "avatarInitials": initials(u.name), "settings": u.settings or {}}
def body(request: Request, session: Optional[str], cart_id: Optional[str]):
    return

def credentials(session: Optional[str], cart_id: Optional[str], x_session: Optional[str], x_cart: Optional[str]):
    return session or x_session, cart_id or x_cart
def get_user(db: Session, token: Optional[str]) -> Optional[User]:
    if not token: return None
    st = db.get(SessionToken, token)
    if not st: return None
    expires_at = st.expires_at.replace(tzinfo=timezone.utc) if st.expires_at.tzinfo is None else st.expires_at
    if expires_at < now(): return None
    return db.get(User, st.user_id)
def require_user(db, token):
    user = get_user(db, token)
    if not user: raise HTTPException(401, "Please sign in to continue")
    return user
def product_rows(db): return [r.data for r in db.scalars(select(Catalog).where(Catalog.kind == "product")).all()]
def merchant_rows(db): return [r.data for r in db.scalars(select(Catalog).where(Catalog.kind == "merchant")).all()]
def find_product(db, value): return next((p for p in product_rows(db) if p.get("id") == value or p.get("slug") == value), None)
def find_merchant(db, value): return next((m for m in merchant_rows(db) if m.get("id") == value or m.get("slug") == value), None)
def store_card(db, m):
    products=[p for p in product_rows(db) if p.get("merchantId")==m["id"]]
    return {**m, "productCount":len(products), "categories":sorted({p.get("category") for p in products})}
def line_key(line): return f"{line['productId']}::{line.get('variant') or ''}"
def cart_payload(db, cart):
    lines=[]; groups={}
    for raw in cart.lines or []:
        p=find_product(db, raw["productId"])
        if not p: continue
        item={"key":line_key(raw), "product":p, "productId":p["id"], "variant":raw.get("variant"), "qty":raw["qty"], "unitPrice":p["price"], "lineTotal":round(p["price"]*raw["qty"],2)}
        lines.append(item); groups.setdefault(p["merchantId"], []).append(item)
    subtotal=round(sum(x["lineTotal"] for x in lines),2)
    merchant_groups=[]
    for mid, items in groups.items():
        m=find_merchant(db,mid); merchant_groups.append({"merchant":store_card(db,m),"items":items,"subtotal":round(sum(x["lineTotal"] for x in items),2),"shipping":0 if subtotal>=FREE_SHIPPING_OVER else 6.5})
    shipping=0 if subtotal>=FREE_SHIPPING_OVER else sum(g["shipping"] for g in merchant_groups)
    tax=round(subtotal*TAX_RATE,2)
    return {"cartId":cart.id,"lines":lines,"merchants":merchant_groups,"count":sum(x["qty"] for x in lines),"distinctItems":len(lines),"subtotal":subtotal,"shipping":shipping,"tax":tax,"total":round(subtotal+shipping+tax,2),"freeShippingOver":FREE_SHIPPING_OVER}

def seed(db):
    if db.scalar(select(Catalog.key).limit(1)): return
    data=json.loads(SEED_PATH.read_text())
    for kind, rows in data.items():
        if kind in {"reviews","shipping_options","payment_methods"}: continue
        for row in rows:
            slug=row.get("slug", row.get("id", uuid.uuid4().hex)); db.add(Catalog(key=f"{kind}:{slug}",kind=kind[:-1] if kind.endswith("s") else kind,slug=slug,data=row))
    demo=User(id="usr_demo",name="Ferixas Demo Shopper",email="demo@ferixas.com",password_hash=hash_password("Ferixas123"),settings={"language":"English","currency":"USD","marketingEmails":True,"orderEmails":True,"smsUpdates":False,"profilePublic":False})
    db.add(demo); db.add(Wishlist(id="wish_demo",user_id=demo.id,product_ids=[])); db.commit()

@app.on_event("startup")
def startup():
    Base.metadata.create_all(engine)
    with SessionLocal() as db: seed(db)

@app.get("/")
def info():
    with SessionLocal() as db: return {"service":"ferixas-commerce-api","version":"2.0.0","database":"connected","products":len(product_rows(db)),"merchants":len(merchant_rows(db)),"status":"ready"}

@app.get("/health")
def health():
    with SessionLocal() as db: db.execute(select(Catalog.key).limit(1)); return {"ok":True,"database":"ok","storage":"cloudinary-configured" if os.getenv("CLOUDINARY_URL") else "pending-configuration","mail":"resend-configured" if os.getenv("RESEND_API_KEY") else "pending-configuration"}

@app.get("/catalog/categories")
def categories():
    with SessionLocal() as db:
        products=product_rows(db); rows=[r.data for r in db.scalars(select(Catalog).where(Catalog.kind=="categorie")).all()]
        return {"categories":[{**c,"count":sum(p.get("category")==c.get("slug") for p in products)} for c in rows]}
@app.get("/catalog/products")
def products(search:Optional[str]=None,category:Optional[str]=None,collection:Optional[str]=None,store:Optional[str]=None,minPrice:Optional[float]=None,maxPrice:Optional[float]=None,rating:Optional[float]=None,inStock:Optional[bool]=None,onSale:Optional[bool]=None,sort:str="relevance",page:int=1,perPage:int=24):
    with SessionLocal() as db:
        items=product_rows(db); q=(search or "").lower()
        if q: items=[p for p in items if q in json.dumps(p).lower()]
        if category: items=[p for p in items if p.get("category")==category]
        if collection: items=[p for p in items if collection in p.get("collections",[])]
        if store: items=[p for p in items if p.get("merchantSlug")==store or p.get("merchantId")==store]
        if minPrice is not None: items=[p for p in items if p["price"]>=minPrice]
        if maxPrice is not None: items=[p for p in items if p["price"]<=maxPrice]
        if rating is not None: items=[p for p in items if p["rating"]>=rating]
        if inStock: items=[p for p in items if p["stock"]>0]
        if onSale: items=[p for p in items if p.get("compareAt")]
        if sort=="price-asc": items.sort(key=lambda p:p["price"])
        elif sort=="price-desc": items.sort(key=lambda p:-p["price"])
        elif sort=="new": items.sort(key=lambda p:p.get("createdAt",""),reverse=True)
        elif sort=="best": items.sort(key=lambda p:-p.get("sold30d",0))
        else: items.sort(key=lambda p:-(p.get("rating",0)*100+p.get("sold30d",0)/10))
        total=len(items); perPage=max(1,min(60,perPage)); start=(page-1)*perPage
        return {"items":items[start:start+perPage],"total":total,"page":page,"perPage":perPage,"pages":max(1,(total+perPage-1)//perPage),"facets":{"categories":[],"stores":[],"priceBuckets":[]}}
@app.get("/catalog/product")
def product(slug:str):
    with SessionLocal() as db:
        p=find_product(db,slug)
        if not p: raise HTTPException(404,"That product is not available")
        m=find_merchant(db,p["merchantId"]); related=[x for x in product_rows(db) if x["id"]!=p["id"] and (x["merchantId"]==p["merchantId"] or x["category"]==p["category"])][:8]
        return {"product":p,"merchant":store_card(db,m),"reviews":[],"related":related,"shipping":[{"label":"Standard","detail":"2-5 working days, tracked end to end"},{"label":"Express","detail":"1-2 working days where available"}],"returns":"30-day returns. Free on orders above $120."}
@app.get("/catalog/home")
def home():
    with SessionLocal() as db:
        ps=product_rows(db); cs=[r.data for r in db.scalars(select(Catalog).where(Catalog.kind=="categorie")).all()]; col=[r.data for r in db.scalars(select(Catalog).where(Catalog.kind=="collection")).all()]; ms=merchant_rows(db)
        cats=[{**c,"count":sum(p.get("category")==c.get("slug") for p in ps)} for c in cs]
        return {"banners":json.loads(SEED_PATH.read_text()).get("banners",[]),"categories":cats,"collections":[{**c,"count":sum(c["slug"] in p.get("collections",[]) for p in ps),"products":[p for p in ps if c["slug"] in p.get("collections",[])][:4]} for c in col],"featured":sorted(ps,key=lambda p:-p["rating"])[:8],"trending":sorted(ps,key=lambda p:-p.get("sold30d",0))[:8],"newArrivals":sorted(ps,key=lambda p:p.get("createdAt",""),reverse=True)[:8],"under100":[p for p in ps if p["price"]<100][:8],"official":[p for p in ps if p["merchantId"]=="ferixas-official"][:4],"stores":[store_card(db,m) for m in ms],"stats":{"products":len(ps),"merchants":len(ms),"categories":len(cs)}}
@app.get("/catalog/category")
def category(slug:str,sort:str="relevance"):
    with SessionLocal() as db:
        c=next((r.data for r in db.scalars(select(Catalog).where(Catalog.kind=="categorie",Catalog.slug==slug)).all()),None)
        if not c: raise HTTPException(404,"That category does not exist")
    return {"category":c,**products(category=slug,sort=sort)}
@app.get("/catalog/collections")
def collections():
    with SessionLocal() as db:
        ps=product_rows(db); cs=[r.data for r in db.scalars(select(Catalog).where(Catalog.kind=="collection")).all()]
        return {"collections":[{**c,"count":sum(c["slug"] in p.get("collections",[]) for p in ps),"products":[p for p in ps if c["slug"] in p.get("collections",[])][:3]} for c in cs]}
@app.get("/catalog/collection")
def collection(slug:str,sort:str="relevance"):
    with SessionLocal() as db:
        c=next((r.data for r in db.scalars(select(Catalog).where(Catalog.kind=="collection",Catalog.slug==slug)).all()),None)
        if not c: raise HTTPException(404,"That collection does not exist")
    return {"collection":c,**products(collection=slug,sort=sort,perPage=48)}
@app.get("/catalog/stores")
def stores(search:Optional[str]=None,sort:str="top"):
    with SessionLocal() as db:
        ms=[store_card(db,m) for m in merchant_rows(db)]; q=(search or "").lower(); ms=[m for m in ms if not q or q in m["name"].lower() or q in m.get("tagline","").lower()]; return {"stores":ms,"total":len(ms)}
@app.get("/catalog/store")
def store(slug:str):
    with SessionLocal() as db:
        m=find_merchant(db,slug)
        if not m: raise HTTPException(404,"No store at that address")
        ps=[p for p in product_rows(db) if p["merchantId"]==m["id"]]; return {"store":store_card(db,m),"about":m.get("about",""),"responseRate":m.get("responseRate",0),"fulfilmentRate":m.get("fulfilmentRate",0),"products":ps,"categories":[],"stats":{"products":len(ps),"rating":m["rating"],"reviewCount":m["reviewCount"],"followers":m["followers"]}}
@app.get("/search")
def search(q:str=""):
    with SessionLocal() as db:
        ps=[p for p in product_rows(db) if q.lower() in json.dumps(p).lower()]; ms=[store_card(db,m) for m in merchant_rows(db) if q.lower() in m["name"].lower()]; return {"query":q,"products":ps[:24],"stores":ms,"categories":[],"suggestions":[]}

@app.post("/auth/register")
def register(p:RegisterIn,x_cart:Optional[str]=Header(None,alias="X-Ferix-Cart")):
    with SessionLocal() as db:
        email=str(p.email).lower();
        if db.scalar(select(User).where(User.email==email)): raise HTTPException(409,"An account already uses that email")
        u=User(id="usr_"+uuid.uuid4().hex[:12],name=p.name.strip(),email=email,password_hash=hash_password(p.password),settings={"language":"English","currency":"USD","marketingEmails":True,"orderEmails":True,"smsUpdates":False,"profilePublic":False}); db.add(u); db.add(Wishlist(id="wish_"+uuid.uuid4().hex[:10],user_id=u.id,product_ids=[])); token=secrets.token_urlsafe(32); db.add(SessionToken(token=token,user_id=u.id,expires_at=now()+timedelta(days=SESSION_DAYS))); db.commit(); return {"token":token,"user":public_user(u),"cartId":x_cart or "cart_"+uuid.uuid4().hex[:12]}
@app.post("/auth/login")
def login(p:LoginIn,x_cart:Optional[str]=Header(None,alias="X-Ferix-Cart")):
    with SessionLocal() as db:
        u=db.scalar(select(User).where(User.email==str(p.email).lower()))
        if not u or not verify_password(p.password,u.password_hash): raise HTTPException(401,"Email or password is incorrect")
        token=secrets.token_urlsafe(32); db.add(SessionToken(token=token,user_id=u.id,expires_at=now()+timedelta(days=SESSION_DAYS))); db.commit(); return {"token":token,"user":public_user(u),"cartId":x_cart or "cart_"+uuid.uuid4().hex[:12]}
@app.post("/auth/logout")
def logout(session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db:
        if session and (s:=db.get(SessionToken,session)): db.delete(s); db.commit()
    return {"ok":True}
@app.get("/auth/me")
def me(session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db: return {"user":public_user(u) if (u:=get_user(db,session)) else None}

def cart_for(db,user_id,cart_id):
    c=db.scalar(select(Cart).where(Cart.user_id==user_id)) if user_id else (db.get(Cart,cart_id) if cart_id else None)
    if not c and cart_id: c=Cart(id=cart_id,user_id=user_id,lines=[]); db.add(c); db.flush()
    if not c and user_id: c=Cart(id="cart_"+uuid.uuid4().hex[:12],user_id=user_id,lines=[]); db.add(c); db.flush()
    return c
@app.get("/cart")
def get_cart(session:Optional[str]=Query(None),cartId:Optional[str]=Query(None),x_session:Optional[str]=Header(None,alias="X-Ferix-Session"),x_cart:Optional[str]=Header(None,alias="X-Ferix-Cart")):
    with SessionLocal() as db: u=get_user(db,session or x_session); return cart_payload(db,cart_for(db,u.id if u else None,cartId or x_cart) or Cart(id=cartId or "cart_empty",lines=[]))
@app.post("/cart/items")
def add_cart(p:CartItemIn,session:Optional[str]=Header(None,alias="X-Ferix-Session"),x_cart:Optional[str]=Header(None,alias="X-Ferix-Cart")):
    with SessionLocal() as db:
        u=require_user(db,session) if session else None; c=cart_for(db,u.id if u else None,p.cartId or x_cart); product=find_product(db,p.productId)
        if not product: raise HTTPException(404,"That product is not available")
        raw=next((x for x in c.lines if x["productId"]==p.productId and x.get("variant")==p.variant),None)
        if raw: raw["qty"]=min(99,raw["qty"]+p.qty)
        else: c.lines=(c.lines or [])+[{"productId":p.productId,"variant":p.variant,"qty":p.qty}]
        db.commit(); return cart_payload(db,c)
@app.patch("/cart/items")
def set_cart(p:CartQtyIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db:
        u=require_user(db,session); c=cart_for(db,u.id,None); c.lines=[x for x in c.lines if line_key(x)!=p.key or p.qty==0];
        for x in c.lines:
            if line_key(x)==p.key: x["qty"]=p.qty
        db.commit(); return cart_payload(db,c)
@app.delete("/cart/items")
def remove_cart(p:CartKeyIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db: u=require_user(db,session); c=cart_for(db,u.id,None); c.lines=[x for x in c.lines if line_key(x)!=p.key]; db.commit(); return cart_payload(db,c)
@app.post("/cart/clear")
def clear_cart(session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db: u=require_user(db,session); c=cart_for(db,u.id,None); c.lines=[]; db.commit(); return cart_payload(db,c)

@app.get("/account")
def account(session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db:
        u=require_user(db,session); w=db.scalar(select(Wishlist).where(Wishlist.user_id==u.id)); add=db.scalars(select(Address).where(Address.user_id==u.id)).all(); orders=db.scalars(select(Order).where(Order.user_id==u.id).order_by(Order.placed_at.desc())).all(); ps={p["id"]:p for p in product_rows(db)}; wishlist=[ps[x] for x in (w.product_ids if w else []) if x in ps]; ods=[o.data for o in orders]; spent=round(sum(o.get("total",0) for o in ods),2); return {"user":public_user(u),"orders":ods[:5],"activeOrders":sum(o.get("fulfillment") not in {"delivered","cancelled"} for o in ods),"wishlist":wishlist,"addresses":[a.data for a in add],"reviews":[],"follows":[],"stats":{"orderCount":len(ods),"spent":spent,"averageOrder":round(spent/len(ods),2) if ods else 0,"wishlistCount":len(wishlist),"addressCount":len(add),"reviewCount":0,"since":u.created_at.isoformat()}}
@app.get("/account/orders")
def account_orders(session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db: u=require_user(db,session); rows=[o.data for o in db.scalars(select(Order).where(Order.user_id==u.id).order_by(Order.placed_at.desc())).all()]; return {"orders":rows,"counts":{"all":len(rows),"processing":sum(o.get("fulfillment")=="processing" for o in rows),"shipped":0,"delivered":sum(o.get("fulfillment")=="delivered" for o in rows)}}
@app.get("/account/orders/detail")
def order_detail(orderId:str,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db:
        u=require_user(db,session); row=next((o for o in db.scalars(select(Order).where(Order.user_id==u.id)).all() if o.id==orderId or o.data.get("number")==orderId),None)
        if not row: raise HTTPException(404,"We could not find that order")
        return {"order":row.data,"merchants":[]}
@app.post("/account/orders/reorder")
def reorder(p:ReorderIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db:
        u=require_user(db,session); row=db.get(Order,p.orderId)
        if not row or row.user_id!=u.id: raise HTTPException(404,"We could not find that order")
        c=cart_for(db,u.id,None); added=0
        for item in row.data.get("items",[]):
            raw=next((x for x in c.lines if x["productId"]==item["productId"] and x.get("variant")==item.get("variant")),None)
            if raw: raw["qty"]=min(99,raw["qty"]+item["qty"])
            else: c.lines=(c.lines or [])+[{"productId":item["productId"],"variant":item.get("variant"),"qty":item["qty"]}]
            added+=1
        db.commit(); return {"added":added,"cart":cart_payload(db,c)}
@app.get("/account/addresses")
def addresses(session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db: u=require_user(db,session); return {"addresses":[a.data for a in db.scalars(select(Address).where(Address.user_id==u.id)).all()]}
@app.post("/account/addresses")
def add_address(p:AddressIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db: u=require_user(db,session); data=p.model_dump(); aid=data.pop("id",None) or "addr_"+uuid.uuid4().hex[:10]; data["id"]=aid; db.add(Address(id=aid,user_id=u.id,data=data)); db.commit(); return {"addresses":[a.data for a in db.scalars(select(Address).where(Address.user_id==u.id)).all()],"address":data}
@app.patch("/account/addresses")
def update_address(p:AddressPatchIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db:
        u=require_user(db,session); row=db.get(Address,p.id)
        if not row or row.user_id != u.id: raise HTTPException(404,"That address is not on your account")
        data={**row.data,**p.model_dump(exclude_none=True)}; row.data=data; db.commit(); return {"addresses":[a.data for a in db.scalars(select(Address).where(Address.user_id==u.id)).all()],"address":data}
@app.delete("/account/addresses")
def delete_address(p:IdIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db:
        u=require_user(db,session); row=db.get(Address,p.id)
        if row and row.user_id==u.id: db.delete(row); db.commit()
        return {"addresses":[a.data for a in db.scalars(select(Address).where(Address.user_id==u.id)).all()]}
@app.patch("/account/settings")
def settings(p:SettingsIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db: u=require_user(db,session); data=p.model_dump(exclude_none=True); u.settings={**(u.settings or {}),**{k:v for k,v in data.items() if k not in {"name","phone"}}}; u.name=data.get("name",u.name); u.phone=data.get("phone",u.phone); db.commit(); return {"user":public_user(u),"settings":u.settings}
@app.get("/account/settings")
def get_settings(session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db: u=require_user(db,session); return {"user":public_user(u),"settings":u.settings}
@app.get("/account/wishlist")
def wishlist(session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db: u=require_user(db,session); w=db.scalar(select(Wishlist).where(Wishlist.user_id==u.id)); ids=w.product_ids if w else []; return {"wishlist":[p for p in product_rows(db) if p["id"] in ids]}
@app.post("/account/wishlist/toggle")
def toggle_wishlist(p:ProductIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db: u=require_user(db,session); w=db.scalar(select(Wishlist).where(Wishlist.user_id==u.id)); ids=list(w.product_ids or []); saved=p.productId not in ids; ids.append(p.productId) if saved else ids.remove(p.productId); w.product_ids=ids; db.commit(); return {"saved":saved,"wishlist":[x for x in product_rows(db) if x["id"] in ids]}
@app.post("/cart/save-for-later")
def save_for_later(p:CartKeyIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db:
        u=require_user(db,session); c=cart_for(db,u.id,None); product_id=p.key.split("::",1)[0]; w=db.scalar(select(Wishlist).where(Wishlist.user_id==u.id));
        if product_id not in w.product_ids: w.product_ids=(w.product_ids or [])+[product_id]
        c.lines=[x for x in c.lines if line_key(x)!=p.key]; db.commit(); return cart_payload(db,c)
@app.get("/account/reviews")
def reviews(session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db: u=require_user(db,session); return {"reviews":[r.data for r in db.scalars(select(Review).where(Review.user_id==u.id)).all()]}
@app.post("/account/reviews")
def add_review(p:ReviewIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db: u=require_user(db,session); data={**p.model_dump(),"id":"rev_"+uuid.uuid4().hex[:10],"date":now().isoformat(),"verified":True,"helpful":0}; db.add(Review(id=data["id"],user_id=u.id,product_id=p.productId,data=data)); db.commit(); return {"reviews":[r.data for r in db.scalars(select(Review).where(Review.user_id==u.id)).all()]}
@app.patch("/account/reviews")
def update_review(p:ReviewPatchIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db:
        u=require_user(db,session); row=db.get(Review,p.id)
        if not row or row.user_id!=u.id: raise HTTPException(404,"That review is not on your account")
        row.data={**row.data,**p.model_dump(exclude_none=True),"date":now().isoformat()}; db.commit(); return {"reviews":[r.data for r in db.scalars(select(Review).where(Review.user_id==u.id)).all()]}
@app.delete("/account/reviews")
def delete_review(p:IdIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db:
        u=require_user(db,session); row=db.get(Review,p.id)
        if row and row.user_id==u.id: db.delete(row); db.commit()
        return {"reviews":[r.data for r in db.scalars(select(Review).where(Review.user_id==u.id)).all()]}
@app.get("/shipping/options")
def shipping(): return {"options":[{"id":"standard","label":"Standard delivery","eta":"2-5 working days","price":6.5},{"id":"express","label":"Express delivery","eta":"1-2 working days","price":14}],"paymentMethods":[{"id":"card","label":"Card","detail":"Secure card payment"}],"freeShippingOver":FREE_SHIPPING_OVER,"taxRate":TAX_RATE}
@app.post("/checkout/quote")
def quote(p:CheckoutIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db: u=require_user(db,session); c=cart_for(db,u.id,None); payload=cart_payload(db,c); option=next(x for x in shipping()["options"] if x["id"]==p.shippingMethod); shipping_cost=0 if payload["subtotal"]>=FREE_SHIPPING_OVER else option["price"]; payload["shipping"]=shipping_cost; payload["total"]=round(payload["subtotal"]+shipping_cost+payload["tax"],2); return {"cart":payload,"groups":payload["merchants"],"address":None,"shippingOption":option,"totals":{"subtotal":payload["subtotal"],"shipping":shipping_cost,"tax":payload["tax"],"total":payload["total"],"commission":0,"itemCount":payload["count"]},"freeShippingOver":FREE_SHIPPING_OVER}
@app.post("/checkout/place")
def place(p:CheckoutIn,session:Optional[str]=Header(None,alias="X-Ferix-Session")):
    with SessionLocal() as db:
        u=require_user(db,session); c=cart_for(db,u.id,None); cp=cart_payload(db,c)
        if not cp["lines"]: raise HTTPException(409,"Your cart is empty")
        placed=now().isoformat(); order={"id":"ord_"+uuid.uuid4().hex[:10],"number":"FX-"+str(4800+len(db.scalars(select(Order)).all())),"placedAt":placed,"channel":"marketplace","items":[{"productId":x["productId"],"title":x["product"]["title"],"variant":x.get("variant"),"qty":x["qty"],"price":x["unitPrice"],"merchantId":x["product"]["merchantId"],"merchantName":x["product"]["merchantName"]} for x in cp["lines"]],"subtotal":cp["subtotal"],"shipping":cp["shipping"],"tax":cp["tax"],"total":cp["total"],"payment":"pending","fulfillment":"processing","carrier":None,"tracking":None,"address":None,"note":p.note,"shippingMethod":p.shippingMethod,"paymentMethod":p.paymentMethod,"timeline":[{"label":"Order placed","at":placed}]}; db.add(Order(id=order["id"],user_id=u.id,data=order)); c.lines=[]; db.commit(); return {"order":order}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app",host="0.0.0.0",port=int(os.getenv("PORT","8000")),reload=False)
