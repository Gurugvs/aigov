/**
 * GovAssign AI — Main Application Logic
 * Pure Vanilla JS, no framework dependencies
 * Connects to Express backend on port 3000
 */

// ─── STATE ────────────────────────────────────────────────────────────────────

const state = {
  user: null,
  plans: [],
  evaluatedPlans: [],
  historyRecords: [],
  savedReports: [],
  currentSituation: null,
  currentReport: null,
  isAnalyzing: false
};

// ─── DOM HELPERS ──────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }
function toggle(el, cond) { if (cond) show(el); else hide(el); }

// ─── TOAST NOTIFICATIONS ─────────────────────────────────────────────────────

function toast(message, type = 'info') {
  const container = $('toast-container');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span style="font-size:1rem">${icons[type] || '●'}</span><span>${message}</span>`;
  container.appendChild(t);
  // Auto-dismiss
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(120%)';
    t.style.transition = 'all 0.35s ease';
    setTimeout(() => t.remove(), 350);
  }, 3800);
}

// ─── AI OVERLAY ───────────────────────────────────────────────────────────────

function showAIOverlay(text = 'Analyzing government plans with xAI Grok...') {
  show($('ai-overlay'));
  $('ai-status-text').textContent = text;
  state.isAnalyzing = true;
}

function hideAIOverlay() {
  hide($('ai-overlay'));
  state.isAnalyzing = false;
}

// ─── API CALLS TO BACKEND ─────────────────────────────────────────────────────

// isServerless is managed via GovAI.isServerless

function handleServerlessApi(method, path, body) {
  const getDB = () => {
    let db;
    try { db = JSON.parse(localStorage.getItem('govassign_db')); } catch (_) {}
    if (!db) {
      db = { plans: [], evaluations: [], reports: [], todos: [] };
    }
    if (!db.plans) db.plans = [];
    if (!db.evaluations) db.evaluations = [];
    if (!db.reports) db.reports = [];
    if (!db.todos) db.todos = [];
    return db;
  };
  const saveDB = (db) => localStorage.setItem('govassign_db', JSON.stringify(db));

  // 1. Auth Login
  if (path === '/api/auth/login') {
    const { username, password } = body;
    const users = {
      admin: { username: 'admin', role: 'Chief Planning Officer' },
      minister: { username: 'minister', role: 'Cabinet Minister' }
    };
    if (users[username] && (password === 'government2024' || password === 'minister123')) {
      return { success: true, user: users[username] };
    }
    throw new Error('Invalid ID or Secure Access Code.');
  }

  const db = getDB();

  // 2. Plans
  if (path === '/api/plans') {
    if (method === 'GET') return { success: true, data: db.plans };
    if (method === 'POST') {
      const plan = {
        ...body,
        id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.plans.push(plan);
      saveDB(db);
      return plan;
    }
  }
  if (path.startsWith('/api/plans/')) {
    const id = path.split('/').pop();
    if (method === 'DELETE') {
      db.plans = db.plans.filter(p => p.id !== id);
      saveDB(db);
      return { success: true };
    }
  }

  // 3. Evaluations
  if (path === '/api/evaluations') {
    if (method === 'GET') return { success: true, data: db.evaluations };
    if (method === 'POST') {
      const evaluation = {
        ...body,
        id: `eval_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      };
      db.evaluations.push(evaluation);
      saveDB(db);
      return evaluation;
    }
  }
  if (path.startsWith('/api/evaluations/')) {
    const id = path.split('/').pop();
    if (method === 'DELETE') {
      db.evaluations = db.evaluations.filter(e => e.id !== id);
      saveDB(db);
      return { success: true };
    }
  }

  // 4. Reports
  if (path === '/api/reports') {
    if (method === 'GET') return { success: true, data: db.reports };
    if (method === 'POST') {
      const report = {
        ...body,
        id: `report_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString()
      };
      db.reports.push(report);
      saveDB(db);
      return report;
    }
  }
  if (path.startsWith('/api/reports/')) {
    const id = path.split('/').pop();
    if (method === 'DELETE') {
      db.reports = db.reports.filter(r => r.id !== id);
      saveDB(db);
      return { success: true };
    }
  }

  // 5. Stats
  if (path === '/api/stats') {
    return {
      success: true,
      data: {
        totalPlans: db.plans.length,
        pendingPlans: db.plans.filter(p => p.status === 'pending').length,
        totalEvaluations: db.evaluations.length,
        totalReports: db.reports.length,
        sectors: [...new Set(db.plans.map(p => p.sector))],
        totalBudget: db.plans.reduce((acc, p) => acc + (p.budget || 0), 0)
      }
    };
  }

  // 6. Settings
  if (path === '/api/settings') {
    const hasKey = !!localStorage.getItem('govassign_xai_key');
    const preview = hasKey ? `${localStorage.getItem('govassign_xai_key').slice(0, 8)}…` : '';
    return { success: true, data: { hasApiKey: hasKey, apiKeyPreview: preview } };
  }

  throw new Error(`Endpoint ${method} ${path} not mock-implemented.`);
}

async function api(method, path, body = null) {
  if (GovAI.isServerless) {
    try {
      // Simulate slight network delay for premium visual loaded state
      await new Promise(r => setTimeout(r, 80));
      return handleServerlessApi(method, path, body);
    } catch (err) {
      throw err;
    }
  }

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 404 || res.status === 504 || res.status === 502) {
        console.warn(`Server API returned status ${res.status}. Falling back to localStorage.`);
        return handleServerlessApi(method, path, body);
      }
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  } catch (err) {
    console.warn("Express server unreachable. Falling back to client-side localStorage db. Error:", err.message);
    // Simulate slight network delay
    await new Promise(r => setTimeout(r, 80));
    return handleServerlessApi(method, path, body);
  }
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  const username = $('login-username').value.trim();
  const password = $('login-password').value;
  const btn = $('login-btn');
  const spinner = $('login-spinner');
  const errEl = $('login-error');

  hide(errEl);
  btn.querySelector('.btn-text').textContent = 'Authenticating...';
  show(spinner);
  btn.disabled = true;

  try {
    const data = await api('POST', '/api/auth/login', { username, password });
    state.user = data.user;
    localStorage.setItem('gov_session', JSON.stringify(data.user));

    // Animate transition
    const loginScreen = $('login-screen');
    loginScreen.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    loginScreen.style.opacity = '0';
    loginScreen.style.transform = 'scale(1.03)';
    setTimeout(() => {
      hide(loginScreen);
      const appEl = $('app');
      show(appEl);
      appEl.style.opacity = '0';
      appEl.style.transform = 'translateY(12px)';
      appEl.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          appEl.style.opacity = '1';
          appEl.style.transform = 'translateY(0)';
        });
      });
      initApp();
    }, 500);

  } catch (err) {
    const errMsgEl = errEl.querySelector('span:last-child') || errEl;
    errMsgEl.textContent = err.message;
    show(errEl);
    // Shake animation
    const card = document.querySelector('.login-card');
    card.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-8px)' },
      { transform: 'translateX(8px)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(0)' }
    ], { duration: 400, easing: 'ease-in-out' });
    btn.querySelector('.btn-text').textContent = 'Authorize & Enter';
    hide(spinner);
    btn.disabled = false;
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

function handleLogout() {
  localStorage.removeItem('gov_session');
  state.user = null;
  state.plans = [];
  state.evaluatedPlans = [];

  hide($('app'));
  show($('login-screen'));
  $('login-screen').style.opacity = '1';
  $('login-username').value = '';
  $('login-password').value = '';
}

// ─── TAB NAVIGATION ──────────────────────────────────────────────────────────

function switchTab(tabId) {
  $$('.nav-btn').forEach(btn => btn.classList.remove('active'));
  $$('.tab-content').forEach(section => section.classList.remove('active'));

  const btn = document.querySelector(`[data-tab="${tabId}"]`);
  const section = $(`tab-content-${tabId}`);
  if (btn) btn.classList.add('active');
  if (section) section.classList.add('active');

  // Tab-specific refresh
  if (tabId === 'dashboard') refreshDashboard();
  if (tabId === 'plans') renderPlansGrid();
  if (tabId === 'history') loadHistory();
  if (tabId === 'report') loadSavedReports();
}

// ─── SITUATION MANAGEMENT ─────────────────────────────────────────────────────

function initSituationSelector() {
  const select = $('situation-select');
  const customForm = $('custom-situation-form');

  // Set current situation
  state.currentSituation = GovAI.PRESET_SITUATIONS.default;

  select.addEventListener('change', () => {
    const val = select.value;
    if (val === 'custom') {
      show(customForm);
      buildCustomSituation();
    } else {
      hide(customForm);
      state.currentSituation = GovAI.PRESET_SITUATIONS[val];
      renderSituationDetails();
      renderPrioritySectorsGuide();
    }
  });

  // Live custom inputs
  ['cust-sit-name', 'cust-sit-inflation', 'cust-sit-desc', 'cust-sit-fiscal',
   'cust-sit-emergency', 'cust-sit-priorities', 'cust-sit-issues'].forEach(id => {
    $(id)?.addEventListener('input', buildCustomSituation);
    $(id)?.addEventListener('change', buildCustomSituation);
  });

  renderSituationDetails();
  renderPrioritySectorsGuide();
}

function buildCustomSituation() {
  const name = $('cust-sit-name')?.value || 'Custom Scenario';
  const priorities = ($('cust-sit-priorities')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  const issues = ($('cust-sit-issues')?.value || '').split(',').map(s => s.trim()).filter(Boolean);

  state.currentSituation = {
    id: 'custom',
    name,
    description: $('cust-sit-desc')?.value || 'Custom situation defined by planning officer.',
    inflation: $('cust-sit-inflation')?.value || 'Unknown',
    season: 'Standard seasonal calendar',
    fiscalStress: $('cust-sit-fiscal')?.value || 'None',
    criticalIssues: issues,
    priorities,
    emergencySector: $('cust-sit-emergency')?.value || null
  };
  renderSituationDetails();
  renderPrioritySectorsGuide();
}

function renderSituationDetails() {
  const sit = state.currentSituation;
  if (!sit) return;
  const el = $('situation-details');
  const chips = [
    { label: 'Inflation', value: sit.inflation },
    { label: 'Fiscal Stress', value: sit.fiscalStress },
    { label: 'Season', value: sit.season },
    ...(sit.emergencySector ? [{ label: '🚨 Emergency', value: sit.emergencySector }] : []),
    ...(sit.criticalIssues?.slice(0, 2).map(i => ({ label: '⚠️', value: i })) || [])
  ];
  el.innerHTML = chips.map(c =>
    `<span class="sit-badge"><span>${c.label}:</span> <strong>${c.value}</strong></span>`
  ).join('');
}

function renderPrioritySectorsGuide() {
  const sit = state.currentSituation;
  if (!sit) return;
  const el = $('priority-sectors-guide');
  if (!el) return;

  const items = [];
  if (sit.emergencySector) {
    items.push(`<div class="priority-sector-item emergency">🚨 EMERGENCY: ${sit.emergencySector}</div>`);
  }
  (sit.priorities || []).forEach((s, i) => {
    const cls = ['top-1', 'top-2', 'top-3'][i] || '';
    items.push(`<div class="priority-sector-item ${cls}"><span>${i + 1}.</span> ${s}</div>`);
  });

  el.innerHTML = items.join('') || '<p style="color:var(--text-muted);font-size:0.8rem">Select a situation to see priority sectors.</p>';
}

// ─── PLAN FORM ────────────────────────────────────────────────────────────────

function initPlanForm() {
  const form = $('plan-form');
  if (!form) return;

  // Pre-fill submitter name
  if (state.user) {
    $('plan-submitted-by').value = state.user.role;
    $('plan-department').value = state.user.department;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('submit-plan-btn');
    btn.disabled = true;
    btn.textContent = '⟳ Submitting...';

    const planData = {
      title: $('plan-title').value.trim(),
      sector: $('plan-sector').value,
      description: $('plan-description').value.trim(),
      objectives: $('plan-objectives').value.trim(),
      budget: parseFloat($('plan-budget').value),
      duration: parseInt($('plan-duration').value),
      startMonth: parseInt($('plan-start-month').value),
      dependencies: $('plan-dependencies').value.trim(),
      submittedBy: $('plan-submitted-by').value.trim(),
      department: $('plan-department').value.trim()
    };

    try {
      const res = await api('POST', '/api/plans', planData);
      state.plans.unshift(res.data);
      toast(`Plan "${planData.title}" submitted successfully!`, 'success');
      form.reset();
      if (state.user) {
        $('plan-submitted-by').value = state.user.role;
        $('plan-department').value = state.user.department;
      }
      // Auto-switch to plans tab
      setTimeout(() => switchTab('plans'), 1000);
    } catch (err) {
      toast(`Submission failed: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '📤 Submit Plan for AI Evaluation';
    }
  });

  $('clear-form-btn')?.addEventListener('click', () => {
    form.reset();
    if (state.user) {
      $('plan-submitted-by').value = state.user.role;
      $('plan-department').value = state.user.department;
    }
  });
}

