/**
 * GovAssign AI Engine — xAI Grok Integration (Server-Proxied or Client-Direct)
 * All API calls go through /api/xai/chat on Express (if server is active) or
 * fallback directly to xAI if running on github.io or offline.
 */

const isServerless = window.location.hostname.endsWith('github.io') || 
                     window.location.protocol === 'file:' || 
                     window.location.search.includes('offline=true');

// ─── PRESET SITUATIONS ─────────────────────────────────────────────────────────

const PRESET_SITUATIONS = {
  default: {
    id: "default",
    name: "Standard Operations",
    description: "Stable economic indicators, moderate weather forecast, normal fiscal budget allocation across all ministries.",
    inflation: "Low (3.1%)",
    season: "Dry Season (Months 1–5), Monsoon (Months 6–9), Winter (Months 10–12)",
    fiscalStress: "None",
    criticalIssues: ["Infrastructure bottlenecks in rural sectors", "Digital divide in remote districts"],
    priorities: ["Infrastructure", "Education", "Digital/IT"],
    emergencySector: null,
    emoji: "🟢"
  },
  monsoon_crisis: {
    id: "monsoon_crisis",
    name: "Heavy Monsoon & Flood Emergency",
    description: "Severe weather alerts active for Months 3–6. Significant flooding risks in low-lying delta areas. Disaster relief budgets mobilized.",
    inflation: "Moderate (4.5%)",
    season: "Heavy Monsoons (Months 3–6), Risk of cyclones",
    fiscalStress: "Moderate (emergency fund diverted to disaster relief)",
    criticalIssues: ["High flooding hazard in 12 districts", "Rural road connectivity damage", "Waterborne disease risk", "Crop failure potential"],
    priorities: ["Water & Sanitation", "Healthcare", "Agriculture"],
    emergencySector: "Water & Sanitation",
    emoji: "🌊"
  },
  inflation_squeeze: {
    id: "inflation_squeeze",
    name: "High Inflation & Fiscal Austerity",
    description: "Economic downturn with 15% budget cut across non-essential capital investments. Import costs surging. Public cost of living at 10-year high.",
    inflation: "Critical (8.4%)",
    season: "Normal weather cycles",
    fiscalStress: "Critical (capital project freeze, high material costs)",
    criticalIssues: ["Cost overruns on construction materials", "Rising public cost of living", "Fiscal deficit widening", "Employment contraction"],
    priorities: ["Social Welfare", "Agriculture", "Energy"],
    emergencySector: "Social Welfare",
    emoji: "📈"
  },
  energy_transition: {
    id: "energy_transition",
    name: "Green Energy Transition Directive",
    description: "New legislative policy targeting 40% clean power grid integration within 12 months. Coal phase-out mandated by parliament.",
    inflation: "Moderate (4.0%)",
    season: "Normal weather cycles",
    fiscalStress: "Low (backed by green bond initiatives and international climate funding)",
    criticalIssues: ["Coal plant retirements creating grid gaps", "Grid instability in industrial zones", "High energy tariffs affecting SMEs"],
    priorities: ["Energy", "Digital/IT", "Infrastructure"],
    emergencySector: "Energy",
    emoji: "⚡"
  },
  pandemic_response: {
    id: "pandemic_response",
    name: "Public Health Emergency",
    description: "Localized outbreak of respiratory pathogen. Strict gathering limits in place. Hospital systems under stress. Supply chains disrupted.",
    inflation: "High (6.2%)",
    season: "Normal weather cycles",
    fiscalStress: "High (diversion of infrastructure budgets to public health response)",
    criticalIssues: ["Hospital bed & oxygen shortages", "Supply chain disruptions", "Remote learning infrastructure gap", "Vaccine cold chain requirements"],
    priorities: ["Healthcare", "Social Welfare", "Digital/IT"],
    emergencySector: "Healthcare",
    emoji: "🏥"
  }
};

// ─── DEMO PLANS ────────────────────────────────────────────────────────────────

