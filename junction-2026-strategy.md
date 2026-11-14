# Junction 2026 — Challenge Analysis & Winning Strategy

Compiled 13 Nov 2026 from the Junction platform (event 45, "European Tech Renaissance").

**What was read:** the full detail page of every Main Challenge (19) and every Tech Challenge (19), including the Insight, Resources, Judging Criteria and Prizes sections that the summary cards hide.

**What was not read:** most externally linked docs (partner API docs, GitHub starter repos, the MLH guides). Exceptions: the S-Pankki dataset repo was opened, and the Valio Aimo resource portal was read later — see `valio-mock-api-notes.md`. The mock offers only price and availability lookups (no search, no ordering), which matches the #1 design.

**Scores are estimates.** "Stack fit" and "48h feasibility" are 1–5 ratings against your stack (TypeScript, React Native, Next.js, Node.js, Python, PostgreSQL, C, AI/LLM workflows). "Crowding" is a guess from prize size and how open the brief is — the platform shows no team counts.

**Secrets:** the Valio portal password and mock API key are on the challenge detail page and deliberately not copied here. Public promo codes are included.

---

## 1. Complete Main Challenges Breakdown

### Agentic AI Track

#### 1.1 Trusted Trade Agents — Valio Aimo
- **Core problem:** B2B food ordering is manual webshop clicking. Valio Aimo (20,000 professional kitchens, 25,000 products, 700 suppliers) wants to define how *external* AI purchasing agents can safely look up, order and get approval from its systems — on open standards, before a platform defines that interface for them.
- **Must enable:** (1) product, price and availability lookup; (2) inquiry → order at fixed prices, no negotiation; (3) permission and human-approval management.
- **Optional:** delivery-time and sustainability comparison; substitution and exception handling; human-readable traceability.
- **Problems they'd love tackled:** a trust protocol (agent can trust stock/price/origin claims without manual checks); a guardrails model (spend threshold, substitutions outside stated preferences); "good-better-best" substitution ranking within their own assortment; an audit trail usable by both buyer and Valio Aimo.
- **Their example scenarios:** need → recipe → order; last-minute event with substitution "through recipe logic rather than a simple SKU swap"; mid-week stock-out; Valio's own proactive selling agent; allergen-safe substitution for school/hospital kitchens; standing-order drift detection.
- **Resources:** synthetic catalogue, simulated suppliers and mock APIs (prices, availability behaviour, lead times, sustainability labels) at junction26.valioaimo.fi; webshop test accounts to follow. Six mentors (commercial, online sales, IT/data governance).
- **Preferred tech:** agentic/tool-use frameworks, open data/interop standards, recommendation logic, optional verifiable-credential or trust layer. x402 / Nevermined are "relevant context, not required".
- **Scope note:** whether production becomes an API, MCP or their own agent is out of scope.
- **Judging:** working end-to-end demo in the mocked environment 30% · precision in matching what the buyer asked 20% · autonomy and controls (guardrails, sign-off, audit) 20% · robustness to exceptions 15% · openness and credible path to production 15%.
- **Prizes:** €4,000 / €2,000 / €1,000.
- **Stack fit 5 · Feasibility 4 · Crowding: high** (largest software cash prize).

#### 1.2 Break the Agent — AfterQuery
- **Core problem:** frontier agents still fail in novel situations. Build an RL environment with a clear goal, actions and a checkable reward that exposes real failure modes — and prove the reward can't be gamed.
- **Requirements:** run a frontier agent and compare against a stronger, reproducible reference run your team demonstrates. Difficulty must come from decisions, with needed information and tools available.
- **Resources:** open-source harness (Harbor running the OpenCode agent) that connects to your environment over **MCP**; scoring skeleton; frontier model credits per team; two mentors from AfterQuery's environments team.
- **Starting points they list:** planning several steps ahead, exploring an unfamiliar system, using tools, managing limited resources, adapting to new information. "A small environment with a well-chosen challenge can be enough."
- **Judging:** the gap 30 · meaningful difficulty 30 · reward integrity 25 · craft 15 (one-command eval from the README).
- **How judging runs:** 10-minute demo; judges rerun your reference run, three agent runs, a do-nothing baseline and a stop-early baseline; 15 minutes of exploit hunting.
- **Tiebreaker / stretch:** a smaller model improving after training on your environment's experience.
- **Prizes:** €3,000 + work trial + merch / €1,500 + merch / €500.
- **Stack fit 4 · Feasibility 3–4 · Crowding: low–medium** (conceptually hard, which keeps wrapper apps out).