// ─── LOAD PLANS ───────────────────────────────────────────────────────────────

async function loadPlans() {
  try {
    const res = await api('GET', '/api/plans');
    state.plans = res.data || [];
  } catch (err) {
    console.error('Failed to load plans:', err.message);
  }
}

// ─── RENDER PLANS GRID ────────────────────────────────────────────────────────

function renderPlansGrid() {
  const grid = $('plans-grid');
  if (!grid) return;

  const filter = $('filter-sector')?.value || '';
  const plans = filter ? state.plans.filter(p => p.sector === filter) : state.plans;

  if (plans.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">📭</div>
        <h3>${filter ? `No plans in "${filter}" sector` : 'No Plans Submitted'}</h3>
        <p>Be the first to submit a government plan for AI analysis.</p>
        <button class="btn btn-primary" onclick="switchTab('submit')">Submit First Plan →</button>
      </div>`;
    return;
  }

  grid.innerHTML = plans.map(plan => {
    const date = new Date(plan.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const evaluated = state.evaluatedPlans.find(p => p.id === plan.id);
    const scoreBadge = evaluated
      ? `<span class="priority-badge ${evaluated.priorityClass}" style="font-size:0.7rem">${evaluated.priorityClass} · ${evaluated.score}%</span>`
      : '';

    return `
    <div class="plan-card" onclick="openPlanModal('${plan.id}')">
      <div class="plan-card-header">
        <div class="plan-card-title">${escHtml(plan.title)}</div>
        <span class="plan-card-sector">${escHtml(plan.sector)}</span>
      </div>
      <p class="plan-card-desc">${escHtml(plan.description)}</p>
      <div class="plan-card-meta">
        <span class="meta-chip">💰 ₹${plan.budget} Cr</span>
        <span class="meta-chip">⏱ ${plan.duration} months</span>
        <span class="meta-chip">📅 Start: ${GovAI.MONTH_NAMES[plan.startMonth - 1]}</span>
        ${scoreBadge}
      </div>
      <div class="plan-card-footer">
        <span class="plan-submitter">By: ${escHtml(plan.submittedBy)} · ${date}</span>
        <div class="plan-card-actions" onclick="event.stopPropagation()">
          <button class="btn-card-action" onclick="openPlanModal('${plan.id}')" title="View details">👁</button>
          <button class="btn-card-action delete" onclick="deletePlan('${plan.id}')" title="Delete plan">🗑</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── PLAN MODAL ───────────────────────────────────────────────────────────────

function openPlanModal(planId) {
  const plan = state.plans.find(p => p.id === planId);
  if (!plan) return;

  const evaluated = state.evaluatedPlans.find(p => p.id === planId);
  const date = new Date(plan.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const monthName = m => GovAI.MONTH_NAMES[(m - 1) % 12];

  $('modal-plan-title').textContent = plan.title;

  let evalSection = '';
  if (evaluated) {
    evalSection = `
    <div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:1rem;margin-top:1rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
        <h4 style="font-size:0.85rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">AI Evaluation Result</h4>
        <span class="priority-badge ${evaluated.priorityClass}">${evaluated.priorityClass} · Score: ${evaluated.score}/100</span>
      </div>
      <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.6rem"><strong>Recommended Start:</strong> ${monthName(evaluated.recommendedStartMonth)} (Month ${evaluated.recommendedStartMonth})</p>
      <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.6rem"><strong>Timing Analysis:</strong> ${evaluated.timingAnalysis}</p>
      ${(evaluated.reasoning || []).map(r => `<p style="font-size:0.8rem;color:var(--text-secondary);padding-left:1rem;position:relative"><span style="position:absolute;left:0;color:var(--blue-light)">▸</span>${r}</p>`).join('')}
      ${(evaluated.scheduleWarnings || []).map(w => `<div class="warning-item">⚠ ${w}</div>`).join('')}
    </div>`;
  }

  $('modal-plan-body').innerHTML = `
    <div class="modal-grid">
      <div class="modal-field"><label>Sector</label><span class="plan-card-sector">${escHtml(plan.sector)}</span></div>
      <div class="modal-field"><label>Submitted</label><span style="font-size:0.85rem;color:var(--text-secondary)">${date}</span></div>
    </div>
    <div class="modal-field"><label>Description</label><p>${escHtml(plan.description)}</p></div>
    ${plan.objectives ? `<div class="modal-field"><label>Objectives</label><p>${escHtml(plan.objectives)}</p></div>` : ''}
    <div class="modal-grid">
      <div class="modal-field"><label>Budget</label><p>₹${plan.budget} Crores</p></div>
      <div class="modal-field"><label>Duration</label><p>${plan.duration} months</p></div>
      <div class="modal-field"><label>Proposed Start</label><p>${monthName(plan.startMonth)} (Month ${plan.startMonth})</p></div>
      <div class="modal-field"><label>Est. Completion</label><p>${monthName(((plan.startMonth + plan.duration - 2) % 12) + 1)} (Month ${Math.min(plan.startMonth + plan.duration - 1, 12)}+)</p></div>
    </div>
    ${plan.dependencies ? `<div class="modal-field"><label>Dependencies</label><p>${escHtml(plan.dependencies)}</p></div>` : ''}
    <div class="modal-grid">
      <div class="modal-field"><label>Submitted By</label><p>${escHtml(plan.submittedBy)}</p></div>
      <div class="modal-field"><label>Department</label><p>${escHtml(plan.department)}</p></div>
    </div>
    ${evalSection}`;

  show($('plan-modal'));
}

function closePlanModal() {
  hide($('plan-modal'));
}

// ─── DELETE PLAN ──────────────────────────────────────────────────────────────

async function deletePlan(planId) {
  if (!confirm('Delete this plan from the registry? This cannot be undone.')) return;
  try {
    await api('DELETE', `/api/plans/${planId}`);
    state.plans = state.plans.filter(p => p.id !== planId);
    state.evaluatedPlans = state.evaluatedPlans.filter(p => p.id !== planId);
    renderPlansGrid();
    refreshDashboard();
    toast('Plan removed from registry.', 'info');
  } catch (err) {
    toast(`Delete failed: ${err.message}`, 'error');
  }
}

// ─── LOAD DEMO PLANS ──────────────────────────────────────────────────────────

async function loadDemoPlans() {
  if (!confirm('This will add 7 demo government plans to the registry. Continue?')) return;
  let added = 0;
  for (const plan of GovAI.DEMO_PLANS) {
    try {
      const res = await api('POST', '/api/plans', plan);
      state.plans.unshift(res.data);
      added++;
    } catch (err) {
      console.warn('Failed to add demo plan:', err.message);
    }
  }
  renderPlansGrid();
  refreshDashboard();
  toast(`${added} demo plans added to the registry!`, 'success');
}

// ─── AI EVALUATION ────────────────────────────────────────────────────────────

async function runAIEvaluation() {
  if (state.plans.length === 0) {
    toast('No plans to evaluate. Submit plans first.', 'error');
    return;
  }

  showAIOverlay(`Sending ${state.plans.length} plans to xAI Grok-3 for analysis…`);

  // Simulate progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 8, 90);
    const fill = $('ai-progress-fill');
    if (fill) fill.style.width = `${progress}%`;
  }, 400);

  try {
    $('ai-status-text').textContent = 'Comparing plans with real-time situational context…';
    const results = await GovAI.evaluatePlans(state.plans, state.currentSituation, true);
    state.evaluatedPlans = results;

    clearInterval(progressInterval);
    const fill = $('ai-progress-fill');
    if (fill) fill.style.width = '100%';

    await new Promise(r => setTimeout(r, 500));
    hideAIOverlay();

    renderAnalysisResults();
    renderPlansGrid(); // Update plan cards with scores
    updateEvalSummaryBar();
    refreshDashboard();
    toast(`✅ AI evaluation complete! ${results.length} plans scored.`, 'success');

  } catch (err) {
    clearInterval(progressInterval);
    hideAIOverlay();

    if (err.message === 'NO_API_KEY') {
      // Show API key setup modal
      showApiKeyModal();
      toast('No xAI API key configured. Please add your key to enable AI analysis.', 'info');
      return;
    }

    // Other API errors — fall back to local engine
    $('ai-status-text').textContent = 'xAI API unavailable. Running local evaluation engine…';
    showAIOverlay('Running local evaluation engine (xAI unavailable)…');

    await new Promise(r => setTimeout(r, 1000));
    try {
      const localResults = GovAI.evaluateLocally(state.plans, state.currentSituation);
      state.evaluatedPlans = localResults;
      hideAIOverlay();
      renderAnalysisResults();
      updateEvalSummaryBar();
      refreshDashboard();
      toast(`Local evaluation complete — ${err.message.slice(0, 60)}`, 'info');
    } catch (localErr) {
      hideAIOverlay();
      toast(`Evaluation failed: ${localErr.message}`, 'error');
    }
  }
}

// ─── RENDER ANALYSIS RESULTS ──────────────────────────────────────────────────

function renderAnalysisResults() {
  const container = $('analysis-results');
  if (!container) return;

  if (state.evaluatedPlans.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🤖</div><h3>No Analysis Yet</h3><p>Click "Run Full AI Analysis" to evaluate all submitted plans.</p></div>`;
    return;
  }

  // Sort: High first, then Medium, then Low; within each group by score desc
  const sorted = [...state.evaluatedPlans].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    if (order[a.priorityClass] !== order[b.priorityClass]) {
      return order[a.priorityClass] - order[b.priorityClass];
    }
    return b.score - a.score;
  });

  const circumference = 2 * Math.PI * 27;

  container.innerHTML = sorted.map((plan, idx) => {
    const priorityClass = plan.priorityClass.toLowerCase() + '-priority';
    const dashOffset = circumference * (1 - plan.score / 100);
    const monthName = m => GovAI.MONTH_NAMES[(m - 1) % 12];

    const reasoningHtml = (plan.reasoning || []).map(r =>
      `<li>${escHtml(r)}</li>`).join('');

    const warningsHtml = (plan.scheduleWarnings || []).map(w =>
      `<div class="warning-item"><span>⚠</span><span>${escHtml(w)}</span></div>`).join('');

    const startChanged = plan.recommendedStartMonth !== plan.startMonth;

    return `
    <div class="result-card ${priorityClass}" style="animation-delay:${idx * 60}ms">
      <div class="result-header">
        <div class="result-title-area">
          <div class="result-plan-title">${escHtml(plan.title)}</div>
          <div class="result-plan-meta">
            <span>🏛 ${escHtml(plan.sector)}</span>
            <span>💰 ₹${plan.budget} Cr</span>
            <span>⏱ ${plan.duration} months</span>
            <span>📅 Proposed: ${monthName(plan.startMonth)}</span>
            ${plan.department ? `<span>🏢 ${escHtml(plan.department)}</span>` : ''}
          </div>
        </div>

        <div class="result-score-area">
          <div class="score-ring">
            <svg viewBox="0 0 64 64">
              <circle class="ring-bg" cx="32" cy="32" r="27" />
              <circle class="ring-fill"
                cx="32" cy="32" r="27"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${dashOffset}" />
            </svg>
            <div class="score-value">${plan.score}</div>
          </div>
          <div>
            <span class="priority-badge ${plan.priorityClass}">${plan.priorityClass}</span>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.3rem;text-align:center">Feasibility: ${plan.feasibilityScore}/100</div>
          </div>
        </div>
      </div>

      <div class="result-body">
        <div class="result-section">
          <h4>📊 AI Reasoning</h4>
          <ul class="reasoning-list">${reasoningHtml}</ul>
          ${warningsHtml}
        </div>

        <div class="result-section">
          <h4>📅 Schedule Recommendation</h4>
          <div class="timing-analysis">${escHtml(plan.timingAnalysis)}</div>
          <div class="recommended-start">
            ${startChanged ? '🔄 Revised' : '✅ Confirmed'} Start: <strong>${monthName(plan.recommendedStartMonth)} (Month ${plan.recommendedStartMonth})</strong>
            ${startChanged ? `<span style="color:var(--text-muted)">(was Month ${plan.startMonth})</span>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── SAVE EVAL BAR ────────────────────────────────────────────────────────────

function updateEvalSummaryBar() {
  const bar = $('save-eval-bar');
  if (!bar || state.evaluatedPlans.length === 0) return;

  show(bar);
  const high = state.evaluatedPlans.filter(p => p.priorityClass === 'High').length;
  const medium = state.evaluatedPlans.filter(p => p.priorityClass === 'Medium').length;
  const low = state.evaluatedPlans.filter(p => p.priorityClass === 'Low').length;
  $('eval-summary-text').textContent =
    `${state.evaluatedPlans.length} plans evaluated — High: ${high}, Medium: ${medium}, Low: ${low}`;
}

async function saveEvaluation() {
  if (state.evaluatedPlans.length === 0) {
    toast('No evaluation to save.', 'error');
    return;
  }

  const high = state.evaluatedPlans.filter(p => p.priorityClass === 'High').length;
  const medium = state.evaluatedPlans.filter(p => p.priorityClass === 'Medium').length;
  const low = state.evaluatedPlans.filter(p => p.priorityClass === 'Low').length;
  const totalBudget = state.evaluatedPlans.reduce((a, b) => a + b.budget, 0);

  try {
    const res = await api('POST', '/api/evaluations', {
      situationContext: state.currentSituation,
      evaluatedPlans: state.evaluatedPlans,
      evaluatedBy: state.user?.username || 'Anonymous',
      summary: {
        totalPlans: state.evaluatedPlans.length,
        highPriority: high,
        mediumPriority: medium,
        lowPriority: low,
        totalBudget
      }
    });

    state.historyRecords.unshift(res.data);
    toast('Evaluation saved to Cabinet Registry!', 'success');
  } catch (err) {
    toast(`Save failed: ${err.message}`, 'error');
  }
}

// ─── API KEY STATUS & MODAL ───────────────────────────────────────────────────

async function refreshApiKeyStatus() {
  const statusEl = $('ai-key-status');
  if (!statusEl) return;

  try {
    const info = await GovAI.checkApiKeyStatus();
    if (info.hasApiKey) {
      statusEl.innerHTML = `
        <span class="status-dot green"></span>
        <span>API Key Active</span>
        <code style="font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:var(--text-muted);margin-left:0.4rem">${info.apiKeyPreview}</code>
        <button onclick="removeApiKeyAction()" style="margin-left:0.5rem;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.7rem;padding:0.1rem 0.3rem;border-radius:4px" title="Remove key">✕</button>
      `;
    } else {
      statusEl.innerHTML = `
        <span class="status-dot red"></span>
        <span style="color:#fda4af">No API Key</span>
        <button onclick="showApiKeyModal()" style="margin-left:0.5rem;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);color:var(--indigo-light);cursor:pointer;font-size:0.72rem;padding:0.2rem 0.6rem;border-radius:6px">+ Add Key</button>
      `;
    }
  } catch {
    statusEl.innerHTML = `<span class="status-dot red"></span><span style="color:#fda4af">Status Unknown</span>`;
  }
}

function showApiKeyModal() {
  // Remove existing modal if any
  const existing = $('apikey-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'apikey-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
    background:rgba(2,4,10,0.88);backdrop-filter:blur(12px);
  `;

  modal.innerHTML = `
    <div style="
      background:rgba(12,20,40,0.98);border:1px solid rgba(99,145,255,0.3);
      border-radius:20px;padding:2.25rem 2.5rem;width:min(520px,94vw);
      box-shadow:0 40px 100px rgba(0,0,0,0.8),0 0 40px rgba(99,130,255,0.2);
      animation:fadeSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
      position:relative;
    ">
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
        <div style="width:44px;height:44px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;box-shadow:0 0 20px rgba(99,102,241,0.4)">🔑</div>
        <div>
          <h3 style="font-size:1.1rem;font-weight:700;color:#eef2ff;margin:0">Configure xAI API Key</h3>
          <p style="font-size:0.78rem;color:#64748b;margin:0.1rem 0 0">Required to run AI-powered plan evaluation</p>
        </div>
        <button onclick="document.getElementById('apikey-modal').remove()" style="margin-left:auto;width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(99,145,255,0.15);color:#64748b;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center">✕</button>
      </div>

      <div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);border-radius:10px;padding:0.9rem 1rem;margin-bottom:1.25rem;font-size:0.82rem;color:#94a3b8;line-height:1.6">
        Get your free API key from <a href="https://console.x.ai" target="_blank" style="color:#60a5fa;text-decoration:none;font-weight:600">console.x.ai</a>. 
        The key is stored securely on the server and never exposed to the browser.
        Without it, the system will use the <strong style="color:#eef2ff">local evaluation engine</strong> as fallback.
      </div>

      <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1.25rem">
        <label style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#475569">xAI API Key</label>
        <input
          id="apikey-input"
          type="password"
          placeholder="xai-xxxxxxxxxxxxxxxxxxxxxxxx"
          style="background:rgba(6,10,24,0.9);border:1px solid rgba(99,145,255,0.15);border-radius:10px;color:#eef2ff;font-family:'JetBrains Mono',monospace;font-size:0.88rem;padding:0.8rem 1rem;outline:none;width:100%;transition:all 0.2s"
          onfocus="this.style.borderColor='#6366f1';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.15)'"
          onblur="this.style.borderColor='rgba(99,145,255,0.15)';this.style.boxShadow='none'"
          onkeydown="if(event.key==='Enter')saveApiKeyFromModal()"
        />
        <div id="apikey-modal-error" style="color:#fda4af;font-size:0.78rem;display:none;margin-top:0.2rem"></div>
      </div>

      <div style="display:flex;gap:0.75rem">
        <button onclick="document.getElementById('apikey-modal').remove()" style="flex:1;padding:0.75rem;background:rgba(255,255,255,0.04);border:1px solid rgba(99,145,255,0.15);border-radius:10px;color:#64748b;font-family:inherit;font-size:0.9rem;font-weight:500;cursor:pointer;transition:all 0.2s"
          onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.04)'">
          Cancel — Use Local Engine
        </button>
        <button onclick="saveApiKeyFromModal()" id="apikey-save-btn" style="flex:1;padding:0.75rem;background:linear-gradient(135deg,#3b82f6,#6366f1,#8b5cf6);border:none;border-radius:10px;color:#fff;font-family:inherit;font-size:0.9rem;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(99,102,241,0.4);transition:all 0.2s"
          onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 8px 30px rgba(99,102,241,0.6)'"
          onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 20px rgba(99,102,241,0.4)'">
          Save &amp; Enable AI
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  setTimeout(() => { const inp = $('apikey-input'); if (inp) inp.focus(); }, 100);

  // Click outside to close
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

async function saveApiKeyFromModal() {
  const input = $('apikey-input');
  const errEl = $('apikey-modal-error');
  const btn = $('apikey-save-btn');
  const key = input?.value?.trim();

  if (!key || key.length < 10) {
    if (errEl) { errEl.textContent = 'Please enter a valid API key.'; errEl.style.display = 'block'; }
    return;
  }

  btn.textContent = 'Saving…';
  btn.disabled = true;

  try {
    await GovAI.saveApiKey(key);
    $('apikey-modal')?.remove();
    await refreshApiKeyStatus();
    toast('✅ API key saved! You can now run AI evaluations.', 'success');
  } catch (err) {
    if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
    btn.textContent = 'Save & Enable AI';
    btn.disabled = false;
  }
}

async function removeApiKeyAction() {
  if (!confirm('Remove the xAI API key? The system will fall back to local evaluation.')) return;
  try {
    await GovAI.removeApiKey();
    await refreshApiKeyStatus();
    toast('API key removed. Using local evaluation engine.', 'info');
  } catch (err) {
    toast(`Failed to remove key: ${err.message}`, 'error');
  }
}



async function generateReport() {
  if (state.evaluatedPlans.length === 0) {
    toast('Run an AI evaluation first before generating a report.', 'error');
    return;
  }

  showAIOverlay('Generating Cabinet Policy Brief with xAI Grok...');

  try {
    const reportText = await GovAI.generatePolicyReport(state.evaluatedPlans, state.currentSituation);
    hideAIOverlay();

    state.currentReport = reportText;
    renderReportDocument(reportText);
    toast('Policy brief generated successfully!', 'success');

  } catch (err) {
    hideAIOverlay();
    // Generate local fallback report
    const fallback = generateLocalReport();
    state.currentReport = fallback;
    renderReportDocument(fallback);
    toast('Report generated with local template (AI unavailable).', 'info');
  }
}

function generateLocalReport() {
  const sit = state.currentSituation;
  const high = state.evaluatedPlans.filter(p => p.priorityClass === 'High');
  const medium = state.evaluatedPlans.filter(p => p.priorityClass === 'Medium');
  const low = state.evaluatedPlans.filter(p => p.priorityClass === 'Low');
  const total = state.evaluatedPlans.reduce((a, b) => a + b.budget, 0);
  const dateStr = new Date().toLocaleDateString('en-IN', { dateStyle: 'long' });

  return `CABINET POLICY BRIEF
Government Project Prioritization Report
Date: ${dateStr}
Situation: ${sit.name}

EXECUTIVE SUMMARY
This brief presents the AI-assisted evaluation of ${state.evaluatedPlans.length} government plans submitted across ${[...new Set(state.evaluatedPlans.map(p => p.sector))].length} sectors. Under the current scenario of "${sit.name}" (Inflation: ${sit.inflation}, Fiscal Stress: ${sit.fiscalStress}), this analysis recommends immediate mobilization of ${high.length} high-priority projects, careful scheduling of ${medium.length} medium-priority projects, and deferral or revision of ${low.length} lower-priority proposals.

SITUATIONAL CONTEXT
${sit.description}
Key national challenges include: ${(sit.criticalIssues || []).join(', ')}.
Cabinet priority sectors: ${(sit.priorities || []).join(', ')}.
${sit.emergencySector ? `Emergency sector requiring immediate action: ${sit.emergencySector}.` : ''}

RECOMMENDED IMMEDIATE ACTIONS (HIGH PRIORITY)
${high.length === 0 ? 'No plans qualified for high priority under current conditions.' : high.map(p => `• ${p.title} (${p.sector}) — ₹${p.budget} Cr — Start: Month ${p.recommendedStartMonth}\n  AI Score: ${p.score}/100 — ${(p.reasoning || [])[0] || ''}`).join('\n\n')}

PHASED IMPLEMENTATION (MEDIUM PRIORITY)
${medium.length === 0 ? 'No plans in medium priority tier.' : medium.map(p => `• ${p.title} (${p.sector}) — ₹${p.budget} Cr — Recommended Start: Month ${p.recommendedStartMonth}\n  ${p.timingAnalysis}`).join('\n\n')}

DEFERRED / REVISED PROPOSALS (LOW PRIORITY)
${low.length === 0 ? 'No plans flagged for deferral.' : low.map(p => `• ${p.title} — Score: ${p.score}/100 — ${(p.reasoning || [])[0] || 'Review recommended.'}`).join('\n')}

BUDGET & FISCAL IMPACT
Total Capital Requirement across all evaluated plans: ₹${total} Crores
High-priority plans require: ₹${high.reduce((a, b) => a + b.budget, 0)} Crores (immediate disbursement)
Medium-priority requires: ₹${medium.reduce((a, b) => a + b.budget, 0)} Crores (phased over the year)
Deferred plans total: ₹${low.reduce((a, b) => a + b.budget, 0)} Crores

CONCLUSION & CABINET DIRECTIVE
The AI Planning Engine recommends that the Cabinet Committee immediately sanction funding for the ${high.length} high-priority plans. The Ministry of Finance should ring-fence ₹${high.reduce((a, b) => a + b.budget, 0)} Crores for immediate project commencement. Planning Commission to monitor implementation milestones monthly and escalate any deviation from the recommended schedule.`;
}

function renderReportDocument(text) {
  const container = $('report-content-area');
  if (!container) return;

  // Convert text to HTML
  const sections = text.split('\n').map(line => {
    line = line.trim();
    if (!line) return '<br>';
    if (line.match(/^#{1,2} |^[A-Z &]+:$|^[A-Z][A-Z\s&\/()]+$/) || line.match(/^(EXECUTIVE|SITUATIONAL|RECOMMENDED|PHASED|DEFERRED|BUDGET|CONCLUSION|CABINET|RISK)/)) {
      return `<h2>${escHtml(line)}</h2>`;
    }
    if (line.startsWith('•') || line.startsWith('-')) {
      return `<p style="padding-left:1.5rem;position:relative"><span style="position:absolute;left:0;color:var(--blue-light)">▸</span>${escHtml(line.slice(1).trim())}</p>`;
    }
    return `<p>${escHtml(line)}</p>`;
  }).join('');

  const dateStr = new Date().toLocaleDateString('en-IN', { dateStyle: 'long' });
  const high = state.evaluatedPlans.filter(p => p.priorityClass === 'High').length;

  container.innerHTML = `
    <div class="report-document">
      <h1>🏛 Cabinet Policy Brief</h1>
      <div class="report-meta">
        <span>📅 Generated: ${dateStr}</span>
        <span>🏛 Situation: ${escHtml(state.currentSituation?.name || 'Standard')}</span>
        <span>📋 Plans Evaluated: ${state.evaluatedPlans.length}</span>
        <span>🔴 High Priority: ${high}</span>
        <span>👤 By: ${escHtml(state.user?.username || 'System')}</span>
      </div>
      <div class="report-body">${sections}</div>
      <div class="report-actions">
        <button class="btn btn-primary" onclick="saveReport()">💾 Save Report</button>
        <button class="btn btn-ghost" onclick="window.print()">🖨 Print / Export</button>
      </div>
    </div>`;
}

async function saveReport() {
  if (!state.currentReport) return;
  try {
    const res = await api('POST', '/api/reports', {
      title: `Policy Brief — ${state.currentSituation?.name} — ${new Date().toLocaleDateString('en-IN')}`,
      content: state.currentReport,
      generatedBy: state.user?.username || 'System'
    });
    state.savedReports.unshift(res.data);
    loadSavedReports();
    toast('Report saved to archive!', 'success');
  } catch (err) {
    toast(`Save failed: ${err.message}`, 'error');
  }
}

async function loadSavedReports() {
  try {
    const res = await api('GET', '/api/reports');
    state.savedReports = res.data || [];
    renderSavedReports();
  } catch (err) {
    console.error('Failed to load reports:', err.message);
  }
}

function renderSavedReports() {
  const list = $('saved-reports-list');
  if (!list) return;

  if (state.savedReports.length === 0) {
    list.innerHTML = '<div class="empty-state" style="padding:1.5rem">No saved reports yet.</div>';
    return;
  }

  list.innerHTML = state.savedReports.map(r => {
    const date = new Date(r.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    return `
    <div class="saved-report-item">
      <div>
        <div class="saved-report-title">📄 ${escHtml(r.title)}</div>
        <div class="saved-report-date">${date} · By ${escHtml(r.generatedBy)}</div>
      </div>
      <div style="display:flex;gap:0.5rem">
        <button class="btn btn-ghost" style="padding:0.4rem 0.8rem;font-size:0.78rem" onclick="viewSavedReport('${r.id}')">View</button>
        <button class="btn btn-danger" style="padding:0.4rem 0.8rem;font-size:0.78rem" onclick="deleteSavedReport('${r.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function viewSavedReport(reportId) {
  const report = state.savedReports.find(r => r.id === reportId);
  if (!report) return;
  state.currentReport = report.content;
  renderReportDocument(report.content);
  switchTab('report');
}

async function deleteSavedReport(reportId) {
  if (!confirm('Delete this report permanently?')) return;
  try {
    await api('DELETE', `/api/reports/${reportId}`);
    state.savedReports = state.savedReports.filter(r => r.id !== reportId);
    renderSavedReports();
    toast('Report deleted.', 'info');
  } catch (err) {
    toast('Delete failed: ' + err.message, 'error');
  }
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────

async function loadHistory() {
  try {
    const res = await api('GET', '/api/evaluations');
    state.historyRecords = res.data || [];
    renderHistoryGrid();
  } catch (err) {
    console.error('Failed to load history:', err.message);
  }
}

function renderHistoryGrid() {
  const grid = $('history-grid');
  if (!grid) return;

  if (state.historyRecords.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🗂️</div>
        <h3>No History Logged</h3>
        <p>Complete an AI evaluation and save it to the Cabinet Registry to see records here.</p>
      </div>`;
    return;
  }

  grid.innerHTML = state.historyRecords.map(record => {
    const date = new Date(record.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const sit = record.situationContext || {};

    return `
    <div class="history-card">
      <div class="history-card-header">
        <div>
          <div class="history-card-title">🤖 ${escHtml(sit.name || 'AI Evaluation')}</div>
          <div class="history-card-date">${date}</div>
        </div>
        <span class="eval-by-badge">By: ${escHtml(record.evaluatedBy || 'System')}</span>
      </div>
      <div class="history-metrics">
        <div class="hist-metric">
          <div class="hist-metric-val">${record.planCount || 0}</div>
          <div class="hist-metric-label">Plans</div>
        </div>
        <div class="hist-metric">
          <div class="hist-metric-val" style="color:var(--high)">${record.highPriorityCount || 0}</div>
          <div class="hist-metric-label">High Priority</div>
        </div>
        <div class="hist-metric">
          <div class="hist-metric-val">₹${record.totalBudget || 0}</div>
          <div class="hist-metric-label">Total Budget (Cr)</div>
        </div>
      </div>
      <div class="history-card-actions">
        <button class="btn btn-ghost" style="flex:1;font-size:0.8rem" onclick="restoreEvaluation('${record.id}')">
          📂 Restore Session
        </button>
        <button class="btn btn-danger" style="font-size:0.8rem" onclick="deleteHistoryRecord('${record.id}')">
          🗑 Delete
        </button>
      </div>
    </div>`;
  }).join('');
}

function restoreEvaluation(recordId) {
  const record = state.historyRecords.find(r => r.id === recordId);
  if (!record) return;

  state.evaluatedPlans = record.evaluatedPlans || [];
  if (record.situationContext) state.currentSituation = record.situationContext;

  switchTab('analyze');
  renderAnalysisResults();
  updateEvalSummaryBar();
  toast(`Session restored from ${new Date(record.timestamp).toLocaleDateString('en-IN')}`, 'success');
}

async function deleteHistoryRecord(recordId) {
  if (!confirm('Delete this evaluation record?')) return;
  try {
    await api('DELETE', `/api/evaluations/${recordId}`);
    state.historyRecords = state.historyRecords.filter(r => r.id !== recordId);
    renderHistoryGrid();
    toast('Record deleted.', 'info');
  } catch (err) {
    toast('Delete failed: ' + err.message, 'error');
  }
}

// ─── DASHBOARD REFRESH ────────────────────────────────────────────────────────

function animateCounter(el, targetVal, prefix = '', suffix = '') {
  if (!el) return;
  const start = 0;
  const duration = 800;
  const startTime = performance.now();
  const isNumeric = !isNaN(parseFloat(targetVal));
  if (!isNumeric) { el.textContent = prefix + targetVal + suffix; return; }
  const target = parseFloat(targetVal);
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;
    el.textContent = prefix + (Number.isInteger(target) ? Math.round(current) : current.toFixed(1)) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

async function refreshDashboard() {
  // Fetch stats from backend
  try {
    const res = await api('GET', '/api/stats');
    const stats = res.data;
    animateCounter($('stat-val-plans'), stats.totalPlans);
    animateCounter($('stat-val-evals'), stats.totalEvaluations);
    $('stat-val-budget').textContent = `₹${stats.totalBudget} Cr`;
  } catch (err) {
    animateCounter($('stat-val-plans'), state.plans.length);
    animateCounter($('stat-val-evals'), state.historyRecords.length);
    $('stat-val-budget').textContent = `₹${state.plans.reduce((a, b) => a + (b.budget || 0), 0)} Cr`;
  }

  // High priority count from local evaluated
  const high = state.evaluatedPlans.filter(p => p.priorityClass === 'High').length;
  $('stat-val-high').textContent = high || '—';

  // Recent plans list
  renderRecentPlans();

  // Sector chart
  renderSectorChart();
}

function renderRecentPlans() {
  const list = $('recent-plans-list');
  if (!list) return;

  const recent = state.plans.slice(0, 5);
  if (recent.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding:1.5rem">No plans submitted yet. <a href="#" onclick="switchTab('submit')">Submit one →</a></div>`;
    return;
  }

  list.innerHTML = recent.map(p => {
    const evaluated = state.evaluatedPlans.find(e => e.id === p.id);
    return `
    <div class="recent-plan-item" onclick="openPlanModal('${p.id}')">
      <div>
        <div class="plan-item-name">${escHtml(p.title)}</div>
        <div class="plan-item-meta">₹${p.budget} Cr · ${p.duration} months · ${escHtml(p.submittedBy)}</div>
      </div>
      ${evaluated
        ? `<span class="priority-badge ${evaluated.priorityClass}" style="font-size:0.7rem">${evaluated.priorityClass}</span>`
        : `<span class="plan-item-sector">${escHtml(p.sector)}</span>`
      }
    </div>`;
  }).join('');
}

function renderSectorChart() {
  const el = $('sector-chart');
  if (!el) return;

  const plans = state.plans.length > 0 ? state.plans : [];
  const sectorCounts = {};
  plans.forEach(p => {
    sectorCounts[p.sector] = (sectorCounts[p.sector] || 0) + 1;
  });

  const entries = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(e => e[1]), 1);

  if (entries.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:1.5rem">No data yet.</div>';
    return;
  }

  el.innerHTML = entries.map(([sector, count]) => {
    const pct = (count / max) * 100;
    return `
    <div class="sector-bar-row">
      <div class="sector-bar-label">
        <span>${escHtml(sector)}</span>
        <span>${count} plan${count > 1 ? 's' : ''}</span>
      </div>
      <div class="sector-bar-track">
        <div class="sector-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
  }).join('');
}

// ─── UTILITY ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createParticles() {
  const container = $('particles-container');
  if (!container) return;
  const colors = [
    'rgba(99, 130, 255, 0.7)',
    'rgba(240, 180, 41, 0.5)',
    'rgba(16, 185, 129, 0.5)',
    'rgba(139, 92, 246, 0.6)',
    'rgba(6, 182, 212, 0.5)',
    'rgba(244, 63, 94, 0.4)',
  ];
  const count = 45;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 1 + Math.random() * 3.5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100 + 100}%;
      animation-duration: ${6 + Math.random() * 14}s;
      animation-delay: ${-Math.random() * 14}s;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      box-shadow: 0 0 ${size * 3}px ${color};
    `;
    container.appendChild(p);
  }
}

// ─── INIT APP ────────────────────────────────────────────────────────────────

async function initApp() {
  // Set user info in header
  if (state.user) {
    $('user-name').textContent = state.user.username;
    $('user-role').textContent = state.user.role || 'Officer';
    $('user-avatar').textContent = state.user.username[0].toUpperCase();
  }

  // Init situation
  initSituationSelector();

  // Load plans from backend
  await loadPlans();

  // Refresh dashboard
  await refreshDashboard();

  // Init plan form
  initPlanForm();

  // Load history
  await loadHistory();

  // Check AI API key status and update UI
  await refreshApiKeyStatus();
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Set default admin session since login is removed
  state.user = { username: 'admin', role: 'Chief Planning Officer' };
  
  // Directly initialize the app
  initApp();

  // Tab navigation
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab) { switchTab(tab); if (tab === 'todo') loadTodos(); }
    });
  });

  // Tab links in content
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-tab-link]');
    if (link) {
      e.preventDefault();
      switchTab(link.dataset.tabLink);
    }
  });

  // AI Run Buttons
  $('run-ai-btn')?.addEventListener('click', () => { switchTab('analyze'); runAIEvaluation(); });
  $('quick-analyze-btn')?.addEventListener('click', () => { switchTab('analyze'); runAIEvaluation(); });

  // Save evaluation
  $('save-evaluation-btn')?.addEventListener('click', saveEvaluation);

  // Generate report
  $('generate-report-btn')?.addEventListener('click', generateReport);

  // Load demo plans
  $('load-demo-plans-btn')?.addEventListener('click', loadDemoPlans);

  // Filter plans
  $('filter-sector')?.addEventListener('change', renderPlansGrid);

  // Modal close
  $('modal-close-btn')?.addEventListener('click', closePlanModal);
  $('modal-backdrop')?.addEventListener('click', closePlanModal);

  // Refresh history
  $('refresh-history-btn')?.addEventListener('click', loadHistory);

  // Keyboard: Escape closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePlanModal();
  });
});