const DEMO_PLANS = [
  {
    title: "District Hospital Upgrades & Oxygen Grid",
    sector: "Healthcare",
    description: "Expand isolation wards, install centralized liquid oxygen tanks, and deploy telemedicine units in 14 rural hospitals across the state.",
    objectives: "Improve emergency medical readiness, expand rural health equity, and scale ICU bed count by 40%.",
    budget: 85,
    duration: 6,
    startMonth: 2,
    dependencies: "Medical supply imports, rural electricity stability, biomedical technician recruitment",
    submittedBy: "Dr. Meena Sharma",
    department: "Ministry of Health & Family Welfare"
  },
  {
    title: "National Highway NH-42 Paving & Bridge Repairs",
    sector: "Infrastructure",
    description: "Major road widening, asphalt paving, and structural bridge reinforcing along the 320 km transport corridor connecting industrial zones.",
    objectives: "Improve logistics speed by 35%, reduce traffic accidents by 50%, and connect 8 isolated manufacturing clusters.",
    budget: 150,
    duration: 8,
    startMonth: 3,
    dependencies: "Heavy machinery availability, dry weather window, right-of-way clearances",
    submittedBy: "Eng. Rajiv Nair",
    department: "Ministry of Road Transport & Highways"
  },
  {
    title: "Solar Microgrid Deployment for Off-Grid Villages",
    sector: "Energy",
    description: "Install decentralized solar arrays and lithium-ion storage banks in 120 remote mountain villages currently dependent on kerosene.",
    objectives: "Replace kerosene lamps, provide clean electricity to 45,000 rural households, support digital learning centers.",
    budget: 45,
    duration: 5,
    startMonth: 1,
    dependencies: "Solar panel logistics chain, local land acquisition clearances, community training",
    submittedBy: "Ms. Priya Iyer",
    department: "Ministry of New & Renewable Energy"
  },
  {
    title: "Drip Irrigation & Precision Agriculture Initiative",
    sector: "Agriculture",
    description: "Subsidize and install drip irrigation systems for 5,000 small farmers, combined with digital soil nutrients analysis and crop advisory apps.",
    objectives: "Reduce groundwater depletion by 30%, increase crop yield by 25%, safeguard farmer livelihoods.",
    budget: 30,
    duration: 4,
    startMonth: 5,
    dependencies: "Agricultural co-op registration, farmer training workshops, mobile connectivity in rural areas",
    submittedBy: "Shri. Arun Verma",
    department: "Ministry of Agriculture & Farmers Welfare"
  },
  {
    title: "State Digital Classroom & Fiber Network",
    sector: "Education",
    description: "Deploy high-speed fiber internet and interactive smartboards to 800 public schools in low-income districts. Teacher training included.",
    objectives: "Close digital divide for 2.4 lakh students, modernize curricula, enable remote teaching during emergencies.",
    budget: 65,
    duration: 7,
    startMonth: 4,
    dependencies: "ISP fiber backbone infrastructure, teacher training schedules, electricity stability in target schools",
    submittedBy: "Mrs. Lakshmi Krishnan",
    department: "Ministry of Education"
  },
  {
    title: "Urban Drainage Expansion & Flood Mitigation",
    sector: "Water & Sanitation",
    description: "Re-engineer low-lying city drain networks and replace deteriorating concrete pipes to increase stormwater capacity by 60%.",
    objectives: "Minimize flash-flooding in 5 high-density urban wards, upgrade waste treatment compliance to national standards.",
    budget: 90,
    duration: 6,
    startMonth: 2,
    dependencies: "Municipal easements, structural steel procurement, underground utility mapping",
    submittedBy: "Er. Suresh Pawar",
    department: "Ministry of Jal Shakti"
  },
  {
    title: "Direct Benefit Transfer for Underemployed Families",
    sector: "Social Welfare",
    description: "Direct cash transfers to the bottom 10% income tier, coupled with vocational retraining registration at ITIs across 8 states.",
    objectives: "Provide financial cushion for 8 lakh families, alleviate rural poverty, stimulate domestic consumer spending by ₹2,000 Cr.",
    budget: 120,
    duration: 12,
    startMonth: 1,
    dependencies: "Biometric bank account verification, Aadhaar seeding, state co-implementation agreements",
    submittedBy: "Dr. Kavita Singh",
    department: "Ministry of Labour & Employment"
  }
];

// ─── MONTH NAMES ───────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── LOCAL FALLBACK EVALUATION ────────────────────────────────────────────────