#### 1.3 Decode the Noise — Hostinger
- **Core problem:** detect coordinated propaganda, bot amplification or bad actors in text, social content or web-traffic patterns.
- **Directions:** spot the swarm (timing, account similarity, text reuse); name the technique (loaded language, whataboutism… with a plain-language verdict); clean the traffic (bots vs. real visitors in server logs); trust the source (domain age, cloned content, link networks).
- **Hard requirement:** deployed and live on Hostinger with a public URL.
- **Resources per team:** Hostinger VPS (2 vCPU, 8 GB RAM, 100 GB NVMe, root, Docker, free domain); AI Router credits for 150+ models (OpenAI- and Anthropic-SDK compatible); AI Builder plan; MCP server/API/CLI for deploying from your editor.
- **Judging:** detection quality (accuracy, false-positive handling, explainability) 40% · technical execution and live deployment 25% · originality and impact 20% · demo clarity 15%. They want measured precision and false-positive rates.
- **Prizes:** €2,000 / €1,000 / €500 + one year hosting, domain, swag, social spotlight.
- **Stack fit 4 · Feasibility 4 · Crowding: medium.** No dataset is provided — finding labelled data is your job.

#### 1.4 Earned Trust in AI Code — Tieto
- **Core problem:** AI writes code faster than humans can review. Design a review concept where AI reviews AI code and a named human stays accountable without reading every line.
- **Requirements:** concept card (recommendation, principles, trade-offs, limits); reference walkthrough on a sample agent-written change with its requirement ID; show what the AI found, what it refused to decide and why; failure modes; decision log. Synthetic or cleared data only.
- **Code input:** github.com/te-industry-tech-office/junction26-messagepack-csharp — four branches of agent-written changes (4, 4, 28 and 237 files) against MessagePack-CSharp issues. The code is **C#**.
- **Principles from their Insight:** review is advice with evidence, never approval; depth of human review follows risk; trust is earned per area and withdrawn after escapes; the owner signs what was checked, what was not, and the residual risk.
- **Judges will ask:** what would make you not trust your own output? Who owns the decision? How would this scale?
- **Judging:** clarity 30% · practicality 25% · measurement (reverts, incidents, time to merge, share routed to humans) 25% · evidence traceable to a requirement 20%. Concept weighs more than implementation.
- **Prizes:** €2,000 / €1,000 / €500.
- **Stack fit 4 · Feasibility 5 · Crowding: medium.**

#### 1.5 Spread — Bahn Express
- **Core problem:** run a simulated car-transport company for a week: quote dealers against a competitor, post drives as gigs and set driver fees. Score = gross margin, with ≥90% on-time delivery.
- **Resources:** spread.bahnexpress.com/join (event code `spread-kmu9z6`), handbook, API reference, TypeScript and Python kits, leaderboard, `llms.txt` for agents.
- **Format:** ranking rounds from Friday 19:30; final Sunday 08:00 (registration closes 07:30), one secret week of about 34 minutes. Top 10 by margin present 5–10 slides or a video; from there the jury scores elegance, clarity, creativity and robustness and margin no longer counts.
- **Judging:** no weighted criteria published.
- **Prizes:** €2,000 / €1,000 / €500.
- **Stack fit 4 · Feasibility 4 · Crowding: unknown.** Objective leaderboard — you know where you stand all weekend.

#### 1.6 The Internet Butler — Exa
- **Core problem:** personal agent that finishes tedious real-life tasks (rent increase legality, missed benefits, travel disruption) using live web search.
- **Resources:** $50 Exa credits per participant (code `EXA50JUNCTION` at dashboard.exa.ai/billing); Search, Contents, Websets, Monitors, hosted MCP, Python/JS SDKs; demos.exa.ai.
- **Judging:** use of Exa beyond training data 20% · usefulness to a specific group 20% · clarity of sources 20% · originality 20% · works on judges' live queries 20%.
- **Prizes:** $2,500 + $5,000 credits + hoodies + TRMNL / $1,500 + $3,000 credits / $500 + $1,000 credits.
- **Stack fit 5 · Feasibility 5 · Crowding: very high.** The most generic brief at the event.