// Make some functions globally accessible (for inline onclick)
window.switchTab = switchTab;
window.openPlanModal = openPlanModal;
window.deletePlan = deletePlan;
window.restoreEvaluation = restoreEvaluation;
window.deleteHistoryRecord = deleteHistoryRecord;
window.saveReport = saveReport;
window.viewSavedReport = viewSavedReport;
window.deleteSavedReport = deleteSavedReport;
window.showApiKeyModal = showApiKeyModal;
window.saveApiKeyFromModal = saveApiKeyFromModal;
window.removeApiKeyAction = removeApiKeyAction;


// ================================================================
// TODO LIST MODULE
// ================================================================

const todoState = {
  todos: [],
  filter: 'all',
  sort: 'created_desc'
};

function handleServerlessTodoApi(method, path, body) {
  const getDB = () => {
    let db;
    try { db = JSON.parse(localStorage.getItem('govassign_db')); } catch (_) {}
    if (!db) db = { plans: [], evaluations: [], reports: [], todos: [] };
    if (!db.todos) db.todos = [];
    return db;
  };
  const saveDB = (db) => localStorage.setItem('govassign_db', JSON.stringify(db));

  const db = getDB();

  // GET /api/todos
  if (path === '/api/todos' && method === 'GET') {
    return { success: true, data: db.todos };
  }

  // POST /api/todos
  if (path === '/api/todos' && method === 'POST') {
    const todo = {
      ...body,
      id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    db.todos.push(todo);
    saveDB(db);
    return { success: true, data: todo };
  }

  // PATCH /api/todos/:id
  if (path.startsWith('/api/todos/') && method === 'PATCH') {
    const id = path.split('/').pop();
    const idx = db.todos.findIndex(t => t.id === id);
    if (idx !== -1) {
      const updates = body;
      const todo = db.todos[idx];
      if ('completed' in updates) {
        todo.completed = Boolean(updates.completed);
        todo.completedAt = todo.completed ? new Date().toISOString() : null;
      }
      const fields = ['title', 'description', 'priority', 'dueDate', 'sector', 'assignee'];
      fields.forEach(f => { if (f in updates) todo[f] = updates[f]; });
      db.todos[idx] = todo;
      saveDB(db);
      return { success: true, data: todo };
    }
  }

  // DELETE /api/todos/:id
  if (path.startsWith('/api/todos/') && method === 'DELETE') {
    const id = path.split('/').pop();
    db.todos = db.todos.filter(t => t.id !== id);
    saveDB(db);
    return { success: true };
  }

  // DELETE /api/todos/bulk/completed
  if (path === '/api/todos/bulk/completed' && method === 'DELETE') {
    const removed = db.todos.filter(t => t.completed).length;
    db.todos = db.todos.filter(t => !t.completed);
    saveDB(db);
    return { success: true, removed };
  }

  throw new Error(`Todo Endpoint ${method} ${path} not mock-implemented.`);
}

async function todoApi(method, path, body) {
  if (GovAI.isServerless) {
    return handleServerlessTodoApi(method, path, body);
  }
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(path, opts);
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 404) {
        console.warn("Todo endpoint 404. Falling back to client-side localStorage.");
        return handleServerlessTodoApi(method, path, body);
      }
      throw new Error(data.error || 'API error ' + res.status);
    }
    return data;
  } catch (err) {
    console.warn("Express server unreachable for Todos. Using client-side localStorage.", err.message);
    return handleServerlessTodoApi(method, path, body);
  }
}

