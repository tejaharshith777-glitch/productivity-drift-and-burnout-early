// App State
let currentUser = null;
let notifications = [
    { id: 1, type: 'danger', title: 'High Burnout Risk', message: 'Your stress level has been high for 3 days.', time: '2 mins ago', read: false },
    { id: 2, type: 'warning', title: 'Productivity Drop', message: 'Your activity decreased by 15% this week.', time: '1 hour ago', read: false },
    { id: 3, type: 'healthy', title: 'Goal Achieved', message: 'You maintained optimal focus hours!', time: '1 day ago', read: true }
];



// DOM Elements
const authScreen = document.getElementById('auth-screen');
const mainLayout = document.getElementById('main-layout');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');

// Auth Toggle
showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
});

// Login Submit
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const role = email.includes('head') ? 'head' : 'user';
    const name = email.split('@')[0];
    
    login({ name: name.charAt(0).toUpperCase() + name.slice(1), email, role });
});

// Signup Submit
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const role = document.getElementById('signup-role').value;
    
    login({ name, email, role });
});

function login(user) {
    currentUser = user;
    localStorage.setItem('mindguard_user', JSON.stringify(user));
    authScreen.style.display = 'none';
    mainLayout.classList.add('active');
    
    document.getElementById('user-display-name').textContent = currentUser.name;
    document.getElementById('user-avatar').textContent = currentUser.name.charAt(0);
    
    // Profile fields
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-email').value = currentUser.email;
    document.getElementById('profile-role').value = currentUser.role === 'head' ? 'Team Head' : 'Team Member';
    
    // Setup Sidebar/Dashboard based on role
    const navDashboard = document.getElementById('nav-dashboard');
    if (currentUser.role === 'head') {
        document.querySelectorAll('.team-exclusive').forEach(el => el.style.display = 'block');
        switchScreen('team-dashboard');
        navDashboard.querySelector('a').setAttribute('onclick', "switchScreen('dashboard')");
        
        // Load simulated data if exists
        loadSimulatedData();
    } else {
        const welcomeText = document.getElementById('welcome-text');
        if (welcomeText) {
            welcomeText.textContent = `Welcome back, ${currentUser.name}`;
        }
        document.querySelectorAll('.team-exclusive').forEach(el => el.style.display = 'none');
        switchScreen('user-dashboard');
        navDashboard.querySelector('a').setAttribute('onclick', "switchScreen('dashboard')");
        fetchAIInsights();
    }

    
    initCharts();
    renderNotifications();
    fetchTeamData();
    renderWorkSessionHeatmap();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('mindguard_user');
    localStorage.removeItem('mindguard_sim_data');
    mainLayout.classList.remove('active');
    authScreen.style.display = 'flex';
    loginForm.reset();
    signupForm.reset();
}


// Screen Switching
function switchScreen(screenId) {
    if (screenId === 'dashboard') {
        screenId = currentUser && currentUser.role === 'head' ? 'team-dashboard' : 'user-dashboard';
    }
    
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    
    // Clear all active states
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    // Find matching navigation links
    document.querySelectorAll('.nav-links a').forEach(a => {
        const clickHandler = a.getAttribute('onclick');
        if (clickHandler && (clickHandler.includes(`'${screenId}'`) || clickHandler.includes(`"${screenId}"`))) {
            a.parentElement.classList.add('active');
        }
    });
    
    // Fallback highlight defaults
    if (screenId === 'user-dashboard' || screenId === 'drift-screen' || screenId === 'team-dashboard') {
        const navDash = document.getElementById('nav-dashboard');
        if (navDash) navDash.classList.add('active');
    }
    
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('open');
}


// Mobile Sidebar Toggle
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

// Notifications Panel Toggle
function toggleNotifications() {
    document.getElementById('notifications-panel').classList.toggle('open');
}

function renderNotifications() {
    const list = document.getElementById('notification-list');
    list.innerHTML = '';
    
    let unreadCount = 0;
    
    notifications.forEach(n => {
        if (!n.read) unreadCount++;
        
        const item = document.createElement('div');
        item.className = `notification-item ${n.type}`;
        item.style.opacity = n.read ? '0.6' : '1';
        item.innerHTML = `
            <div style="font-weight: 600;">${n.title}</div>
            <div style="font-size: 0.9rem; color: var(--text-muted);">${n.message}</div>
            <div class="notification-time">${n.time}</div>
        `;
        list.appendChild(item);
    });
    
    document.getElementById('unread-dot').style.display = unreadCount > 0 ? 'block' : 'none';
}

