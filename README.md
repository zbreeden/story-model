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
