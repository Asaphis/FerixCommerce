# Ferixas section colour palettes

Ready-to-paste colour codes for designing sections — backgrounds as gradients, plus the text, accent, timer and label colours that go with them.

Every value in this document has been machine-checked twice:

* it is accepted by the section contract (`is_safe_css_color`), so the CMS will not silently fall back to a default; and
* it clears WCAG AA contrast (4.5:1) for the text it carries — measured against the **darkest or brightest stop of the gradient**, not against an average.

The checker lives at `tools/check_section_palettes.py`; run it from `Backend` with `.venv/bin/python ../tools/check_section_palettes.py`.

---

## 1. Where each code goes

In **CMS → a page → a section → its settings**, the colour controls are:

| Editor field | Field key | What it paints |
|---|---|---|
| Background | `backgroundColor` | The whole band behind the section. **Accepts a gradient.** |
| Accent | `accentColor` | Eyebrow pill fill, "See all" link and button outline, department/brand link |
| Text | `textColor` | Title, description, and card text inside the section |
| Timer background | `timerBackgroundColor` | The countdown chips. **Accepts a gradient.** |
| Timer text | `timerTextColor` | The numerals and unit labels inside those chips |
| Label colour | `badgeColor` | Per **product**, set on the product's placement form: the small label on that product's card |

Sections that carry all of these: product rows and grids (including a **Flash Sale** presentation).
Departments, brands and stores carry Background, Accent and Text. The message strip carries Background, Colour and Text. The footer carries Background and Text.

Type or paste a code straight into the field — `#F05A28`, `rgb(240, 90, 40)`, `hsl(17, 87%, 55%)`, `rebeccapurple`, or a full gradient. The picker stays beside it for quick nudges, and on background fields the **Solid / Gradient** switch opens the gradient builder (type, angle or shape, origin, up to 8 stops).

A **bright** accent is safe now: the label sitting on an accent fill picks its own ink, so lime, peach or glow colours read correctly instead of turning into white-on-lime mush.

---

## 2. The Ferixas palette these recipes are built from

| Role | Code | Where it already lives |
|---|---|---|
| Ember (primary) | `#F05A28` | Storefront accent, buttons, links |
| Ember deep | `#C2410C` | AA-safe ember for text and filled labels |
| Ember soft | `#E64E21` | Hover states |
| Ember peach | `#FFB38A` | Light ember for dark backgrounds |
| Void | `#102D43` | Deep navy, hero and footer bands |
| Ink | `#172B3B` | Body text, dark chips |
| Ink soft | `#637586` | Secondary text |
| Bone | `#F3F6FA` | Page background |
| Bone soft | `#EAF0F5` | Alternating bands |
| Line | `#DFE6ED` | Hairlines |
| Pine | `#16856F` | Success, "in stock" |
| Sand | `#C58A21` | Warning, "limited" |
| Azure | `#3479A8` | Information, trust |
| Danger | `#E34D32` | "Sold out" |

The CMS defaults (`#E4572E` accent, `#12263A` text, `#FFF3EF` campaign background) sit inside this family; the recipes below are the same identity with more depth, so a designed section still reads as Ferixas rather than as a random theme.

---

## 3. The nine recipes

Each block is a complete section: paste the values into the matching fields. "Label colour" goes on the products you place in that section.

### 1 · Ember Midnight — the flagship flash sale

A deep navy band that warms into ember on the right. The default choice for a timed campaign.

| Field | Value |
|---|---|
| Background | `linear-gradient(135deg, #0B1F30 0%, #102D43 50%, #6E2A18 100%)` |
| Accent | `#F05A28` |
| Text | `#FFFFFF` |
| Timer background | `linear-gradient(180deg, #FFB38A 0%, #FF8D59 100%)` |
| Timer text | `#3A1405` |
| Label colour | `#F05A28` |

Contrast: text 10.46 · timer 7.18 · label 4.54.
Pair with **Layout: carousel**, **Show countdown: on**, **Show discount badges: on**, **Show remaining: on**, **Eyebrow: Limited time only**, **Countdown label: Ends in**.

### 2 · Deep Void — calm, premium, always-on row

For a "Featured" or "Best sellers" row that should feel expensive rather than urgent. No countdown.

