// App State
let currentUser = null;
let notifications = [
    { id: 1, type: 'danger', priority: 'high', category: 'burnout', title: 'High Burnout Risk', message: 'Your stress level has been high for 3 days.', employee: 'You', time: '2 mins ago', read: false, rootCause: 'Sustained high workload + low sleep', suggestedAction: 'Schedule a break and check-in with manager' },
    { id: 2, type: 'warning', priority: 'medium', category: 'drift', title: 'Productivity Drop', message: 'Your activity decreased by 15% this week.', employee: 'You', time: '1 hour ago', read: false, rootCause: 'Irregular work patterns detected', suggestedAction: 'Review task priorities and block focus time' },
    { id: 3, type: 'healthy', priority: 'low', category: 'system', title: 'Goal Achieved', message: 'You maintained optimal focus hours!', employee: 'You', time: '1 day ago', read: true, rootCause: '', suggestedAction: '' }
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
    loadSettings();
    populateProfileData();
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
    
    // Screen-specific hooks
    if (screenId === 'alerts-screen') renderAlertCenter();
    if (screenId === 'employees-screen') renderEmployeeRoster();
    if (screenId === 'profile-screen') populateProfileData();
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
    
    const priorityFilter = document.getElementById('notif-filter-priority')?.value || 'all';
    let unreadCount = 0;
    
    const filtered = notifications.filter(n => {
        if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;
        return true;
    });
    
    // Smart grouping: merge similar alerts
    const grouped = [];
    const seen = new Set();
    filtered.forEach(n => {
        const key = `${n.category}_${n.priority}`;
        if (!n.read) unreadCount++;
        if (seen.has(key) && n.category !== 'system') {
            const existing = grouped.find(g => `${g.category}_${g.priority}` === key);
            if (existing) { existing.groupCount = (existing.groupCount || 1) + 1; return; }
        }
        seen.add(key);
        grouped.push({...n, groupCount: 1});
    });
    
    grouped.forEach(n => {
        const item = document.createElement('div');
        item.className = `notification-item ${n.type}`;
        item.style.opacity = n.read ? '0.6' : '1';
        item.style.cursor = 'pointer';
        item.style.transition = 'all 0.2s';
        
        const priorityBadge = n.priority === 'critical' ? '🔴' : n.priority === 'high' ? '🟠' : n.priority === 'medium' ? '🟡' : '🟢';
        const groupLabel = n.groupCount > 1 ? ` <span style="background: var(--primary); color: #000; padding: 1px 6px; border-radius: 8px; font-size: 0.7rem; font-weight: 600;">+${n.groupCount - 1} similar</span>` : '';
        
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <span>${priorityBadge}</span>
                <span style="font-weight: 600;">${n.title}${groupLabel}</span>
                ${!n.read ? '<span style="width: 6px; height: 6px; background: var(--primary); border-radius: 50; display: inline-block; margin-left: auto;"></span>' : ''}
            </div>
            <div style="font-size: 0.9rem; color: var(--text-muted);">${n.message}</div>
            <div class="notification-time">${n.time} · ${n.employee || ''}</div>
            <div id="notif-detail-${n.id}" style="display: none; margin-top: 8px; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px; border-left: 3px solid var(--primary); font-size: 0.8rem;">
                ${n.rootCause ? `<div><strong>Root cause:</strong> ${n.rootCause}</div>` : ''}
                ${n.suggestedAction ? `<div style="margin-top: 4px;"><strong>Action:</strong> ${n.suggestedAction}</div>` : ''}
                <div style="margin-top: 6px; display: flex; gap: 6px;">
                    <button class="btn btn-outline" style="padding: 2px 8px; font-size: 0.7rem;" onclick="event.stopPropagation(); markNotifRead(${n.id})">Mark read</button>
                </div>
            </div>
        `;
        item.onclick = () => {
            const detail = document.getElementById(`notif-detail-${n.id}`);
            if (detail) detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
        };
        list.appendChild(item);
    });
    
    document.getElementById('unread-dot').style.display = unreadCount > 0 ? 'block' : 'none';
}

function markNotifRead(id) {
    const n = notifications.find(n => n.id === id);
    if (n) n.read = true;
    renderNotifications();
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
    
    // Feature 1: Simulate health data for user check-in
    const heart_rate = Math.floor(60 + Math.random() * 35 + stressVal * 2); // stress elevates HR
    const sleep_hours = parseFloat(Math.max(3, 9 - stressVal * 0.5 + (Math.random() * 2 - 1)).toFixed(1));
    const fatigue_level = Math.min(10, Math.max(1, Math.round(stressVal * 0.8 + Math.random() * 2)));
    const headache_status = symptoms.includes('headaches');
    
    // Feature 2: Enhanced burnout calculation (weighted formula)
    // Work metrics → 50%
    let workScore = (stressVal || 5) * 6;
    if (workingHours > 10) workScore += 20;
    if (workingHours > 12) workScore += 15;
    if (workingDays >= 6) workScore += 15;
    if (burdenTasks === 'overwhelmed') workScore += 25;
    else if (burdenTasks === 'heavy') workScore += 12;
    if (pressureTalk === 'no') workScore += 10;
    workScore = Math.min(100, workScore);
    
    // Sleep deficiency → 20%
    let sleepScore = 0;
    if (sleep_hours < 4) sleepScore = 100;
    else if (sleep_hours < 5) sleepScore = 80;
    else if (sleep_hours < 6) sleepScore = 50;
    else if (sleep_hours < 7) sleepScore = 25;
    
    // Heart rate → 15%
    let heartScore = 0;
    if (heart_rate > 100) heartScore = 90;
    else if (heart_rate > 90) heartScore = 50;
    else if (heart_rate > 85) heartScore = 25;
    
    // Headache + fatigue → 15%
    let healthScore = 0;
    if (headache_status) healthScore += 40;
    healthScore += Math.max(0, (fatigue_level - 4) * 10);
    if (symptoms.length > 0) healthScore += symptoms.length * 8;
    healthScore = Math.min(100, healthScore);
    
    const burnoutScore = Math.min(100, Math.max(0, Math.round(
        workScore * 0.50 + sleepScore * 0.20 + heartScore * 0.15 + healthScore * 0.15
    )));
    
    // Feature 3: Strict classification
    let burnout = 'Medium';
    let status = 'yellow';
    if (burnoutScore >= 70) { burnout = 'High'; status = 'red'; }
    else if (burnoutScore < 40) { burnout = 'Low'; status = 'green'; }

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
    
    // Feature 8: Update personal health summary
    if (document.getElementById('user-heart-rate')) document.getElementById('user-heart-rate').textContent = heart_rate;
    if (document.getElementById('user-sleep-hours')) document.getElementById('user-sleep-hours').textContent = sleep_hours;
    if (document.getElementById('user-fatigue')) document.getElementById('user-fatigue').textContent = fatigue_level;
    if (document.getElementById('user-headache')) {
        const headacheEl = document.getElementById('user-headache');
        headacheEl.textContent = headache_status ? 'Yes' : 'No';
        headacheEl.style.color = headache_status ? 'var(--danger)' : 'var(--success)';
    }
    
    // Burnout explanation
    const reasons = [];
    if (sleep_hours < 5) reasons.push('low sleep');
    if (heart_rate > 95) reasons.push('elevated heart rate');
    if (fatigue_level > 7) reasons.push('high fatigue');
    if (headache_status) reasons.push('headache reported');
    if (workingHours > 10) reasons.push('excessive work hours');
    const explanation = reasons.length > 0 
        ? `${burnout} due to ${reasons.join(' and ')}` 
        : `${burnout} — within normal parameters`;
    if (document.getElementById('user-burnout-explanation')) {
        document.getElementById('user-burnout-explanation').textContent = explanation;
    }
    
    // Save state to LocalStorage
    currentUser.productivity = productivity;
    currentUser.burnout = burnout;
    currentUser.status = status;
    currentUser.healthData = { heart_rate, sleep_hours, working_hours: workingHours, headache_status, fatigue_level, source: 'simulated' };
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
            if (sleep_hours < 5) suggestions.push("⚠️ Sleep critically low — prioritize 7+ hours tonight.");
            if (heart_rate > 100) suggestions.push("❤️ Heart rate elevated — consider a calming activity.");
        } else if (burnout === 'Low') {
            suggestions = [
                "Keep up high-performance workflows.",
                "Optimize learning paths."
            ];
        }
        if (headache_status) suggestions.push("🤕 Headache reported — stay hydrated and consider a screen break.");
        if (fatigue_level > 7) suggestions.push("⚡ High fatigue detected — take a power nap or walk.");
        
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
        currentUser.dept = document.getElementById('profile-dept').value;
        
        document.getElementById('user-display-name').textContent = currentUser.name;
        document.getElementById('user-avatar').textContent = currentUser.name.charAt(0);
        
        if (currentUser.role === 'user') {
            document.getElementById('welcome-text').textContent = `Welcome back, ${currentUser.name}`;
        }
        
        document.getElementById('profile-completion-text').textContent = '100%';
        document.getElementById('profile-progress').style.width = '100%';
        
        localStorage.setItem('mindguard_user', JSON.stringify(currentUser));
        alert('Profile updated!');
    }
}

// ===== THEME SYSTEM =====
function applyThemeSetting() {
    const theme = document.getElementById('setting-theme').value;
    let isDark = true;
    
    if (theme === 'light') isDark = false;
    else if (theme === 'system') isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
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
    saveAllSettings();
}

function toggleTheme() { applyThemeSetting(); }

// ===== SETTINGS PERSISTENCE =====
function getSettings() {
    const saved = localStorage.getItem('mindguard_settings');
    return saved ? JSON.parse(saved) : {
        theme: 'dark',
        sensitivity: 'balanced',
        notifBurnout: true, notifAnomaly: true, notifTeam: true,
        trackSleep: true, trackHeartrate: true, trackFatigue: true, trackBehavior: true,
        shareWithHead: true,
        visBurnout: true, visHealth: false, visPatterns: true,
        headAlertThreshold: 60, headInterventionTrigger: '3days',
        aiEnabled: true, aiFrequency: 'daily', aiExplain: true,
        workStart: '09:00', workEnd: '18:00', breaksPerDay: 3, offhoursBlock: true
    };
}

function saveAllSettings() {
    const settings = {
        theme: document.getElementById('setting-theme')?.value || 'dark',
        sensitivity: document.getElementById('setting-sensitivity')?.value || 'balanced',
        notifBurnout: document.getElementById('notif-burnout')?.checked ?? true,
        notifAnomaly: document.getElementById('notif-anomaly')?.checked ?? true,
        notifTeam: document.getElementById('notif-team')?.checked ?? true,
        trackSleep: document.getElementById('track-sleep')?.checked ?? true,
        trackHeartrate: document.getElementById('track-heartrate')?.checked ?? true,
        trackFatigue: document.getElementById('track-fatigue')?.checked ?? true,
        trackBehavior: document.getElementById('track-behavior')?.checked ?? true,
        shareWithHead: document.getElementById('setting-privacy')?.checked ?? true,
        visBurnout: document.getElementById('vis-burnout')?.checked ?? true,
        visHealth: document.getElementById('vis-health')?.checked ?? false,
        visPatterns: document.getElementById('vis-patterns')?.checked ?? true,
        headAlertThreshold: parseInt(document.getElementById('head-alert-threshold')?.value) || 60,
        headInterventionTrigger: document.getElementById('head-intervention-trigger')?.value || '3days',
        aiEnabled: document.getElementById('ai-enabled')?.checked ?? true,
        aiFrequency: document.getElementById('ai-frequency')?.value || 'daily',
        aiExplain: document.getElementById('ai-explain')?.checked ?? true,
        workStart: document.getElementById('sys-work-start')?.value || '09:00',
        workEnd: document.getElementById('sys-work-end')?.value || '18:00',
        breaksPerDay: parseInt(document.getElementById('sys-breaks')?.value) || 3,
        offhoursBlock: document.getElementById('sys-offhours')?.checked ?? true
    };
    
    localStorage.setItem('mindguard_settings', JSON.stringify(settings));
    
    // Immediately apply settings effects
    applySettingsEffects(settings);
}

function loadSettings() {
    const s = getSettings();
    if (document.getElementById('setting-theme')) document.getElementById('setting-theme').value = s.theme;
    if (document.getElementById('setting-sensitivity')) document.getElementById('setting-sensitivity').value = s.sensitivity;
    if (document.getElementById('notif-burnout')) document.getElementById('notif-burnout').checked = s.notifBurnout;
    if (document.getElementById('notif-anomaly')) document.getElementById('notif-anomaly').checked = s.notifAnomaly;
    if (document.getElementById('notif-team')) document.getElementById('notif-team').checked = s.notifTeam;
    if (document.getElementById('track-sleep')) document.getElementById('track-sleep').checked = s.trackSleep;
    if (document.getElementById('track-heartrate')) document.getElementById('track-heartrate').checked = s.trackHeartrate;
    if (document.getElementById('track-fatigue')) document.getElementById('track-fatigue').checked = s.trackFatigue;
    if (document.getElementById('track-behavior')) document.getElementById('track-behavior').checked = s.trackBehavior;
    if (document.getElementById('setting-privacy')) document.getElementById('setting-privacy').checked = s.shareWithHead;
    if (document.getElementById('vis-burnout')) document.getElementById('vis-burnout').checked = s.visBurnout;
    if (document.getElementById('vis-health')) document.getElementById('vis-health').checked = s.visHealth;
    if (document.getElementById('vis-patterns')) document.getElementById('vis-patterns').checked = s.visPatterns;
    if (document.getElementById('head-alert-threshold')) document.getElementById('head-alert-threshold').value = s.headAlertThreshold;
    if (document.getElementById('head-intervention-trigger')) document.getElementById('head-intervention-trigger').value = s.headInterventionTrigger;
    if (document.getElementById('ai-enabled')) document.getElementById('ai-enabled').checked = s.aiEnabled;
    if (document.getElementById('ai-frequency')) document.getElementById('ai-frequency').value = s.aiFrequency;
    if (document.getElementById('ai-explain')) document.getElementById('ai-explain').checked = s.aiExplain;
    if (document.getElementById('sys-work-start')) document.getElementById('sys-work-start').value = s.workStart;
    if (document.getElementById('sys-work-end')) document.getElementById('sys-work-end').value = s.workEnd;
    if (document.getElementById('sys-breaks')) document.getElementById('sys-breaks').value = s.breaksPerDay;
    if (document.getElementById('sys-offhours')) document.getElementById('sys-offhours').checked = s.offhoursBlock;
    
    applySettingsEffects(s);
}

function applySettingsEffects(s) {
    // AI toggle: hide/show AI insight panels
    const aiPanels = document.querySelectorAll('#profile-ai-insights, #smart-alerts-list');
    aiPanels.forEach(p => { if (p) p.style.opacity = s.aiEnabled ? '1' : '0.3'; });
    
    // Sensitivity affects alert visibility thresholds
    window._aiSensitivity = s.sensitivity;
    window._aiEnabled = s.aiEnabled;
    window._headAlertThreshold = s.headAlertThreshold;
    window._trackSleep = s.trackSleep;
    window._trackHeartrate = s.trackHeartrate;
    window._trackFatigue = s.trackFatigue;
}

// ===== PROFILE ROLE TOGGLE =====
function toggleProfileRole() {
    const isHead = document.getElementById('profile-role-toggle').checked;
    document.getElementById('profile-employee-view').style.display = isHead ? 'none' : 'block';
    document.getElementById('profile-head-view').style.display = isHead ? 'block' : 'none';
    document.getElementById('profile-role-label').textContent = isHead ? 'Team Lead View' : 'Employee View';
    
    if (isHead) populateHeadProfileData();
}

// ===== PROFILE DATA POPULATION =====
function populateProfileData() {
    const s = getSettings();
    const user = currentUser || {};
    const health = user.healthData || {};
    
    // Work Patterns — simulate based on settings
    const workStart = parseInt((s.workStart || '09:00').split(':')[0]);
    const workEnd = parseInt((s.workEnd || '18:00').split(':')[0]);
    const workHoursTotal = workEnd - workStart;
    const focusHours = (workHoursTotal * (0.5 + Math.random() * 0.2)).toFixed(1);
    const breaksActual = (s.breaksPerDay + (Math.random() * 2 - 1)).toFixed(1);
    const peakStart = workStart + Math.floor(Math.random() * 2);
    const peakEnd = peakStart + 2;
    const deepPct = Math.floor(55 + Math.random() * 15);
    
    if (document.getElementById('prof-focus-hours')) document.getElementById('prof-focus-hours').textContent = focusHours;
    if (document.getElementById('prof-break-pattern')) document.getElementById('prof-break-pattern').textContent = breaksActual;
    if (document.getElementById('prof-peak-window')) document.getElementById('prof-peak-window').textContent = `${peakStart}–${peakEnd} ${peakStart < 12 ? 'AM' : 'PM'}`;
    if (document.getElementById('prof-deep-shallow')) document.getElementById('prof-deep-shallow').textContent = `${deepPct}/${100 - deepPct}`;
    
    // Behavioral Metrics
    const taskConsistency = Math.floor(70 + Math.random() * 20);
    const reworkFreq = Math.floor(5 + Math.random() * 15);
    const responseLatency = Math.floor(8 + Math.random() * 20);
    
    if (document.getElementById('prof-task-consistency')) {
        document.getElementById('prof-task-consistency').textContent = taskConsistency + '%';
        document.getElementById('prof-task-consistency-bar').style.width = taskConsistency + '%';
    }
    if (document.getElementById('prof-rework-freq')) {
        document.getElementById('prof-rework-freq').textContent = reworkFreq + '%';
        document.getElementById('prof-rework-bar').style.width = reworkFreq + '%';
    }
    if (document.getElementById('prof-response-latency')) {
        document.getElementById('prof-response-latency').textContent = responseLatency + 'm';
        document.getElementById('prof-response-bar').style.width = Math.min(100, responseLatency * 2) + '%';
    }
    
    // Wellbeing Indicators
    const burnout = user.burnout || 'Medium';
    const fatigueLevel = health.fatigue_level || Math.floor(3 + Math.random() * 5);
    const cogLoad = Math.floor(50 + Math.random() * 30);
    const baselineDev = Math.floor(Math.random() * 20 - 10);
    
    const fatigueSignal = fatigueLevel > 7 ? 'High' : fatigueLevel > 4 ? 'Moderate' : 'Low';
    const fatigueColor = fatigueLevel > 7 ? 'var(--danger)' : fatigueLevel > 4 ? 'var(--warning)' : 'var(--success)';
    const burnoutColor = burnout === 'High' ? 'var(--danger)' : burnout === 'Medium' ? 'var(--warning)' : 'var(--success)';
    
    if (document.getElementById('prof-fatigue-signal')) {
        document.getElementById('prof-fatigue-signal').textContent = fatigueSignal;
        document.getElementById('prof-fatigue-signal').style.color = fatigueColor;
    }
    if (document.getElementById('prof-burnout-risk')) {
        document.getElementById('prof-burnout-risk').textContent = burnout;
        document.getElementById('prof-burnout-risk').style.color = burnoutColor;
    }
    if (document.getElementById('prof-cognitive-load')) document.getElementById('prof-cognitive-load').textContent = cogLoad + '%';
    if (document.getElementById('prof-baseline-dev')) {
        const devText = baselineDev >= 0 ? `+${baselineDev}%` : `${baselineDev}%`;
        document.getElementById('prof-baseline-dev').textContent = devText;
        document.getElementById('prof-baseline-dev').style.color = Math.abs(baselineDev) > 8 ? 'var(--danger)' : 'var(--primary)';
    }
    
    // AI Insights — dynamic based on real data
    const insightsEl = document.getElementById('profile-ai-insights');
    if (insightsEl && s.aiEnabled) {
        insightsEl.innerHTML = '';
        const insights = [];
        if (cogLoad > 70) insights.push('🧠 Cognitive load above optimal (>70%) — consider reducing multitasking');
        if (parseFloat(focusHours) < 4) insights.push(`📉 Focus hours low at ${focusHours}h/day — block distraction-free periods`);
        if (reworkFreq > 12) insights.push(`🔄 Rework frequency at ${reworkFreq}% — check requirement clarity`);
        if (fatigueLevel > 6) insights.push(`⚡ Fatigue signal elevated — sleep & break patterns need attention`);
        if (responseLatency > 20) insights.push(`⏱️ Response latency at ${responseLatency}m — above 15m threshold`);
        insights.push(`⚡ Peak cognitive window: ${peakStart}–${peakEnd} ${peakStart < 12 ? 'AM' : 'PM'}. Schedule critical tasks here.`);
        if (Math.abs(baselineDev) > 5) insights.push(`📊 Baseline deviation at ${baselineDev > 0 ? '+' : ''}${baselineDev}% — ${baselineDev > 0 ? 'improving' : 'declining'} trend`);
        
        insights.forEach(i => {
            const li = document.createElement('li');
            li.textContent = i;
            insightsEl.appendChild(li);
        });
    }
    
    // Collaboration Graph
    const collabEl = document.getElementById('collab-graph');
    if (collabEl) {
        const collaborators = ['Sarah K.', 'Mike T.', 'Priya R.', 'James L.', 'Nina W.'];
        const intensity = collaborators.map(() => Math.floor(30 + Math.random() * 70));
        collabEl.innerHTML = collaborators.map((name, i) => `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600;">${name.charAt(0)}</div>
                <div style="flex: 1;">
                    <div style="font-size: 0.85rem; font-weight: 500;">${name}</div>
                    <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 4px;">
                        <div style="width: ${intensity[i]}%; height: 100%; background: var(--primary); border-radius: 2px; opacity: ${0.4 + intensity[i] / 150};"></div>
                    </div>
                </div>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${intensity[i]}%</span>
            </div>
        `).join('');
    }
    
    // Role toggle visibility
    if (currentUser && currentUser.role === 'head') {
        document.getElementById('profile-role-toggle').parentElement.parentElement.style.display = 'flex';
    }
}

function populateHeadProfileData() {
    const saved = localStorage.getItem('mindguard_sim_data');
    if (!saved) return;
    
    const data = JSON.parse(saved);
    const { employees, highCount, mediumCount, lowCount } = data;
    
    if (document.getElementById('head-low-count')) document.getElementById('head-low-count').textContent = lowCount;
    if (document.getElementById('head-med-count')) document.getElementById('head-med-count').textContent = mediumCount;
    if (document.getElementById('head-high-count')) document.getElementById('head-high-count').textContent = highCount;
    
    // Resource Strain
    const strainEl = document.getElementById('resource-strain-list');
    if (strainEl && employees) {
        const overloaded = employees.filter(e => e.working_hours > 10 && e.burnout >= 50).slice(0, 5);
        const underutilized = employees.filter(e => e.working_hours < 6 && e.burnout < 30).slice(0, 5);
        
        strainEl.innerHTML = `
            <div style="margin-bottom: 16px;">
                <div style="font-weight: 600; color: var(--danger); margin-bottom: 8px;">🔴 Overloaded (${overloaded.length})</div>
                ${overloaded.map(e => `<div style="padding: 6px 12px; background: rgba(255,0,85,0.05); border-radius: 6px; margin-bottom: 4px; font-size: 0.85rem;">${e.name} — ${e.working_hours}h/day, burnout: ${e.burnout}</div>`).join('')}
                ${overloaded.length === 0 ? '<div style="font-size: 0.85rem; color: var(--text-muted);">None currently</div>' : ''}
            </div>
            <div>
                <div style="font-weight: 600; color: var(--primary); margin-bottom: 8px;">🔵 Underutilized (${underutilized.length})</div>
                ${underutilized.map(e => `<div style="padding: 6px 12px; background: rgba(0,255,255,0.05); border-radius: 6px; margin-bottom: 4px; font-size: 0.85rem;">${e.name} — ${e.working_hours}h/day, burnout: ${e.burnout}</div>`).join('')}
                ${underutilized.length === 0 ? '<div style="font-size: 0.85rem; color: var(--text-muted);">None currently</div>' : ''}
            </div>
        `;
    }
    
    // Risk Alerts
    const alertsEl = document.getElementById('head-risk-alerts');
    if (alertsEl && employees) {
        alertsEl.innerHTML = '';
        const highRisk = employees.filter(e => e.risk === 'High');
        const reworkAlerts = employees.filter(e => e.burnout >= 50 && e.fatigue_level > 7);
        
        if (highRisk.length > 0) {
            const li = document.createElement('li');
            li.style.borderLeftColor = 'var(--danger)';
            li.textContent = `🚨 ${highRisk.length} member(s) in High burnout zone — immediate attention required`;
            alertsEl.appendChild(li);
        }
        if (reworkAlerts.length > 0) {
            const li = document.createElement('li');
            li.style.borderLeftColor = 'var(--warning)';
            li.textContent = `⚠️ ${reworkAlerts.length} members showing early burnout signals due to high fatigue and elevated risk`;
            alertsEl.appendChild(li);
        }
        
        const sleepAlerts = employees.filter(e => e.sleep_hours < 5);
        if (sleepAlerts.length > 0) {
            const li = document.createElement('li');
            li.style.borderLeftColor = 'var(--warning)';
            li.textContent = `😴 ${sleepAlerts.length} members reporting less than 5h sleep — fatigue risk`;
            alertsEl.appendChild(li);
        }
    }
    
    // Deviation Drilldown
    const drilldownEl = document.getElementById('deviation-drilldown');
    if (drilldownEl && employees) {
        const deviating = employees.filter(e => e.burnout >= 40 && e.fatigue_level > 5).slice(0, 8);
        drilldownEl.innerHTML = deviating.map(e => {
            const reasons = [];
            if (e.sleep_hours < 5) reasons.push('low sleep');
            if (e.heart_rate > 95) reasons.push('elevated HR');
            if (e.fatigue_level > 7) reasons.push('high fatigue');
            if (e.working_hours > 10) reasons.push('overwork');
            return `<div style="padding: 10px; background: rgba(255,255,255,0.02); border-radius: 6px; margin-bottom: 8px; border-left: 3px solid var(--${e.risk === 'High' ? 'danger' : 'warning'});">
                <div style="font-weight: 600;">${e.name} <span style="color: var(--${e.colorClass}); font-size: 0.8rem;">${e.risk}</span></div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">AI: Deviating from baseline — ${reasons.length > 0 ? reasons.join(', ') : 'multiple factors'}</div>
            </div>`;
        }).join('');
    }
}

function reportOverwhelm(isOverwhelmed) {
    const user = currentUser || {};
    user.overwhelmReported = isOverwhelmed;
    user.overwhelmTimestamp = new Date().toISOString();
    localStorage.setItem('mindguard_user', JSON.stringify(user));
    
    if (isOverwhelmed) {
        alert('🫂 We hear you. Your response has been recorded privately.\n\nAI suggestion: Take a 10-minute break, step away from your screen, and practice deep breathing.');
    } else {
        alert('✅ Great to hear! Keep monitoring your patterns.');
    }
}

function explainMyRisk() {
    const user = currentUser || {};
    const health = user.healthData || {};
    const settings = getSettings();
    
    let explanation = '📊 AI Risk Assessment Explanation:\n\n';
    explanation += `Current burnout level: ${user.burnout || 'Not assessed'}\n\n`;
    explanation += 'Contributing factors:\n';
    
    if (health.sleep_hours && health.sleep_hours < 6) explanation += `• Sleep: ${health.sleep_hours}h (below recommended 7h)\n`;
    else explanation += '• Sleep: Within normal range\n';
    
    if (health.heart_rate && health.heart_rate > 90) explanation += `• Heart rate: ${health.heart_rate} bpm (elevated)\n`;
    else explanation += '• Heart rate: Normal\n';
    
    if (health.fatigue_level && health.fatigue_level > 6) explanation += `• Fatigue: ${health.fatigue_level}/10 (above threshold)\n`;
    else explanation += '• Fatigue: Manageable\n';
    
    if (health.headache_status) explanation += '• Headache: Reported\n';
    
    explanation += `\nAI sensitivity: ${settings.sensitivity.toUpperCase()}`;
    explanation += `\nData source: ${health.source || 'simulated'}`;
    
    alert(explanation);
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
    const employees = [];
    const totalEmployees = 125;
    
    for (let i = 1; i <= totalEmployees; i++) {
        const name = NAMES[Math.floor(Math.random() * NAMES.length)] + " " + String.fromCharCode(65 + (i % 26));
        const dept = DEPTS[Math.floor(Math.random() * DEPTS.length)];
        
        // Feature 1: Health & Activity Tracking — realistic simulated values
        const heart_rate = Math.floor(60 + Math.random() * 50); // 60–110 bpm
        const sleep_hours = parseFloat((Math.random() * 9 + 3).toFixed(1)); // 3–12 hours
        const working_hours = parseFloat((Math.random() * 10 + 4).toFixed(1)); // 4–14 hours
        const headache_status = Math.random() < 0.2; // 20% chance
        const fatigue_level = Math.floor(Math.random() * 10) + 1; // 1–10
        
        // Feature 2: Enhanced Burnout Score (weighted formula)
        // Work metrics → 50%
        let workScore = 0;
        if (working_hours > 10) workScore += 30;
        else if (working_hours > 8) workScore += 15;
        workScore += Math.max(0, (fatigue_level - 5) * 5); // fatigue adds to work stress
        workScore = Math.min(100, workScore);
        
        // Sleep deficiency → 20%
        let sleepScore = 0;
        if (sleep_hours < 4) sleepScore = 100;
        else if (sleep_hours < 5) sleepScore = 80;
        else if (sleep_hours < 6) sleepScore = 50;
        else if (sleep_hours < 7) sleepScore = 25;
        
        // Heart rate abnormality → 15%
        let heartScore = 0;
        if (heart_rate > 100) heartScore = 90;
        else if (heart_rate > 90) heartScore = 50;
        else if (heart_rate > 85) heartScore = 25;
        
        // Headache + fatigue → 15%
        let healthScore = 0;
        if (headache_status) healthScore += 40;
        healthScore += Math.max(0, (fatigue_level - 4) * 10);
        healthScore = Math.min(100, healthScore);
        
        // Final burnout score (0–100)
        const burnout = Math.min(100, Math.max(0, Math.round(
            workScore * 0.50 + sleepScore * 0.20 + heartScore * 0.15 + healthScore * 0.15
        )));
        
        const prod = Math.min(100, Math.max(20, 100 - burnout + Math.floor(Math.random() * 15) - 5));
        
        // Feature 3: Classification (Low 0-39, Medium 40-69, High 70-100)
        let risk = 'Low';
        let colorClass = 'success';
        if (burnout >= 70) {
            risk = 'High';
            colorClass = 'danger';
        } else if (burnout >= 40) {
            risk = 'Medium';
            colorClass = 'warning';
        }
        
        // Burnout explanation
        let burnoutExplanation = '';
        const reasons = [];
        if (sleep_hours < 5) reasons.push('low sleep');
        if (heart_rate > 95) reasons.push('elevated heart rate');
        if (fatigue_level > 7) reasons.push('high fatigue');
        if (headache_status) reasons.push('headache reported');
        if (working_hours > 10) reasons.push('excessive work hours');
        burnoutExplanation = reasons.length > 0 
            ? `${risk} due to ${reasons.join(' and ')}` 
            : `${risk} — within normal parameters`;
        
        // Integration-ready health data structure (Feature 9)
        const healthData = {
            source: 'simulated', // ready for: 'apple_health', 'fitbit', 'google_fit'
            heart_rate,
            sleep_hours,
            working_hours,
            headache_status,
            fatigue_level,
            timestamp: new Date().toISOString()
        };
        
        employees.push({ 
            name, dept, burnout, prod, risk, colorClass,
            heart_rate, sleep_hours, working_hours, headache_status, fatigue_level,
            burnoutExplanation, healthData
        });
    }
    
    // Feature 4: Strict Distribution Control — High NEVER ≥ 10
    // Sort by burnout descending for rebalancing
    employees.sort((a, b) => b.burnout - a.burnout);
    
    let highCount = employees.filter(e => e.risk === 'High').length;
    const MAX_HIGH = 9;
    
    // Cap High at 9 — overflow goes to Medium
    if (highCount > MAX_HIGH) {
        let demoteCount = highCount - MAX_HIGH;
        // Demote the lowest-burnout "High" employees to Medium
        for (let i = employees.length - 1; i >= 0 && demoteCount > 0; i--) {
            if (employees[i].risk === 'High') {
                employees[i].risk = 'Medium';
                employees[i].colorClass = 'warning';
                employees[i].burnoutExplanation = employees[i].burnoutExplanation.replace('High', 'Medium');
                demoteCount--;
            }
        }
    }
    
    // Ensure at least 1 High if any risk signals exist
    highCount = employees.filter(e => e.risk === 'High').length;
    if (highCount === 0) {
        const candidates = employees.filter(e => e.risk === 'Medium' && e.burnout >= 50);
        if (candidates.length > 0) {
            const promote = candidates.slice(0, Math.min(2, candidates.length));
            promote.forEach(emp => {
                emp.risk = 'High';
                emp.colorClass = 'danger';
            });
        }
    }
    
    // Recount after rebalancing
    highCount = employees.filter(e => e.risk === 'High').length;
    let mediumCount = employees.filter(e => e.risk === 'Medium').length;
    let lowCount = employees.filter(e => e.risk === 'Low').length;
    
    // Feature 5: Data Integrity — ensure total matches
    const totalCheck = highCount + mediumCount + lowCount;
    if (totalCheck !== totalEmployees) {
        console.error(`Distribution mismatch: ${totalCheck} vs ${totalEmployees}`);
    }
    
    // Feature 6: Compute dashboard aggregate stats
    const avgSleep = (employees.reduce((s, e) => s + e.sleep_hours, 0) / totalEmployees).toFixed(1);
    const avgHeartRate = Math.round(employees.reduce((s, e) => s + e.heart_rate, 0) / totalEmployees);
    const avgFatigue = (employees.reduce((s, e) => s + e.fatigue_level, 0) / totalEmployees).toFixed(1);
    
    // Feature 7: Smart Alerts
    const smartAlerts = [];
    employees.forEach(emp => {
        if (emp.sleep_hours < 5) smartAlerts.push({ type: 'danger', msg: `${emp.name}: Sleep critically low (${emp.sleep_hours}h)` });
        if (emp.heart_rate > 100) smartAlerts.push({ type: 'danger', msg: `${emp.name}: Heart rate elevated (${emp.heart_rate} bpm) during work` });
        if (emp.fatigue_level > 8) smartAlerts.push({ type: 'warning', msg: `${emp.name}: Fatigue level critical (${emp.fatigue_level}/10)` });
        if (emp.headache_status) smartAlerts.push({ type: 'warning', msg: `${emp.name}: Headache reported — monitor for consecutive pattern` });
    });
    
    const simData = { 
        employees, highCount, mediumCount, lowCount, 
        totalEmployees, avgSleep, avgHeartRate, avgFatigue,
        smartAlerts
    };
    localStorage.setItem('mindguard_sim_data', JSON.stringify(simData));
    
    if (!quiet) alert(`✅ Generated health-enhanced data for ${totalEmployees} employees!\n\nDistribution: Low(${lowCount}) Medium(${mediumCount}) High(${highCount})\nTotal: ${lowCount + mediumCount + highCount}\nHigh burnout capped at max 9 ✓`);
    loadSimulatedData();
}

function loadSimulatedData() {
    let saved = localStorage.getItem('mindguard_sim_data');
    if (!saved) {
        generateSampleData(true);
        saved = localStorage.getItem('mindguard_sim_data');
    }
    
    try {
        const data = JSON.parse(saved);
        const { employees, highCount, mediumCount, lowCount, totalEmployees, avgSleep, avgHeartRate, avgFatigue, smartAlerts } = data;
        const grid = document.getElementById('heatmap-grid');
        const tbody = document.getElementById('team-table-body');
        const alerts = document.getElementById('team-alerts');
        
        if (grid) grid.innerHTML = '';
        if (tbody) tbody.innerHTML = '';
        if (alerts) alerts.innerHTML = '';
        
        employees.forEach(emp => {
            // Heatmap cards with health data
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
                    <div style="margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 0.75rem; color: var(--text-muted);">
                        <div>❤️ ${emp.heart_rate || '--'} bpm</div>
                        <div>😴 ${emp.sleep_hours || '--'}h sleep</div>
                        <div>⚡ Fatigue: ${emp.fatigue_level || '--'}/10</div>
                        <div>🕐 ${emp.working_hours || '--'}h work</div>
                    </div>
                    ${emp.headache_status ? '<div style="margin-top: 6px; font-size: 0.75rem; color: var(--danger);">🤕 Headache reported</div>' : ''}
                    <div style="margin-top: 8px; font-size: 0.8rem; text-transform: uppercase; color: var(--${emp.colorClass}); font-weight: bold;">
                        ${emp.risk} Risk
                    </div>
                `;
                grid.appendChild(card);
            }
            
            // Team table — High and Medium risk employees
            if (tbody && (emp.risk === 'High' || emp.risk === 'Medium')) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${emp.name}</td>
                    <td>${emp.prod}%</td>
                    <td style="color: var(--${emp.colorClass}); font-weight:bold;">${emp.risk}</td>
                    <td><span class="status-dot dot-${emp.colorClass === 'danger' ? 'red' : 'yellow'}"></span></td>
                    <td>
                        ${emp.risk === 'High' ? 
                            `<button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; cursor:pointer;" onclick="offerBurnoutChoices('${emp.name}', '${emp.prod}')">Intervene</button>` : 
                            `<button class="btn btn-warning" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 6px; cursor:pointer; color:#000;" onclick="offerMediumChoices('${emp.name}', '${emp.prod}')">Support</button>`
                        }
                    </td>
                `;
                tbody.appendChild(tr);
            }
            
            // High risk alerts
            if (alerts && emp.risk === 'High') {
                const alertItem = document.createElement('li');
                alertItem.style.borderLeft = `4px solid var(--${emp.colorClass})`;
                alertItem.style.padding = '8px';
                alertItem.style.marginBottom = '8px';
                alertItem.innerHTML = `<strong>${emp.name}</strong> (${emp.dept}): Burnout index at ${emp.burnout}. ${emp.burnoutExplanation || 'Action requested.'}`;
                alerts.appendChild(alertItem);
            }
        });
        
        // Update alert counters
        if (document.getElementById('total-alerts-count')) document.getElementById('total-alerts-count').textContent = highCount + mediumCount;
        if (document.getElementById('critical-alerts')) document.getElementById('critical-alerts').textContent = highCount;
        if (document.getElementById('high-alerts')) document.getElementById('high-alerts').textContent = mediumCount;
        if (document.getElementById('medium-alerts')) document.getElementById('medium-alerts').textContent = lowCount;
        if (document.getElementById('low-alerts')) document.getElementById('low-alerts').textContent = 0;
        
        // Feature 6: Dashboard KPIs — populate new health summary cards
        if (document.getElementById('dash-total-employees')) document.getElementById('dash-total-employees').textContent = totalEmployees || employees.length;
        if (document.getElementById('dash-high-count')) document.getElementById('dash-high-count').textContent = highCount || 0;
        if (document.getElementById('dash-medium-count')) document.getElementById('dash-medium-count').textContent = mediumCount || 0;
        if (document.getElementById('dash-low-count')) document.getElementById('dash-low-count').textContent = lowCount || 0;
        if (document.getElementById('dash-avg-sleep')) document.getElementById('dash-avg-sleep').textContent = avgSleep || '--';
        if (document.getElementById('dash-avg-heartrate')) document.getElementById('dash-avg-heartrate').textContent = avgHeartRate || '--';
        if (document.getElementById('dash-avg-fatigue')) document.getElementById('dash-avg-fatigue').textContent = avgFatigue || '--';
        if (document.getElementById('dash-alerts-count')) document.getElementById('dash-alerts-count').textContent = highCount || 0;
        
        // Feature 7: Smart Alerts rendering
        const smartAlertsList = document.getElementById('smart-alerts-list');
        if (smartAlertsList && smartAlerts && smartAlerts.length > 0) {
            smartAlertsList.innerHTML = '';
            smartAlerts.slice(0, 15).forEach(sa => {
                const li = document.createElement('li');
                li.style.borderLeftColor = sa.type === 'danger' ? 'var(--danger)' : 'var(--warning)';
                li.innerHTML = `${sa.type === 'danger' ? '🚨' : '⚠️'} ${sa.msg}`;
                smartAlertsList.appendChild(li);
            });
        }
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

// ===== EMPLOYEE MANAGEMENT =====
let managedEmployees = JSON.parse(localStorage.getItem('mindguard_managed_employees') || '[]');

function addEmployee() {
    const name = document.getElementById('emp-name')?.value?.trim();
    const email = document.getElementById('emp-email')?.value?.trim();
    const role = document.getElementById('emp-role-input')?.value?.trim();
    const dept = document.getElementById('emp-dept-input')?.value;
    if (!name || !email || !role) { alert('Name, Role, and Email are required.'); return; }
    const emp = {
        id: document.getElementById('emp-id')?.value?.trim() || `EMP-${Date.now().toString(36).toUpperCase()}`,
        name, email, role, dept,
        manager: document.getElementById('emp-manager')?.value?.trim() || 'Unassigned',
        team: document.getElementById('emp-team')?.value?.trim() || dept,
        projects: document.getElementById('emp-projects')?.value?.trim() || '',
        phone: document.getElementById('emp-phone')?.value?.trim() || '',
        addedAt: new Date().toISOString(),
        // Auto-generated metrics
        burnout: Math.floor(15 + Math.random() * 40),
        productivity: Math.floor(55 + Math.random() * 35),
        heart_rate: Math.floor(65 + Math.random() * 30),
        sleep_hours: parseFloat((5.5 + Math.random() * 3).toFixed(1)),
        fatigue_level: Math.floor(2 + Math.random() * 6),
        working_hours: parseFloat((6 + Math.random() * 5).toFixed(1)),
        taskCompletion: Math.floor(65 + Math.random() * 30),
        reworkFreq: Math.floor(3 + Math.random() * 18),
        focusTime: parseFloat((3 + Math.random() * 4).toFixed(1)),
        outputQuality: Math.floor(60 + Math.random() * 35)
    };
    emp.risk = emp.burnout >= 70 ? 'High' : emp.burnout >= 40 ? 'Medium' : 'Low';
    emp.status = emp.burnout >= 65 ? 'Critical' : emp.burnout >= 40 ? 'Drifting' : 'Stable';
    managedEmployees.push(emp);
    localStorage.setItem('mindguard_managed_employees', JSON.stringify(managedEmployees));
    ['emp-name','emp-id','emp-role-input','emp-manager','emp-team','emp-projects','emp-email','emp-phone'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    renderEmployeeRoster();
    alert(`✅ ${name} added successfully!`);
}

function handleCSVUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const lines = e.target.result.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(',').map(v => v.trim());
            const get = (key) => vals[headers.indexOf(key)] || '';
            if (!get('name')) continue;
            const b = Math.floor(15 + Math.random() * 40);
            managedEmployees.push({
                id: get('id') || `EMP-${Date.now().toString(36).toUpperCase()}${i}`,
                name: get('name'), email: get('email') || `${get('name').replace(/\s/g,'').toLowerCase()}@company.com`,
                role: get('role') || 'Employee', dept: get('department') || 'Engineering',
                manager: get('manager') || 'Unassigned', team: get('team') || 'General',
                projects: get('projects') || '', phone: get('phone') || '',
                addedAt: new Date().toISOString(), burnout: b, productivity: Math.floor(55 + Math.random() * 35),
                heart_rate: Math.floor(65 + Math.random() * 30), sleep_hours: parseFloat((5.5 + Math.random() * 3).toFixed(1)),
                fatigue_level: Math.floor(2 + Math.random() * 6), working_hours: parseFloat((6 + Math.random() * 5).toFixed(1)),
                taskCompletion: Math.floor(65 + Math.random() * 30), reworkFreq: Math.floor(3 + Math.random() * 18),
                focusTime: parseFloat((3 + Math.random() * 4).toFixed(1)), outputQuality: Math.floor(60 + Math.random() * 35),
                risk: b >= 70 ? 'High' : b >= 40 ? 'Medium' : 'Low',
                status: b >= 65 ? 'Critical' : b >= 40 ? 'Drifting' : 'Stable'
            });
            count++;
        }
        localStorage.setItem('mindguard_managed_employees', JSON.stringify(managedEmployees));
        renderEmployeeRoster();
        alert(`✅ ${count} employees imported from CSV!`);
    };
    reader.readAsText(file);
}

function getAllEmployees() {
    const sim = JSON.parse(localStorage.getItem('mindguard_sim_data') || '{}');
    const simEmps = (sim.employees || []).map(e => ({...e, source: 'simulated', id: e.id || `SIM-${e.name?.replace(/\s/g,'')}`,
        taskCompletion: e.taskCompletion || Math.floor(65 + Math.random() * 30),
        reworkFreq: e.reworkFreq || Math.floor(3 + Math.random() * 18),
        focusTime: e.focusTime || parseFloat((3 + Math.random() * 4).toFixed(1)),
        outputQuality: e.outputQuality || Math.floor(60 + Math.random() * 35),
        status: (e.burnout >= 65 ? 'Critical' : e.burnout >= 40 ? 'Drifting' : 'Stable')
    }));
    return [...simEmps, ...managedEmployees.map(e => ({...e, source: 'manual'}))];
}

function renderEmployeeRoster() {
    const container = document.getElementById('employee-roster'); if (!container) return;
    const search = (document.getElementById('emp-search')?.value || '').toLowerCase();
    const deptFilter = document.getElementById('emp-filter-dept')?.value || 'all';
    const statusFilter = document.getElementById('emp-filter-status')?.value || 'all';
    let emps = getAllEmployees();
    if (search) emps = emps.filter(e => (e.name||'').toLowerCase().includes(search) || (e.dept||'').toLowerCase().includes(search));
    if (deptFilter !== 'all') emps = emps.filter(e => e.dept === deptFilter);
    if (statusFilter !== 'all') emps = emps.filter(e => e.status === statusFilter);
    document.getElementById('emp-count-label').textContent = `${emps.length} employees`;
    if (emps.length === 0) { container.innerHTML = '<div style="color: var(--text-muted); padding: 20px; text-align: center;">No employees found. Add employees or generate sample data.</div>'; return; }
    container.innerHTML = emps.map((e, i) => {
        const sc = e.status === 'Critical' ? 'danger' : e.status === 'Drifting' ? 'warning' : 'success';
        const rc = e.risk === 'High' ? 'danger' : e.risk === 'Medium' ? 'warning' : 'success';
        const aiSummary = generateAISummary(e);
        return `<div style="border: 1px solid var(--glass-border); border-radius: 8px; margin-bottom: 8px; overflow: hidden;">
            <div style="padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="document.getElementById('emp-expand-${i}').style.display = document.getElementById('emp-expand-${i}').style.display === 'none' ? 'block' : 'none'">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem;">${(e.name||'?').charAt(0)}</div>
                <div style="flex: 1;"><div style="font-weight: 600;">${e.name}</div><div style="font-size: 0.8rem; color: var(--text-muted);">${e.role || ''} · ${e.dept || ''}</div></div>
                <span class="status-indicator status-${sc}" style="font-size: 0.75rem; padding: 2px 8px;">${e.status}</span>
                <span style="font-size: 0.8rem; color: var(--${rc}); font-weight: 600;">${e.risk}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted);">▼</span>
            </div>
            <div id="emp-expand-${i}" style="display: none; padding: 0 16px 16px; border-top: 1px solid var(--glass-border);">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-top: 12px;">
                    <div style="text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;"><div style="font-size: 0.75rem; color: var(--text-muted);">Task Completion</div><div style="font-weight: 700; color: var(--primary);">${e.taskCompletion}%</div></div>
                    <div style="text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;"><div style="font-size: 0.75rem; color: var(--text-muted);">Focus Time</div><div style="font-weight: 700; color: #8b5cf6;">${e.focusTime}h</div></div>
                    <div style="text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;"><div style="font-size: 0.75rem; color: var(--text-muted);">Rework</div><div style="font-weight: 700; color: var(--warning);">${e.reworkFreq}%</div></div>
                    <div style="text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;"><div style="font-size: 0.75rem; color: var(--text-muted);">Output Quality</div><div style="font-weight: 700; color: var(--success);">${e.outputQuality}%</div></div>
                    <div style="text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;"><div style="font-size: 0.75rem; color: var(--text-muted);">Heart Rate</div><div style="font-weight: 700; color: #ef4444;">${e.heart_rate} bpm</div></div>
                    <div style="text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;"><div style="font-size: 0.75rem; color: var(--text-muted);">Sleep</div><div style="font-weight: 700; color: #8b5cf6;">${e.sleep_hours}h</div></div>
                    <div style="text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;"><div style="font-size: 0.75rem; color: var(--text-muted);">Fatigue</div><div style="font-weight: 700; color: #f59e0b;">${e.fatigue_level}/10</div></div>
                    <div style="text-align: center; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;"><div style="font-size: 0.75rem; color: var(--text-muted);">Burnout Score</div><div style="font-weight: 700; color: var(--${rc});">${e.burnout}</div></div>
                </div>
                <div style="margin-top: 12px; padding: 10px; background: rgba(0,255,255,0.03); border-radius: 6px; border-left: 3px solid var(--primary);">
                    <div style="font-size: 0.8rem; font-weight: 600; color: var(--primary);">🤖 AI Summary</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">${aiSummary}</div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">Manager: ${e.manager||'N/A'} · Team: ${e.team||'N/A'} · ${e.email||''}</div>
            </div></div>`;
    }).join('');
}

function generateAISummary(e) {
    const issues = [];
    if (e.burnout >= 60) issues.push('elevated burnout risk');
    if (e.sleep_hours < 5) issues.push('critically low sleep');
    if (e.fatigue_level > 7) issues.push('high fatigue');
    if (e.reworkFreq > 15) issues.push('excessive rework cycles');
    if (e.taskCompletion < 60) issues.push('declining task completion');
    if (e.working_hours > 10) issues.push('overwork pattern detected');
    if (issues.length === 0) return `${e.name} is performing within normal parameters. No anomalies detected.`;
    return `Performance concern: ${issues.join(', ')}. Recommend ${e.burnout >= 60 ? 'immediate check-in and workload review' : 'monitoring over next 3 days'}.`;
}

// ===== TASK REDISTRIBUTION ENGINE =====
let taskRecoveryMetrics = JSON.parse(localStorage.getItem('mindguard_task_metrics') || '{"score": 0, "reassigned": 0}');

function getEmployeeTasks(empId, dept) {
    let tasksDB = JSON.parse(localStorage.getItem('mindguard_employee_tasks') || '{}');
    if (!tasksDB[empId]) {
        // Generate simulated tasks
        const numTasks = Math.floor(3 + Math.random() * 5);
        tasksDB[empId] = [];
        for (let i = 0; i < numTasks; i++) {
            const isPriority = Math.random() > 0.6;
            const status = Math.random() > 0.7 ? (Math.random() > 0.5 ? 'blocked' : 'delayed') : 'pending';
            tasksDB[empId].push({
                id: `TSK-${empId}-${Date.now().toString(36)}-${i}`,
                title: `${dept} Deliverable ${String.fromCharCode(65+i)}`,
                priority: isPriority ? 'High' : 'Normal',
                status: status,
                hours: Math.floor(2 + Math.random() * 6),
                deadline: new Date(Date.now() + (Math.random() * 7 - 2) * 86400000).toLocaleDateString()
            });
        }
        localStorage.setItem('mindguard_employee_tasks', JSON.stringify(tasksDB));
    }
    return tasksDB[empId];
}

function updateEmployeeTasks(empId, tasks) {
    let tasksDB = JSON.parse(localStorage.getItem('mindguard_employee_tasks') || '{}');
    tasksDB[empId] = tasks;
    localStorage.setItem('mindguard_employee_tasks', JSON.stringify(tasksDB));
}

function renderTaskRebalancer() {
    const emps = getAllEmployees();
    const atRisk = emps.filter(e => e.burnout >= 50); // High/Critical or upper Medium
    const listHtml = atRisk.map(e => {
        const tasks = getEmployeeTasks(e.id, e.dept);
        const criticalTasks = tasks.filter(t => t.priority === 'High' || t.status === 'delayed' || t.status === 'blocked');
        if (criticalTasks.length === 0) return '';
        
        return `<div style="border: 1px solid var(--glass-border); padding: 12px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: rgba(255,255,255,0.02);" onclick="selectRebalanceTarget('${e.id}')">
            <div>
                <div style="font-weight: 600;">${e.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${e.dept} · Burnout: <span style="color: var(--danger); font-weight: bold;">${e.burnout}</span></div>
            </div>
            <div style="text-align: right;">
                <div style="color: var(--warning); font-weight: 600;">${criticalTasks.length} At-Risk Tasks</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Click to reassign</div>
            </div>
        </div>`;
    }).join('');

    document.getElementById('at-risk-workloads').innerHTML = listHtml || '<div style="color: var(--success); padding: 20px; text-align: center;">No critical work gaps detected.</div>';
    
    // Update metrics
    document.getElementById('metric-recovery-score').textContent = `${taskRecoveryMetrics.score}%`;
    document.getElementById('metric-reassigned-count').textContent = taskRecoveryMetrics.reassigned;
}

let currentRebalanceTarget = null;
let currentTaskId = null;

function selectRebalanceTarget(empId) {
    currentRebalanceTarget = empId;
    const emps = getAllEmployees();
    const emp = emps.find(e => e.id === empId);
    if (!emp) return;

    document.getElementById('rebalance-target-name').textContent = `Tasks for ${emp.name}`;
    
    const tasks = getEmployeeTasks(emp.id, emp.dept);
    const listHtml = tasks.map(t => {
        const statusColor = t.status === 'blocked' ? 'var(--danger)' : t.status === 'delayed' ? 'var(--warning)' : 'var(--primary)';
        return `<div style="border: 1px solid var(--glass-border); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: 600;">${t.title}</div>
                <div style="font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; background: rgba(255,255,255,0.1); border: 1px solid ${statusColor}; color: ${statusColor};">${t.status.toUpperCase()}</div>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">Priority: ${t.priority} · Est. ${t.hours}h · Due: ${t.deadline}</div>
            <button class="btn btn-primary" style="padding: 4px 12px; font-size: 0.8rem;" onclick="suggestReassignment('${emp.id}', '${t.id}')">Suggest Reassignment</button>
        </div>`;
    }).join('');

    document.getElementById('pending-tasks-list').innerHTML = listHtml || '<div style="color: var(--text-muted); text-align: center;">No pending tasks.</div>';
    document.getElementById('impact-awareness-panel').style.display = 'none';
}

function suggestReassignment(sourceEmpId, taskId) {
    const emps = getAllEmployees();
    const sourceEmp = emps.find(e => e.id === sourceEmpId);
    const tasks = getEmployeeTasks(sourceEmpId, sourceEmp.dept);
    const task = tasks.find(t => t.id === taskId);
    if (!sourceEmp || !task) return;

    currentTaskId = taskId;

    // Filter available employees: same dept, burnout < 50, working_hours < 8
    const candidates = emps.filter(e => e.id !== sourceEmpId && e.dept === sourceEmp.dept && e.burnout < 50 && e.working_hours < 8);
    candidates.sort((a, b) => a.burnout - b.burnout); // Sort by lowest burnout

    const panel = document.getElementById('impact-awareness-panel');
    const details = document.getElementById('impact-details');

    if (candidates.length === 0) {
        details.innerHTML = `<div style="color: var(--danger); font-weight: 600;">No suitable candidates found in ${sourceEmp.dept}.</div>
        <p style="color: var(--text-muted); font-size: 0.8rem;">All team members are either at high burnout risk or over capacity (>8h/day). Cross-department reassignment or deadline extension required.</p>`;
        document.getElementById('btn-confirm-reassign').style.display = 'none';
    } else {
        const top = candidates[0];
        const newHours = (top.working_hours + (task.hours / 5)).toFixed(1); // Spread task hours over a week roughly
        const newRisk = newHours > 8 ? 'Medium' : top.risk;
        
        details.innerHTML = `
            <div style="margin-bottom: 12px;"><strong>Suggested Assignee:</strong> ${top.name} (Burnout: ${top.burnout}, ${top.working_hours}h/day)</div>
            <div style="margin-bottom: 8px;"><strong>Simulated Impact on ${top.name}:</strong></div>
            <ul style="color: var(--text-muted); margin: 0; padding-left: 20px;">
                <li>Workload: ${top.working_hours}h ➔ <span style="color: var(--warning);">${newHours}h</span></li>
                <li>Burnout Risk: ${top.risk} ➔ <span style="color: ${newRisk === 'Medium' ? 'var(--warning)' : 'var(--success)'};">${newRisk}</span></li>
            </ul>
        `;
        const btn = document.getElementById('btn-confirm-reassign');
        btn.style.display = 'block';
        btn.onclick = () => executeReassignment(sourceEmpId, top.id, taskId);
    }
    
    panel.style.display = 'block';
}

function executeReassignment(sourceEmpId, targetEmpId, taskId) {
    const emps = getAllEmployees();
    const sourceEmp = emps.find(e => e.id === sourceEmpId);
    let tasks = getEmployeeTasks(sourceEmpId, sourceEmp.dept);
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const task = tasks.splice(taskIndex, 1)[0];
    updateEmployeeTasks(sourceEmpId, tasks);
    
    const targetEmp = emps.find(e => e.id === targetEmpId);
    let targetTasks = getEmployeeTasks(targetEmpId, targetEmp.dept);
    targetTasks.push(task);
    updateEmployeeTasks(targetEmpId, targetTasks);

    // Update metrics
    taskRecoveryMetrics.reassigned += 1;
    taskRecoveryMetrics.score = Math.min(100, taskRecoveryMetrics.score + Math.floor(5 + Math.random() * 10));
    if (taskRecoveryMetrics.score === 0) taskRecoveryMetrics.score = 85;
    localStorage.setItem('mindguard_task_metrics', JSON.stringify(taskRecoveryMetrics));

    document.getElementById('impact-awareness-panel').style.display = 'none';
    selectRebalanceTarget(sourceEmpId);
    renderTaskRebalancer();
    
    alert(`✅ Task "${task.title}" successfully reassigned from ${sourceEmp.name} to ${targetEmp.name}.`);
}

// ===== ALERT CENTER ENGINE =====
let systemAlerts = [];

function generateSystemAlerts() {
    systemAlerts = [];
    const emps = getAllEmployees();
    const now = new Date();
    const cats = ['burnout', 'drift', 'behavior', 'system'];
    const depts = ['Engineering', 'Marketing', 'Sales', 'Design', 'HR'];
    const seenKeys = new Set();

    emps.forEach(e => {
        // Burnout alerts
        if (e.burnout >= 70) {
            const k = `burnout_high_${e.name}`;
            if (!seenKeys.has(k)) { seenKeys.add(k); systemAlerts.push({ severity: 'critical', category: 'burnout', employee: e.name, dept: e.dept, desc: `Burnout score at ${e.burnout} — immediate intervention needed`, rootCause: `Sustained overwork (${e.working_hours}h/day) + low sleep (${e.sleep_hours}h)`, action: 'Reduce workload, schedule 1:1 check-in', ts: new Date(now - Math.random()*3600000) }); }
        } else if (e.burnout >= 50) {
            const k = `burnout_med_${e.name}`;
            if (!seenKeys.has(k)) { seenKeys.add(k); systemAlerts.push({ severity: 'high', category: 'burnout', employee: e.name, dept: e.dept, desc: `Burnout score rising to ${e.burnout}`, rootCause: `Fatigue level ${e.fatigue_level}/10, irregular patterns`, action: 'Monitor closely, suggest break', ts: new Date(now - Math.random()*7200000) }); }
        }
        // Drift alerts
        if (e.productivity < 50) {
            systemAlerts.push({ severity: 'medium', category: 'drift', employee: e.name, dept: e.dept, desc: `Productivity at ${e.productivity}% — below baseline`, rootCause: 'Possible disengagement or task mismatch', action: 'Review task assignments', ts: new Date(now - Math.random()*14400000) });
        }
        // Behavior alerts
        if (e.reworkFreq > 18) {
            systemAlerts.push({ severity: 'medium', category: 'behavior', employee: e.name, dept: e.dept, desc: `Rework frequency at ${e.reworkFreq}%`, rootCause: 'Unclear requirements or skill gap', action: 'Pair with senior, clarify specs', ts: new Date(now - Math.random()*21600000) });
        }
        if (e.sleep_hours < 4.5) {
            systemAlerts.push({ severity: 'high', category: 'burnout', employee: e.name, dept: e.dept, desc: `Sleep critically low at ${e.sleep_hours}h`, rootCause: 'Possible chronic sleep deprivation', action: 'Flag for wellness check', ts: new Date(now - Math.random()*7200000) });
        }
        // Work Continuity Risk (Gap Detection)
        if (e.burnout >= 50) {
            const tasks = getEmployeeTasks(e.id, e.dept) || [];
            const criticalTasks = tasks.filter(t => t.priority === 'High' || t.status === 'delayed' || t.status === 'blocked');
            if (criticalTasks.length > 0) {
                const k = `work_gap_${e.id}`;
                if (!seenKeys.has(k)) { 
                    seenKeys.add(k); 
                    systemAlerts.push({ 
                        severity: e.burnout >= 70 ? 'critical' : 'high', 
                        category: 'continuity', 
                        employee: e.name, 
                        dept: e.dept, 
                        desc: `${criticalTasks.length} critical/delayed tasks at risk due to burnout`, 
                        rootCause: `Employee is at ${e.burnout >= 70 ? 'critical' : 'high'} burnout risk with pending high-priority work`, 
                        action: 'Use Task Rebalancer to redistribute workload', 
                        ts: new Date(now - Math.random()*1800000) 
                    }); 
                }
            }
        }
    });

    // System-level alerts
    systemAlerts.push({ severity: 'low', category: 'system', employee: 'System', dept: 'All', desc: 'Daily diagnostics completed', rootCause: '', action: '', ts: new Date(now - 60000) });
    systemAlerts.push({ severity: 'low', category: 'system', employee: 'System', dept: 'All', desc: `${emps.length} employees tracked`, rootCause: '', action: '', ts: now });

    // Enforce balance: critical+high in single digits
    let critCount = systemAlerts.filter(a => a.severity === 'critical').length;
    let highCount = systemAlerts.filter(a => a.severity === 'high').length;
    if (critCount + highCount > 9) {
        let excess = critCount + highCount - 9;
        for (let i = systemAlerts.length - 1; i >= 0 && excess > 0; i--) {
            if (systemAlerts[i].severity === 'high') { systemAlerts[i].severity = 'medium'; excess--; }
        }
    }
    systemAlerts.sort((a, b) => b.ts - a.ts);

    // Sync to notification panel
    const newNotifs = systemAlerts.slice(0, 8).map((a, i) => ({
        id: 100 + i, type: a.severity === 'critical' ? 'danger' : a.severity === 'high' ? 'danger' : a.severity === 'medium' ? 'warning' : 'healthy',
        priority: a.severity, category: a.category, title: `${a.category === 'burnout' ? '🔥' : a.category === 'drift' ? '📉' : a.category === 'behavior' ? '⚠️' : 'ℹ️'} ${a.desc.substring(0, 50)}`,
        message: a.desc, employee: a.employee, time: a.ts.toLocaleTimeString(), read: a.severity === 'low',
        rootCause: a.rootCause, suggestedAction: a.action
    }));
    notifications = [...newNotifs, ...notifications.filter(n => n.id < 100)];
    renderNotifications();
}

function renderAlertCenter() {
    if (systemAlerts.length === 0) generateSystemAlerts();
    const sevFilter = document.getElementById('alert-filter-severity')?.value || 'all';
    const catFilter = document.getElementById('alert-filter-category')?.value || 'all';
    const deptFilter = document.getElementById('alert-filter-dept')?.value || 'all';
    const timeFilter = document.getElementById('alert-filter-time')?.value || 'all';
    const now = Date.now();
    let filtered = systemAlerts.filter(a => {
        if (sevFilter !== 'all' && a.severity !== sevFilter) return false;
        if (catFilter !== 'all' && a.category !== catFilter) return false;
        if (deptFilter !== 'all' && a.dept !== deptFilter) return false;
        if (timeFilter === '1h' && now - a.ts.getTime() > 3600000) return false;
        if (timeFilter === '24h' && now - a.ts.getTime() > 86400000) return false;
        if (timeFilter === '7d' && now - a.ts.getTime() > 604800000) return false;
        return true;
    });
    // Update KPIs
    const crit = filtered.filter(a => a.severity === 'critical').length;
    const high = filtered.filter(a => a.severity === 'high').length;
    const med = filtered.filter(a => a.severity === 'medium').length;
    const low = filtered.filter(a => a.severity === 'low').length;
    document.getElementById('critical-alerts').textContent = crit;
    document.getElementById('high-alerts').textContent = high;
    document.getElementById('medium-alerts').textContent = med;
    document.getElementById('low-alerts').textContent = low;
    document.getElementById('total-alerts-count').textContent = filtered.length;

    const tbody = document.getElementById('alerts-log-body');
    if (!tbody) return;
    tbody.innerHTML = filtered.map((a, i) => {
        const sevColor = a.severity === 'critical' ? 'var(--danger)' : a.severity === 'high' ? 'var(--warning)' : a.severity === 'medium' ? 'var(--primary)' : 'var(--success)';
        const catIcon = a.category === 'burnout' ? '🔥' : a.category === 'drift' ? '📉' : a.category === 'behavior' ? '⚠️' : a.category === 'continuity' ? '⚖️' : '⚙️';
        return `<tr style="border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer;" onclick="expandAlertDetail(${i})">
            <td style="padding: 10px; font-size: 0.85rem;">${a.ts.toLocaleString()}</td>
            <td style="padding: 10px; color: ${sevColor}; font-weight: bold; text-transform: uppercase; font-size: 0.8rem;">${a.severity}</td>
            <td style="padding: 10px; font-size: 0.85rem;">${catIcon} ${a.category}</td>
            <td style="padding: 10px; font-size: 0.85rem;">${a.employee}</td>
            <td style="padding: 10px; font-size: 0.85rem;">${a.desc}</td>
            <td style="padding: 10px;"><button class="btn btn-outline" style="padding: 2px 8px; font-size: 0.7rem;" onclick="event.stopPropagation(); alertQuickAction(${i})">Action</button></td>
        </tr>`;
    }).join('');
}

function expandAlertDetail(idx) {
    const a = systemAlerts[idx]; if (!a) return;
    const panel = document.getElementById('alert-detail-panel');
    document.getElementById('alert-detail-title').textContent = `${a.category.toUpperCase()} Alert — ${a.employee}`;
    document.getElementById('alert-detail-content').innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div><strong>Severity:</strong> <span style="color: var(--${a.severity === 'critical' ? 'danger' : a.severity === 'high' ? 'warning' : 'primary'}); text-transform: uppercase;">${a.severity}</span></div>
            <div><strong>Department:</strong> ${a.dept}</div>
            <div><strong>Category:</strong> ${a.category}</div>
            <div><strong>Time:</strong> ${a.ts.toLocaleString()}</div>
        </div>
        <div style="margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 6px;"><strong>Description:</strong> ${a.desc}</div>
        ${a.rootCause ? `<div style="margin-top: 8px; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 6px; border-left: 3px solid var(--warning);"><strong>🤖 AI Root Cause:</strong> ${a.rootCause}</div>` : ''}
        ${a.action ? `<div style="margin-top: 8px; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 6px; border-left: 3px solid var(--primary);"><strong>Suggested Action:</strong> ${a.action}</div>` : ''}
        <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn btn-primary" style="padding: 6px 16px; font-size: 0.85rem;" onclick="alert('Intervention assigned for ${a.employee}')">Assign Intervention</button>
            <button class="btn btn-outline" style="padding: 6px 16px; font-size: 0.85rem;" onclick="alert('Manager notification sent for ${a.employee}')">Notify Manager</button>
        </div>`;
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth' });
}

function alertQuickAction(idx) {
    const a = systemAlerts[idx]; if (!a) return;
    alert(`Quick Action for ${a.employee}:\n\n📋 ${a.desc}\n🤖 Root cause: ${a.rootCause || 'N/A'}\n✅ Suggested: ${a.action || 'Monitor'}\n\nNotification sent to ${a.employee}'s manager.`);
}

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