#### 1.7 Make Unicorns Real — Cala
- **Core problem:** founders and investors decide on scattered, stale data. Build one sharp product on Cala's structured, sourced knowledge graph (companies, people, rounds, investors).
- **Needs they hear:** finding investors who actually lead rounds and are still active; reading a market; pre-investment background checks; finding first customers among companies that just raised.
- **Resources:** unlimited-as-needed credits (code `MAKEUNICORNSREAL` in console.cala.ai); API and MCP; docs.cala.ai; workshop Saturday 11:00.
- **Judging:** real need 25% · execution 25% · originality 25% · use of Cala 25%.
- **Prizes:** travel and accommodation for three hackathons (~€5,000 for a team of four) + €1,000 credits + merch; runner-up €500 credits + merch. **No cash.**
- **Stack fit 5 · Feasibility 5 · Crowding: high.**

### Hardware Track by Arduino

#### 1.8 Physical AI Challenge — Ignite Next × Intel
- **Core problem:** turn an SO-101 robot arm into an autonomous inspection cell: pick Duplo bricks, show them to a camera, sort good from defective.
- **Requirements:** teleoperated demos → fine-tune a VLA policy in Physical AI Studio; Anomalib defect model; OpenVINO deployment on the Intel Core Ultra laptop's CPU/GPU/NPU. Challenge Terms must be accepted.
- **Resources:** **25 stations, one per team** (laptop with 64 GB RAM, follower and leader arms, two cameras incl. RealSense D415, bricks); cloud GPUs; technical session Saturday 12:00; 3–5 Intel engineers on site.
- **Judging:** task success 30% · Intel technology integration 30% · dataset and pipeline quality 20% · system efficiency 20%.
- **Prizes:** €5,000 / €3,000 / €2,000 — the largest cash pool at the event.
- **Stack fit 2 · Feasibility 2–3 · Crowding: capped at 25 teams.**

#### 1.9 Aaltonomous Humanoid — Aalto University
- **Core problem:** make a Unitree G1 humanoid sort 3–5 coloured objects into three boxes within 2 minutes, by fixed rule and by unseen text instruction.
- **Requirements:** Docker policy server; inputs are head RGB-D, wrist cameras, joint states and the instruction; outputs joint targets at 30 Hz (≥27 commands/s to pass the safety check).
- **Resources:** starter repo github.com/zupermiez/aaltonomous-humanoid; Isaac Sim Docker image; Verda GPUs (must be RTX-class ≥24 GB for rendering); real-robot datasets on Hugging Face during the event; ~30 volunteers.
- **Judging:** real-world result 40% · generality 25% · originality 20% · presentation 15%.
- **Prizes:** €2,000 + lab visit; top ~5 run on the real robot.
- **Stack fit 2 · Feasibility 2 · Crowding: low.**

#### 1.10 The Robot Teleoperation Challenge — Rokoko
- **Core problem:** use motion-capture suits and gloves to control robot hands, arms or humanoids, physically or in simulation.
- **Resources:** Smartgloves II, Smartsuit Pro II, Coil Pro, Device SDK (access by form approval), shared Unitree G1, possibly a Booster T1.
- **Judging:** technical execution 35% · originality 25% · usefulness 25% · demonstration of human-controlled robotics 15%.
- **Prizes:** hardware only — Smartgloves II + SDK licence (~€4,990) / Smartsuit Pro II (~€2,295) / Smartgloves I (~€1,095).
- **Stack fit 2 · Feasibility 2 · Crowding: low.**

#### 1.11 AI Glasses for Everyone, Everyday — Meta
- **Core problem:** an everyday use case where a first-person view beats a phone, inclusive for all abilities.
- **Requirements:** functional prototype + deck; handles permissions, errors, connectivity, device state; consent and safe data practices.
- **Resources:** 10 Meta Ray-Ban Display + 10 Ray-Ban Meta Gen 2, **shared**; most mentors are web-app engineers, so a web app is a supported route (also iOS/Android Device Access Toolkit).
- **Judging:** creativity and use case 25% · technical execution 25% · real-world value 25% · UX (input, accessibility, trust) 25%.
- **Prizes:** Ray-Ban Meta glasses per winning member; best teams may be invited to a Meta AI forum on 18 Nov.
- **Stack fit 4 · Feasibility 3 · Crowding: medium** (shared devices limit testing time).