| Field | Value |
|---|---|
| Background | `linear-gradient(160deg, #071824 0%, #102D43 60%, #17405F 100%)` |
| Accent | `#F05A28` |
| Text | `#FFFFFF` |
| Timer background | `#FFFFFF` |
| Timer text | `#102D43` |
| Label colour | `#3479A8` |

Contrast: text 10.85 · timer 14.2 · label 4.72.
Turn **Show countdown** off; leave **Show discount badges** on.

### 3 · Ember Glow — a spotlight in one corner

A radial wash that concentrates the heat top-right. Best for a hero-adjacent campaign or a single-product push.

| Field | Value |
|---|---|
| Background | `radial-gradient(circle at 75% 0%, #A8330F 0%, #6E2A18 45%, #102D43 100%)` |
| Accent | `#FFB38A` |
| Text | `#FFFFFF` |
| Timer background | `#102D43` |
| Timer text | `#FFB38A` |
| Label colour | `#FFB38A` |

Contrast: text 6.68 · timer 8.16 · label 8.85 (dark ink lands on the peach label automatically).

### 4 · Pine Signal — fresh, "new arrivals" energy

Green reads as newness and safety, not as urgency. Good for New arrivals or a restock campaign.

| Field | Value |
|---|---|
| Background | `linear-gradient(140deg, #06231D 0%, #0F3A31 55%, #16856F 100%)` |
| Accent | `#5FD3B8` |
| Text | `#FFFFFF` |
| Timer background | `#FFFFFF` |
| Timer text | `#0F3A31` |
| Label colour | `#16856F` |

Contrast: text 4.55 · timer 12.58 · label 4.55.

### 5 · Azure Trust — trust, tech, official stores

Blue for anything that should feel verified: official stores, warranty, a brand partner row.

| Field | Value |
|---|---|
| Background | `linear-gradient(145deg, #0B2233 0%, #1B4A6B 55%, #3479A8 100%)` |
| Accent | `#8FC7E8` |
| Text | `#FFFFFF` |
| Timer background | `linear-gradient(180deg, #FFFFFF 0%, #E7F1F8 100%)` |
| Timer text | `#0B2233` |
| Label colour | `#3479A8` |

Contrast: text 4.72 · timer 14.2 · label 4.72.

### 6 · Ember Cream — the light flash sale

The ember campaign without going dark. This is the family the current CMS default belongs to, deepened so the numerals stay readable.

| Field | Value |
|---|---|
| Background | `linear-gradient(135deg, #FFFFFF 0%, #FFF3EF 55%, #FFE0D2 100%)` |
| Accent | `#C2410C` |
| Text | `#12263A` |
| Timer background | `linear-gradient(180deg, #C2410C 0%, #9A3412 100%)` |
| Timer text | `#FFFFFF` |
| Label colour | `#C2410C` |

Contrast: text 12.35 · timer 5.18 · label 5.18.
Use this when the section sits directly under a light hero and a dark band would be too heavy.

### 7 · Bone Cool — light and quiet

For departments, brands and stores where colour should not compete with product photography.

| Field | Value |
|---|---|
| Background | `linear-gradient(135deg, #F3F6FA 0%, #E7EEF6 60%, #D9E6F2 100%)` |
| Accent | `#1E5B84` |
| Text | `#12263A` |
| Timer background | `#12263A` |
| Timer text | `#FFFFFF` |
| Label colour | `#1E5B84` |

Contrast: text 12.13 · timer 15.4 · label 7.28.

### 8 · Bone Sand — warm, editorial, seasonal

Warm paper for gifting, home, and seasonal edits.

| Field | Value |
|---|---|
| Background | `linear-gradient(135deg, #FFFDF7 0%, #FBF1DC 60%, #F3E2BE 100%)` |
| Accent | `#8A5A0B` |
| Text | `#2B1D06` |
| Timer background | `#2B1D06` |
| Timer text | `#F7E7C4` |
| Label colour | `#8A5A0B` |

Contrast: text 12.83 · timer 13.41 · label 5.92.

### 9 · Plum Night — the conic one

A conic gradient sweeps the hue around a point instead of along a line. Use it sparingly, for one statement section.

| Field | Value |
|---|---|
| Background | `conic-gradient(from 210deg at 30% 20%, #102D43 0%, #3A1F45 55%, #6E2A18 100%)` |
| Accent | `#E9A0C8` |
| Text | `#FFFFFF` |
| Timer background | `#FFFFFF` |
| Timer text | `#3A1F45` |
| Label colour | `#B3528F` |

