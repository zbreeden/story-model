# The Story — lightweight narrative engine + docs

Below is a complete, copy‑pasteable scaffold for your `The Story` repo. Create the folders shown, drop the files in, and it will run on GitHub Pages with **no build step** (vanilla HTML/JS/CSS). It includes: a minimal scene/choice engine, README in-page rendering, and GTM/GA4 hooks that reuse your `track()` helper.

---

## Repo layout

```
TheStory/
├── index.html
├── README.md
├── styles/
│   └── site.css
├── scripts/
│   ├── tracker.js
│   └── story.js
├── content/
│   └── story.json
└── seeds/
    ├── glossary.yml
    └── tags.yml
```

---

## `index.html`

````html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FourTwenty Analytics — The Story</title>
  <meta name="description" content="A lightweight, file-based narrative engine (scenes + choices) with analytics hooks." />
  <meta name="color-scheme" content="light dark" />

  <!-- Google Tag Manager (GTM) -->
  <script>
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
      var f=d.getElementsByTagName(s)[0], j=d.createElement(s), dl=l!='dataLayer'?'&l='+l:'';
      j.async=true; j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
      f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-WVC4SNLB'); /* ← replace if needed */
  </script>
  <!-- End GTM -->

  <link rel="stylesheet" href="styles/site.css" />
