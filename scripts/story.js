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