function markAllRead() {
    notifications.forEach(n => n.read = true);
    renderNotifications();
}

// Daily Check-in Logic
let selectedMoodState = 'okay';

function selectMood(mood, element) {
    selectedMoodState = mood;
    document.querySelectorAll('.emoji-btn').forEach(btn => btn.classList.remove('selected'));
    element.classList.add('selected');
}

function updateStress(val) {
    document.getElementById('stress-val').textContent = `${val}/10`;
}

async function submitCheckIn() {
    const stressVal = parseInt(document.getElementById('stress-slider').value);
    const workingHours = parseInt(document.getElementById('working-hours').value) || 8;
    const workingDays = parseInt(document.getElementById('working-days').value) || 5;
    const burdenTasks = document.getElementById('burden-tasks').value;
    const pressureTalk = document.getElementById('pressure-talk').value;
    
    const symptoms = [];
    document.querySelectorAll('.symptom-chk:checked').forEach(chk => symptoms.push(chk.value));
    
    // Calculate client metrics directly
    let baseBurnout = (stressVal || 5) * 4; 
    if (workingHours > 10) baseBurnout += 15;
    if (workingHours > 12) baseBurnout += 20;
    if (workingDays >= 6) baseBurnout += 15;
    if (burdenTasks === 'overwhelmed') baseBurnout += 20;
    else if (burdenTasks === 'heavy') baseBurnout += 10;
    if (pressureTalk === 'no') baseBurnout += 15;
    else if (pressureTalk === 'hesitant') baseBurnout += 5;
    if (Array.isArray(symptoms)) baseBurnout += Math.min(20, symptoms.length * 5);

    const burnoutScore = Math.min(100, Math.max(0, baseBurnout));
    let burnout = 'Medium';
    let status = 'yellow';
    if (burnoutScore > 75) { burnout = 'High'; status = 'red'; }
    else if (burnoutScore < 45) { burnout = 'Low'; status = 'green'; }

    let productivity = Math.min(100, Math.max(20, 100 - burnoutScore + Math.floor(Math.random() * 15) - 5));

    const metrics = { productivity, burnout, status };
    
    document.getElementById('prod-score').textContent = `${metrics.productivity}%`;
    const burnoutEl = document.getElementById('burnout-level');
    const burnoutLabelEl = document.getElementById('burnout-label');
    
    burnoutEl.textContent = metrics.burnout;
    burnoutLabelEl.textContent = `${metrics.status.toUpperCase()} Risk`;
    burnoutLabelEl.className = `status-indicator status-${metrics.status === 'red' ? 'danger' : metrics.status === 'green' ? 'success' : 'warning'}`;
    
    if (metrics.status === 'red') burnoutEl.style.color = 'var(--danger)';
    else if (metrics.status === 'green') burnoutEl.style.color = 'var(--success)';
    else burnoutEl.style.color = 'var(--warning)';
    
    // Save state to LocalStorage
    currentUser.productivity = productivity;
    currentUser.burnout = burnout;
    currentUser.status = status;
    localStorage.setItem('mindguard_user', JSON.stringify(currentUser));
    
    // Generate dynamic AI recommendations
    const suggestionsEl = document.getElementById('suggestions-list');
    if (suggestionsEl) {
        suggestionsEl.innerHTML = '';
        let suggestions = [
            "Take a short break (5 mins) after 25 mins of work.",
            "Enable Do Not Disturb to complete deep tasks.",
            "Discuss workload capacity with Team Leads."
        ];
        if (burnout === 'High') {
            suggestions = [
                "🚨 Take an immediate intentional offline break.",
                "Schedule emergency check-in with direct manager.",
                "Block focus periods safely."
            ];
        } else if (burnout === 'Low') {
            suggestions = [
                "Keep up high-performance workflows.",
                "Optimize learning paths."
            ];
        }
        suggestions.forEach(s => {
            const li = document.createElement('li');
            li.textContent = s;
            suggestionsEl.appendChild(li);
        });
    }

    alert('Diagnostics analyzed successfully!');

}


