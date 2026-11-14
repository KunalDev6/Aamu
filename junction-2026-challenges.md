# Junction 2026 — Challenges, Tech Challenges & Developer Tools

Condensed notes from hackjunction.app (event 45, "Junction 2026: European Tech Renaissance"), read 2026-11-13.
Source pages: `/participate/45/challenges` (Main + Tech tabs) and `/participate/45/hackerpacks`.
These are summaries, not the full text — open the platform for exact wording before submitting.

**Rule of thumb:** one main challenge + any number of tech challenges with the same project
(confirm the main-challenge limit with organisers).

---

## Main challenges (19)

### Agentic AI Track (6)

#### Decode the Noise — Hostinger
- **Ask:** AI tool that detects propaganda, bot amplification or bad-actor behaviour in text, social content or web-traffic patterns. Form is open: API, dashboard, explainable classifier, monitoring service for site owners.
- **Hard requirement:** deployed live on Hostinger infrastructure with a public URL by the end.
- **Judged on:** strength and honesty of detection logic, incl. false-positive handling > polished UI.
- **Prizes:** 1st €2,000 · 2nd €1,000 · all three winners get 1 yr Hostinger hosting + domain, swag, social spotlight.

#### Earned Trust in AI Code — Tieto
- **Ask:** concept + reference implementation for AI code review that keeps up with AI-written code while a named human stays accountable. Question whether line-by-line review is still right.
- **Expected:** principles balancing risk, hallucination, transparency, confidence, quality; one sample agent-written change with requirement ID; show what the AI found, what it refused to decide and why; how evidence lets a human accept without a full read; failure modes; decision log. Synthetic/cleared data only.
- **Deliverables:** concept card, live walkthrough, lessons log, demo video/presentation.
- **Out of scope:** finished product, model training, vendor selection.
- **Prizes:** €2,000 / €1,000 / €500.

#### Spread — Bahn Express
- **Ask:** run a simulated car-transport company for a week in Finland. Quote dealers (competing with others), post winning drives as gigs to drivers and set fees. Score = gross margin; ≥90% of cars on time.
- **Start:** spread.bahnexpress.com/join, event code `spread-kmu9z6`. Handbook, API, TS/Python kits, leaderboard there. Agent docs: spread.bahnexpress.com/llms.txt
- **Format:** ranking rounds from Fri 19:30; final Sun 08:00 (registration closes 07:30), one secret week, ~34 min. Top 10 by margin pitch (5–10 slides or short video); jury judges elegance, clarity, creativity, robustness — margin no longer counts after top 10. Bahn's own bot plays every round.
- **Prizes:** €2,000 / €1,000 / €500.

#### Break the Agent — AfterQuery
- **Ask:** build an RL environment (game, sim, software task, real process…) with a clear goal, actions and a checkable reward. Run a frontier agent, compare with a stronger reproducible reference run, show where/why it fails. Judges will try reward hacking. Harness + model credits provided.
- **Stretch:** train a smaller model on environment experience and show improvement (also the tiebreaker).
- **Rubric:** Gap 30 · Meaningful difficulty 30 · Reward integrity 25 · Craft 15 (one-command eval from README).
- **Judging run:** 10-min demo; judges rerun reference + 3 agent runs + do-nothing + stop-early baselines; 15 min exploit hunting.
- **Prizes:** €3,000 + work trial + merch / €1,500 + merch / €500.