#### 1.12 The Green European Renaissance — Arduino
- **Core problem:** Edge AI on the Arduino UNO Q for local environmental or social problems.
- **Requirements:** UNO Q + Modulino sensors; **must also publish on Arduino Project Hub** (tag "Junction Finland 2026").
- **Judging:** technical implementation and Edge AI 30% · environmental and social impact 30% · creativity 20% · working prototype 20%.
- **Prizes:** hardware only (Ventuno Q / UNO Q 4G + kit / kit, per member).
- **Stack fit 3 · Feasibility 3 · Crowding: medium.**

### FinTech Track

#### 1.13 Personal Economic Trainer — S-Pankki
- **Core problem:** banking stops at transaction lists. Let customers chat with their own money and actually understand it. No Finnish bank does this yet.
- **Requirements:** use the synthetic dataset; mobile app or mobile-embeddable web app.
- **Dataset** (github.com/hackjunction/Junction-2026-S-pankki): transactions CSV ~346 MB (customer, account, date, timestamp, category, amount, balance after, type, merchant, MCC code; Git LFS, UTF-8 BOM); customers (postal code, age); **mortgage negotiation history and outcomes** linked to customers.
- **What they value:** the three-baskets pedagogy (mandatory regular, mandatory irregular, everyday leakage); MyData-style free exploration, not fixed charts; what-if simulation; safe-to-spend and safe-to-save; optional benchmarks from open data; optional PSD2 multi-bank angle.
- **Judging:** impact on financial literacy 20% · originality of AI integration 20% · clarity of mobile UX 20% · feasibility 20% · potential to integrate into S-mobiili 20%.
- **Prizes:** €2,000 / €1,000 / €500 Airbnb gift cards.
- **Stack fit 5 · Feasibility 4 · Crowding: high.** React Native is a direct advantage here.

### Healthcare Track

#### 1.14 Equal Care Across Finland — AstraZeneca
- **Core problem:** cancer diagnosis and treatment speed varies by region. Find the gap, locate it in the care pathway, and recommend concrete actions.
- **Requirements:** public aggregate data with a source for every claim; at least one Goal 3 indicator of the national cancer strategy; actionable recommendations; working demo.
- **Resources:** national cancer strategy 2026–2035 and implementation roadmap (PDFs, in Finnish); curated source list; Finnish Cancer Registry and THL indicators; mentors (briefing Friday 20:00, limited Saturday cover).
- **Their warning:** "Data on cancer care in Finland is limited, and addressing this data gap is part of the challenge."
- **Judging:** actionability 30% · insight 25% · data quality and transparency 20% · execution 15% · clarity (understood in two minutes) 10%.
- **Prizes:** €1,000 / €750 / €250; possible follow-up project with a wellbeing services county.
- **Stack fit 3 · Feasibility 3 · Crowding: low.**

#### 1.15 Beyond the Clinic — Aalto University
- **Core problem:** depression can return after hospital TMS treatment; there is no good at-home maintenance. Build a sense → respond → learn loop.
- **Requirements:** none hard. "A laptop and a phone are enough."
- **Sensing ideas:** phone (voice, movement, sleep, routines), wearables (HRV, sleep). **Directions:** everyday companion, adaptive music/light/VR, game, smart home, social, clinician view.
- **Judging:** usefulness 25% · ease of use 25% · smart sensing 25% · creativity 25%.
- **Prizes:** €2,000 for the best team + lab visit + possible continued development with the researchers.
- **Stack fit 4 · Feasibility 4 · Crowding: low–medium.** One prize only; sensitive domain.

### AI Infrastructure Track by Verda

#### 1.16 Make Blueprints Talk — Stoa
- **Core problem:** general AI models fail on construction drawings. Answer natural-language questions about drawings and BIM models, and show where in the drawing the answer came from.
- **Resources:** dataset of real drawings and models — 0.5 GB preview, 10 GB full.
- **Judging:** accuracy 25% · how well reasoning is visualised for verification 25% · creativity 25% · low inference cost 25%.
- **Prizes:** €1,000 + work trial / €750 / €250.
- **Stack fit 3 · Feasibility 2 · Crowding: low.** Explicitly "one of the hardest unsolved problems".

### Data Track