async function fetchAIInsights() {
    try {
        const response = await fetch(`/api/insights?email=${encodeURIComponent(currentUser.email)}`);
        const data = await response.json();
        
        const suggestionsEl = document.getElementById('suggestions-list');
        suggestionsEl.innerHTML = '';
        
        data.suggestions.forEach(s => {
            const li = document.createElement('li');
            li.textContent = s;
            suggestionsEl.appendChild(li);
        });
    } catch (error) {
        console.error('Error fetching insights:', error);
    }
}

async function fetchTeamData() {
    try {
        const response = await fetch('/api/team');
        const data = await response.json();
        
        const tbody = document.getElementById('team-table-body');
        const alerts = document.getElementById('team-alerts');
        
        tbody.innerHTML = '';
        alerts.innerHTML = '';
        
        data.forEach(member => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${member.name}</td>
                <td>${member.productivity}</td>
                <td style="color: var(--${member.burnout === 'High' ? 'danger' : member.burnout === 'Medium' ? 'warning' : 'success'});">${member.burnout}</td>
                <td><span class="status-dot dot-${member.status}"></span></td>
                <td>
                    ${member.burnout === 'High' || member.burnout === 'Critical' ? 
                        `<button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; cursor:pointer;" onclick="offerBurnoutChoices('${member.name}', '${member.productivity}')">Intervene</button>` : 
                      member.burnout === 'Medium' ?
                        `<button class="btn btn-warning" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; cursor:pointer; color:#000;" onclick="offerMediumChoices('${member.name}', '${member.productivity}')">Support</button>` :
                        `<button class="btn btn-success" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; cursor:pointer;" onclick="offerLowChoices('${member.name}', '${member.productivity}')">Reward</button>`
                    }
                </td>
            `;

            tbody.appendChild(tr);
            
            if (member.burnout === 'High') {
                const alertItem = document.createElement('li');
                alertItem.style.borderLeftColor = 'var(--danger)';
                alertItem.innerHTML = `<strong>${member.name}</strong> needs immediate attention. Productivity dropped to ${member.productivity}.`;
                alerts.appendChild(alertItem);
            }
        });
    } catch (error) {
        console.error('Error fetching team data:', error);
        loadSimulatedData();
    }
}

function offerBurnoutChoices(name, prod) {
    const prodInt = parseInt(prod) || 50;
    
    let choice1 = "Grant 3-day Mental Health Leave";
    let choice2 = "Cap workload assignments by 50%";
    let choice3 = "Implement strict standard work limits";
    
    if (prodInt < 40) {
        choice1 = "🚀 Emergency: Grant immediate 1-week administrative leave";
        choice2 = "⚠️ Critical: Pause all ongoing deliverables";
        choice3 = "🤝 Mandatory sync with internal support mentors";
    } else if (prodInt < 60) {
        choice1 = "🌴 Recommended: 2-day wellness break";
        choice2 = "📈 Optimization: Postpone deadlines by 2 weeks";
        choice3 = "🧘 Optional workflow audits";
    }
    
    const promptMessage = `⚠️ Burnout Intervention Portal for ${name}\n` +
        `Productivity Score: ${prod}\n\n` +
        `Select actionable choice code:\n` +
        `[1] ${choice1}\n` +
        `[2] ${choice2}\n` +
        `[3] ${choice3}\n\n` +
        `Type 1, 2, or 3 below:`;
        
    const action = prompt(promptMessage);
    if (action === '1') {
        alert(`Intervention Applied: ${choice1} submitted for ${name}!`);
    } else if (action === '2') {
        alert(`Intervention Applied: ${choice2} submitted for ${name}!`);
    } else if (action === '3') {
        alert(`Intervention Applied: ${choice3} submitted for ${name}!`);
    }
}

function offerMediumChoices(name, prod) {
    const choice1 = "🌴 Grant 1-day wellness pass";
    const choice2 = "⚖️ Reallocate 25% workload to other peers";
    const choice3 = "📈 Extend current active milestone by 1 week";
    
    const promptMessage = `⚠️ Workflow Support Portal for ${name}\n` +
        `Productivity Score: ${prod}\n\n` +
        `Select support actions:\n` +
        `[1] ${choice1}\n` +
        `[2] ${choice2}\n` +
        `[3] ${choice3}\n\n` +
        `Type 1, 2, or 3 below:`;
        
    const action = prompt(promptMessage);
    if (action === '1') alert(`Applied: ${choice1} for ${name}!`);
    else if (action === '2') alert(`Applied: ${choice2} for ${name}!`);
    else if (action === '3') alert(`Applied: ${choice3} for ${name}!`);
}

function offerLowChoices(name, prod) {
    const choice1 = "🏆 Issue Spot Award Recognition";
    const choice2 = "🎁 Approve continuous development stipends";
    const choice3 = "🌟 Nominate for Employee of the Month";
    
    const promptMessage = `🎉 Performance Optimization Portal for ${name}\n` +
        `Productivity Score: ${prod}\n\n` +
        `Select reward choices:\n` +
        `[1] ${choice1}\n` +
        `[2] ${choice2}\n` +
        `[3] ${choice3}\n\n` +
        `Type 1, 2, or 3 below:`;
        
    const action = prompt(promptMessage);
    if (action === '1') alert(`Applied: ${choice1} for ${name}!`);
    else if (action === '2') alert(`Applied: ${choice2} for ${name}!`);
    else if (action === '3') alert(`Applied: ${choice3} for ${name}!`);
}

// Profile Logic
function saveProfile() {
    if (currentUser) {
        currentUser.name = document.getElementById('profile-name').value;
        currentUser.email = document.getElementById('profile-email').value;
        
        document.getElementById('user-display-name').textContent = currentUser.name;
        document.getElementById('user-avatar').textContent = currentUser.name.charAt(0);
        
        if (currentUser.role === 'user') {
            document.getElementById('welcome-text').textContent = `Welcome back, ${currentUser.name}`;
        }
        
        document.getElementById('profile-completion-text').textContent = '100%';
        document.getElementById('profile-progress').style.width = '100%';
        
        alert('Profile updated!');
    }
}

// Theme Toggle
function toggleTheme() {
    const isDark = document.getElementById('setting-dark').checked;
    if (!isDark) {
        document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)');
        document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.8)');
        document.documentElement.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.1)');
        document.documentElement.style.setProperty('--text-main', '#1e293b');
        document.documentElement.style.setProperty('--text-muted', '#64748b');
    } else {
        document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)');
        document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.05)');
        document.documentElement.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.1)');
        document.documentElement.style.setProperty('--text-main', '#f8fafc');
        document.documentElement.style.setProperty('--text-muted', '#94a3b8');
    }
}

// Global Chart Instances
let prodChart = null, teamChart = null, burnoutProdChart = null, taskVolumeChart = null;
let focusTimeChart = null, prodTrendChart = null, riskDistributionChart = null, reworkTrendChart = null;

function initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
        }
    };

    // User Productivity
    const ctx = document.getElementById('productivityChart');
    if (ctx) {
        if (prodChart) prodChart.destroy();
        prodChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                datasets: [{
                    label: 'Productivity %',
                    data: [70, 75, 65, 80, 75],
                    borderColor: '#00ffff',
                    backgroundColor: 'rgba(0, 255, 255, 0.1)',
                    borderWidth: 3, fill: true, tension: 0.4
                }]
            },
            options: chartOptions
        });
    }

    // Team Productivity
    const teamCtx = document.getElementById('teamChart');
    if (teamCtx) {
        if (teamChart) teamChart.destroy();
        teamChart = new Chart(teamCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['User A', 'User B', 'User C', 'User D'],
                datasets: [{
                    label: 'Productivity',
                    data: [80, 60, 40, 90],
                    backgroundColor: ['#00ff88', '#ffcc00', '#ff0055', '#00ff88']
                }]
            },
            options: chartOptions
        });
    }

    // Burnout vs Productivity
    const bpCtx = document.getElementById('burnoutProdChart');
    if (bpCtx) {
        if (burnoutProdChart) burnoutProdChart.destroy();
        burnoutProdChart = new Chart(bpCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Marketing', 'Sales', 'Product', 'Design'],
                datasets: [
                    { label: 'Burnout Risk', data: [25, 18, 30, 10], backgroundColor: '#ff0055' },
                    { label: 'Productivity', data: [63, 60, 55, 82], backgroundColor: '#00ffff' }
                ]
            },
            options: chartOptions
        });
    }

    // Task Volume
    const tvCtx = document.getElementById('taskVolumeChart');
    if (tvCtx) {
        if (taskVolumeChart) taskVolumeChart.destroy();
        taskVolumeChart = new Chart(tvCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
                datasets: [{
                    label: 'Tasks Completed',
                    data: [45, 52, 38, 60],
                    borderColor: '#ffcc00',
                    backgroundColor: 'transparent',
                    borderWidth: 3
                }]
            },
            options: chartOptions
        });
    }

    // Average Focus Time
    const ftCtx = document.getElementById('focusTimeChart');
    if (ftCtx) {
        if (focusTimeChart) focusTimeChart.destroy();
        focusTimeChart = new Chart(ftCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Deep Work', 'Meetings', 'Inbox', 'Breaks'],
                datasets: [{
                    data: [4.5, 1.5, 1.2, 0.8],
                    backgroundColor: ['#00ffff', '#94a3b8', '#ffcc00', '#00ff88']
                }]
            },
            options: {
                ...chartOptions,
                scales: {
                    y: { min: 0, max: 8, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }

    // Productivity Trend (30 Days)
    const ptCtx = document.getElementById('prodTrendChart');
    if (ptCtx) {
        if (prodTrendChart) prodTrendChart.destroy();
        prodTrendChart = new Chart(ptCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Day 1', 'Day 10', 'Day 20', 'Day 30'],
                datasets: [{
                    label: 'Performance',
                    data: [68, 62, 58, 64.2],
                    borderColor: '#00ffff',
                    backgroundColor: 'rgba(0, 255, 255, 0.05)',
                    borderWidth: 2, fill: true
                }]
            },
            options: chartOptions
        });
    }

    // Risk Distribution
    const rdCtx = document.getElementById('riskDistributionChart');
    if (rdCtx) {
        if (riskDistributionChart) riskDistributionChart.destroy();
        riskDistributionChart = new Chart(rdCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Healthy', 'Moderate', 'High Risk'],
                datasets: [{
                    data: [65, 46, 14],
                    backgroundColor: ['#00ff88', '#ffcc00', '#ff0055'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, labels: { color: '#fff' } } }
            }
        });
    }

    // Rework Rate
    const rwCtx = document.getElementById('reworkTrendChart');
    if (rwCtx) {
        if (reworkTrendChart) reworkTrendChart.destroy();
        reworkTrendChart = new Chart(rwCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                datasets: [{
                    label: 'Rework %',
                    data: [12, 15, 22, 18, 19],
                    borderColor: '#ff0055',
                    backgroundColor: 'transparent',
                    borderWidth: 3
                }]
            },
            options: chartOptions
        });
    }
}

// --- Data Simulator Logic ---
const NAMES = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Robin", "Avery", "Quinn"];
const DEPTS = ["Sales", "Marketing", "Product", "Design", "Engineering"];

function generateSampleData(quiet = false) {
    const grid = document.getElementById('heatmap-grid');
    let criticalCount = 0, highCount = 0, mediumCount = 0, lowCount = 0;
    const employees = [];
    
    for (let i = 1; i <= 125; i++) {
        const name = NAMES[Math.floor(Math.random() * NAMES.length)] + " " + String.fromCharCode(65 + (i % 26));
        const dept = DEPTS[Math.floor(Math.random() * DEPTS.length)];
        const burnout = Math.floor(Math.random() * 100);
        const prod = Math.floor(Math.random() * 60) + 40; 
        
        let risk = 'Low';
        let colorClass = 'success';
        
        if (burnout > 75) {
            risk = 'Critical';
            colorClass = 'danger';
            criticalCount++;
        } else if (burnout > 50) {
            risk = 'High';
            colorClass = 'warning';
            highCount++;
        } else if (burnout > 25) {
            risk = 'Medium';
            colorClass = 'primary';
            mediumCount++;
        } else {
            lowCount++;
        }
        
        employees.push({ name, dept, burnout, prod, risk, colorClass });
    }
    
    const simData = { employees, criticalCount, highCount, mediumCount, lowCount };
    localStorage.setItem('mindguard_sim_data', JSON.stringify(simData));
    
    if (!quiet) alert('Successfully generated diagnostic protocols for 125 behavioral clusters!');
    loadSimulatedData();
}

function loadSimulatedData() {
    let saved = localStorage.getItem('mindguard_sim_data');
    if (!saved) {
        generateSampleData(true);
        saved = localStorage.getItem('mindguard_sim_data');
    }
    
    try {
        const { employees, criticalCount, highCount, mediumCount, lowCount } = JSON.parse(saved);
        const grid = document.getElementById('heatmap-grid');
        const tbody = document.getElementById('team-table-body');
        const alerts = document.getElementById('team-alerts');
        
        if (grid) grid.innerHTML = '';
        if (tbody) tbody.innerHTML = '';
        if (alerts) alerts.innerHTML = '';
        
        employees.forEach(emp => {
            if (grid) {
                const card = document.createElement('div');
                card.className = `glass-card glass`;
                card.style.borderColor = `var(--${emp.colorClass})`;
                card.style.margin = '10px';
                card.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="avatar" style="background: var(--${emp.colorClass}); color: #000; padding: 10px; border-radius: 50%;">${emp.name.charAt(0)}</div>
                        <div>
                            <div style="font-weight: 600;">${emp.name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${emp.dept}</div>
                        </div>
                    </div>
                    <div style="margin-top: 16px; display: flex; justify-content: space-between; font-size: 0.9rem;">
                        <div>Burnout: <strong style="color: var(--${emp.colorClass});">${emp.burnout}</strong></div>
                        <div>Prod: <strong style="color: var(--primary);">${emp.prod}%</strong></div>
                    </div>
                    <div style="margin-top: 8px; font-size: 0.8rem; text-transform: uppercase; color: var(--${emp.colorClass}); font-weight: bold;">
                        ${emp.risk} Risk
                    </div>
                `;
                grid.appendChild(card);
            }
            
            if (tbody && (emp.risk === 'Critical' || emp.risk === 'High' || emp.risk === 'Medium')) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${emp.name}</td>
                    <td>${emp.prod}%</td>
                    <td style="color: var(--${emp.colorClass}); font-weight:bold;">${emp.risk}</td>
                    <td><span class="status-dot dot-${emp.colorClass === 'danger' ? 'red' : 'yellow'}"></span></td>
                    <td>
                        ${emp.risk === 'High' || emp.risk === 'Critical' ? 
                            `<button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; cursor:pointer;" onclick="offerBurnoutChoices('${emp.name}', '${emp.prod}')">Intervene</button>` : 
                            `<button class="btn btn-warning" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; cursor:pointer; color:#000;" onclick="offerMediumChoices('${emp.name}', '${emp.prod}')">Support</button>`
                        }
                    </td>
                `;
                tbody.appendChild(tr);
            }
            
            if (alerts && (emp.risk === 'Critical' || emp.risk === 'High')) {
                const alertItem = document.createElement('li');
                alertItem.style.borderLeft = `4px solid var(--${emp.colorClass})`;
                alertItem.style.padding = '8px';
                alertItem.style.marginBottom = '8px';
                alertItem.innerHTML = `<strong>${emp.name}</strong> (${emp.dept}): Burnout index at ${emp.burnout}. Action requested.`;
                alerts.appendChild(alertItem);
            }
        });
        
        if (document.getElementById('total-alerts-count')) document.getElementById('total-alerts-count').textContent = criticalCount + highCount + mediumCount;
        if (document.getElementById('critical-alerts')) document.getElementById('critical-alerts').textContent = criticalCount;
        if (document.getElementById('high-alerts')) document.getElementById('high-alerts').textContent = highCount;
        if (document.getElementById('medium-alerts')) document.getElementById('medium-alerts').textContent = mediumCount;
        if (document.getElementById('low-alerts')) document.getElementById('low-alerts').textContent = lowCount;
    } catch (e) {
        console.error("Failed to parse simulation logs", e);
    }
}



function clearSimulatorData() {
    const grid = document.getElementById('heatmap-grid');
    if (grid) grid.innerHTML = '<p style="color: var(--text-muted);">Data cleared. Use generator.</p>';
    
    document.getElementById('total-alerts-count').textContent = '0';
    document.getElementById('critical-alerts').textContent = '0';
    document.getElementById('high-alerts').textContent = '0';
    document.getElementById('medium-alerts').textContent = '0';
    document.getElementById('low-alerts').textContent = '0';
}


// --- NEW: Manager Notifications Scanner ---
function sendManagerNotifications() {
    const saved = localStorage.getItem('mindguard_sim_data');
    if (!saved) {
        alert('No simulation data found. Please generate sample data first.');
        return;
    }
    
    try {
        const { employees } = JSON.parse(saved);
        const highRisk = employees.filter(emp => emp.burnout > 60);
        const resultsDiv = document.getElementById('manager-notif-results');
        
        if (highRisk.length === 0) {
            resultsDiv.innerHTML = '<div style="color: var(--success); padding: 12px;">✅ No employees with burnout risk >60 found. All clear!</div>';
            return;
        }
        
        let html = `<div style="padding: 12px; background: rgba(255,204,0,0.1); border-radius: 8px; border-left: 4px solid var(--warning); margin-bottom: 12px;">
            <strong>📧 ${highRisk.length} burnout alert emails generated</strong>
            <div style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Scanning ${employees.length} employees — ${highRisk.length} exceeded risk threshold (>60)</div>
        </div>`;
        
        html += '<div style="max-height: 300px; overflow-y: auto;">';
        highRisk.forEach((emp, i) => {
            let action = '🌴 Recommended: 2-day wellness break';
            let severity = 'Medium';
            let sevColor = 'var(--warning)';
            
            if (emp.burnout > 85) {
                action = '🚀 Emergency: Immediate 1-week administrative leave';
                severity = 'Critical';
                sevColor = 'var(--danger)';
            } else if (emp.burnout > 75) {
                action = '⚠️ Urgent: Pause ongoing deliverables & schedule 1-on-1';
                severity = 'High';
                sevColor = 'var(--danger)';
            }
            
            html += `<div style="padding: 10px; margin: 6px 0; background: rgba(255,255,255,0.02); border-radius: 6px; border-left: 3px solid ${sevColor};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>${emp.name}</strong>
                    <span style="color: ${sevColor}; font-size: 0.8rem; font-weight: bold;">${severity}</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Dept: ${emp.dept} | Burnout: ${emp.burnout} | Prod: ${emp.prod}%</div>
                <div style="font-size: 0.85rem; color: var(--primary); margin-top: 4px;">AI Action: ${action}</div>
            </div>`;
        });
        html += '</div>';
        
        resultsDiv.innerHTML = html;
        alert(`✅ Burnout Alert Report Generated!\n\n${highRisk.length} high-risk employees identified.\nEmails queued for their respective managers.`);
    } catch(e) {
        console.error('Manager notification error:', e);
    }
}


// --- NEW: Work Session Heatmap Renderer ---
function renderWorkSessionHeatmap() {
    const container = document.getElementById('work-session-heatmap');
    if (!container) return;
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = ['6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM'];
    
    // Generate realistic intensity data (higher during 9am-12pm on weekdays)
    const data = days.map((day, di) => {
        return hours.map((hr, hi) => {
            const isWeekday = di < 5;
            const isPeakHour = hi >= 2 && hi <= 6; // 8am-12pm
            const isMorning = hi >= 1 && hi <= 8;  // 7am-3pm
            
            let base = Math.random() * 0.3;
            if (isWeekday && isPeakHour) base = 0.6 + Math.random() * 0.4;
            else if (isWeekday && isMorning) base = 0.3 + Math.random() * 0.4;
            else if (!isWeekday) base = Math.random() * 0.25;
            
            return Math.min(1, base);
        });
    });
    
    let html = '<table style="border-collapse: collapse; width: 100%;">';
    html += '<thead><tr><th style="padding: 8px; color: var(--text-muted); font-size: 0.8rem;"></th>';
    hours.forEach(h => {
        html += `<th style="padding: 6px 8px; color: var(--text-muted); font-size: 0.75rem; text-align: center;">${h}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    days.forEach((day, di) => {
        html += `<tr><td style="padding: 8px; font-weight: 600; font-size: 0.85rem; color: var(--text-main);">${day}</td>`;
        data[di].forEach(intensity => {
            const r = Math.floor(intensity * 0);
            const g = Math.floor(intensity * 229);
            const b = Math.floor(intensity * 195);
            const alpha = 0.15 + intensity * 0.85;
            html += `<td style="padding: 4px;">
                <div style="width: 100%; height: 28px; min-width: 32px; border-radius: 4px; background: rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)});"></div>
            </td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    // Legend
    html += '<div style="display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 0.8rem; color: var(--text-muted);">';
    html += '<span>Less</span>';
    [0.1, 0.3, 0.5, 0.7, 0.9].forEach(v => {
        const a = 0.15 + v * 0.85;
        html += `<div style="width: 20px; height: 14px; border-radius: 3px; background: rgba(0, ${Math.floor(v*229)}, ${Math.floor(v*195)}, ${a.toFixed(2)});"></div>`;
    });
    html += '<span>More</span></div>';
    
    container.innerHTML = html;
}


// --- Futuristic Three.js 3D Earth Background Logic ---
window.addEventListener('DOMContentLoaded', () => {
    const bgCanvas = document.getElementById('bg');
    if (!bgCanvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 3);

    const renderer = new THREE.WebGLRenderer({ canvas: bgCanvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    const laptops = [];
    const laptopCount = 9;

    function createLaptop() {
        const group = new THREE.Group();

        // Base
        const baseGeo = new THREE.BoxGeometry(2, 0.1, 1.5);
        const baseMat = new THREE.MeshPhongMaterial({ 
            color: 0x0D1526, 
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        group.add(base);

        // Screen
        const screenGeo = new THREE.BoxGeometry(2, 1.3, 0.05);
        const screenMat = new THREE.MeshPhongMaterial({ 
            color: 0x0f172a,
            emissive: 0x00E5C3,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.9
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 0.65, -0.75);
        screen.rotation.x = -Math.PI / 12; // Angled open
        group.add(screen);

        // Floating micro elements (badges ⚠️)
        const badgeGeo = new THREE.OctahedronGeometry(0.15);
        const badgeMat = new THREE.MeshBasicMaterial({ color: 0xFF6B35, wireframe: true });
        const badge = new THREE.Mesh(badgeGeo, badgeMat);
        badge.position.set(1.2, 1, 0);
        group.add(badge);

        return { group, badge };
    }

    for(let i=0; i<laptopCount; i++) {
        const laptopData = createLaptop();
        
        if (i % 2 === 0) {
            laptopData.group.position.x = -3 - (Math.random() * 5);
        } else {
            laptopData.group.position.x = 3 + (Math.random() * 5);
        }
        
        laptopData.group.position.y = (Math.random() - 0.5) * 6;
        laptopData.group.position.z = -5 - Math.random() * 10;
        
        laptopData.group.rotation.x = (Math.random() - 0.5) * Math.PI * 0.2;
        laptopData.group.rotation.y = (Math.random() - 0.5) * Math.PI * 0.2;
        
        laptopData.seed = Math.random() * 100;
        laptopData.speed = 0.3 + Math.random() * 0.3;
        laptopData.driftDir = i % 2 === 0 ? 1 : -1;
        
        scene.add(laptopData.group);
        laptops.push(laptopData);
    }




    // Mouse Motion
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Animation Loop
    const clock = new THREE.Clock();
    function animate() {
        if (!currentUser) {
            requestAnimationFrame(animate);
            
            const elapsedTime = clock.getElapsedTime();
            if (laptops && laptops.length > 0) {
                laptops.forEach(lap => {
                    lap.group.position.y += Math.sin(elapsedTime * lap.speed + lap.seed) * 0.005;
                    lap.group.position.x += Math.cos(elapsedTime * (lap.speed * 0.5) + lap.seed) * 0.003 * lap.driftDir;
                    lap.group.rotation.y += 0.001 * lap.driftDir;
                    lap.group.rotation.z += 0.0005;

                    // Badge orbit
                    if(lap.badge) {
                        lap.badge.position.y = 1 + Math.sin(elapsedTime * 3 + lap.seed) * 0.2;
                        lap.badge.rotation.y += 0.05;
                    }
                });
            }

            controls.update();
            renderer.render(scene, camera);
        } else {
            const bg = document.getElementById('bg');
            if (bg) bg.style.display = 'none';
        }
    }


    animate();

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
});

// --- Restore user session on refresh safely ---
function initApp() {
    const savedUser = localStorage.getItem('mindguard_user');
    if (savedUser) {
        try {
            login(JSON.parse(savedUser));
        } catch(e) {
            console.error("Failed to restore user session", e);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}




