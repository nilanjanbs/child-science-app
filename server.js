// ═══════════════════════════════════════════════════════════════
//  Mahika Science Learning App — Server
//  Ontario Curriculum Grade 2 & 3 | Modular JSON Architecture
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();

const express   = require('express');
const fs        = require('fs');
const path      = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Paths ──────────────────────────────────────────────────────
const DATA_DIR     = path.join(__dirname, 'data');
const PROGRESS_DIR = path.join(__dirname, 'progress');
const PUBLIC_DIR   = path.join(__dirname, 'public');

// ── Ensure progress directory exists ──────────────────────────
if (!fs.existsSync(PROGRESS_DIR)) fs.mkdirSync(PROGRESS_DIR, { recursive: true });

// ── Middleware ─────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// ── Helper: safe JSON read ─────────────────────────────────────
function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return null; }
}

// ── Helper: walk a directory tree, collect all .json paths ─────
function walkJSON(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkJSON(full));
    else if (entry.isFile() && entry.name.endsWith('.json')) results.push(full);
  }
  return results;
}

// ══════════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════════

// ── GET /api/manifest ──────────────────────────────────────────
app.get('/api/manifest', (req, res) => {
  const indexPath = path.join(DATA_DIR, 'index.json');
  const index = readJSON(indexPath);
  if (!index) return res.status(500).json({ error: 'Manifest not found' });
  res.json(index);
});

// ── GET /api/:grade/:section ───────────────────────────────────
app.get('/api/:grade/:section', (req, res) => {
  const { grade, section } = req.params;
  if (!['grade2', 'grade3'].includes(grade))
    return res.status(400).json({ error: 'Grade must be grade2 or grade3' });
  const sectionDir = path.join(DATA_DIR, grade, section);
  const files = walkJSON(sectionDir);
  if (files.length === 0)
    return res.status(404).json({ error: `No data found for ${grade}/${section}` });
  res.json({ grade, section, files: files.map(f => readJSON(f)).filter(Boolean) });
});

// ── GET /api/progress/:name ───────────────────────────────────
app.get('/api/progress/:name', (req, res) => {
  const safe = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const file = path.join(PROGRESS_DIR, `${safe}.json`);
  if (!fs.existsSync(file)) return res.json({ name: req.params.name, stars: 0, badges: [], history: {} });
  res.json(readJSON(file) || {});
});