#### 1.17 The Web Is Your Real-Time Database — Context.dev
- **Core problem:** software runs on stale data. Build a product that reacts to the live web.
- **Themes:** live economic indicators from prices or job listings; agents triggered by page or news changes; apps that brand themselves from an email; fact-checking with sources.
- **Resources:** 50,000 credits per team (code `JUNCTION26`), no card, 50 concurrent requests; search, scrape, crawl, structured extraction, brand data, enrichment, news, monitors with webhooks, batch, file parsing; SDKs and MCP.
- **Judging:** real-world impact 20% · creative use of live web data 20% · completeness of demo 20% · technical execution 20% · real-timeness 20%.
- **Prizes:** €2,000 + swag / €500 + swag / swag.
- **Stack fit 5 · Feasibility 5 · Crowding: high.**

#### 1.18 Rethinking Recruitment — City of Espoo
- **Core problem:** Espoo's recruitment and matchmaking events run on poor information: companies describe needs late and vaguely, candidates undersell themselves, and both sides increasingly exchange AI-generated text.
- **Pain points listed:** companies doubt a free public service; organisers can't assess applicants' real capabilities (especially tech); companies get swamped with irrelevant approaches; event platform matching is cumbersome and crashes at start; international hires add compliance, language and relocation complexity.
- **Constraints:** synthetic data only; minimise personal data; **no automated decision-making about individuals**; avoid bias; EU AI Act awareness.
- **Resources:** subject-matter experts, example scenarios; pointers to ESCO, job portals, event platforms.
- **Judging:** no weights — matching, discovery and communication quality, with privacy, transparency, fairness and inclusion.
- **Prizes:** €1,500 / €1,000 / €500; winner presents to Espoo's innovation leaders and a national network of cities.
- **Stack fit 4 · Feasibility 4 · Crowding: low–medium.**

#### 1.19 Wikipedia Through Time — MariaDB
- **Core problem:** Wikipedia search is keyword-based and its edit history is unexplored. Build the missing tool with MariaDB at the core.
- **Tracks:** RAG (vector search, cited answers); SVT (system-versioned tables: point-in-time views, edit wars, bias detection); both.
- **Resources:** MariaDB with vector search and SVT; small/medium/large datasets of **Finnish** Wikipedia on the history of Finland (multilingual embeddings recommended); three starter repos under github.com/MariaDB.
- **Judging:** creative use of MariaDB 20% · implementation and scalability 20% · usefulness 20% · design and demo 20% · originality 20% · bonus recognition for SVT or both.
- **Prizes:** €1,000 + €1,000 UpCloud credits + certification vouchers / €500 / €250.
- **Stack fit 4 · Feasibility 4 · Crowding: low–medium.**

---

## 2. Complete Tech Challenges Breakdown

All are entered with the same project as your main challenge. "Integration" = effort to qualify credibly, not just to tick the box.

