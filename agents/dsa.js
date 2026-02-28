// ────────────────────────────────────────────────
//  DSA Quiz Agent
// ────────────────────────────────────────────────

const DSA_TOPICS = [
    { icon: '📦', label: 'Arrays', value: 'Arrays and Strings' },
    { icon: '🔗', label: 'Linked Lists', value: 'Linked Lists' },
    { icon: '🥞', label: 'Stacks & Queues', value: 'Stacks and Queues' },
    { icon: '🌳', label: 'Trees', value: 'Binary Trees and BST' },
    { icon: '🕸️', label: 'Graphs', value: 'Graphs and BFS/DFS' },
    { icon: '🔍', label: 'Searching', value: 'Binary Search' },
    { icon: '🔀', label: 'Sorting', value: 'Sorting Algorithms' },
    { icon: '💡', label: 'Dynamic Prog.', value: 'Dynamic Programming (beginner)' },
    { icon: '🔢', label: 'Recursion', value: 'Recursion and Backtracking' },
    { icon: '📐', label: 'Bit Manip.', value: 'Bit Manipulation basics' },
];

let dsaTopic = '';
let dsaScore = 0;
let dsaTotal = 0;
let dsaCurrentQ = null;

function renderDSAAgent() {
    dsaTopic = '';
    dsaScore = 0;
    dsaTotal = 0;
    dsaCurrentQ = null;

    document.getElementById('dsa-root').innerHTML = `
    <div class="agent-panel">
      <div class="agent-header">
        <div class="agent-header-icon">🧩</div>
        <div>
          <h1>DSA Quiz Agent</h1>
          <p>Select a topic and test your Data Structures & Algorithms knowledge with AI-generated MCQs.</p>
        </div>
      </div>

      <div class="quiz-score-bar">
        <div class="score-count" id="dsa-score">0</div>
        <div class="score-divider">/</div>
        <div class="score-count" id="dsa-total">0</div>
        <div class="q-counter" style="margin-left:8px">questions answered</div>
        <div style="margin-left:auto">
          <button class="btn-secondary" onclick="resetDSAQuiz()" style="font-size:0.8rem;padding:7px 14px">↺ Reset</button>
        </div>
      </div>

      <div id="topic-selector" class="input-card">
        <label>Choose a Topic</label>
        <div class="quiz-topic-grid" id="topic-grid">
          ${DSA_TOPICS.map(t => `
            <button class="topic-btn" onclick="selectTopic('${t.value}', this)">
              <span class="topic-icon">${t.icon}</span>${t.label}
            </button>`).join('')}
        </div>
        <div class="btn-row">
          <button class="btn-primary" id="start-quiz-btn" onclick="startDSAQuiz()" disabled>🚀 Start Quiz</button>
        </div>
      </div>

      <div id="dsa-loading" style="display:none">
        <div class="typing-indicator">
          <div class="typing-dots"><span></span><span></span><span></span></div>
          <span>DSA Quiz Agent is generating your question...</span>
        </div>
      </div>

      <div id="quiz-area" style="display:none"></div>
    </div>
  `;
}

function selectTopic(value, btn) {
    document.querySelectorAll('.topic-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    dsaTopic = value;
    document.getElementById('start-quiz-btn').disabled = false;
}

async function startDSAQuiz() {
    if (!dsaTopic) return;
    document.getElementById('topic-selector').style.display = 'none';
    await loadNextQuestion();
}

async function loadNextQuestion() {
    document.getElementById('dsa-loading').style.display = 'block';
    document.getElementById('quiz-area').style.display = 'none';

    const systemInstruction = `You are a DSA quiz bot for 1st year computer science students.
Generate ONE multiple-choice question about "${dsaTopic}".
Respond ONLY in this JSON format:
{
  "question": "<the question text>",
  "options": ["<A>", "<B>", "<C>", "<D>"],
  "correct": <0|1|2|3>,
  "explanation": "<brief, clear explanation of the correct answer>"
}
Make the question clear and appropriate for a beginner-to-intermediate level.`;

    try {
        const raw = await callGemini(`Generate a new unique DSA MCQ about ${dsaTopic}. Do not repeat previous questions.`, systemInstruction);
        dsaCurrentQ = extractJSON(raw);
        renderQuestion(dsaCurrentQ);
    } catch (e) {
        document.getElementById('quiz-area').innerHTML = `<div class="mcq-card"><p style="color:var(--danger)">Error: ${e.message}</p></div>`;
        document.getElementById('quiz-area').style.display = 'block';
    } finally {
        document.getElementById('dsa-loading').style.display = 'none';
    }
}

function renderQuestion(q) {
    const html = `
    <div class="mcq-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <span style="font-size:0.78rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">${dsaTopic}</span>
        <span style="font-size:0.78rem;color:var(--text-muted)">Q${dsaTotal + 1}</span>
      </div>
      <div class="mcq-question">${q.question}</div>
      <div class="mcq-options" id="mcq-options">
        ${q.options.map((opt, i) => `
          <button class="option-btn" id="opt-${i}" onclick="selectOption(${i})">${String.fromCharCode(65 + i)}. ${opt}</button>
        `).join('')}
      </div>
      <div id="explanation-area"></div>
    </div>
    <div class="btn-row" id="next-btn-row" style="display:none">
      <button class="btn-primary" onclick="nextQuestion()">Next Question ➜</button>
      <button class="btn-secondary" onclick="changeTopic()">↩ Change Topic</button>
    </div>
  `;
    document.getElementById('quiz-area').innerHTML = html;
    document.getElementById('quiz-area').style.display = 'block';
}

function selectOption(chosen) {
    if (!dsaCurrentQ) return;
    const correct = dsaCurrentQ.correct;

    document.querySelectorAll('.option-btn').forEach((btn, i) => {
        btn.disabled = true;
        if (i === correct) btn.classList.add('correct');
        else if (i === chosen) btn.classList.add('wrong');
    });

    dsaTotal++;
    if (chosen === correct) dsaScore++;
    document.getElementById('dsa-score').textContent = dsaScore;
    document.getElementById('dsa-total').textContent = dsaTotal;

    document.getElementById('explanation-area').innerHTML = `
    <div class="explanation-box">
      <strong>${chosen === correct ? '✅ Correct!' : '❌ Incorrect.'}</strong>
      ${dsaCurrentQ.explanation}
    </div>`;

    document.getElementById('next-btn-row').style.display = 'flex';
}

function nextQuestion() {
    loadNextQuestion();
}

function changeTopic() {
    document.getElementById('topic-selector').style.display = 'block';
    document.getElementById('quiz-area').style.display = 'none';
    document.querySelectorAll('.topic-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('start-quiz-btn').disabled = true;
    dsaTopic = '';
}

function resetDSAQuiz() {
    dsaScore = 0;
    dsaTotal = 0;
    renderDSAAgent();
}
