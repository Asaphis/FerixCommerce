# Ferixas — Account Dashboard Prototype

An interactive prototype of the **customer (user front end) account dashboard**, rebuilt from scratch.
It is deliberately *only* the dashboard — no other screens — so the layout, density and responsive
behaviour can be judged and agreed before anything is ported into the real app.

---

## Preview

| | |
|---|---|
| **Live preview** | https://8080-igvwf27vbvea374mmet2t-70af08cd.us4.manus.computer/index.html |
| **Dashboard alone** | https://8080-igvwf27vbvea374mmet2t-70af08cd.us4.manus.computer/dashboard.html |
| **Files** | `Prototype/index.html` (preview shell) · `Prototype/dashboard.html` (the dashboard) |

The preview shell has a device switcher (**Mobile 390 / Tablet 834 / Desktop 1280 / Full**) so the
same page can be checked at every breakpoint, plus a **“Why this works”** panel with the rationale.
The dashboard is a plain static page — no build step, no framework, no network calls.

```bash
cd Prototype && python3 -m http.server 8080
```

**Clickable in the prototype:** tap an order row to expand its items/tracking/actions · `+` on Buy
again increments both cart badges · the heart toggles saved state and updates the Saved count ·
the bottom tab bar switches its active state.

---

## What was wrong with the current dashboard

Current file: `WebPhase/marketplace/app/account/page.tsx`, with `components/ferix/chrome.tsx`
(header) and `components/ferix/account-nav.tsx` (section nav).

**1. Nothing about it says “order”.** The page opens with a greeting, then four equal stat tiles, then
a plain order list. There is no open-order status, no progress, no ETA, no carrier, no tracking
number, no reorder, no return, no review action. For a shopper, the reason to open an account page
is *“where is my stuff?”* — that answer is absent.

**2. Duplicated labels everywhere (the “too much content” problem).** Every section prints two
labels for one idea via `SectionHead`:

```tsx
<SectionHead eyebrow="Recent orders"  title="Your latest purchases" />
<SectionHead eyebrow="Saved items"    title={`${stats.wishlistCount} kept for later`} />
<SectionHead eyebrow="Delivery addresses" title={`${addresses.length} address(es) on file`} />
```

Plus a greeting block with `Eyebrow` + name + email + “customer since”, a stat tile with
label + value + sub-line, and a closing sentence: *“$3,842.50 spent across 14 orders · one checkout
on every store”*. Same fact, stated twice, at full size.

**3. Mobile is a shrunk desktop.** The header renders **three stacked rows on every screen**
(announcement strip, search row, department strip), the account nav is six equal buttons that wrap
into two rows, and navigation lives at the top of the screen — out of thumb reach. There is no
bottom navigation, no safe-area handling, and content can sit under the browser chrome.

**4. Missing standard e-commerce affordances.** No payment method on file, no return entry point, no
help entry point, no notification/bell, no “buy again”, no order row actions beyond a single “View”
link, and no way to reach every account area from the dashboard itself.

---

## The redesign

### Structure (top to bottom)

| # | Block | Why it exists |
|---|---|---|
| 1 | **Open order hero** (dark panel) | Status pill, order number, “Arriving Tue, 8 Oct”, carrier · items · total, 4-step progress (Ordered → Packed → In transit → Delivered), last scan, “Track package” + “Order details”, and the parcel contents. This is the #1 account task. |
| 2 | **Stat tiles ×4** | Orders / Lifetime spend / Saved / Reviews — one label, one number, one micro-line. |
| 3 | **Recent orders** | Four rows, each expandable to items, tracking, address and contextual actions (Track, Buy again, Invoice, Return, Write review). |
| 4 | **Saved items** | Horizontal snap rail on small screens, 4-up grid on desktop. |
| 5 | **Buy again** | Reorder shortcuts with a one-tap `+`. |
| 6 | **Account details strip** | Ships to · Payment · Returns in a single 3-cell band (replaces a stack of address cards). |
| 7 | **Sidebar / chip strip** | Paths to *all* account areas with live counts. |

### Responsive rules

| Breakpoint | Behaviour |
|---|---|
| **< 640px** | One 56px top bar (mark + screen title + search + alerts). Single column. 2×2 stat tiles. Saved items as a snap-scroll rail. **Fixed 5-item bottom tab bar** (Home · Browse · Cart · Orders · Account) with an ember active indicator and the cart badge always visible. Sticky account chip strip. `pb-28` so nothing hides under the tab bar. |
| **640–1023px** | Same tab bar and chip strip. Card grids go 2-up. Saved rail shows 4 cards. |
| **≥ 1024px** | 232px sticky sidebar replaces the chip strip, 4-up stats, 4-up saved grid, hero splits into *order* / *parcel* columns. Header keeps its announcement + department rows. |