| # | Challenge (partner) | What qualifies | Judging | Prize | Integration |
|---|---|---|---|---|---|
| 2.1 | **Best Use of Gemini API** (Google DeepMind) | Meaningful Gemini use; explain why Gemini matters. Credits for up to 400 teams via a form; 18+ only. | No weights; "beyond simply adding an LLM" | €4,000 + $1,000 GCP credits/member · €2,000 · €1,000 | Easy to add, hard to win (most-entered) |
| 2.2 | **Best Use of Gemma** (Google DeepMind) | Innovative use of Gemma open models; run via Featherless, Modal, Verda, AI Studio or Hugging Face | No weights | €1,000 × 3 teams, unranked | Easy |
| 2.3 | **Best Use of Nemotron** (NVIDIA) | Must use **Nemotron 3.5 Super VL** in the core function; written explanation in the submission form | Meaningful usage 25 · execution 25 · output quality 25 · creativity 25 | RTX 5080 × 2 teams | Easy (OpenAI-compatible API; ~40 req/min free tier — one key per teammate) |
| 2.4 | **Verda Compute Track** (Verda) | Use Verda for something a laptop can't do; document process; post a summary in their Discord | Ambition 25 · fit 25 · working prototype 25 · path to scale 25 | $10,000 credits + hoodies · $2,500 · $2,500 (credits, not cash) | Medium. Verda also hosts a Nemotron endpoint |
| 2.5 | **Best use of Modal** (Modal) | Modal does the heavy lifting: GPU inference, Sandboxes, fine-tuning, batch | Effective use 40 · technical ambition 25 · impact 20 · live deployed demo 15 | $2,000 cash + $3,000 credits (one team) | Medium. $100 credits per person |
| 2.6 | **Best Use of Aiven** (Aiven) | ≥1 Aiven service doing real work (PostgreSQL, Valkey, Kafka, ClickHouse, OpenSearch, Runtime) | Meaningful use 40 · implementation 30 · impact 20 · creativity 10 | €1,000 · €750 · €500 | Easy for a Postgres team. $50 credits |
| 2.7 | **Best Use of Codex** (OpenAI) | Meaningfully use Codex while building | No weights | $10,000 · $5,000 · $2,500 API credits | Easy. $100 credits per person |
| 2.8 | **Best Use of Context.dev** | ≥1 endpoint in the core flow, visibly driving the demo; note which endpoints and why | Creative use 40 · centrality of live web data 30 · execution 30 | €750 + swag · €250 + swag · swag | Easy. 50,000 credits |
| 2.9 | **Best agentic use of Oxylabs Web API** | Live `/search` or `/scrape` call at runtime; show source URLs | Use of API 30 · real-world value 25 · trust 20 · execution 15 · originality 10 | €1,000 Apple voucher + $500 credits/member | Easy API, but sign-up needs a **credit card** on a $500 plan with code `JUNCTION2026` — cancel afterwards |
| 2.10 | **Best Use of Cloudinary** | Use one of the tools at cld.media/hackathons as more than a CDN; submit cld.media/hackathon-survey | Innovation 30 · UX/design 30 · implementation 20 · impact 20 | $500 Amazon gift card **per member** (one team) | Easy if the project has images or video |
| 2.11 | **Best use of CRACI** | CI/CD must run on CRACI (`runs-on: craci`) | Technical depth 50 · creative use of SBOMs, AI fixes, provenance, traces, API 50 — "do not just add runs-on and stop there" | LEGO sets · Red Bull · Slush lunch; top 5 get build minutes + job interview | Trivial to qualify, real work to win. €1,000 platform credits |
| 2.12 | **Best use of Arduino UNO Q** | UNO Q + Modulino + on-device AI; publish on Arduino Project Hub | Hardware and Edge AI 50 · working prototype 30 · creativity 20 | UNO Q + Plug and Make kit per member | Hard (hardware, loan kit to book) |
| 2.13 | **Atech Real World Challenge** | Atech modules in a live hardware demo; repo or export; ~2-min video; Discord post | Real-world validation 25 · impact 25 · use of Atech 25 · demo and storytelling 25 | Pro Atech kit; runner-up kits | Medium (2–4 boards per team, first come first served; code `JUNCTION`) |
| 2.14 | **Best Use of ElevenLabs** (MLH) | Voice in the project | None published | Wireless earbuds | Easy |
| 2.15 | **Best Use of Tiger Data** (MLH) | Postgres time-series, continuous aggregates | None published | Stream Deck Mini | Easy |
| 2.16 | **Best Use of MongoDB Atlas** (MLH) | Build with Atlas | None published | M5Stack IoT kit | Easy |
| 2.17 | **Best Use of Vultr** (MLH) | Deploy on Vultr | None published | M5Stack mini monitor | Easy |
| 2.18 | **Best Use of Entire** (MLH) | Use Entire's Sessions, Graph, Brain, Trails in your workflow | None published | Mini projector | Medium (workflow change) |
| 2.19 | **Best Use of Solana** (MLH) | App relying on fast, cheap transactions | None published | Hardware wallets | Hard to make natural |

**Worth your time:** Gemini (cash, three places), Gemma (three unranked €1,000 awards), Aiven (cash, three places, Postgres), Nemotron (two winners), Modal (cash, if compute is central), Cloudinary (per-member prize, if you have media).
**Low value per hour:** the MLH gadgets, Solana, CRACI unless security is your theme.

---

## 3. Top 3 Recommended Tracks & Combo Strategies

Ranking logic: expected prize × how well the brief rewards your stack × how hard it is for a generic wrapper to compete. Team counts are unknown, so treat win probability as relative.

### #1 — Trusted Trade Agents (Valio Aimo) + Aiven + Nemotron + Gemini

**The combo:** Valio Aimo main challenge · Aiven (PostgreSQL + Valkey) · Nemotron · Gemini API · Codex as a free extra.

**Why it wins**
- **Largest software cash pool** (€7,000 across three places) and a weighted rubric you can build to line by line.
- **Exact stack fit:** a Node/TypeScript gateway, PostgreSQL audit log, Next.js or React Native approval screen, LLM tool use. The backend is already mocked for you.
- **Wrapper-proof:** the brief says "not a chatbot over the webshop". 50% of the score is guardrails, exceptions and openness — engineering, not prompting.
- **Natural double-dip:** run two different buyer agents (one on Nemotron, one on Gemini) against the same gateway. That is your proof of "open standard, not one platform's black box" for Valio, and it qualifies both tech challenges honestly.

