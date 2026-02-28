// ════════════════════════════════════════════════════════════
//  PlacementPrep AI — Active Jobs Dashboard
// ════════════════════════════════════════════════════════════

const mockJobs = [
    {
        id: "j1",
        title: "Software Engineer (New Grad)",
        company: "Google",
        location: "Bangalore, India",
        type: "Full-time",
        tags: ["Java", "C++", "Python", "DSA"],
        posted: "2 days ago",
        salary: "$120k - $150k"
    },
    {
        id: "j2",
        title: "Frontend Developer",
        company: "Amazon",
        location: "Hyderabad, India",
        type: "Full-time",
        tags: ["React", "JavaScript", "HTML/CSS"],
        posted: "1 week ago",
        salary: "$90k - $130k"
    },
    {
        id: "j3",
        title: "Data Analyst Intern",
        company: "Microsoft",
        location: "Remote",
        type: "Internship",
        tags: ["SQL", "Python", "PowerBI"],
        posted: "3 days ago",
        salary: "$40/hr"
    },
    {
        id: "j4",
        title: "Backend Engineer",
        company: "Atlassian",
        location: "Pune, India",
        type: "Full-time",
        tags: ["Node.js", "AWS", "Microservices"],
        posted: "5 hours ago",
        salary: "$110k - $140k"
    }
];

function renderJobsAgent() {
    const root = document.getElementById('jobs-root');
    if (!root) return;

    let html = `
        <div class="agent-panel" style="max-width: 900px;">
            <div class="agent-header">
                <div class="agent-header-icon">💼</div>
                <div>
                    <h1>Active Job Postings</h1>
                    <p>Find and apply to the latest opportunities matching your profile.</p>
                </div>
            </div>
            
            <div class="jobs-list">
    `;

    mockJobs.forEach(job => {
        html += `
            <div class="job-card agent-card">
                <div class="job-card-header">
                    <div>
                        <h3 class="job-title">${job.title}</h3>
                        <div class="job-company">${job.company} • ${job.location}</div>
                    </div>
                    <div class="job-tag ${job.type.toLowerCase().replace('-', '')}">${job.type}</div>
                </div>
                <div class="job-tags">
                    ${job.tags.map(tag => `<span class="skill-tag">${tag}</span>`).join('')}
                </div>
                <div class="job-card-footer">
                    <div class="job-meta">
                        <span>🕒 ${job.posted}</span>
                        <span>💰 ${job.salary}</span>
                    </div>
                    <button class="btn-primary btn-apply" onclick="event.stopPropagation(); applyForJob('${job.id}')">Apply Now</button>
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    root.innerHTML = html;

    // Initialize tilt effect for the new dynamically injected cards
    if (typeof initTiltEffect === 'function') {
        setTimeout(initTiltEffect, 50);
    }
}

function applyForJob(jobId) {
    const job = mockJobs.find(j => j.id === jobId);
    if (!job) return;

    alert(`Applying for: ${job.title} at ${job.company}\n\nRedirecting to application portal...`);
}
