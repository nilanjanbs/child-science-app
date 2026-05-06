# 🌟 Child Science Learning Apps

**Interactive Ontario Curriculum learning apps for Grade 2 & 3**

Built with Node.js and Express, these three web apps run locally in any browser with zero installation beyond Node.js. Each app features a quiz engine with AI-generated questions, sound effects, confetti celebrations, animated mascots, and a clean Material 3 design.

---

## 📦 Apps at a Glance

| App | Port | Questions | Subject |
|-----|------|-----------|---------|
| 🔬 **Science** | 3002 | 1,573 | Matter, forces, life science, earth science |

**Total: 5,976 curriculum-aligned questions across 3 subjects.**

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher


### Windows
| File | Opens |
|------|-------|

| `start-science.bat` | Science app on http://localhost:3002 |

### Mac / Linux
```bash
# English

cd mahika-science-app
npm install
PORT=3002 node server.js
```

---

## 🗂️ Project Structure

```
child-science-apps/
│
├── start-science.bat
├── start.sh
├── child-esciencenglish-app/
│   ├── server.js
│   ├── package.json
│   └── public/
│       └── index.html          ← Single-page app (HTML + CSS + JS)
│   └── data/
│       ├── grade2/
│       └── grade3/
│

```

---

## 🔬 Science App — Curriculum Coverage

### Grade 2 (15 modules · 765 questions)

| Module | Topic |
|--------|-------|
| A | Properties of Materials |
| B | States of Matter |
| C | Changes of State |
| D | Light and Sound |
| E | Physical & Chemical Changes |
| F | Mixtures & Solutions |
| G | Force and Motion |
| H | Magnets |
| I | Classification of Living Things |
| J | Animals |
| K | Plants |
| L | Traits & Adaptations |
| M | Earth Features |
| N | Earth Events |
| O | Measurement |

### Grade 3 (16 modules · 808 questions)

| Module | Topic |
|--------|-------|
| A | Properties of Materials |
| B | States of Matter |
| C | Phase Changes |
| D | Heat & Thermal Energy |
| E | Physical & Chemical Changes |
| F | Force & Motion |
| G | Magnets & Electromagnetism |
| H | Animals |
| I | Plants |
| J | Ecosystems |
| K | Fossils & Evolution |
| L | Weather & Climate |
| M | Earth Features & Plate Tectonics |
| N | Earth Events & Volcanoes |
| O | Engineering Design |
| P | Measurement & Data |

---

## ✨ Features

### Quiz Engine
- **Paginated quizzes** — 5 questions per page with progress dots
- **Instant feedback** — correct/incorrect highlighted with explanations
- **Score tracking** — stars earned per module, stored in localStorage
- **AI question generation** — Claude AI can generate extra questions on demand

### Visual & Audio
- **16 inline SVG illustrations** on relevant science questions (water cycle, food chain, butterfly life cycle, states of matter, earth layers, photosynthesis, and more)
- **Web Audio API sound effects** — synthesised musical tones for correct answers, wrong answers, streaks, and level completion (no audio files required)
- **Confetti animations** on high scores and perfect scores
- **Sparky mascot** — bounces on correct answers, shakes on wrong answers
- **Screen flash** — green flash for correct, red for incorrect
- **🔊 Mute toggle** — one-click sound on/off, preference saved

### Design
- **Material Design 3** colour tokens throughout
- **Light / Dark mode** toggle, preference saved to localStorage
- **Responsive layout** — works on desktop and tablet
- **Smooth page transitions** and animated score stars

---

## 🗃️ Question Data Format

Each topic is a `.json` file with this structure:

```json
{
  "id": "A",
  "grade": "2",
  "emoji": "🧱",
  "title": "Properties of Materials",
  "description": "Short description shown on the topic card.",
  "exercises": [
    {
      "question": "Which word describes how something FEELS when you touch it?",
      "choices": ["colour", "texture", "smell", "size"],
      "answer": 1,
      "exp": "Texture describes how something feels — rough, smooth, bumpy, or soft.",
      "svg": "states-of-matter"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `question` | string | The question text |
| `choices` | string[4] | Exactly four answer choices |
| `answer` | 0–3 | Index of the correct choice |
| `exp` | string | Explanation shown after answering |
| `svg` | string? | Optional — key into `SCIENCE_IMAGES` for an illustration |

### Available SVG Illustration Keys (Science App)

| Key | Illustration |
|-----|-------------|
| `water-cycle` | Evaporation → cloud → rain → run-off |
| `states-of-matter` | Particle diagrams: solid / liquid / gas |
| `magnet-field` | N-S bar magnet with field lines |
| `food-chain` | Plant → caterpillar → frog → eagle |
| `plant-parts` | Labelled flower, leaf, stem, roots |
| `volcano` | Cross-section with lava and magma |
| `butterfly-lifecycle` | Egg → caterpillar → chrysalis → butterfly |
| `earth-layers` | Crust → mantle → outer/inner core |
| `photosynthesis` | CO₂ + H₂O + sun → O₂ + sugar |
| `force-motion` | Car with push/pull force arrows |
| `measurement-tools` | Thermometer, cylinder, scale, ruler |
| `frog-lifecycle` | Egg → tadpole → froglet → adult frog |
| `weather-symbols` | Sunny / rainy / snowy / stormy tiles |
| `simple-machines` | Lever, wheel & axle, inclined plane |
| `ecosystem` | Forest scene: producers, consumers, decomposers |
| `phase-change` | Ice ↔ water ↔ steam with transition labels |

---

## 🤖 AI Question Generation

The science (and other) apps include an **Ask AI** button per module. When clicked, Claude (via the Anthropic API) generates additional questions matching the topic's curriculum level and style. Generated questions are appended to the current quiz session.

To enable AI features, create a `.env` file inside each app folder:

```
ANTHROPIC_API_KEY=your_api_key_here
```

Get an API key at [console.anthropic.com](https://console.anthropic.com).

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js + Express |
| Frontend | Vanilla HTML / CSS / JavaScript (no build step) |
| Styling | CSS Custom Properties (Material 3 tokens) |
| Audio | Web Audio API (synthesised — no audio files) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Storage | Browser `localStorage` (theme, sound, progress) |

---

## 📋 Adding New Questions

1. Open the relevant `.json` file in `data/grade2/` or `data/grade3/`
2. Add a new object to the `exercises` array following the format above
3. Save the file — changes are live on next page reload (no build step)
4. Optionally regenerate `data/index.json` with:

```bash
# Run from inside the app folder (e.g. mahika-science-app/)
node -e "
const fs = require('fs'), path = require('path');
const dataDir = './data';
const files = [];
function scan(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) scan(full);
    else if (f.endsWith('.json') && f !== 'index.json') {
      const raw = JSON.parse(fs.readFileSync(full,'utf8'));
      files.push({ ...raw, questionCount: (raw.exercises||[]).length, exercises: undefined,
        path: path.relative(dataDir, full).replace(/\\\\/g,'/') });
    }
  });
}
scan(dataDir);
const totalQuestions = files.reduce((s,f)=>s+f.questionCount,0);
fs.writeFileSync(path.join(dataDir,'index.json'), JSON.stringify({ generated: new Date().toISOString(), totalQuestions, files }, null, 2));
console.log('index.json updated —', totalQuestions, 'questions across', files.length, 'files');
"
```

---

## 📄 License

MIT — free to use, modify, and distribute.

---

*Built for Kids — making Ontario curriculum fun, one question at a time. 🎉*
