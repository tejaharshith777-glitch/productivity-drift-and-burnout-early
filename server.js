const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8082;
const DATA_FILE = path.join(__dirname, 'data.json');


// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
        users: {
            'user@company.com': { name: 'User', role: 'user', mood: 'okay', stress: 5, productivity: 75, burnout: 'Medium', status: 'yellow' },
            'test@company.com': { name: 'Test User', role: 'user', mood: 'okay', stress: 5, productivity: 75, burnout: 'Medium', status: 'yellow' }
        },
        team: [
            { id: 1, name: 'User A', productivity: '80%', burnout: 'Low', status: 'green' },
            { id: 2, name: 'User B', productivity: '60%', burnout: 'Medium', status: 'yellow' },
            { id: 3, name: 'User C', productivity: '40%', burnout: 'High', status: 'red' }
        ]
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

const server = http.createServer((req, res) => {
    const { method, url } = req;

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Static File Serving
    if (method === 'GET' && !url.startsWith('/api/')) {
        const pathname = url.split('?')[0].split('#')[0];
        let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
            
            const ext = path.extname(filePath);
            let contentType = 'text/html';
            if (ext === '.css') contentType = 'text/css';
            if (ext === '.js') contentType = 'application/javascript';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
        return;
    }

    // API Endpoints
    if (url === '/api/checkin' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { email, mood, stress, workingHours, workingDays, burdenTasks, pressureTalk, symptoms } = JSON.parse(body);
                const fileData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
                
                // --- Realistic Productivity & Burnout Index Scoring ---
                let baseBurnout = (stress || 5) * 4; // 4 to 40
                
                if ((workingHours || 8) > 10) baseBurnout += 15;
                if ((workingHours || 8) > 12) baseBurnout += 20;
                if ((workingDays || 5) >= 6) baseBurnout += 15;
                
                if (burdenTasks === 'overwhelmed') baseBurnout += 20;
                else if (burdenTasks === 'heavy') baseBurnout += 10;
                
                if (pressureTalk === 'no') baseBurnout += 15;
                else if (pressureTalk === 'hesitant') baseBurnout += 5;
                
                if (Array.isArray(symptoms)) {
                    baseBurnout += Math.min(20, symptoms.length * 5);
                }
                
                // Clamp Burnout Index
                const burnoutScore = Math.min(100, Math.max(0, baseBurnout));
                
                let burnout = 'Medium';
                let status = 'yellow';
                if (burnoutScore > 75) {
                    burnout = 'High';
                    status = 'red';
                } else if (burnoutScore < 45) {
                    burnout = 'Low';
                    status = 'green';
                }
                
                // Productivity is generally inversely proportional to burnout with random variance
                let productivity = Math.min(100, Math.max(20, 100 - burnoutScore + Math.floor(Math.random() * 15) - 5));

                
                // Update user data
                if (!fileData.users[email]) {
                    fileData.users[email] = { name: email.split('@')[0], role: 'user' };
                }
                fileData.users[email] = {
                    ...fileData.users[email],
                    mood,
                    stress,
                    productivity,
                    burnout,
                    status
                };
                
                // Update team array for Team Head view
                const teamIndex = fileData.team.findIndex(m => m.name === fileData.users[email].name);
                const teamMember = {
                    id: teamIndex >= 0 ? fileData.team[teamIndex].id : Date.now(),
                    name: fileData.users[email].name,
                    productivity: `${productivity}%`,
                    burnout,
                    status
                };
                
                if (teamIndex >= 0) {
                    fileData.team[teamIndex] = teamMember;
                } else {
                    fileData.team.push(teamMember);
                }
                
                fs.writeFileSync(DATA_FILE, JSON.stringify(fileData, null, 2));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, metrics: fileData.users[email] }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    if (url === '/api/team' && method === 'GET') {
        try {
            const fileData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(fileData.team));
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Server Error' }));
        }
        return;
    }

    if (url.startsWith('/api/insights') && method === 'GET') {
        const urlParams = new URL(req.url, `http://localhost:${PORT}`);
        const email = urlParams.searchParams.get('email');
        
        try {
            const fileData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            const user = fileData.users[email] || { mood: 'okay', stress: 5 };
            
            let suggestions = [
                "Take a short break (5 mins) after 25 mins of work.",
                "Reduce intense workload for the next 2 days.",
                "Block time for focused deep work."
            ];
            
            if (user.burnout === 'High') {
                suggestions = [
                    "🚨 Stop working immediately and take a 15-minute walk.",
                    "Schedule a 1-on-1 with your Team Head to discuss workload.",
                    "Enable 'Do Not Disturb' for the rest of the day."
                ];
            } else if (user.burnout === 'Low') {
                suggestions = [
                    "Great job! You are in a high-performance flow state.",
                    "Tackle complex tasks today while energy is high.",
                    "Maintain your current work-life balance."
                ];
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ suggestions }));
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Server Error' }));
        }
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