**Concrete MVP — "Signed Offers" agent gateway**

```
Buyer side                               Seller side (your gateway)                Valio mock
┌───────────────────────────┐   MCP +   ┌─────────────────────────────────┐      ┌──────────┐
│ Agent A: Nemotron 3.5 VL  │  OpenAPI  │ search_products / get_offer     │ ───▶ │ catalog  │
│  reads event sheet photo  │ ────────▶ │ place_order / request_approval  │      │ prices   │
│ Agent B: Gemini           │           │ Policy engine (deterministic)   │      │ stock    │
│ Mandate: signed spend and │ ◀──────── │ Substitution ranker (good/      │      │ lead     │
│  substitution rules       │  signed   │  better/best)                   │      │ times    │
└───────────────────────────┘  offers   │ Audit log: Aiven PostgreSQL,    │      └──────────┘
        ▲                               │  hash-chained                   │
        │ approval request              └─────────────────────────────────┘
┌───────────────────────────┐
│ Chef's phone: approve /   │
│ pick substitute           │
└───────────────────────────┘
```

- **Trust protocol:** every price/stock answer is a signed, time-limited offer (JWS, public key published). An order must cite a valid offer, which gives "fixed price, inquiry → commitment" for free and answers their trust-protocol wish.
- **Mandates:** the buyer organisation signs what its agent may do (spend limit, categories, allergen rules, substitution policy). The gateway enforces it in code, never in a prompt.
- **Substitutions:** attribute-based ranking inside Valio's assortment (allergens, pack size, lead time, sustainability label); the LLM only explains the trade-off.
- **Audit:** append-only, hash-chained log with a buyer view and a Valio view.

**Killer demo (3 minutes)**
1. Their own example: "1,000 L lactose-free milk by Monday" → structured offers → auto-ordered inside the mandate.
2. Last-minute event: photo of a booking sheet for 120 guests tomorrow → Nemotron extracts needs → partial availability → good/better/best substitutes.
3. One substitute touches an allergen rule → the chef's phone buzzes → approve.
4. Replay an expired or tampered offer → rejected.
5. Swap the buyer agent to Gemini live → same gateway, same result.
6. Open the audit trail from both sides.

**Criteria map:** steps 1–3 = end-to-end demo (30%) and buyer precision (20%); mandates + step 3 + audit = autonomy and controls (20%); steps 2–4 = exceptions (15%); MCP + OpenAPI + signed offers + step 5 = openness (15%).

**Risks:** popular challenge; undisclosed API rate limits; no recipe data is provided, so recipe scenarios need your own small recipe set. Details in `valio-mock-api-notes.md`.

### #2 — Break the Agent (AfterQuery) + Modal + Gemma + Verda

**The combo:** AfterQuery main challenge · Modal (Sandboxes, fan-out rollouts, fine-tuning) · Gemma (the small model you train) · Verda (large rollout batch; it is one of their own listed examples).

**Why it wins**
- **Judged by rerunning your code, not by pitch.** A rigorous team beats a charismatic one.
- **High barrier for wrapper teams** — there is nothing to wrap. Expect a small field.
- **€3,000 + a work trial**, plus the tiebreaker (small-model improvement) is the same work that qualifies Modal ($2,000 cash), Gemma (€1,000) and Verda.
- **Stack fit:** a Python MCP server and LLM agent loops. No ML research needed for the core; fine-tuning is the stretch.

**Concrete MVP — "Virasto", a bureaucracy simulator**
- **World:** four offices, ~15 form types, a dependency graph generated from a seed; documents expire; every action costs simulated days; a mid-episode rule change is posted on a bulletin the agent can read.
- **Goal:** get one permit approved with the correct fee before the deadline.
- **Agent tools (over MCP):** read bulletin, list forms, read form guide, submit form, check status, book appointment, wait.
- **Reward:** computed from server state only. Zero unless approved; scaled by correctness and days used. Do-nothing and stop-early score ~0; submissions themselves earn nothing.
- **Reference run:** a deterministic planner that reads the same guides (dependency ordering + expiry-aware scheduling). Reproducible by seed.
- **Experiments:** frontier agent × many seeds; failure taxonomy (missed rule change, expired document, resubmission loops).
- **Stretch:** fine-tune Gemma on planner trajectories with Modal; show the before/after score.