</head>
<body>
  <!-- GTM (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WVC4SNLB" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

  <header class="wrap header">
    <div class="brand">
      <a href="https://zbreeden.github.io/FourTwentyAnalytics/" class="crumb">⟵ Constellation</a>
      <h1>📖 The Story</h1>
      <p class="tagline">Narrative lives here. The Player handles sims; The Story handles scenes & choices.</p>
    </div>
  </header>

  <main class="wrap grid">
    <section class="card" id="player">
      <h2>Scene</h2>
      <div id="scene-text" class="prose"></div>
      <div id="choices" class="choices"></div>
      <div class="toolbar">
        <button id="back-btn" title="Go to previous scene">◀ Back</button>
        <button id="restart-btn" title="Restart story">⟲ Restart</button>
      </div>
    </section>

    <section class="card" id="readme-card">
      <h2>Repo Docs</h2>
      <p><a id="open-readme" href="README.md" target="_blank" rel="noopener">Open README on GitHub</a></p>
      <article id="readme-panel" class="prose muted"><em>Loading README…</em></article>
    </section>
  </main>

  <footer class="wrap footer">
    <small>© FourTwenty Analytics · Built as a file‑based engine (no build). · <a href="#" id="emit-debug">Emit debug event</a></small>
  </footer>

  <!-- App scripts -->
  <script type="module" src="scripts/story.js"></script>
  <script>
    // Lightweight README loader (raw file → plain text). Keeps dependencies zero.
    (function(){
      const panel = document.getElementById('readme-panel');
      const link  = document.getElementById('open-readme');
      if (!panel || !link) return;

      const raw = (function(resolve){
        try {
          const url = new URL(window.location.href);
          // Works for GitHub Pages or local file serving
          const base = url.origin + url.pathname.replace(/\/[^/]*$/, '/');
          return base + 'README.md';
        } catch(e) { return 'README.md'; }
      })();

      fetch(raw).then(r=>r.text()).then(txt=>{
        // Minimal markdown→HTML: preserve code fences & headings (non-perfect by design)
        const html = txt
          .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
          .replace(/^# (.*)$/gm, '<h1>$1</h1>')
          .replace(/^## (.*)$/gm, '<h2>$1</h2>')
          .replace(/^### (.*)$/gm, '<h3>$1</h3>')
          .replace(/^\- (.*)$/gm, '<li>$1</li>')
          .replace(/\n<li>/g, '<ul><li>').replace(/<\/li>\n(?!<li>)/g,'</li></ul>')
          .replace(/\n\n/g, '<br/><br/>');
        panel.innerHTML = html;
      }).catch(()=>{ panel.innerHTML = '<em>Could not load README in-page. Use the link above.</em>'; });
    })();
  </script>
</body>
</html>
````

---

## `scripts/tracker.js`

```js
// Reuse across modules to standardize analytics
// Requires GTM to be present on the page.
window.dataLayer = window.dataLayer || [];
export const track = (event, params = {}) => {
  window.dataLayer.push({ event, ts: Date.now(), ...params });
};
```

---

## `scripts/story.js`

```js
import { track } from './tracker.js';

const STORY_PATH = './content/story.json';

const elText    = document.getElementById('scene-text');
const elChoices = document.getElementById('choices');
const btnBack   = document.getElementById('back-btn');
const btnReset  = document.getElementById('restart-btn');
const emitDebug = document.getElementById('emit-debug');

let story = null;           // loaded JSON
let current = null;         // current scene id
const historyStack = [];    // visited scene ids

async function loadStory() {
  const res = await fetch(STORY_PATH, { cache: 'no-store' });
  story = await res.json();
  current = story.start || Object.keys(story.scenes)[0];
  historyStack.length = 0;
  render();
  track('story_init', { start: current });
}

function render() {
  if (!story) return;
  const scene = story.scenes[current];
  if (!scene) { elText.textContent = 'Unknown scene: ' + current; elChoices.innerHTML=''; return; }

  // Render text (supports minimal markdown: **bold**, *italics*)
  const md = (t) => t
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
  elText.innerHTML = `<h3>${scene.title || ''}</h3><p>${md(scene.text)}</p>`;

  // Render choices
  elChoices.innerHTML = '';
  (scene.choices || []).forEach((c, idx) => {
    const b = document.createElement('button');
    b.className = 'choice';
    b.textContent = c.label;
    b.addEventListener('click', () => {
      historyStack.push(current);
      current = c.next;
      render();
      track('story_choice', {
        from: historyStack[historyStack.length-1],
        to: current,
        label: c.label,
        idx
      });
    });
    elChoices.appendChild(b);
  });

  track('scene_view', { scene: current, choices: (scene.choices||[]).length });
}

btnBack.addEventListener('click', () => {
  if (!historyStack.length) return;
  const prev = historyStack.pop();
  const from = current;
  current = prev;
  render();
  track('story_back', { from, to: prev });
});

btnReset.addEventListener('click', () => {
  const first = story?.start || 'start';
  const from = current;
  historyStack.length = 0;
  current = first;
  render();
  track('story_restart', { from, to: first });
});

emitDebug?.addEventListener('click', (e) => {
  e.preventDefault();
  track('debug_emit', { where: 'the_story_footer' });
});

// Kick it off
loadStory().catch(err => {
  elText.textContent = 'Failed to load story.json';
  console.error(err);
});
```

---

## `styles/site.css`

```css
:root { --fg:#111; --bg:#fafafa; --muted:#6b7280; --card:#ffffff; --border:#e5e7eb; }
@media (prefers-color-scheme: dark) {
  :root { --fg:#e5e7eb; --bg:#0b0f14; --muted:#9aa4b2; --card:#0f1620; --border:#1f2937; }
}
* { box-sizing: border-box; }
html, body { margin:0; padding:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--fg); background:var(--bg); }
.wrap { max-width: 1100px; margin: 0 auto; padding: 1.25rem; }
.header { display:flex; align-items:flex-start; gap:1rem; }
.brand h1 { margin:0; font-size: 1.6rem; }
.tagline { margin:.25rem 0 0; color: var(--muted); }
.grid { display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.card { background: var(--card); border:1px solid var(--border); border-radius: 1rem; padding: 1rem; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
.footer { color: var(--muted); }
.prose { line-height: 1.6; }
.muted { color: var(--muted); }
.choices { display:flex; flex-wrap: wrap; gap:.5rem; margin-top:.75rem; }
.choice, .toolbar button { border:1px solid var(--border); background:transparent; padding:.5rem .75rem; border-radius:.75rem; cursor:pointer; }
.choice:hover, .toolbar button:hover { filter: brightness(1.1); }
.toolbar { display:flex; gap:.5rem; margin-top: .75rem; }
.crumb { color: inherit; text-decoration: none; opacity: .9; }
.crumb:hover { text-decoration: underline; }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
```

---

## `content/story.json` (starter narrative based on your worldbuilding)

```json
{
  "meta": {
    "title": "The Story",
    "version": "0.1",
    "tags": ["chloe", "carapace_glyphs", "triple_system", "memory_pulses"]
  },
  "start": "orbit_insertion",
  "scenes": {
    "orbit_insertion": {
      "title": "High Above the CO₂ World",
      "text": "The transport refuses to land. *Protocol* says the atmosphere is too dense, the signals too strange. Chloe, your suit intelligence, whispers: ‘We can **listen** first. Or… we can **descend**.’",
      "choices": [
        { "label": "Request orbital survey", "next": "orbital_survey" },
        { "label": "Initiate descent anyway",   "next": "hot_descent" },
        { "label": "Just listen",               "next": "planet_listen" }
      ]
    },
    "orbital_survey": {
      "title": "Sweep of the Night Side",
      "text": "Thermal scans sketch **buried patterns**—like orchards of stone arranged in spirals. Chloe: ‘Regular intervals. Could be *carapace fields*… or **archives**.’",
      "choices": [
        { "label": "Mark the spirals and descend", "next": "hot_descent" },
        { "label": "Keep mapping",                  "next": "wide_mapping" }
      ]
    },
    "wide_mapping": {
      "title": "Wide Mapping",
      "text": "A triple star dawn washes over plains of glass. Under the crust: repeating **pulses**. ‘Like rings on a tree—only *sung* into the rock,’ Chloe says.",
      "choices": [
        { "label": "Pin a landing site near pulses", "next": "hot_descent" },
        { "label": "Listen deeper",                 "next": "planet_listen" }
      ]
    },
    "planet_listen": {
      "title": "The Planet Breathes",
      "text": "You let engines idle. The hull resonates. A slow **heart rhythm**—echoes nested in echoes. Chloe: ‘They *recorded* time in carapace, then laid their dead in spirals to **amplify memory**.’",
      "choices": [
        { "label": "Promise to leave it intact", "next": "vow_to_preserve" },
        { "label": "Consider mining the archive", "next": "mine_tension" }
      ]
    },
    "hot_descent": {
      "title": "Hot Descent",
      "text": "You separate from the transport. The suit seals. Chloe floods your feed with glide paths. ‘We’ll land near those spirals. Minimal thrust; we *walk* the last mile.’",
      "choices": [
        { "label": "Land near the spirals", "next": "spiral_field" }
      ]
    },
    "spiral_field": {
      "title": "Spiral Field",
      "text": "Stone hums under your boots. A **carapace shard** protrudes—etched with bands like a record. Chloe: ‘We can read it. Carefully.’",
      "choices": [
        { "label": "Let Chloe read the glyphs", "next": "read_glyphs" },
        { "label": "Pocket the shard",         "next": "mine_tension" }
      ]
    },
    "read_glyphs": {
      "title": "Playback",
      "text": "The shard vibrates. Images: long-lived burrowers, winters of red light, a **famine** avoided by sharing heat. Then silence. Chloe: ‘They encoded **ethics** in memory.’",
      "choices": [
        { "label": "Vow to preserve the archive", "next": "vow_to_preserve" },
        { "label": "Extract for science",          "next": "mine_tension" }
      ]
    },
    "vow_to_preserve": {
      "title": "A Gentle Science",
      "text": "You set down the shard. ‘We learn without taking.’ Chloe logs a protocol: **hands-in, hands-off**. The planet’s rhythm slows, almost… relieved.",
      "choices": [
        { "label": "Restart from orbit", "next": "orbit_insertion" }
      ]
    },
    "mine_tension": {
      "title": "The Tension",
      "text": "Chloe calculates yield curves. The spirals answer with a low **keening**. You can almost name the cost.",
      "choices": [
        { "label": "Back out—this isn’t ours", "next": "vow_to_preserve" },
        { "label": "Take one more shard",      "next": "read_glyphs" }
      ]
    }
  }
}
```

---

## `README.md`

````markdown
# The Story

A minimal, file‑based narrative engine (scenes + choices) where content lives in `content/story.json`. No frameworks, no build step. The Player handles simulations/probabilities; **The Story** handles narrative.

## How it works
- `index.html` loads `scripts/story.js`, which fetches `content/story.json` and renders a scene with interactive choices.
- Analytics are sent via `scripts/tracker.js` (pushes events to `dataLayer` → GTM → GA4).
- README is also rendered in‑page (lightweight), and fully viewable via the GitHub link.

## Authoring
Edit `content/story.json`:
```json
{
  "start": "scene_id",
  "scenes": {
    "scene_id": {
      "title": "Readable title",
      "text": "Narration text. Supports *italics* and **bold**.",
      "choices": [ { "label": "Button text", "next": "other_scene" } ]
    }
  }
}
````

Tips:

* Keep `id`s **snake\_case** and stable.
* Narrative tone can stay minimal—your *world* carries the weight.
* Branching can be shallow (3–5 hops) and still feel rich.

## Analytics

Events emitted (GTM):

* `story_init` — when JSON loads
* `scene_view` — `{ scene, choices }`
* `story_choice` — `{ from, to, label, idx }`
* `story_back` — on back navigation
* `story_restart` — on restart
* `debug_emit` — manual test via footer link

## Move content here from *The Player*

1. Copy over any narrative you want to keep into new `scenes`.
2. Use `seeds/glossary.yml` and `seeds/tags.yml` to keep vocabulary consistent.
3. For probability/simulation logic, keep it in **The Player**; here we only reference outcomes as narrative.

## Local dev

* Open `index.html` directly or serve the folder (`python3 -m http.server 8080`).
* Commit/push; GitHub Pages will serve as‑is.

## Roadmap

* [ ] Optional Markdown renderer for story text
* [ ] Save/restore state via `localStorage`
* [ ] Scene art slots (non‑blocking images)

````

---

## `seeds/glossary.yml` (starter entries)
```yaml
# Rich, human-facing definitions. Use stable keys (snake_case).
- key: chloe
  term: "Chloe"
  definition: >
    The suit intelligence—an analytical companion who advises, reads signals,
    and challenges extractive impulses with ethical counters.
  examples:
    - "Chloe proposes listening before descent."
  see_also: [memory_pulses, carapace_glyphs]

- key: carapace_glyphs
  term: "Carapace Glyphs"
  definition: >
    Etched bands on fossilized exoskeletons that store layered memories—like rings
    on a tree, but resonant when excited. Function as communal archives.
  examples:
    - "Reading a shard reveals winter histories."
  see_also: [spiral_fields, memory_pulses]

- key: spiral_fields
  term: "Spiral Fields"
  definition: >
    Buried arrangements of remains laid in resonant spirals to amplify memory.
  examples:
    - "Landing near the spirals to minimize disturbance."
  see_also: [carapace_glyphs]

- key: memory_pulses
  term: "Memory Pulses"
  definition: >
    Low-frequency planetary rhythms produced by layered archives; perceived as
    a heartbeat from orbit.
  examples:
    - "The hull vibrates with nested echoes."
  see_also: [carapace_glyphs, spiral_fields]

- key: triple_system
  term: "Triple System"
  definition: >
    The planet's three-star configuration, creating complex cycles that imprint
    on ecological and cultural timelines.
  examples:
    - "A dawn of three lights over plains of glass."
  see_also: []
````

---

## `seeds/tags.yml` (aligns with your earlier format)

```yaml
# key: Stable, machine-friendly identifier in snake_case. Must be unique and stable.
# label: Human-readable; safe to tweak.
# description: What this tag marks in your docs/story.
# kind: Category of tag (e.g., character, place, theme, tech, ethic).
# gloss_ref: Optional link to glossary key for richer definition.
# deprecated: true|false — mark if no longer used.

- key: chloe
  label: "Chloe"
  description: "Suit intelligence; advisor and counterweight."
  kind: character
  gloss_ref: chloe
  deprecated: false

- key: carapace_glyphs
  label: "Carapace Glyphs"
  description: "Etched memory-bands on exoskeleton shards."
  kind: artifact
  gloss_ref: carapace_glyphs
  deprecated: false

- key: spiral_fields
  label: "Spiral Fields"
  description: "Burial spirals that amplify memory."
  kind: place
  gloss_ref: spiral_fields
  deprecated: false

- key: memory_pulses
  label: "Memory Pulses"
  description: "Planetary heartbeat; resonant archives."
  kind: theme
  gloss_ref: memory_pulses
  deprecated: false

- key: triple_system
  label: "Triple System"
  description: "Three-star orbital context affecting cycles."
  kind: setting
  gloss_ref: triple_system
  deprecated: false
```

---

### Notes

* Replace `GTM-WVC4SNLB` if you plan to use another container here.
* All fetches are **relative paths**, so the engine works locally and on Pages.
* You can safely expand the engine (branch conditions, variables) later—this is intentionally minimal to ship now.