Contrast: text 10.46 · timer 14.37 · label 4.65.

---

## 4. Supporting pieces

### Message strip (promo strip)

| Intent | Background | Colour (accent) | Text |
|---|---|---|---|
| Delivery / reassurance | `#102D43` | `#FFB38A` | `#FFFFFF` |
| Offer | `linear-gradient(90deg, #9A3412 0%, #C2410C 100%)` | `#FFF3EF` | `#FFFFFF` |
| Quiet notice | `#F3F6FA` | `#1E5B84` | `#12263A` |

Measured: delivery 14.2, offer 5.18, quiet notice 14.2 for the message text; the accent used as the link colour clears 3:1 against the strip in all three.

### Hero and banner overlay

The hero has no colour pickers — it has an **Overlay tone** (`dark` behind light text, `light` behind dark text) and **Overlay strength** (`0–100`). Match them to the media:

* busy or bright photo → tone `dark`, strength `60–70`
* dark photo or video → tone `light`, strength `35–50`
* quiet studio shot → strength `25–40`

The hero's button colour comes from the banner's own **Accent colour** (CMS → Banners), and its label ink is chosen automatically.

### Footer

`linear-gradient(180deg, #102D43 0%, #0B1F30 100%)` with Text `#FFFFFF`, or Background `#F3F6FA` with Text `#12263A` for a light footer.

---

## 5. Rules of thumb

1. **One accent per page.** Ember is the platform's voice; the other recipes are for one section that must stand apart.
2. **Alternate light and dark bands.** Two dark campaigns back to back read as one long band. Follow Ember Midnight with Bone Cool or Bone Sand.
3. **135° is the default angle** for a band — it falls left-to-right, matching reading direction. Use 160°–180° for tall bands and radials only when you want a spotlight.
4. **Keep the gradient to two or three stops.** Past that the band starts to look like a texture rather than a colour.
5. **Timer chips should contrast with the band, not with each other.** On a dark band use light chips; on a light band use dark chips. That is why the recipes flip them.
6. **Label colour is per product.** Two products in the same section can carry different label colours — useful to say "Only 3 left" in danger red while the rest of the section stays ember.
7. **Prefer a deep accent when the accent is used as text** (the department and brand "See all" links paint accent-coloured text). `#C2410C` reads on light backgrounds where `#F05A28` is marginal.

---

## 6. Verified codes at a glance

Copy from here when you only need one value.

```
Backgrounds
linear-gradient(135deg, #0B1F30 0%, #102D43 50%, #6E2A18 100%)   Ember Midnight
linear-gradient(160deg, #071824 0%, #102D43 60%, #17405F 100%)   Deep Void
radial-gradient(circle at 75% 0%, #A8330F 0%, #6E2A18 45%, #102D43 100%)   Ember Glow
linear-gradient(140deg, #06231D 0%, #0F3A31 55%, #16856F 100%)   Pine Signal
linear-gradient(145deg, #0B2233 0%, #1B4A6B 55%, #3479A8 100%)   Azure Trust
linear-gradient(135deg, #FFFFFF 0%, #FFF3EF 55%, #FFE0D2 100%)   Ember Cream
linear-gradient(135deg, #F3F6FA 0%, #E7EEF6 60%, #D9E6F2 100%)   Bone Cool
linear-gradient(135deg, #FFFDF7 0%, #FBF1DC 60%, #F3E2BE 100%)   Bone Sand
conic-gradient(from 210deg at 30% 20%, #102D43 0%, #3A1F45 55%, #6E2A18 100%)   Plum Night

Accents
#F05A28  #FFB38A  #5FD3B8  #8FC7E8  #E9A0C8  #C2410C  #1E5B84  #8A5A0B  #3479A8

Text
#FFFFFF  #12263A  #2B1D06  #3A1405

Timer chips
linear-gradient(180deg, #FFB38A 0%, #FF8D59 100%)   light chip, dark ink
linear-gradient(180deg, #C2410C 0%, #9A3412 100%)   deep chip, white ink
linear-gradient(180deg, #FFFFFF 0%, #E7F1F8 100%)   white chip, navy ink
#FFFFFF  #102D43  #12263A  #0F3A31  #3A1F45
```
