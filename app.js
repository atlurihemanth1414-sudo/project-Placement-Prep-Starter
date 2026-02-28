// ════════════════════════════════════════════════════════════
//  PlacementPrep AI — Orchestrator Agent (app.js)
//  Routes user to specialist agents, manages API key &
//  shared Gemini API utility.
// ════════════════════════════════════════════════════════════

// ── State ─────────────────────────────────────────
let currentView = 'home';
let geminiApiKey = typeof ENV !== 'undefined' ? ENV.GEMINI_API_KEY : '';
//AIzaSyARALMwQMNOOcTyLcuN19DE1mxYyhSDG7Y
// ── Init ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    // API key must be strictly loaded from env.js now.
    if (!geminiApiKey) {
        alert('CRITICAL ERROR: No Gemini API Key found.\\n\\nPlease add your key to env.js to use this application.');
        return;
    }
    launchApp();
});


function launchApp() {
    document.getElementById('app').classList.remove('hidden');
    navigateTo('home');
    initTiltEffect();
}

// ── 3D Tilt Effect ────────────────────────────────
function initTiltEffect() {
    const cards = document.querySelectorAll('.agent-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Limit tilt logic to small angles (e.g. max 8 degrees)
            const rotateX = ((y - centerY) / centerY) * -8;
            const rotateY = ((x - centerX) / centerX) * 8;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            // Reset to default on leave smoothly
            card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)`;
        });
    });
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