function evaluateLocally(plans, situation) {
  const priorities = situation.priorities || [];
  const emergencySector = situation.emergencySector;
  const isMonsoon = situation.id === "monsoon_crisis";
  const isAusterity = situation.id === "inflation_squeeze";

  return plans.map(plan => {
    let score = 68;
    const reasoning = [];
    const warnings = [];
    let recStart = plan.startMonth;
    let timingAnalysis = "Proposed schedule appears adequate for current conditions.";

    // 1. Sector alignment
    if (plan.sector === emergencySector) {
      score += 25;
      reasoning.push(`Emergency Match: Direct alignment with active emergency sector (${plan.sector}).`);
    } else {
      const idx = priorities.indexOf(plan.sector);
      if (idx !== -1) {
        const boost = 15 - idx * 4;
        score += boost;
        reasoning.push(`Priority Sector: Ranked #${idx + 1} in current cabinet directives for ${plan.sector}.`);
      } else {
        score -= 8;
        reasoning.push(`Secondary Sector: ${plan.sector} is not in current priority focus areas.`);
      }
    }

    // 2. Budget vs fiscal stress
    if (isAusterity) {
      if (plan.budget > 100) {
        score -= 22;
        reasoning.push(`Fiscal Risk: ₹${plan.budget} Cr is high during austerity. Large capital projects face cost overruns.`);
      } else if (plan.budget > 50) {
        score -= 10;
        reasoning.push(`Moderate Fiscal Pressure: ₹${plan.budget} Cr is feasible but inflation raises material costs by ~20%.`);
      } else {
        score += 10;
        reasoning.push(`Fiscal Advantage: Low capex (₹${plan.budget} Cr) makes this viable even under austerity.`);
      }
    } else {
      if (plan.budget > 120) {
        score -= 5;
        reasoning.push(`High Capital: ₹${plan.budget} Cr requires strict milestone auditing and phased disbursement.`);
      } else {
        score += 5;
        reasoning.push(`Budget Within Norms: ₹${plan.budget} Cr fits within standard sector allocation thresholds.`);
      }
    }

    // 3. Monsoon clash (outdoor infrastructure)
    const endMonth = plan.startMonth + plan.duration - 1;
    const monsoonMonths = { start: 3, end: 6 };
    const overlapsMonsoon = (plan.startMonth <= monsoonMonths.end && endMonth >= monsoonMonths.start);

    if (isMonsoon && overlapsMonsoon) {
      if (["Infrastructure", "Water & Sanitation"].includes(plan.sector)) {
        score -= 20;
        recStart = 7;
        warnings.push(`⚠️ Outdoor construction phases fall during peak monsoon (Months 3–6). Expect 2–3 month delays.`);
        timingAnalysis = `Schedule Conflict: Excavation and paving during heavy rains will cause major delays. Recommend shifting start to Month 7 (post-monsoon).`;
        reasoning.push(`Monsoon Conflict: Risk of soil erosion, mudslides, and concrete curing failures during peak rain.`);
      } else if (plan.sector === "Agriculture") {
        score += 12;
        timingAnalysis = `Seasonal Advantage: Monsoon aligns with planting cycle — ideal timing for irrigation and crop programs.`;
        reasoning.push(`Monsoon Benefit: Rain-fed agriculture programs perform best when timed with monsoon onset.`);
      }
    } else if (isMonsoon && plan.sector === "Water & Sanitation" && endMonth < monsoonMonths.start) {
      score += 10;
      reasoning.push(`Pre-emptive Win: Drainage upgrades complete before monsoon begins — maximum flood mitigation benefit.`);
      timingAnalysis = `Excellent Timing: Infrastructure will be ready before the monsoon flood season.`;
    }

    // 4. Social impact bonus
    if (["Healthcare", "Social Welfare"].includes(plan.sector)) {
      score += 8;
      reasoning.push(`Social Safety Net: Directly protects vulnerable populations with immediate implementation impact.`);
    }

    // 5. Import dependency risk
    if (plan.dependencies && plan.dependencies.toLowerCase().includes("import") && isAusterity) {
      score -= 7;
      warnings.push(`⚠️ Import dependency introduces foreign currency exposure risk during high inflation.`);
    }

    // Cap score
    score = Math.max(10, Math.min(97, score));

    let priorityClass = "Medium";
    if (score >= 75) priorityClass = "High";
    else if (score < 45) priorityClass = "Low";

    return {
      ...plan,
      score,
      priorityClass,
      recommendedStartMonth: recStart,
      reasoning,
      scheduleWarnings: warnings,
      timingAnalysis,
      feasibilityScore: Math.round(score * 0.88 + (12 - Math.min(plan.duration, 12)) * 1.2)
    };
  });
}

// ─── SERVER-PROXIED xAI EVALUATION ────────────────────────────────────────────