async function loadTodos() {
  try {
    const res = await todoApi('GET', '/api/todos');
    todoState.todos = res.data || [];
    renderTodoList();
    updateTodoStats();
  } catch (err) {
    console.warn('Todos load failed:', err.message);
  }
}

async function createTodo(fields) {
  if (!fields.title || !fields.title.trim()) { toast('Task title is required.', 'error'); return null; }
  try {
    const res = await todoApi('POST', '/api/todos', fields);
    todoState.todos.unshift(res.data);
    renderTodoList();
    updateTodoStats();
    toast('Task added!', 'success');
    return res.data;
  } catch (err) {
    toast('Failed to create task: ' + err.message, 'error');
    return null;
  }
}

async function toggleTodo(id, completed) {
  const idx = todoState.todos.findIndex(t => t.id === id);
  if (idx === -1) return;
  todoState.todos[idx].completed = completed;
  todoState.todos[idx].completedAt = completed ? new Date().toISOString() : null;
  renderTodoList();
  updateTodoStats();
  try {
    await todoApi('PATCH', '/api/todos/' + id, { completed });
  } catch (err) {
    todoState.todos[idx].completed = !completed;
    renderTodoList();
    updateTodoStats();
    toast('Failed to update task.', 'error');
  }
}

async function deleteTodo(id) {
  const el = document.querySelector('[data-todo-id="' + id + '"]');
  if (el) { el.classList.add('todo-removing'); await new Promise(r => setTimeout(r, 280)); }
  try {
    await todoApi('DELETE', '/api/todos/' + id);
    todoState.todos = todoState.todos.filter(t => t.id !== id);
    renderTodoList();
    updateTodoStats();
    toast('Task deleted.', 'info');
  } catch (err) {
    toast('Failed to delete: ' + err.message, 'error');
    if (el) el.classList.remove('todo-removing');
  }
}

