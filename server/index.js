import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file at the project root
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
    console.log('[Env] Loaded environment variables from .env file');
  } catch (err) {
    console.warn('[Env] Failed to load .env file:', err.message);
  }
}

const DB_FILE = path.join(__dirname, 'db.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(PUBLIC_DIR));

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── xAI PROXY ENDPOINT ─────────────────────────────────────────────────────
// Keeps the API key on the server, never exposed to the browser

app.post('/api/xai/chat', async (req, res) => {
  const db = readDB();
  const apiKey = process.env.XAI_API_KEY || db.settings?.xaiApiKey || '';

  if (!apiKey) {
    return res.status(400).json({ error: 'NO_API_KEY', message: 'No xAI API key configured. Please add your key in Settings.' });
  }

  const { messages, model = 'grok-3', temperature = 0.2, max_tokens = 6000 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required.' });
  }

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens })
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error || data?.message || `API Error ${response.status}`;
      console.error(`[xAI Proxy] Error ${response.status}:`, errMsg);
      return res.status(response.status).json({ error: errMsg, code: data?.code });
    }

    console.log(`[xAI Proxy] ✓ Request OK (model: ${model}, tokens: ${data?.usage?.total_tokens || '?'})`);
    res.json(data);
  } catch (err) {
    console.error('[xAI Proxy] Network error:', err.message);
    res.status(502).json({ error: `Network error reaching xAI: ${err.message}` });
  }
});

// ─── SETTINGS ROUTES ─────────────────────────────────────────────────────────

// GET /api/settings — get non-sensitive settings
app.get('/api/settings', (req, res) => {
  const db = readDB();
  const settings = db.settings || {};
  const apiKey = process.env.XAI_API_KEY || settings.xaiApiKey || '';
  // Never send the actual key to the client, just whether it's set
  res.json({
    success: true,
    data: {
      hasApiKey: !!apiKey,
      apiKeyPreview: apiKey ? '••••••••' : null
    }
  });
});

// POST /api/settings/apikey — save API key
app.post('/api/settings/apikey', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    return res.status(400).json({ error: 'A valid API key is required.' });
  }
  const db = readDB();
  if (!db.settings) db.settings = {};
  db.settings.xaiApiKey = apiKey.trim();
  writeDB(db);
  console.log(`[SETTINGS] ✓ xAI API key saved (preview: ${apiKey.trim().slice(0, 8)}…)`);
  res.json({ success: true, message: 'API key saved securely on server.' });
});

// DELETE /api/settings/apikey — remove API key
app.delete('/api/settings/apikey', (req, res) => {
  const db = readDB();
  if (db.settings) delete db.settings.xaiApiKey;
  writeDB(db);
  console.log('[SETTINGS] ✓ xAI API key removed');
  res.json({ success: true, message: 'API key removed.' });
});

// ─── DB Helpers ────────────────────────────────────────────────────────────────

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const defaultDB = {
        users: [
          { id: 'u1', username: 'admin', password: 'government2024', role: 'Chief Planning Officer', department: 'Ministry of Planning' },
          { id: 'u2', username: 'minister', password: 'minister123', role: 'Cabinet Minister', department: 'Cabinet Secretariat' },
          { id: 'u3', username: 'analyst', password: 'analyst123', role: 'Senior Analyst', department: 'National Development Council' }
        ],
        plans: [],
        evaluations: [],
        reports: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
      return defaultDB;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error('[DB] Read error:', err.message);
    return { users: [], plans: [], evaluations: [], reports: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('[DB] Write error:', err.message);
    return false;
  }
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── AUTH ROUTES ───────────────────────────────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  const db = readDB();
  const user = db.users.find(
    u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
  );
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. Access denied.' });
  }
  const token = `tok_${user.id}_${Date.now()}`;
  console.log(`[AUTH] ✓ Login: ${user.username} (${user.role})`);
  res.json({
    success: true,
    token,
    user: { id: user.id, username: user.username, role: user.role, department: user.department }
  });
});

// ─── PLANS ROUTES ──────────────────────────────────────────────────────────────

// GET /api/plans — list all plans
app.get('/api/plans', (req, res) => {
  const db = readDB();
  const sorted = [...db.plans].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, data: sorted });
});

