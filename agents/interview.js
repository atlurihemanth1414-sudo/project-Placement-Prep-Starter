// ────────────────────────────────────────────────
//  Mock Interview Agent
// ────────────────────────────────────────────────

let interviewHistory = [];
let interviewQCount = 0;
let interviewScore = 0;
let interviewActive = false;
const MAX_QUESTIONS = 8;

function renderInterviewAgent() {
  interviewHistory = [];
  interviewQCount = 0;
  interviewScore = 0;
  interviewActive = false;

  document.getElementById('interview-root').innerHTML = `
    <div class="agent-panel">
      <div class="agent-header">
        <div class="agent-header-icon">🎤</div>
        <div>
          <h1>Mock Interview Agent</h1>
          <p>Experience a live HR + technical interview with real-time AI feedback. ${MAX_QUESTIONS} questions per session.</p>
        </div>
      </div>

      <div id="interview-setup" class="input-card">
        <label>Your Target Role (optional)</label>
        <input type="text" id="interview-role" placeholder="e.g. Software Developer Intern, Data Analyst, Frontend Developer" />
        <div class="btn-row">
          <button class="btn-primary" onclick="startInterview()">🎬 Start Interview</button>
        </div>
      </div>

      <div id="interview-session" style="display:none">
        <div class="session-stats">
          <div class="stat-pill">🎤 Session: <strong>&nbsp;Active</strong></div>
          <div class="stat-pill">❓ Question: <strong id="q-num">0</strong>&nbsp;/ ${MAX_QUESTIONS}</div>
          <div class="stat-pill">⭐ Score: <strong id="stat-score">0</strong></div>
        </div>

        <div class="chat-area" id="chat-area"></div>

        <div id="interview-loading" style="display:none">
          <div class="typing-indicator">
            <div class="typing-dots"><span></span><span></span><span></span></div>
            <span>Interviewer is evaluating your answer...</span>
          </div>
        </div>

        <div class="chat-input-row" id="answer-row">
          <textarea id="answer-input" placeholder="Type your answer here..." rows="2"></textarea>
          <button id="send-btn" onclick="sendAnswer()" title="Send Answer">➤</button>
        </div>

        <div class="btn-row" style="margin-top:12px">
          <button class="btn-secondary" onclick="endInterview()">🏁 End & Get Report</button>
        </div>
      </div>

      <div id="interview-report" style="display:none"></div>
    </div>
  `;

  document.getElementById('answer-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAnswer(); }
  });
}

async function startInterview() {
  const role = document.getElementById('interview-role').value.trim() || 'Software Engineer Intern';
  document.getElementById('interview-setup').style.display = 'none';
  document.getElementById('interview-session').style.display = 'block';

  interviewActive = true;
  window._interviewRole = role;
  interviewHistory = [];
  interviewQCount = 0;
  interviewScore = 0;

  await askNextQuestion();
}

async function askNextQuestion() {
  if (interviewQCount >= MAX_QUESTIONS) {
    endInterview();
    return;
  }

  const isHR = interviewQCount < 3;
  const qType = isHR ? 'behavioural HR' : 'technical computer science';
  const role = window._interviewRole || 'Software Engineer Intern';

  const systemInstruction = `You are a strict but fair interviewer at a top tech company.
Ask ONE ${qType} interview question for a "${role}" candidate (1st year engineering student).
The question must be clear, concise, and appropriate for a freshman student.
Respond ONLY with the question text. No preamble, no numbering.`;

  showLoading(true);
  try {
    const question = await callGemini('Ask the next interview question. Previous questions: ' + interviewHistory.filter(m => m.role === 'model').map(m => m.parts[0].text).join(' | '), systemInstruction, false);
    interviewHistory.push({ role: 'model', parts: [{ text: question }] });
    interviewQCount++;
    document.getElementById('q-num').textContent = interviewQCount;
    appendBubble('ai', `<div class="bubble-label">🤖 Interviewer — Q${interviewQCount}</div>${question}`);
  } catch (e) {
    appendBubble('ai', `<div class="bubble-label">Error</div>${e.message}`);
  } finally {
    showLoading(false);
  }
}

