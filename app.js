// ════════════════════════════════════════════════════════════
//  PlacementPrep AI — Orchestrator Agent (app.js)
//  Routes user to specialist agents, manages API key &
//  shared Gemini API utility.
// ════════════════════════════════════════════════════════════

// ── State ─────────────────────────────────────────
let currentView = 'home';
let geminiApiKey = 'AIzaSyASPJBNemAcrUqa1RIMUHtSxRw0gA9vqOE';

// ── Init ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    // API key is hardcoded — skip the modal entirely
    document.getElementById('api-modal').style.display = 'none';
    launchApp();
});

// ── API Key ───────────────────────────────────────
function saveApiKey() {
    const val = document.getElementById('api-key-input').value.trim();
    if (!val || val.length < 20) {
        document.getElementById('api-key-error').style.display = 'block';
        return;
    }
    geminiApiKey = val;
    localStorage.setItem('pp_gemini_key', val);
    document.getElementById('api-modal').style.display = 'none';
    launchApp();
}

function resetApiKey() {
    localStorage.removeItem('pp_gemini_key');
    geminiApiKey = '';
    document.getElementById('api-key-input').value = '';
    document.getElementById('api-key-error').style.display = 'none';
    document.getElementById('api-modal').style.display = 'flex';
}

// Allow pressing Enter in the API key input
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('api-key-input');
    if (input) {
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveApiKey(); });
    }
});

// ── App Launch ────────────────────────────────────
function launchApp() {
    document.getElementById('app').classList.remove('hidden');
    navigateTo('home');
}

// ── Navigation (Orchestrator routing) ─────────────
function navigateTo(viewName) {
    // Deactivate all views and nav items
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Activate target
    const view = document.getElementById(`view-${viewName}`);
    const nav = document.getElementById(`nav-${viewName}`);
    if (view) view.classList.add('active');
    if (nav) nav.classList.add('active');

    currentView = viewName;

    // Close mobile sidebar
    document.querySelector('.sidebar').classList.remove('open');

    // Initialize agent views on first load
    const renders = {
        resume: renderResumeAgent,
        interview: renderInterviewAgent,
        dsa: renderDSAAgent,
        skillgap: renderSkillGapAgent,
    };
    if (renders[viewName]) {
        const root = document.getElementById(`${viewName}-root`);
        // Only render if empty (avoid re-init on revisit mid-session for interview/dsa)
        if (root && root.innerHTML.trim() === '') {
            renders[viewName]();
        }
    }
}

// ── Mobile Sidebar ────────────────────────────────
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const hamburger = document.getElementById('hamburger-btn');
    if (sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && e.target !== hamburger) {
            sidebar.classList.remove('open');
        }
    }
});

// ── Gemini API ────────────────────────────────────
/**
 * callGemini(userPrompt, systemInstruction, jsonMode)
 * Calls the Gemini 2.5 Flash API. Set jsonMode=false for plain text responses.
 */
async function callGemini(userPrompt, systemInstruction = '', jsonMode = true) {
    if (!geminiApiKey) throw new Error('No API key set. Please add your Gemini API key.');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    const genConfig = {
        temperature: 0.7,
        maxOutputTokens: 8192,
    };
    if (jsonMode) {
        genConfig.responseMimeType = 'application/json';
    }

    const body = {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: genConfig
    };

    if (systemInstruction) {
        body.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `HTTP ${res.status}`;
        throw new Error(`Gemini API error: ${msg}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini. Please try again.');
    return text;
}

// ── JSON Extractor ────────────────────────────────
/**
 * extractJSON(rawText)
 * Robustly extracts JSON from Gemini responses that may contain
 * markdown fences, thinking text, or other wrapping.
 */
function extractJSON(rawText) {
    // First, try direct parse (works when responseMimeType = application/json)
    try { return JSON.parse(rawText.trim()); } catch (e) { /* fall through */ }

    // Strip markdown fences
    let text = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Try direct parse again after stripping fences
    try { return JSON.parse(text); } catch (e) { /* fall through */ }

    // Find the first { or [
    const startObj = text.indexOf('{');
    const startArr = text.indexOf('[');
    let start = -1;
    if (startObj === -1 && startArr === -1) throw new Error('No JSON found in model response.');
    if (startObj === -1) start = startArr;
    else if (startArr === -1) start = startObj;
    else start = Math.min(startObj, startArr);

    const opener = text[start];
    const closer = opener === '{' ? '}' : ']';

    // Find matching close bracket — skip over quoted strings
    let depth = 0, end = -1, inString = false, escape = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{' || ch === '[') depth++;
        else if (ch === '}' || ch === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) throw new Error('Malformed JSON in model response.');

    try {
        return JSON.parse(text.slice(start, end + 1));
    } catch (e) {
        throw new Error('Failed to parse JSON from model response: ' + e.message);
    }
}