#### Trusted Trade Agents — Valio Aimo
- **Context:** foodservice wholesaler, 20k+ professional kitchens, 25k products, 700 suppliers. Planning a B2B marketplace; for Junction they mock today's webshop/backend.
- **Core (required):** (1) product, price & availability lookup for external agents; (2) request → place order at fixed prices (no negotiation); (3) permissions & human-approval management.
- **Optional:** delivery-time & sustainability comparison (category carbon ranges = stretch); substitution/exception handling (not core); traceability/explainability log.
- **Example:** hotel chain's agent: "1,000 L lactose-free milk by Monday" → structured results → order within authority or escalate.
- **Emphasis:** open, verifiable standards, not one platform's black box; not "chatbot over webshop".
- **Judging (from the detail page, `/challenges/327`):**
  - Working end-to-end demo 30% — full request → lookup → order/approval flow in the mocked environment
  - Solving the problem and user need 20% — how precisely the agent matches what the buyer asked, least manual correction
  - Autonomy and controls 20% — guardrails, what needs human sign-off, logged and auditable
  - Robustness to exceptions 15% — partial availability, substitutions, delivery constraints
  - Openness and path to production 15% — open documented standards, visible assumptions, justified choices, next steps
- **Problems they'd love tackled:** trust protocol (agent can trust stock/price/origin claims without manual check) · guardrails model (spend threshold, substitutions outside preferences) · response logic (partial availability, "good-better-best" substitution ranking within their assortment) · audit trail readable by both buyer and Valio Aimo.
- **Their example scenarios:** need → recipe → order (menu around a seasonal ingredient, work out what's missing from stock) · last-minute event (substitute via recipe logic, not SKU swap) · supplier stock-out mid-week · Valio's own proactive selling agent · allergen-safe substitution for school/hospital kitchens · standing-order drift detection.
- **Resources:** synthetic catalog, simulated suppliers, mock APIs (prices, availability behaviour, lead times, sustainability labels) at junction26.valioaimo.fi — portal password and API key are on the challenge detail page; webshop test accounts shared later. Everything is synthetic.
- **Preferred tech:** agentic/tool-use frameworks, open data/interop standards, recommendation logic, optional verifiable-credential / trust layer. Agentic payment standards (x402, Nevermined) relevant but not required.
- **Scope note:** they mock a structured data/API interface; whether production becomes an API, MCP or their own service agent is out of scope.
- **Mentors:** Hanna Forsström, Pirjo Kaartinen (marketplace/commercial) · Minni Ruhtinas (online sales) · Tommi Nurmi-Aro, Ville Takanen, Riku Tapper (IT/integrations, data governance).
- **Prizes:** €4,000 / €2,000 / €1,000.

#### The Internet Butler — Exa
- **Ask:** personal agent that takes tedious life tasks off people's hands (rent increase legality, missed benefits, special occasions, travel disruption…), gets as close to done as possible, leaves final approval to the user. Demo on a real case.
- **Judged on:** Exa use for info not in training data, usefulness to a specific group, clear sources, originality, works on judges' live queries.
- **Prizes:** 1st $2,500 + $5k Exa credits + hoodies + TRMNL · 2nd $1,500 + $3k credits + hoodies + macropad · 3rd $500 + $1k credits + hoodies.

### Hardware Track by Arduino (5)

#### The Green European Renaissance — Arduino
- **Ask:** Edge AI on Arduino UNO Q for local, environmental problems — a greener, tech-forward, human Europe not dependent on big US/Asian platforms.
- **Prizes:** Ventuno Q per member / UNO Q 4G + Plug and Make kit per member / Plug and Make kit per member.

#### AI Glasses for Everyone, Everyday — Meta
- **Ask:** everyday use case where first-person view enables new/better interactions (not mirroring a phone). Display and audio-first equal; web apps or Device Access Toolkit mobile integrations.
- **Judged on:** creativity, execution, real-world impact, inclusive design for all abilities; clear problem/audience, path to pilot; prototype handles permissions, errors, performance, connectivity, device state; consent & safe data.
- **Deliver:** functional prototype + deck.
- **Prize:** Ray-Ban Meta glasses per winning member.

#### Physical AI Challenge — Ignite Next × Intel
- **Setup per team:** SO-101 arm + leader arm, top camera, inspection camera, Duplo bricks (you mark defects).
- **Ask:** teleop demos → fine-tune a VLA policy in Physical AI Studio (cloud GPUs); train Anomalib defect model; combine so the arm picks, inspects and sorts good/defective autonomously, optimised with OpenVINO on Intel Core Ultra 3 laptop (CPU/GPU/NPU). Extensions: speed, messier piles, new defects.
- **Prizes:** €5,000 / €3,000 / €2,000.

#### Robot Teleoperation — Rokoko
- **Ask:** use Rokoko mocap suits/gloves to control robot hands, arms or humanoids (real or simulated). Anything impressive, useful or surprising.
- **Prizes:** Smartgloves II + SDK licence + blog feature (~€4,990) / Smartsuit Pro II (~€2,295) / Smartgloves I + merch (~€1,095).

#### Aaltonomous Humanoid — Aalto University
- **Ask:** make Unitree G1 "Väiski" sort 3–5 printed objects (cubes/cylinders/prisms, ~4.5 cm, red/yellow/blue) into 3 unmarked orange boxes (left/centre/right) within 2 min, autonomously. Legs/waist fixed; two 7-DoF arms, Dex3 hands.
- **Modes:** fixed (red→left, yellow→centre, blue→right) and instruction-based (unseen phrasings). Stretch: through holes in a lid.
- **I/O:** head RGB-D + wrist cams + joint states + instruction in; joint targets out at 30 Hz.
- **Process:** Isaac Sim of the exact scene, GPU from Verda; real-robot datasets published on Hugging Face during event (links in Discord); submit a Docker policy server; sim eval on unseen scene → top ~5 run on real robot Sunday.
- **Prizes:** €2,000 + Aalto robotics lab visit; top ~5 run live on the G1.

### FinTech Track (2)

#### Make Unicorns Real — Cala
- **Ask:** product on Cala's structured, sourced data (companies, people, funding rounds, investors + their connections) solving one real need for founders and/or investors. Usable right after — Slush starts the next day.
- **Judging (25% each):** real need · execution · originality · Cala is core.
- **Prizes:** each winner becomes a "Cala Comet" (one hackathon/month for 3 months, travel covered, ~€5k for team of 4) + €1,000 Cala credits + merch; runner-up €500 credits + merch.

#### Personal Economic Trainer — S-Pankki (S-Bank)
- **Ask:** AI experience to chat with your own money using a large synthetic transaction dataset modelled on S-Bank data. From "taxi spend last month?" to "what kind of spender am I?", "safe to spend this week?", "savings if dining out −20%?"
- **Valued:** pedagogical angle with three baskets — mandatory regular (rent), mandatory irregular (broken washer), everyday leakage (coffees); MyData spirit (free exploration, not fixed charts); open-data benchmarks (e.g. Statistics Finland).
- **Format:** mobile app or embeddable web app.
- **Prizes:** €2,000 / €1,000 / €500 Airbnb gift cards.

### Healthcare Track (2)

#### Equal Care Across Finland — AstraZeneca
- **Ask:** AI system for equitable cancer care across Finland: identify access/outcome gaps, locate where in the pathway (detection, referral, diagnosis, treatment start), and — most important — recommend concrete, evidence-based actions.
- **Min. requirements:** reliable public data and/or mentor insights with sources for every claim; cover ≥1 indicator linked to Goal 3 of the national cancer strategy; actionable proposals; working demo (slides alone insufficient).
- **Note:** key insights at AstraZeneca stand Friday 20:00.
- **Prizes:** €1,000 / €750 / €250.

#### Beyond the Clinic — Aalto University
- **Ask:** help people stay well at home after TMS depression treatment (relapse risk). Sense mental state at home, respond with something helpful (natural stimuli, phone, music, games, light, AI), ideally closed-loop and personalised.
- **Prizes:** TBA.

### AI Infrastructure Track by Verda (1)

#### Make Blueprints Talk — Stoa
- **Ask:** answer natural-language questions about construction drawings / BIM accurately and verifiably (show where in the drawing). Dataset of real drawings in many formats/languages + example questions.
- **Wanted:** approaches next year's frontier models won't obsolete — hybrids of frontier models, CV, 3D, geometry, small fine-tuned models.
- **Prizes:** €1,000 + work trial / €750 / €250.

### Data Track (3)

#### The Web Is Your Real-Time Database — Context.dev
- **Ask:** product that turns live web data into decisions, actions or experiences. Examples: GPU rental price comparison, founder activity leaderboard, CVE monitor, personalised onboarding from company data.
- **Prizes:** €2,000 + swag / €500 + swag / swag.

#### Rethinking Recruitment — City of Espoo
- **Ask:** how Espoo's recruitment/matchmaking events can help companies and talent find each other when AI-generated applications and AI-assisted hiring are common.
- **Prizes:** €1,500 / €1,000 / €500.

#### Wikipedia Through Time — MariaDB
- **Ask:** a missing/underused Wikipedia tool with MariaDB at the core.
- **Tracks:** RAG (vector search, source-cited answers — recommended) · SVT (system-versioned tables: article as of a date, edit wars, rewritten history — advanced) · both (very advanced, extra recognition).
- **Judged on:** creative MariaDB RAG/SVT use, execution & scalability on provided datasets, usefulness to readers/editors, design & demo.
- **Prizes:** €1,000 + €1,000 UpCloud credits + MariaDB certification vouchers per member / €500 / €250; blog credit on mariadb.org.

---

## Tech challenges (19) — stack these on top of your main challenge

> Fuller profiles with judging weights are in `junction-2026-strategy.md`.

| Sponsor | Challenge | Requirement (short) | Prize |
|---|---|---|---|
| Verda | Best Use of Verda | Use Verda (inference API, GPU/instant clusters, CPU, autoscaling containers, batch jobs) for something a laptop can't do; document process; post summary in Discord. Bonus: scaling story. No crypto mining. | $10k credits + hoodies / $2.5k / $2.5k |
| MLH | Best Use of MongoDB Atlas | Build with Atlas (free tier / $50 student credit) | M5Stack IoT kit each |
| MLH | Best Use of Vultr | Deploy on Vultr (free credits, cloud GPUs) | M5Stack mini monitor |
| MLH | Best Use of Tiger Data | Postgres + time-series, continuous aggregates, compression | Stream Deck Mini |
| MLH | Best Use of Solana | Apps relying on fast, cheap transactions | Hardware wallets each |
| MLH | Best Use of Entire | Use Entire's Sessions, Graph, Brain, Trails; show token efficiency & clean history | Mini projector |
| MLH | Best Use of ElevenLabs | Voice/audio experiences | Wireless earbuds |
| OpenAI | Best Use of Codex | Meaningfully use Codex while building | $10k / $5k / $2.5k API credits |
| Google DeepMind | Best Use of Gemini API | Open innovation; show why Gemini matters | €4,000 + $1k GCP credits/member / €2,000 / €1,000 |
| Google DeepMind | Best Use of Gemma | Innovative, impactful use of Gemma open models | €1,000 × 3 teams (unranked) |
| NVIDIA | Best Use of Nemotron | Nemotron 3.5 Super VL central to core function; text explanation in submission form. Free API at integrate.api.nvidia.com/v1 (~40 req/min/key; OpenRouter free tier 20 rpm / 50 per day) | RTX 5080 × 2 teams |
| Arduino | Best use of Arduino UNO Q | UNO Q + Modulino sensors, on-device AI, working physical prototype | UNO Q + Plug and Make kit each |
| Context.dev | Fully Structured Web | ≥1 Context.dev endpoint in core flow, visibly driving the demo; repo + note on endpoints | €750 + swag / €250 + swag / swag |
| Aiven | Best Use of Aiven | ≥1 Aiven service meaningfully used (Runtime, PostgreSQL, Valkey, Kafka, ClickHouse, OpenSearch) | €1,000 / €750 / €500 |
| CRACI | Best use of CRACI | CI/CD runs on CRACI (`runs-on: craci`); bonus for self-defending software ideas | LEGO set each / Red Bull 24-pack each / CRACI × OpenAI lunch at Slush |
| Cloudinary | Best Use of Cloudinary | Use one of the tools at cld.media/hackathons; submit cld.media/hackathon-survey | $500 Amazon gift card per member |
| Modal | Best use of Modal | Modal does the heavy lifting (GPU serving, Sandboxes, fine-tuning, batch) | $2,000 cash + $3,000 credits |
| Oxylabs | Agentic use of Web API | Live `/search` or `/scrape` call at runtime + show source URLs; note endpoints used | €1,000 Apple voucher + $500 credits/member |
| Atech | Atech Real World Challenge | Physical device with Atech modules for a real person; live hardware demo, repo/export, ~2-min video, Discord post | Pro Atech kit; runner-ups kits + swag + Copenhagen visit |

---

## Developer Tools and Assets (Hackerpack)

| Provider | What you get | How / notes |
|---|---|---|
| Verda | €200 credits (GPU compute + inference API) | Sign up to Verda Console → claim via form → share with team per docs |
| OpenAI | $100 Codex credits per participant | Codex + OpenAI dev tools |
| Anthropic | $20 Claude API credits per participant | — |
| Google DeepMind | Gemini API credits (eligible participants) | — |
| MariaDB | Database; published/credited on mariadb.org | Show at booth or mention in submission |
| Aiven | $50 free credits | Docs + runtime templates; mentors on site all days |
| Arduino | UNO Q kits on loan (2 GB RAM, 16 GB eMMC, USB-C cable/hub, 45 W PSU, USB camera, Modulino Buzzer/Knob/Thermo) | Arduino booth / Hardware Lab, 5th floor; booking at 2026.hackjunction.com/hardware; install Arduino App Lab |
| CRACI | €1,000 platform credits per team, CI/CD minutes, CycloneDX SBOMs, AI vuln fixes, API | Invite code from #craci Discord or booth → platform.craci.com → connect GitHub App → `runs-on: craci`; API at api.craci.com; docs.craci.com (incl. agent skills) |
| Cloudinary | Free tier: image/video transform, optimise, deliver, AI media | cld.media/hackathons |
| Modal | $100 per participant (T4 → B300 GPUs) | `pip install modal`; Sandboxes, web endpoints, Volumes, Modal Dojo (fine-tune/RL); Junction starter kit; kick-off workshop at booth |
| Oxylabs | Web API (`/search`, `/scrape`; Markdown/HTML/JSON/screenshots; MCP) | Code `JUNCTION2026` = first month free on $500 Flexible plan — needs a credit card, **cancel after** |
| Context.dev | 50,000 API credits per team, no expiry, no card | SDKs TS/Python/Ruby/Go + MCP; 50 concurrent requests |
| IronShard | S3-compatible + MCP object storage; challenge datasets preloaded read-only; zero-copy forks | Store large artifacts (>100 MiB) for judges |
| Junction | Hardware Lab devices | 5th floor |
| Wendy | Deploy to Jetson / Pi / ESP32 / Arduino with `wendy run`; simulator | Open source; Python, Swift, Rust, ROS |
| Qualia | Robot-learning dataset QA/curation (SO-101, Rokoko data) → export for LeRobot / pi0.5 | — |
| Featherless | $50 API credits (open-weight models) via Junction coupon; bare-metal GPU credits for selected teams | — |
| Scailab | Scaipipe: annotate, synthetic data from 3D scenes, train CV models in browser; MCP server | Early-access platform |
| Exa | $50 credits per participant; Search (fast/balanced/deep), Contents, Websets, Monitors, MCP, SDKs | demos.exa.ai for examples |

---

## Quick reference: biggest prizes

- **Main:** Intel Physical AI €5k · Valio Aimo €4k · AfterQuery €3k + work trial · Cala ~€5k travel value · Exa $2.5k + credits
- **Stackable:** Verda $10k credits · Codex $10k credits · Gemini €4k · Modal $2k + $3k credits · Aiven €1k · Gemma €1k × 3
