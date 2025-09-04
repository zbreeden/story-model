import { track } from './tracker.js';

const STORY_PATH    = './content/story.json';
const TRIGGERS_PATH = './content/triggers.json';

const elText     = document.getElementById('scene-text');
const elChoices  = document.getElementById('choices');
const elResp     = document.getElementById('response');
const form       = document.getElementById('freeform');
const input      = document.getElementById('utterance');
const toneSel    = document.getElementById('tone');
const btnBack    = document.getElementById('back-btn');
const btnReset   = document.getElementById('restart-btn');
const emitDebug  = document.getElementById('emit-debug');

let story = null;           // loaded JSON
let triggers = null;        // loaded JSON
let current = null;         // current scene id
const historyStack = [];    // visited scene ids

function compileRules(raw) {
  return (raw?.rules || []).map(r => ({
    ...r,
    _patterns: (r.patterns || []).map(p => new RegExp(p, 'i'))
  }));
}

async function loadAll() {
  const [s, t] = await Promise.all([
    fetch(STORY_PATH, { cache: 'no-store' }).then(r=>r.json()),
    fetch(TRIGGERS_PATH, { cache: 'no-store' }).then(r=>r.json()).catch(()=>({rules:[]}))
  ]);
  story = s; triggers = compileRules(t);
  current = story.start || Object.keys(story.scenes)[0];
  historyStack.length = 0;
  render();
  track('story_init', { start: current });
}

function md(t = '') {
  return t
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

function clearHighlights() {
  document.querySelectorAll('.choice.glow').forEach(b=> b.classList.remove('glow'));
}

function highlightChoices(labels = []) {
  const set = new Set(labels.map(x=>x.toLowerCase()));
  document.querySelectorAll('#choices .choice').forEach(b => {
    if (set.has((b.textContent||'').toLowerCase())) b.classList.add('glow');
  });
}

function render() {
  clearHighlights();
  if (!story) return;
  const scene = story.scenes[current];
  if (!scene) { elText.innerHTML = '<p>Unknown scene: ' + current + '</p>'; elChoices.innerHTML=''; return; }

  elText.innerHTML = `<h3>${scene.title || ''}</h3><p>${md(scene.text)}</p>`;

  // Render choices
  elChoices.innerHTML = '';
  (scene.choices || []).forEach((c, idx) => {
    const b = document.createElement('button');
    b.className = 'choice';
    b.textContent = c.label;
    b.addEventListener('click', () => {
      const from = current;
      const fromTags = scene.tags || [];
      historyStack.push(current);
      current = c.next;
      const toTags = story.scenes[current]?.tags || [];
      render();
      track('story_choice', { from, to: current, label: c.label, idx, from_tags: fromTags, to_tags: toTags });
    });
    elChoices.appendChild(b);
  });

  const sceneTags = scene.tags || [];
  track('scene_view', { scene: current, choices: (scene.choices||[]).length, tags: sceneTags });
}

function respond(html, opts={}) {
  elResp.innerHTML = html;
  if (opts.highlight) highlightChoices(opts.highlight);
}

function reassess() {
  // Minimal hook for now; could adjust probabilities or enable dynamic options later.
  track('reassess', { scene: current });
}

function fireActions(actions = []) {
  const tone = (toneSel?.value || 'gentle');
  let highlights = [];
  let navTo = null;

  actions.forEach(a => {
    if (a.type === 'message') {
      const text = (tone === 'snark' ? (a.text_snark || a.text || '') : (a.text_gentle || a.text || ''));
      if (text) respond(`<p>${md(text)}</p>`);
    }
    if (a.type === 'recommend' && Array.isArray(a.choices)) {
      highlights = highlights.concat(a.choices);
    }
    if (a.type === 'tag_emit' && Array.isArray(a.tags)) {
      track('input_tag_emit', { tags: a.tags });
    }
    if (a.type === 'navigate' && a.scene) {
      navTo = a.scene;
    }
  });

  if (highlights.length) respond(elResp.innerHTML + `<p class="muted">Recommended options highlighted.</p>`, { highlight: highlights });
  if (navTo) {
    const from = current;
    const prevScene = story.scenes[current];
    historyStack.push(current);
    current = navTo;
    render();
    track('input_navigate', { from, to: navTo, from_tags: prevScene?.tags || [], to_tags: story.scenes[navTo]?.tags || [] });
  }

  reassess();
}

function handleFreeInput(text) {
  const raw = text || '';
  const utter = raw.trim();
  if (!utter) return;

  // persist locally for future features
  try {
    const key = 'the_story_inputs';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push({ t: Date.now(), scene: current, text: utter });
    localStorage.setItem(key, JSON.stringify(arr).slice(-5000));
  } catch {}

  track('free_input', { scene: current, text_len: utter.length });

  // rule match
  const rule = (triggers || []).find(r => r._patterns?.some(rx => rx.test(utter)));
  if (rule) {
    track('rule_fired', { rule: rule.id || null });
    fireActions(rule.actions || []);
  } else {
    track('rule_miss', {});
    respond(`<p>Chloe tilts her head: <em>"I can work with that. Try a why/how/where, or pick an option above."</em></p>`);
  }
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

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const txt = input?.value || '';
  input.value = '';
  handleFreeInput(txt);
});

// Kick it off
loadAll().catch(err => {
  elText.textContent = 'Failed to load story.json';
  console.error(err);
});