async function evaluateWithXAI(plans, situation) {
  const monthLabel = m => MONTH_NAMES[(m - 1) % 12] || `Month ${m}`;

  const prompt = `You are a Senior Advisor to the Cabinet and Ministry of Planning in the Government of India.

Your task is to evaluate a list of government plans (submitted by various ministries) for the upcoming fiscal year, based on the CURRENT REAL-TIME NATIONAL SITUATION.

═══ CURRENT NATIONAL SITUATION REPORT ═══
Scenario: ${situation.name}
Overview: ${situation.description}
Inflation Level: ${situation.inflation}
Fiscal Stress: ${situation.fiscalStress}
Active Season: ${situation.season}
Critical National Issues: ${(situation.criticalIssues || []).join("; ")}
Top Priority Sectors (by Cabinet directive): ${(situation.priorities || []).join(", ")}
Emergency Sector (if any): ${situation.emergencySector || "None"}

═══ SUBMITTED GOVERNMENT PLANS ═══
${JSON.stringify(plans.map((p, i) => ({
  index: i + 1,
  title: p.title,
  sector: p.sector,
  budget_crores: p.budget,
  duration_months: p.duration,
  proposed_start_month: p.startMonth,
  proposed_start_label: monthLabel(p.startMonth),
  objectives: p.objectives,
  dependencies: p.dependencies,
  submitted_by: p.submittedBy,
  department: p.department
})), null, 2)}

═══ EVALUATION INSTRUCTIONS ═══
For EACH plan, provide a rigorous government planning evaluation:

1. score (0–100): Overall alignment, urgency, feasibility under current situation
2. priorityClass: "High" (score ≥75), "Medium" (45–74), or "Low" (<45)
3. recommendedStartMonth (1–12): Optimal start considering weather, inflation, dependencies
4. reasoning: Array of 3–4 concise, policy-level bullet points covering:
   - Sector alignment with current national priorities
   - Budget feasibility under current fiscal stress
   - Seasonal/weather impact on implementation
   - Social or economic urgency
5. scheduleWarnings: Array of specific risk warnings (empty if none)
6. timingAnalysis: One paragraph explaining the recommended schedule and why
7. feasibilityScore (0–100): Implementation feasibility considering dependencies and capacity

Think like a government planning expert. Consider:
- Plans in emergency sectors should be fast-tracked
- Outdoor construction should avoid monsoon months (June–September typically, or Months 3–6 in monsoon_crisis scenario)
- High budget projects during austerity face significant risk
- Social welfare and healthcare always have high urgency
- Dependencies on imports during high inflation reduce feasibility

Return ONLY a valid JSON array — no markdown, no explanation. The array must have exactly ${plans.length} objects, in the same order as input, each with this structure:
{
  "score": 85,
  "priorityClass": "High",
  "recommendedStartMonth": 3,
  "reasoning": ["point 1", "point 2", "point 3"],
  "scheduleWarnings": ["warning if any"],
  "timingAnalysis": "Detailed scheduling rationale...",
  "feasibilityScore": 78
}`;

  // Call our server-side proxy or direct xAI API
  let response;
  if (isServerless) {
    const apiKey = localStorage.getItem('govassign_xai_key') || '';
    if (!apiKey) throw new Error('NO_API_KEY');
    response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 6000
      })
    });
  } else {
    response = await fetch('/api/xai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 6000
      })
    });
  }

  const data = await response.json();

  if (!response.ok) {
    if (data.error === 'NO_API_KEY' || (isServerless && response.status === 401)) {
      throw new Error('NO_API_KEY');
    }
    throw new Error(data.error || data.message || `API error ${response.status}`);
  }

  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty response from xAI API.");

  // Clean JSON
  let clean = raw.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // Find array boundaries
  const startIdx = clean.indexOf("[");
  const endIdx = clean.lastIndexOf("]");
  if (startIdx !== -1 && endIdx !== -1) {
    clean = clean.substring(startIdx, endIdx + 1);
  }

  const evalList = JSON.parse(clean);

  return plans.map((plan, i) => {
    const ev = evalList[i] || {};
    return {
      ...plan,
      score: ev.score ?? 50,
      priorityClass: ev.priorityClass ?? "Medium",
      recommendedStartMonth: ev.recommendedStartMonth ?? plan.startMonth,
      reasoning: ev.reasoning ?? ["Standard evaluation applied."],
      scheduleWarnings: ev.scheduleWarnings ?? [],
      timingAnalysis: ev.timingAnalysis ?? "Proposed schedule is acceptable.",
      feasibilityScore: ev.feasibilityScore ?? 60
    };
  });
}

// ─── MASTER EVALUATE FUNCTION ─────────────────────────────────────────────────

async function evaluatePlans(plans, situation, useAI = true) {
  if (useAI) {
    try {
      return await evaluateWithXAI(plans, situation);
    } catch (err) {
      console.warn("[AI Engine] xAI API failed, falling back to local engine:", err.message);
      throw err; // Let caller handle fallback decision
    }
  }
  return evaluateLocally(plans, situation);
}