```
Harbor + OpenCode ──MCP──▶ Virasto env (Python) ──▶ state machine + seeded generator
                                   │
                                   ├─▶ scorer (state-based)        one command: make eval
                                   └─▶ Modal: N parallel rollouts ─▶ trajectories ─▶ Gemma fine-tune
```

**Killer demo (10-minute slot):** live episode where the agent visibly ignores the rule-change bulletin and lets a document expire → the planner solves the same seed → score table across seeds with baselines at zero → invite judges to try an exploit → Gemma before/after chart.

**Criteria map:** planner vs. agent = the gap (30); failure taxonomy with tools available = meaningful difficulty (30); state-based reward + zero baselines = reward integrity (25); `make eval` = craft (15).

**Risks:** a frontier agent may simply solve it. Tune difficulty Friday night with the provided credits, and keep it fair — tricks score zero on "meaningful difficulty".

### #3 — Personal Economic Trainer (S-Pankki) + Gemma + Verda + Aiven/Tiger Data

**The combo:** S-Pankki main challenge · Gemma served on Verda (bank data stays in Europe — Verda lists this exact example) · Aiven PostgreSQL or Tiger Data for transactions.

**Why it wins**
- **Best stack fit at the event:** 40% of the score is mobile UX clarity and fit with S-mobiili. A real React Native app beats the web chat pages most teams will show.
- **Clear pedagogy to build to:** the three baskets are spelled out; teams that ignore them lose 20% outright.
- **Hidden asset:** the dataset includes mortgage application histories and outcomes linked to customers. Few teams will read past the transactions file.
- **Wrapper-proof if numbers never come from the LLM.**

**Concrete MVP — "Three Jars"**
- **Data:** load the 346 MB CSV into PostgreSQL; nightly-style pre-aggregates per customer.
- **Basket engine (deterministic):** recurrence detection (merchant, interval, amount stability) + MCC code → mandatory regular / mandatory irregular / everyday.
- **Chat:** the model picks typed query tools; every figure comes from SQL and has a "how was this calculated?" drill-down (the MyData angle).
- **Safe to spend:** balance − upcoming regular bills before payday − a reserve sized from the customer's own irregular history.
- **What-if:** "dining out −20%" recomputed live.
- **Benchmarks:** peers by age band and postal code from the customers file; Statistics Finland as an extra.
- **Stretch:** "mortgage readiness" from the mortgage dataset.

```
React Native (Expo) ──▶ Node API ──▶ tool router ──▶ PostgreSQL (transactions, aggregates)
                             │
                             └──▶ Gemma on Verda inference (EU) — language only, no arithmetic
```

**Killer demo:** pick a synthetic customer → "How much did I spend on taxis last month?" with tappable breakdown → "What kind of spender am I?" fills three jars → "What's safe to spend this week?" with the reasoning → drag the dining-out slider → one plain-language lesson card.

**Criteria map:** jars = financial literacy (20%); tools-not-guessing + what-if = originality of AI (20%); native app = mobile UX (20%); deterministic engine = feasibility (20%); embeddable screens + EU-hosted model = S-mobiili integration (20%).

**Risks:** likely crowded; prize is Airbnb gift cards, not cash.

### Honourable mentions
- **Tieto — Earned Trust in AI Code:** lowest build effort (concept 30% + measurement 25%), pairs with CRACI and Codex. Sample code is C#.
- **Intel Physical AI:** biggest cash pool (€10,000) and at most 25 teams, but it is robotics and ML outside your stack, and stations may already be taken.
- **Spread:** objective leaderboard with TypeScript/Python kits — a good second project for one or two people, since the bot runs itself in the final.
- **Beyond the Clinic:** strong React Native fit (phone sensing), probably a small field, but a single €2,000 prize.

### Generic traps to avoid
- **Internet Butler (Exa)** and **Context.dev main:** the most open briefs, so the most "search + LLM" wrappers.
- **Gemini as your only angle:** most-entered tech challenge; treat it as an add-on.
- **Cala:** fine product brief, but the prize is travel, not cash.

### Before you commit
1. Open the Valio resource portal and read the mock API docs.
2. Ask organisers whether one team may submit to two main challenges.
3. Fill in the Gemini credits form and redeem Modal, Verda, Aiven and Exa credits tonight.