// POST /api/plans — submit a new government plan
app.post('/api/plans', (req, res) => {
  const { title, sector, description, objectives, budget, duration, startMonth, dependencies, submittedBy, department } = req.body;

  if (!title || !sector || !description) {
    return res.status(400).json({ error: 'Title, sector and description are required.' });
  }

  const db = readDB();
  const newPlan = {
    id: genId('plan'),
    title,
    sector,
    description,
    objectives: objectives || '',
    budget: parseFloat(budget) || 0,
    duration: parseInt(duration) || 6,
    startMonth: parseInt(startMonth) || 1,
    dependencies: dependencies || '',
    submittedBy: submittedBy || 'Anonymous',
    department: department || 'Unknown',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.plans.push(newPlan);
  writeDB(db);
  console.log(`[PLANS] ✓ New plan submitted: "${title}" by ${submittedBy}`);
  res.status(201).json({ success: true, data: newPlan });
});

// PUT /api/plans/:id — update a plan
app.put('/api/plans/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const idx = db.plans.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Plan not found.' });

  db.plans[idx] = { ...db.plans[idx], ...req.body, updatedAt: new Date().toISOString() };
  writeDB(db);
  res.json({ success: true, data: db.plans[idx] });
});

// DELETE /api/plans/:id
app.delete('/api/plans/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const before = db.plans.length;
  db.plans = db.plans.filter(p => p.id !== id);
  if (db.plans.length === before) return res.status(404).json({ error: 'Plan not found.' });
  writeDB(db);
  console.log(`[PLANS] ✓ Deleted plan: ${id}`);
  res.json({ success: true, message: 'Plan deleted.' });
});

// ─── EVALUATIONS ROUTES ────────────────────────────────────────────────────────

// GET /api/evaluations — list all evaluation sessions
app.get('/api/evaluations', (req, res) => {
  const db = readDB();
  const sorted = [...db.evaluations].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ success: true, data: sorted });
});

// POST /api/evaluations — save an evaluation session
app.post('/api/evaluations', (req, res) => {
  const { situationContext, evaluatedPlans, summary, evaluatedBy } = req.body;

  if (!evaluatedPlans || !Array.isArray(evaluatedPlans)) {
    return res.status(400).json({ error: 'evaluatedPlans array is required.' });
  }

  const db = readDB();
  const evaluation = {
    id: genId('eval'),
    timestamp: new Date().toISOString(),
    evaluatedBy: evaluatedBy || 'System',
    situationContext: situationContext || {},
    evaluatedPlans,
    summary: summary || {},
    planCount: evaluatedPlans.length,
    highPriorityCount: evaluatedPlans.filter(p => p.priorityClass === 'High').length,
    totalBudget: evaluatedPlans.reduce((acc, p) => acc + (p.budget || 0), 0)
  };

  db.evaluations.push(evaluation);
  writeDB(db);
  console.log(`[EVAL] ✓ Evaluation saved: ${evaluation.id} (${evaluation.planCount} plans)`);
  res.status(201).json({ success: true, data: evaluation });
});

// DELETE /api/evaluations/:id
app.delete('/api/evaluations/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const before = db.evaluations.length;
  db.evaluations = db.evaluations.filter(e => e.id !== id);
  if (db.evaluations.length === before) return res.status(404).json({ error: 'Evaluation not found.' });
  writeDB(db);
  res.json({ success: true, message: 'Evaluation deleted.' });
});

// ─── REPORTS ROUTES ────────────────────────────────────────────────────────────

// GET /api/reports
app.get('/api/reports', (req, res) => {
  const db = readDB();
  const sorted = [...db.reports].sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
  res.json({ success: true, data: sorted });
});

// POST /api/reports — save a generated AI report
app.post('/api/reports', (req, res) => {
  const { title, content, evaluationId, generatedBy } = req.body;
  if (!content) return res.status(400).json({ error: 'Report content is required.' });

  const db = readDB();
  const report = {
    id: genId('rpt'),
    title: title || `AI Report — ${new Date().toLocaleDateString()}`,
    content,
    evaluationId: evaluationId || null,
    generatedBy: generatedBy || 'AI Engine',
    generatedAt: new Date().toISOString()
  };

  db.reports.push(report);
  writeDB(db);
  console.log(`[REPORTS] ✓ Report saved: ${report.id}`);
  res.status(201).json({ success: true, data: report });
});