// ─── REPORT GENERATOR ─────────────────────────────────────────────────────────

async function generatePolicyReport(evaluatedPlans, situation) {
  const highPlans = evaluatedPlans.filter(p => p.priorityClass === "High");
  const mediumPlans = evaluatedPlans.filter(p => p.priorityClass === "Medium");
  const lowPlans = evaluatedPlans.filter(p => p.priorityClass === "Low");
  const totalBudget = evaluatedPlans.reduce((a, b) => a + (b.budget || 0), 0);

  const prompt = `You are the Principal Secretary to the Cabinet Committee on Economic Affairs (CCEA), Government of India.

Generate a formal, structured CABINET POLICY BRIEF based on this AI evaluation of government plans.

SITUATION: ${situation.name}
Description: ${situation.description}
Current Inflation: ${situation.inflation}
Fiscal Stress: ${situation.fiscalStress}
Key Issues: ${(situation.criticalIssues || []).join("; ")}

EVALUATION RESULTS SUMMARY:
- Total Plans Evaluated: ${evaluatedPlans.length}
- HIGH Priority Plans (${highPlans.length}): ${highPlans.map(p => p.title).join(", ")}
- MEDIUM Priority Plans (${mediumPlans.length}): ${mediumPlans.map(p => p.title).join(", ")}
- LOW Priority Plans (${lowPlans.length}): ${lowPlans.map(p => p.title).join(", ")}
- Total Capital Required: ₹${totalBudget} Crores
- Priority Sector Focus: ${(situation.priorities || []).join(", ")}

HIGH PRIORITY DETAILS:
${highPlans.map(p => `• ${p.title} (₹${p.budget} Cr, ${p.sector}) — Score: ${p.score}/100 — Recommended Start: Month ${p.recommendedStartMonth}`).join("\n")}

Write a formal policy brief with these EXACT sections:
1. EXECUTIVE SUMMARY (2–3 sentences)
2. SITUATIONAL CONTEXT (current economic/weather/policy environment)
3. RECOMMENDED IMMEDIATE ACTIONS (High priority plans — what to implement NOW and why)
4. PHASED IMPLEMENTATION PLAN (Medium priority — timeline and conditions)
5. DEFERRED OR REVISED PROPOSALS (Low priority — what to delay and why)
6. RISK MITIGATION MEASURES (key risks and how to address them)
7. BUDGET & FISCAL IMPACT (overall treasury implications)
8. CONCLUSION & CABINET DIRECTIVE (final recommendation in 2–3 sentences)

Format: Professional government document style. Use formal language. Include specific plan names and figures.
Length: 600–900 words. Return as plain text with section headers.`;

  // Route through server proxy or direct xAI API
  let response;
  if (isServerless) {
    const apiKey = localStorage.getItem('govassign_xai_key') || '';
    if (!apiKey) throw new Error('NO_API_KEY');
    response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      })
    });
  } else {
    response = await fetch('/api/xai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      })
    });
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || `API error ${response.status}`);
  return data?.choices?.[0]?.message?.content || "Report generation failed.";
}

// ─── API KEY MANAGEMENT (client-side helpers) ──────────────────────────────────

async function checkApiKeyStatus() {
  if (isServerless) {
    const key = localStorage.getItem('govassign_xai_key') || '';
    return {
      hasApiKey: !!key,
      apiKeyPreview: key ? '••••••••' : null
    };
  }
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    return data.data || { hasApiKey: false, apiKeyPreview: null };
  } catch {
    return { hasApiKey: false, apiKeyPreview: null };
  }
}

async function saveApiKey(apiKey) {
  if (isServerless) {
    if (!apiKey || apiKey.trim().length < 10) throw new Error('Invalid API Key');
    localStorage.setItem('govassign_xai_key', apiKey.trim());
    return { success: true };
  }
  const res = await fetch('/api/settings/apikey', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save API key');
  return data;
}

async function removeApiKey() {
  if (isServerless) {
    localStorage.removeItem('govassign_xai_key');
    return { success: true };
  }
  const res = await fetch('/api/settings/apikey', { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to remove API key');
  return data;
}

// ─── EXPORTS (window-level for HTML/JS usage) ─────────────────────────────────
window.GovAI = {
  PRESET_SITUATIONS,
  DEMO_PLANS,
  MONTH_NAMES,
  evaluatePlans,
  evaluateLocally,
  generatePolicyReport,
  checkApiKeyStatus,
  saveApiKey,
  removeApiKey,
  isServerless
};