// ── POST /api/progress/:name ──────────────────────────────────
app.post('/api/progress/:name', (req, res) => {
  const safe = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const file = path.join(PROGRESS_DIR, `${safe}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Could not save progress' });
  }
});

// ── GET /api/leaderboard ──────────────────────────────────────
app.get('/api/leaderboard', (req, res) => {
  const files = fs.existsSync(PROGRESS_DIR)
    ? fs.readdirSync(PROGRESS_DIR).filter(f => f.endsWith('.json'))
    : [];
  const board = files
    .map(f => readJSON(path.join(PROGRESS_DIR, f)))
    .filter(Boolean)
    .map(p => ({ name: p.name || 'Student', stars: p.stars || 0, badges: (p.badges || []).length }))
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 10);
  res.json(board);
});

// ══════════════════════════════════════════════════════════════
//  AI QUESTION GENERATION
// ══════════════════════════════════════════════════════════════

const AI_COOLDOWN_MS    = (parseInt(process.env.AI_COOLDOWN_MINUTES, 10) || 10) * 60 * 1000;
const AI_QUESTION_COUNT = parseInt(process.env.AI_QUESTION_COUNT, 10) || 5;
const aiCooldowns       = {};

// ── GET /api/ai-status/:grade/:section/:modId ─────────────────
app.get('/api/ai-status/:grade/:section/:modId', (req, res) => {
  const { grade, section, modId } = req.params;
  const key    = `${grade}|${section}|${modId}`;
  const now    = Date.now();
  const expiry = aiCooldowns[key] || 0;
  res.json({
    canGenerate  : expiry <= now,
    cooldownUntil: expiry,
    remainingMs  : Math.max(0, expiry - now),
    cooldownMinutes: AI_COOLDOWN_MS / 60000,
    questionCount: AI_QUESTION_COUNT
  });
});

// ── POST /api/generate ────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set. Add it to .env and restart.' });

  const { grade, section, modId, modTitle, modDescription, exerciseSample, count = AI_QUESTION_COUNT } = req.body;
  if (!grade || !section || !modId)
    return res.status(400).json({ error: 'Missing required fields: grade, section, modId' });

  const key = `${grade}|${section}|${modId}`;
  const now = Date.now();
  if (aiCooldowns[key] && aiCooldowns[key] > now)
    return res.status(429).json({ error: 'Cooling down', cooldownUntil: aiCooldowns[key], remainingMs: aiCooldowns[key] - now });

  aiCooldowns[key] = now + AI_COOLDOWN_MS;

  try {
    const client     = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const gradeLabel = grade === 'grade2' ? 'Grade 2 (ages 7–8)' : 'Grade 3 (ages 8–9)';
    const sampleJson = exerciseSample?.length ? JSON.stringify(exerciseSample.slice(0, 2), null, 2) : '[]';

    const sectionHints = {
      matter: 'solids, liquids, gases, properties of materials, changes of state',
      'light-sound': 'light, shadows, transparent/opaque, sound, communication',
      forces: 'pushes, pulls, motion, speed, magnets, attract/repel',
      'life-science': 'living/nonliving, animals, plants, life cycles, traits, adaptations',
      'earth-science': 'rocks, soil, water, land features, earthquakes, erosion, volcanoes',
      measurement: 'units of time, distance, mass, volume',
      weather: 'temperature, thermometers, weather patterns, climate',
      engineering: 'design solutions, engineering practices, problem solving',
    };

    const message = await client.messages.create({
      model     : 'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      messages  : [{
        role   : 'user',
        content: `Generate ${count} new science multiple-choice exercises for a ${gradeLabel} student (Ontario curriculum, Canada).

Module: "${modTitle || section}"
Subject area: ${section} — ${sectionHints[section] || 'science concepts'}
Description: ${modDescription || 'Science practice'}

Sample exercises from this module (match this difficulty and style exactly):
${sampleJson}

Rules:
- Exactly 4 answer choices per question
- "answer" is the 0-based index of the correct choice (0, 1, 2, or 3)
- Questions must be DIFFERENT from the samples above
- Keep difficulty appropriate for ${gradeLabel}
- Use fun, age-appropriate contexts (animals, nature, everyday items)
- Include a brief child-friendly explanation in "exp"

Return ONLY a valid JSON array — no markdown, no extra text:
[{"question":"...","choices":["a","b","c","d"],"answer":0,"exp":"Brief child-friendly explanation."}]`
      }]
    });

    const raw   = message.content[0]?.text?.trim() || '';
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) { delete aiCooldowns[key]; return res.status(500).json({ error: 'AI returned no JSON array' }); }

    let questions;
    try { questions = JSON.parse(match[0]); }
    catch { delete aiCooldowns[key]; return res.status(500).json({ error: 'Failed to parse AI response' }); }

    questions = (Array.isArray(questions) ? questions : [])
      .filter(q => typeof q.question === 'string' && Array.isArray(q.choices) && q.choices.length === 4 && typeof q.answer === 'number')
      .slice(0, count);

    if (questions.length === 0) { delete aiCooldowns[key]; return res.status(500).json({ error: 'No valid questions in AI response' }); }

    console.log(`[AI] Generated ${questions.length} questions for ${grade}/${section}/${modId}`);
    res.json({ questions, cooldownUntil: aiCooldowns[key], generated: questions.length });

  } catch (err) {
    delete aiCooldowns[key];
    console.error('[AI] Error:', err.message);
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

// ── Fallback ──────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   🔬 Mahika Science Learning App 🔬          ║');
  console.log('║   Ontario Curriculum — Grade 2 & 3           ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅  Server running at http://localhost:${PORT}`);
  const keySet = !!process.env.ANTHROPIC_API_KEY;
  console.log(`🤖  AI questions: ${keySet ? '✅ enabled' : '⚠️  disabled — set ANTHROPIC_API_KEY in .env'}`);
  console.log('');
  const url = `http://localhost:${PORT}`;
  const { exec } = require('child_process');
  if (process.platform === 'darwin')      exec(`open "${url}"`);
  else if (process.platform === 'win32')  exec(`start "" "${url}"`);
  else                                     exec(`xdg-open "${url}"`);
});