No heading is used as navigation on mobile — the header only carries identity and search; **all
navigation is the bottom menu**.

### Copy rules (applied throughout)

1. **One heading per section.** No eyebrow + title pairs.
2. Supporting lines are **9.5–12.5px mono micro-labels**, uppercase, `tracking-[0.12em]–[0.16em]`.
   Never a sentence where a label will do.
3. Item summaries abbreviate to **`First item +N more · 2 Oct`**; the full list is one tap away.
4. Whole dollars in tiles (`$3.8k`, `$214`), cents only inside line items (`$189.00`).
5. All numerals use `tabular-nums`.
6. Statuses are pills with a fixed vocabulary: `In transit` (azure), `Delivered` (pine),
   `Refunded` (neutral), `Only N left` (sand), `In stock` (muted).

### Design tokens

Unchanged from the app — `app/globals.css`: `bone #f5f2ec`, `ink #14110e`, `ink-soft #6b635a`,
`line-warm #e2dbcc`, `void #0b0d11`, `hairline #242c39`, `chalk #e9ecf1`, `chalk-dim #8b95a6`,
`ember #e4572e`, `lime #c9f24d`, `pine #1f4b43`, `sand #c9a24d`, `azure #2f6f8f`.
Fonts: Bricolage Grotesque (display), Archivo (body), IBM Plex Mono (labels/numbers).
Corners stay sharp: `rounded-[2px]` for controls, `rounded-[3px]` for cards.

---

## Porting map

The prototype markup is plain Tailwind utility classes using the **same token names as
`app/globals.css`**, so each block drops into the real component tree.

| Prototype block | Goes to | Data already available |
|---|---|---|
| Top bar + bottom tab bar | `components/ferix/chrome.tsx` (new `FerixMobileTabBar`) | `headerState()` → `user`, `cartCount` |
| Sidebar / chip strip | replace `components/ferix/account-nav.tsx` | counts from `account.stats` |
| Open order hero | new `components/ferix/order-tracker.tsx` | `account.orders[0]` (`fulfillment`, `carrier`, `tracking`, `timeline`, `address`), `account.activeOrders` |
| Stat tiles | `app/account/page.tsx` | `stats.orderCount / spent / averageOrder / wishlistCount / reviewCount` |
| Recent orders | `app/account/page.tsx` + row component | `orders[]` (`number`, `placedAt`, `items[]`, `total`, `fulfillment`) |
| Saved items | reuse `ProductRail` | `wishlist[]` |
| Buy again | new (derive from `orders[].items`) | `orders[].items[]` |
| Details strip | `app/account/page.tsx` | `addresses[default]`, user settings |

Nothing new is needed from the API — the existing `Account` payload
(`user, orders, activeOrders, wishlist, addresses, reviews, follows, stats`) covers every block.
`timeline[]` on `Order` already carries the stepper steps.

---

## Brief to hand to the coding agent

> Rebuild the customer account dashboard (`WebPhase/marketplace/app/account/page.tsx`) to match the
> approved prototype in `Prototype/dashboard.html`. Requirements:
>
> 1. **Open-order tracking is the hero block** — status, ETA, carrier, 4-step progress from
>    `order.timeline`, and Track/Details actions, above everything else.
> 2. **Mobile uses a bottom tab bar** (Home, Browse, Cart, Orders, Account) and a **56px top bar**.
>    Remove the three-row header and the wrapped button nav below 1024px. Keep the desktop sidebar.
> 3. **Delete every duplicated label** — no `eyebrow` + `title` pairs, no label+value+subtitle tiles
>    unless the sub-line is a short mono micro-label. Abbreviate item summaries to
>    `First item +N more · date`.
> 4. **Keep the brand tokens and fonts exactly** (`globals.css`); sharp 2–3px corners.
> 5. **Add the missing e-commerce affordances**: buy again, return, write review, payment method,
>    help, notification bell, per-order actions, and paths to all seven account areas.
> 6. Content must never sit under the bottom tab bar (`pb-28` + `env(safe-area-inset-bottom)`).

---

## Not built (deliberately)

Only the Overview screen exists. Orders, Saved items, Addresses, Reviews, Payment and Settings
resolve to a toast so it is obvious they are out of scope for this review round.