// DELETE /api/reports/:id
app.delete('/api/reports/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const before = db.reports.length;
  db.reports = db.reports.filter(r => r.id !== id);
  if (db.reports.length === before) return res.status(404).json({ error: 'Report not found.' });
  writeDB(db);
  res.json({ success: true, message: 'Report deleted.' });
});

// ─── STATS ROUTE ───────────────────────────────────────────────────────────────

// GET /api/stats — dashboard summary
app.get('/api/stats', (req, res) => {
  const db = readDB();
  res.json({
    success: true,
    data: {
      totalPlans: db.plans.length,
      pendingPlans: db.plans.filter(p => p.status === 'pending').length,
      totalEvaluations: db.evaluations.length,
      totalReports: db.reports.length,
      sectors: [...new Set(db.plans.map(p => p.sector))],
      totalBudget: db.plans.reduce((acc, p) => acc + (p.budget || 0), 0)
    }
  });
});

// ─── TODO ROUTES ───────────────────────────────────────────────────────────────

// GET /api/todos — get all todos
app.get('/api/todos', (req, res) => {
  const db = readDB();
  res.json({ success: true, data: db.todos || [] });
});

// POST /api/todos — create a new todo
app.post('/api/todos', (req, res) => {
  const { title, description, priority, dueDate, sector, assignee } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required.' });
  }
  const db = readDB();
  if (!db.todos) db.todos = [];

  const todo = {
    id: genId('todo'),
    title: title.trim(),
    description: (description || '').trim(),
    priority: priority || 'Medium',
    dueDate: dueDate || null,
    sector: sector || '',
    assignee: (assignee || '').trim(),
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  db.todos.push(todo);
  writeDB(db);
  console.log(`[TODO] ✓ Created: "${todo.title}" (${todo.priority})`);
  res.status(201).json({ success: true, data: todo });
});

// PATCH /api/todos/:id — update a todo (toggle complete, edit fields)
app.patch('/api/todos/:id', (req, res) => {
  const db = readDB();
  if (!db.todos) db.todos = [];
  const idx = db.todos.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Todo not found.' });

  const todo = db.todos[idx];
  const updates = req.body;

  // Toggle completed
  if ('completed' in updates) {
    todo.completed = Boolean(updates.completed);
    todo.completedAt = todo.completed ? new Date().toISOString() : null;
  }

  // Editable fields
  const editFields = ['title', 'description', 'priority', 'dueDate', 'sector', 'assignee'];
  editFields.forEach(f => { if (f in updates) todo[f] = updates[f]; });

  db.todos[idx] = todo;
  writeDB(db);
  res.json({ success: true, data: todo });
});

// DELETE /api/todos/:id — delete a todo
app.delete('/api/todos/:id', (req, res) => {
  const db = readDB();
  if (!db.todos) return res.status(404).json({ error: 'Todo not found.' });
  const before = db.todos.length;
  db.todos = db.todos.filter(t => t.id !== req.params.id);
  if (db.todos.length === before) return res.status(404).json({ error: 'Todo not found.' });
  writeDB(db);
  console.log(`[TODO] ✓ Deleted: ${req.params.id}`);
  res.json({ success: true, message: 'Task deleted.' });
});

// DELETE /api/todos/bulk/completed — clear all completed todos
app.delete('/api/todos/bulk/completed', (req, res) => {
  const db = readDB();
  if (!db.todos) db.todos = [];
  const removed = db.todos.filter(t => t.completed).length;
  db.todos = db.todos.filter(t => !t.completed);
  writeDB(db);
  console.log(`[TODO] ✓ Cleared ${removed} completed tasks.`);
  res.json({ success: true, removed });
});

// ─── CATCH-ALL → serve index.html ─────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ─── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║   GovAssign AI — Backend Server                      ║`);
  console.log(`║   http://localhost:${PORT}                               ║`);
  console.log(`║   DB: ${DB_FILE}  ║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);
});