async function sendAnswer() {
  const input = document.getElementById('answer-input');
  const answer = input.value.trim();
  if (!answer || !interviewActive) return;

  input.value = '';
  document.getElementById('send-btn').disabled = true;
  appendBubble('user', `<div class="bubble-label">👤 You</div>${answer}`);
  interviewHistory.push({ role: 'user', parts: [{ text: answer }] });

  const systemInstruction = `You are an expert interviewer evaluating an answer.
Give a brief evaluation (2–3 sentences max): mention what was good, what was missing, and a score from 1–10.
Format: "Feedback: <your feedback> | Score: <N>/10"
Be encouraging but honest. The candidate is a 1st year engineering student.`;

  showLoading(true);
  try {
    const feedback = await callGemini(`Question was: "${interviewHistory[interviewHistory.length - 2]?.parts[0]?.text}" — Candidate answered: "${answer}"`, systemInstruction, false);
    const scoreMatch = feedback.match(/Score:\s*(\d+)/i);
    if (scoreMatch) interviewScore += parseInt(scoreMatch[1]);
    document.getElementById('stat-score').textContent = interviewScore;
    interviewHistory.push({ role: 'model', parts: [{ text: feedback }] });
    appendBubble('ai', `<div class="bubble-label">📋 Feedback</div>${feedback}`);
  } catch (e) {
    appendBubble('ai', `<div class="bubble-label">Error</div>${e.message}`);
  } finally {
    showLoading(false);
    document.getElementById('send-btn').disabled = false;
    if (interviewQCount < MAX_QUESTIONS) {
      setTimeout(askNextQuestion, 800);
    } else {
      endInterview();
    }
  }
}

async function endInterview() {
  interviewActive = false;
  document.getElementById('answer-row').style.display = 'none';

  const systemInstruction = `You are a senior placement counselor.
Summarize the mock interview session performance.
Return ONLY this JSON:
{
  "overall": "<Overall performance summary, 2-3 sentences>",
  "rating": "<Excellent|Good|Average|Needs Work>",
  "totalScore": <computed score out of ${MAX_QUESTIONS * 10}>,
  "topStrengths": ["<strength1>","<strength2>"],
  "areasToImprove": ["<area1>","<area2>","<area3>"],
  "nextSteps": "<Practical 1-2 sentence advice>"
}`;

  const transcript = interviewHistory.map(m => `${m.role === 'model' ? 'Interviewer' : 'Candidate'}: ${m.parts[0].text}`).join('\n');
  showLoading(true);
  try {
    const raw = await callGemini(`Here is the full interview transcript:\n${transcript}`, systemInstruction);
    const data = extractJSON(raw);
    renderInterviewReport(data);
  } catch (e) {
    renderInterviewReport({ overall: 'Could not generate report: ' + e.message, rating: 'N/A', totalScore: interviewScore, topStrengths: [], areasToImprove: [], nextSteps: '' });
  } finally {
    showLoading(false);
  }
}

function renderInterviewReport(data) {
  const ratingColor = { Excellent: '#10b981', Good: '#06b6d4', Average: '#f59e0b', 'Needs Work': '#ef4444' };
  const color = ratingColor[data.rating] || '#a78bfa';
  const maxScore = MAX_QUESTIONS * 10;

  const html = `
    <div class="result-card" style="margin-top:20px">
      <h3>🏁 Interview Report</h3>
      <div style="display:flex;align-items:center;gap:16px;margin:16px 0;flex-wrap:wrap">
        <div style="font-size:2rem;font-weight:800;color:${color}">${data.totalScore || interviewScore}<span style="font-size:1rem;color:var(--text-muted)">/${maxScore}</span></div>
        <span style="background:${color}22;color:${color};border:1px solid ${color}44;padding:6px 16px;border-radius:99px;font-weight:600;font-size:0.88rem">${data.rating}</span>
      </div>
      <p class="md-content">${data.overall}</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="result-card">
        <h3>💪 Top Strengths</h3>
        <ul class="md-content" style="padding-left:18px">${(data.topStrengths || []).map(s => `<li>${s}</li>`).join('')}</ul>
      </div>
      <div class="result-card">
        <h3>📈 Areas to Improve</h3>
        <ul class="md-content" style="padding-left:18px">${(data.areasToImprove || []).map(a => `<li>${a}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="result-card">
      <h3>🗺️ Next Steps</h3>
      <p class="md-content">${data.nextSteps}</p>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn-primary" onclick="renderInterviewAgent()">🔄 Start New Session</button>
      </div>
    </div>`;

  document.getElementById('interview-session').style.display = 'none';
  document.getElementById('interview-report').innerHTML = html;
  document.getElementById('interview-report').style.display = 'block';
}

function appendBubble(type, html) {
  const area = document.getElementById('chat-area');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${type}`;
  bubble.innerHTML = html;
  area.appendChild(bubble);
  area.scrollTop = area.scrollHeight;
}

function showLoading(visible) {
  const el = document.getElementById('interview-loading');
  if (el) el.style.display = visible ? 'block' : 'none';
}
