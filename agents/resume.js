// ────────────────────────────────────────────────
//  Resume Review Agent (with file upload)
// ────────────────────────────────────────────────

function renderResumeAgent() {
  document.getElementById('resume-root').innerHTML = `
    <div class="agent-panel">
      <div class="agent-header">
        <div class="agent-header-icon">📄</div>
        <div>
          <h1>Resume Review Agent</h1>
          <p>Upload your resume or paste text → get an ATS score, recruiter feedback, and improvement tips.</p>
        </div>
      </div>

      <div class="input-card">
        <!-- Upload Zone -->
        <label>Upload Resume</label>
        <div id="upload-zone" class="upload-zone" onclick="document.getElementById('resume-file').click()">
          <input type="file" id="resume-file" accept=".pdf,.docx,.doc,.txt" style="display:none" onchange="handleResumeUpload(event)" />
          <div class="upload-icon">📁</div>
          <div class="upload-text">Click to upload or drag & drop</div>
          <div class="upload-sub">Supports PDF, DOCX, TXT files</div>
        </div>
        <div id="upload-status" style="display:none" class="upload-status"></div>

        <div class="upload-divider"><span>OR</span></div>

        <label>Paste Resume Text</label>
        <textarea id="resume-text" rows="10" placeholder="Paste your full resume here — including education, skills, projects, internships..."></textarea>

        <div class="btn-row">
          <button class="btn-primary" id="resume-analyze-btn" onclick="analyzeResume()">🔍 Analyze Resume</button>
          <button class="btn-secondary" onclick="clearResume()">Clear</button>
        </div>
      </div>

      <div id="resume-loading" style="display:none">
        <div class="typing-indicator">
          <div class="typing-dots"><span></span><span></span><span></span></div>
          <span>Resume Review Agent is analyzing your resume...</span>
        </div>
      </div>

      <div id="resume-results" style="display:none"></div>
    </div>
  `;

  // Set up drag and drop
  const zone = document.getElementById('upload-zone');
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processUploadedFile(file);
  });
}

async function handleResumeUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  await processUploadedFile(file);
}

async function processUploadedFile(file) {
  const statusEl = document.getElementById('upload-status');
  const textarea = document.getElementById('resume-text');
  const zoneEl = document.getElementById('upload-zone');
  const ext = file.name.split('.').pop().toLowerCase();

  statusEl.style.display = 'flex';
  statusEl.innerHTML = `<span class="upload-spinner"></span> Reading <strong>${file.name}</strong>...`;

  try {
    let text = '';

    if (ext === 'txt') {
      text = await file.text();
    } else if (ext === 'pdf') {
      text = await extractTextFromPDF(file);
    } else if (ext === 'docx' || ext === 'doc') {
      text = await extractTextFromDOCX(file);
    } else {
      throw new Error('Unsupported file type. Please use PDF, DOCX, or TXT.');
    }

    if (!text || text.trim().length < 20) {
      throw new Error('Could not extract enough text from the file. Try pasting manually.');
    }

    textarea.value = text.trim();
    statusEl.innerHTML = `<span style="color:var(--success)">✅</span> Loaded <strong>${file.name}</strong> — ${text.trim().split(/\s+/).length} words extracted`;
    zoneEl.classList.add('uploaded');
  } catch (err) {
    statusEl.innerHTML = `<span style="color:var(--danger)">❌</span> ${err.message}`;
  }
}

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

async function extractTextFromDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function analyzeResume() {
  const text = document.getElementById('resume-text').value.trim();
  if (!text || text.length < 50) {
    alert('Please upload a file or paste your resume text (at least a few lines).');
    return;
  }

  const btn = document.getElementById('resume-analyze-btn');
  btn.disabled = true;
  document.getElementById('resume-loading').style.display = 'block';
  document.getElementById('resume-results').style.display = 'none';

  const systemInstruction = `You are an expert Resume Review Agent specializing in tech placement for engineering students.
Your task:
1. Give an ATS Score out of 100.
2. List 3 key strengths.
3. List 3 critical weaknesses.
4. Give 5 specific, actionable improvement suggestions.
5. Provide a one-line summary verdict.

Respond ONLY in this JSON format:
{
  "score": <number>,
  "verdict": "<one-line verdict>",
  "strengths": ["<s1>","<s2>","<s3>"],
  "weaknesses": ["<w1>","<w2>","<w3>"],
  "suggestions": ["<tip1>","<tip2>","<tip3>","<tip4>","<tip5>"]
}`;

  const prompt = `Review this resume:\n\n${text}`;

  try {
    const raw = await callGemini(prompt, systemInstruction);
    const json = extractJSON(raw);
    renderResumeResults(json);
  } catch (err) {
    document.getElementById('resume-results').innerHTML = `<div class="result-card"><p style="color:var(--danger)">Error: ${err.message}</p></div>`;
    document.getElementById('resume-results').style.display = 'block';
  } finally {
    btn.disabled = false;
    document.getElementById('resume-loading').style.display = 'none';
  }
}

function renderResumeResults(data) {
  const score = data.score || 0;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 75 ? 'Strong ✅' : score >= 50 ? 'Average ⚠️' : 'Weak ❌';
  const dashoffset = 264 - (264 * score / 100);

  const html = `
    <div class="result-card">
      <h3>📊 ATS Score & Overview</h3>
      <div class="score-ring-wrapper">
        <div class="score-ring">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle class="score-bg" cx="50" cy="50" r="42"/>
            <circle class="score-fill" id="score-arc" cx="50" cy="50" r="42" stroke="${color}" stroke-dashoffset="${dashoffset}"/>
          </svg>
          <div class="score-text">
            <span style="color:${color}">${score}</span>
            <span class="score-label">/ 100</span>
          </div>
        </div>
        <div class="score-info">
          <div class="score-title">${label}</div>
          <div class="score-desc">${data.verdict || ''}</div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="result-card">
        <h3>✅ Strengths</h3>
        <ul class="md-content" style="padding-left:18px">
          ${(data.strengths || []).map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
      <div class="result-card">
        <h3>⚠️ Weaknesses</h3>
        <ul class="md-content" style="padding-left:18px">
          ${(data.weaknesses || []).map(w => `<li>${w}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="result-card">
      <h3>💡 Improvement Suggestions</h3>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
        ${(data.suggestions || []).map((s, i) => `
          <div style="display:flex;gap:12px;align-items:flex-start;font-size:0.88rem;color:var(--text-secondary)">
            <span style="flex-shrink:0;width:24px;height:24px;background:rgba(124,58,237,0.2);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:#a78bfa">${i + 1}</span>
            <span>${s}</span>
          </div>`).join('')}
      </div>
    </div>
  `;

  const resultsEl = document.getElementById('resume-results');
  resultsEl.innerHTML = html;
  resultsEl.style.display = 'block';

  // Animate arc after paint
  setTimeout(() => {
    const arc = document.getElementById('score-arc');
    if (arc) arc.style.strokeDashoffset = dashoffset;
  }, 100);
}

function clearResume() {
  document.getElementById('resume-text').value = '';
  document.getElementById('resume-results').style.display = 'none';
  document.getElementById('upload-status').style.display = 'none';
  document.getElementById('upload-zone').classList.remove('uploaded');
  document.getElementById('resume-file').value = '';
}