async function clearCompletedTodos() {
  const count = todoState.todos.filter(t => t.completed).length;
  if (count === 0) { toast('No completed tasks to clear.', 'info'); return; }
  if (!confirm('Clear ' + count + ' completed task' + (count > 1 ? 's' : '') + '?')) return;
  try {
    await todoApi('DELETE', '/api/todos/bulk/completed');
    todoState.todos = todoState.todos.filter(t => !t.completed);
    renderTodoList();
    updateTodoStats();
    toast('Cleared ' + count + ' completed task' + (count > 1 ? 's' : '') + '.', 'success');
  } catch (err) {
    toast('Failed to clear: ' + err.message, 'error');
  }
}

function isOverdue(t) {
  if (t.completed || !t.dueDate) return false;
  return new Date(t.dueDate + 'T23:59:59') < new Date();
}

function formatDueDate(dateStr, completed) {
  if (!dateStr) return null;
  const due = new Date(dateStr + 'T23:59:59');
  const diffMs = due - Date.now();
  const diffDays = Math.ceil(diffMs / 86400000);
  if (completed) return { label: 'Done ' + due.toLocaleDateString('en-IN', {day:'numeric',month:'short'}), cls: 'done-ok' };
  if (diffMs < 0) return { label: 'Overdue by ' + Math.abs(diffDays) + 'd', cls: 'overdue' };
  if (diffDays === 0) return { label: 'Due today!', cls: 'due-soon' };
  if (diffDays === 1) return { label: 'Due tomorrow', cls: 'due-soon' };
  if (diffDays <= 7) return { label: 'Due in ' + diffDays + 'd', cls: 'due-soon' };
  return { label: due.toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'2-digit'}), cls: '' };
}

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const h = Math.floor(mins / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function getFilteredSortedTodos() {
  const pOrd = { High: 0, Medium: 1, Low: 2 };
  let todos = [...todoState.todos];
  switch (todoState.filter) {
    case 'pending':   todos = todos.filter(t => !t.completed); break;
    case 'completed': todos = todos.filter(t => t.completed); break;
    case 'High': case 'Medium': case 'Low': todos = todos.filter(t => t.priority === todoState.filter); break;
    case 'overdue': todos = todos.filter(t => isOverdue(t)); break;
  }
  switch (todoState.sort) {
    case 'created_asc':  todos.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
    case 'created_desc': todos.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    case 'due_asc': todos.sort((a,b) => !a.dueDate ? 1 : !b.dueDate ? -1 : new Date(a.dueDate) - new Date(b.dueDate)); break;
    case 'priority': todos.sort((a,b) => (pOrd[a.priority]??9) - (pOrd[b.priority]??9)); break;
    case 'alpha': todos.sort((a,b) => a.title.localeCompare(b.title)); break;
  }
  return todos;
}

function renderTodoItem(t) {
  const dueInfo = t.dueDate ? formatDueDate(t.dueDate, t.completed) : null;
  const overdueFlag = isOverdue(t);
  return '<div class="todo-item priority-' + t.priority + (t.completed ? ' todo-completed' : '') + (overdueFlag ? ' todo-overdue-item' : '') + '" data-todo-id="' + t.id + '">' +
    '<input type="checkbox" class="todo-checkbox" ' + (t.completed ? 'checked' : '') + ' onchange="toggleTodo(\'' + t.id + '\', this.checked)" />' +
    '<div class="todo-content">' +
      '<div class="todo-title">' + escapeHtml(t.title) + '</div>' +
      (t.description ? '<div class="todo-desc">' + escapeHtml(t.description) + '</div>' : '') +
      '<div class="todo-meta-row">' +
        '<span class="todo-priority-badge ' + t.priority + '">' + t.priority + '</span>' +
        (t.sector ? '<span class="todo-sector-chip">' + escapeHtml(t.sector) + '</span>' : '') +
        (dueInfo ? '<span class="todo-due-date ' + dueInfo.cls + '">&#x1F4C5; ' + dueInfo.label + '</span>' : '') +
        (t.assignee ? '<span class="todo-assignee">&#x1F464; ' + escapeHtml(t.assignee) + '</span>' : '') +
        '<span class="todo-due-date" style="margin-left:auto;opacity:.6">&#x1F551; ' + timeAgo(t.createdAt) + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="todo-actions">' +
      '<button class="todo-action-btn delete" onclick="deleteTodo(\'' + t.id + '\')" title="Delete">&#x1F5D1;</button>' +
    '</div>' +
  '</div>';
}

function renderTodoList() {
  const container = document.getElementById('todo-list');
  if (!container) return;
  const todos = getFilteredSortedTodos();
  if (todos.length === 0) {
    const emptyMsgs = {
      all: ['&#x1F4DD;', 'No Tasks Yet', 'Use the bar above to add your first task.'],
      pending: ['&#x1F389;', 'All Caught Up!', 'No pending tasks. Great work!'],
      completed: ['&#x1F4CB;', 'Nothing Completed Yet', 'Complete a task to see it here.'],
      overdue: ['&#x2705;', 'No Overdue Tasks', 'Everything is on schedule!']
    };
    const m = emptyMsgs[todoState.filter] || emptyMsgs.all;
    container.innerHTML = '<div class="todo-empty"><span class="todo-empty-icon">' + m[0] + '</span><h3>' + m[1] + '</h3><p>' + m[2] + '</p></div>';
    return;
  }
  const pending = todos.filter(t => !t.completed);
  const completed = todos.filter(t => t.completed);
  let html = '';
  if (todoState.filter === 'all' && pending.length > 0 && completed.length > 0) {
    html = pending.map(renderTodoItem).join('');
    html += '<div class="todo-section-label">Completed (' + completed.length + ')</div>';
    html += completed.map(renderTodoItem).join('');
  } else {
    html = todos.map(renderTodoItem).join('');
  }
  container.innerHTML = html;
}

function updateTodoStats() {
  const t = todoState.todos;
  if (window.animateCounter) {
    animateCounter(document.getElementById('todo-stat-total'), t.length);
    animateCounter(document.getElementById('todo-stat-pending'), t.filter(x => !x.completed).length);
    animateCounter(document.getElementById('todo-stat-done'), t.filter(x => x.completed).length);
    animateCounter(document.getElementById('todo-stat-overdue'), t.filter(x => isOverdue(x)).length);
  } else {
    if (document.getElementById('todo-stat-total')) document.getElementById('todo-stat-total').textContent = t.length;
    if (document.getElementById('todo-stat-pending')) document.getElementById('todo-stat-pending').textContent = t.filter(x => !x.completed).length;
    if (document.getElementById('todo-stat-done')) document.getElementById('todo-stat-done').textContent = t.filter(x => x.completed).length;
    if (document.getElementById('todo-stat-overdue')) document.getElementById('todo-stat-overdue').textContent = t.filter(x => isOverdue(x)).length;
  }
}

async function submitQuickTodo() {
  const input = document.getElementById('todo-quick-input');
  const title = input ? input.value.trim() : '';
  if (!title) { if (input) input.focus(); return; }
  const priority = (document.getElementById('todo-quick-priority') || {}).value || 'Medium';
  const dueDate = (document.getElementById('todo-quick-date') || {}).value || null;
  await createTodo({ title, priority, dueDate });
  if (input) input.value = '';
  const dateEl = document.getElementById('todo-quick-date');
  if (dateEl) dateEl.value = '';
  const prioEl = document.getElementById('todo-quick-priority');
  if (prioEl) prioEl.value = 'Medium';
}

async function submitFullTodo() {
  const titleEl = document.getElementById('todo-full-title');
  const title = titleEl ? titleEl.value.trim() : '';
  if (!title) { toast('Task title is required.', 'error'); if (titleEl) titleEl.focus(); return; }
  const fields = {
    title,
    description: (document.getElementById('todo-full-desc') || {}).value || '',
    priority: (document.getElementById('todo-full-priority') || {}).value || 'Medium',
    sector: (document.getElementById('todo-full-sector') || {}).value || '',
    dueDate: (document.getElementById('todo-full-due') || {}).value || null,
    assignee: (document.getElementById('todo-full-assignee') || {}).value || ''
  };
  const result = await createTodo(fields);
  if (result) {
    ['todo-full-title','todo-full-desc','todo-full-assignee'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const dueEl = document.getElementById('todo-full-due'); if (dueEl) dueEl.value = '';
    const prioEl = document.getElementById('todo-full-priority'); if (prioEl) prioEl.value = 'Medium';
    const secEl = document.getElementById('todo-full-sector'); if (secEl) secEl.value = '';
    const panel = document.getElementById('todo-add-panel'); if (panel) panel.classList.remove('open');
  }
}

function initTodoListeners() {
  const qinput = document.getElementById('todo-quick-input');
  if (qinput) qinput.addEventListener('keydown', e => { if (e.key === 'Enter') submitQuickTodo(); });

  const qsubmit = document.getElementById('todo-quick-submit-btn');
  if (qsubmit) qsubmit.addEventListener('click', submitQuickTodo);

  const expandBtn = document.getElementById('todo-expand-form-btn');
  if (expandBtn) expandBtn.addEventListener('click', () => {
    const panel = document.getElementById('todo-add-panel');
    if (!panel) return;
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      const qt = document.getElementById('todo-quick-input');
      const ft = document.getElementById('todo-full-title');
      if (qt && ft && qt.value.trim()) { ft.value = qt.value.trim(); qt.value = ''; }
      if (ft) ft.focus();
    }
  });

  const toggleBtn = document.getElementById('todo-toggle-form-btn');
  if (toggleBtn) toggleBtn.addEventListener('click', () => {
    const panel = document.getElementById('todo-add-panel');
    if (!panel) return;
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) { const ft = document.getElementById('todo-full-title'); if (ft) ft.focus(); }
  });

  const cancelBtn = document.getElementById('todo-cancel-form-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    const panel = document.getElementById('todo-add-panel'); if (panel) panel.classList.remove('open');
  });

  const fullBtn = document.getElementById('todo-full-submit-btn');
  if (fullBtn) fullBtn.addEventListener('click', submitFullTodo);

  const clearBtn = document.getElementById('todo-clear-completed-btn');
  if (clearBtn) clearBtn.addEventListener('click', clearCompletedTodos);

  const filters = document.getElementById('todo-filters');
  if (filters) filters.addEventListener('click', e => {
    const btn = e.target.closest('[data-todo-filter]');
    if (!btn) return;
    document.querySelectorAll('[data-todo-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    todoState.filter = btn.dataset.todoFilter;
    renderTodoList();
  });

  const sortEl = document.getElementById('todo-sort');
  if (sortEl) sortEl.addEventListener('change', e => { todoState.sort = e.target.value; renderTodoList(); });
}

window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;


