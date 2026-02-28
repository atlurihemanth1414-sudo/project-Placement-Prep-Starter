// ────────────────────────────────────────────────
//  Skill Gap Analyzer Agent
// ────────────────────────────────────────────────

const COMPANIES = [
    'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple',
    'TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant',
    'Flipkart', 'Zomato', 'Paytm', 'Swiggy', 'Ola',
    'IBM', 'Oracle', 'Capgemini', 'HCL', 'Tech Mahindra',
    'Other'
];

const ROLES = [
    'Software Developer (SDE)', 'Frontend Developer', 'Backend Developer',
    'Full Stack Developer', 'Data Analyst', 'Data Scientist',
    'DevOps Engineer', 'Cloud Engineer', 'Mobile App Developer',
    'Business Analyst', 'ML/AI Engineer', 'Cybersecurity Analyst'
];

function renderSkillGapAgent() {
    document.getElementById('skillgap-root').innerHTML = `
    <div class="agent-panel">
      <div class="agent-header">
        <div class="agent-header-icon">📊</div>
        <div>
          <h1>Skill Gap Analyzer</h1>
          <p>Enter your target company & role → get a personalized skill gap report and 3-month learning roadmap.</p>
        </div>
      </div>

      <div class="input-card">
        <div class="two-col" style="margin-bottom:16px">
          <div>
            <label>Target Company</label>
            <select id="sg-company">
              <option value="">— Select Company —</option>
              ${COMPANIES.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Target Role</label>
            <select id="sg-role">
              <option value="">— Select Role —</option>
              ${ROLES.map(r => `<option value="${r}">${r}</option>`).join('')}
            </select>
          </div>
        </div>

        <label>Your Current Skills (comma-separated)</label>
        <input type="text" id="sg-skills" placeholder="e.g. Python, HTML, CSS, SQL, basic C++" style="margin-bottom:16px"/>

        <label>Academic Year / Background</label>
        <select id="sg-year">
          <option value="1st year engineering student">1st Year Engineering</option>
          <option value="2nd year engineering student">2nd Year Engineering</option>
          <option value="fresh graduate">Fresh Graduate</option>
        </select>

        <div class="btn-row">
          <button class="btn-primary" id="sg-analyze-btn" onclick="analyzeSkillGap()">📊 Analyze My Gap</button>
          <button class="btn-secondary" onclick="clearSkillGap()">Clear</button>
        </div>
      </div>

      <div id="sg-loading" style="display:none">
        <div class="typing-indicator">
          <div class="typing-dots"><span></span><span></span><span></span></div>
          <span>Skill Gap Analyzer is building your personalized roadmap...</span>
        </div>
      </div>

      <div id="sg-results" style="display:none"></div>
    </div>
  `;
}

async function analyzeSkillGap() {
    const company = document.getElementById('sg-company').value;
    const role = document.getElementById('sg-role').value;
    const skills = document.getElementById('sg-skills').value.trim();
    const year = document.getElementById('sg-year').value;

    if (!company || !role) {
        alert('Please select both a company and a role.');
        return;
    }

    const btn = document.getElementById('sg-analyze-btn');
    btn.disabled = true;
    document.getElementById('sg-loading').style.display = 'block';
    document.getElementById('sg-results').style.display = 'none';

    const systemInstruction = `You are an expert career coach and placement consultant.
The user is a ${year} targeting a "${role}" position at "${company}".
Their current skills: ${skills || 'none specified'}.

Respond ONLY in this JSON format:
{
  "requiredSkills": [
    { "skill": "<name>", "priority": "High|Medium|Low", "has": true|false }
  ],
  "gapSummary": "<2-3 sentence summary of the skill gap>",
  "roadmap": [
    { "week": "Week 1-2", "focus": "<topic>", "tasks": "<what to do>" },
    { "week": "Week 3-4", "focus": "<topic>", "tasks": "<what to do>" },
    { "week": "Week 5-6", "focus": "<topic>", "tasks": "<what to do>" },
    { "week": "Week 7-8", "focus": "<topic>", "tasks": "<what to do>" },
    { "week": "Week 9-10", "focus": "<topic>", "tasks": "<what to do>" },
    { "week": "Week 11-12", "focus": "<topic>", "tasks": "<what to do>" }
  ],
  "resources": ["<free resource 1>", "<free resource 2>", "<free resource 3>"],
  "readinessScore": <0-100>
}

Be specific, realistic for a beginner, and use only free learning resources.`;

    try {
        const raw = await callGemini(`Analyze skill gap for: Company=${company}, Role=${role}, Current Skills=${skills}, Year=${year}`, systemInstruction);
        const data = extractJSON(raw);
        renderSkillGapResults(data, company, role);
    } catch (e) {
        document.getElementById('sg-results').innerHTML = `<div class="result-card"><p style="color:var(--danger)">Error: ${e.message}</p></div>`;
        document.getElementById('sg-results').style.display = 'block';
    } finally {
        btn.disabled = false;
        document.getElementById('sg-loading').style.display = 'none';
    }
}

function renderSkillGapResults(data, company, role) {
    const score = data.readinessScore || 0;
    const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

    const skillRows = (data.requiredSkills || []).map(s => {
        const pColor = s.priority === 'High' ? 'var(--danger)' : s.priority === 'Medium' ? 'var(--warning)' : 'var(--success)';
        return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--glass-border)">
        <span style="font-size:1rem">${s.has ? '✅' : '❌'}</span>
        <span style="flex:1;font-size:0.87rem;color:${s.has ? 'var(--text-primary)' : 'var(--text-secondary)'}">${s.skill}</span>
        <span style="font-size:0.72rem;font-weight:600;color:${pColor};background:${pColor}18;border:1px solid ${pColor}33;padding:3px 10px;border-radius:99px">${s.priority}</span>
      </div>`;
    }).join('');

    const roadmapRows = (data.roadmap || []).map(r => `
    <div class="roadmap-week">
      <div class="week-badge">${r.week.replace('Week ', 'W')}</div>
      <div class="week-content">
        <h4>${r.focus}</h4>
        <p>${r.tasks}</p>
      </div>
    </div>`).join('');

    const html = `
    <div class="result-card">
      <h3>🎯 Readiness for ${role} at ${company}</h3>
      <div style="display:flex;align-items:center;gap:20px;margin:16px 0;flex-wrap:wrap">
        <div style="font-size:2.5rem;font-weight:800;color:${color}">${score}<span style="font-size:1rem;color:var(--text-muted)">/100</span></div>
        <div class="md-content">${data.gapSummary}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="result-card" style="max-height:380px;overflow-y:auto">
        <h3>🛠️ Required Skills</h3>
        ${skillRows}
      </div>
      <div class="result-card">
        <h3>🔗 Free Resources</h3>
        <ul class="md-content" style="padding-left:18px;margin-top:8px">
          ${(data.resources || []).map(r => `<li style="margin-bottom:8px">${r}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="result-card">
      <h3>🗓️ 12-Week Learning Roadmap</h3>
      <div class="roadmap-section">
        ${roadmapRows}
      </div>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn-primary" onclick="clearSkillGap()">🔄 Analyze Another Role</button>
      </div>
    </div>
  `;

    const el = document.getElementById('sg-results');
    el.innerHTML = html;
    el.style.display = 'block';
}

function clearSkillGap() {
    document.getElementById('sg-company').value = '';
    document.getElementById('sg-role').value = '';
    document.getElementById('sg-skills').value = '';
    document.getElementById('sg-results').style.display = 'none';
}
