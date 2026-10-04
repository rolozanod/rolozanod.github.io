// UI Elements
const statusEl = document.getElementById('status');
const timeSlider = document.getElementById('time-slider');
const valT = document.getElementById('val-t');

// Badges
const badgeZlb = document.getElementById('badge-zlb');
const badgeDebt = document.getElementById('badge-debt');
const badgeHyper = document.getElementById('badge-hyper');

// Params
const paramEa = document.getElementById('param-ea');
const lblEa = document.getElementById('lbl-ea');
const paramFp = document.getElementById('param-fp');
const lblFp = document.getElementById('lbl-fp');
const paramK = document.getElementById('param-k');
const lblK = document.getElementById('lbl-k');
const paramL = document.getElementById('param-l');
const lblL = document.getElementById('lbl-l');

const presetBtns = document.querySelectorAll('.presets .preset-btn');

var pyodideInstance = null;
var simulationHistory = [];
let macroChart = null;
var currentShocks = {};
const PERIODS = 20;

const formatPct = (val) => (val * 100).toFixed(2) + '%';
const formatNum = (val) => val.toFixed(3);
const setMetric = (id, text) => { document.getElementById(id).innerText = text; };

// Scenario Definitions (Based on Real Historical Cases)
const SCENARIOS = {
    'baseline': {},
    'tech': { 2: { 'e_A': 0.06 }, 3: { 'e_A': 0.06 }, 4: { 'e_A': 0.06 }, 5: { 'e_A': 0.06 }, 6: { 'e_A': 0.05 } },
    'monetary': { 2: { 'u': 0.12 }, 3: { 'u': 0.15 }, 4: { 'u': 0.10 }, 5: { 'u': 0.05 } },
    'fiscal': { 2: {'e_QID': -0.15, 'e_G': 0.10}, 3: {'e_QID': -0.20, 'e_G': 0.12}, 4: {'e_QID': -0.20, 'e_G': 0.15}, 5: {'e_QID': -0.20, 'e_G': 0.15}, 6: {'e_QID': -0.15, 'e_G': 0.10}, 7: {'e_QID': -0.10, 'e_G': 0.05} },
    'tequila': { 
        1: {'e_QID': -0.15, 'e_A': 0.05}, 2: {'e_QID': -0.15, 'e_A': 0.05}, 3: {'e_QID': -0.15, 'e_A': 0.04}, // Capital Inflow / NAFTA Optimism
        4: {'e_QID': 0.0, 'e_A': 0.0}, 5: {'e_QID': 0.0, 'e_A': -0.02, 'u': 0.15}, // Sudden Stop & Massive Rate Hike to defend peg
        6: {'u': 0.20}, 7: {'u': 0.10} // Severe Recession & Stabilization
    }
};

// Shock-Propagation Wave Animation
function fireWave(color) {
    const universe = document.querySelector('.universe');
    if (!universe) return;
    const wave = document.createElement('div');
    wave.style.position = 'absolute';
    wave.style.width = '10px';
    wave.style.height = '10px';
    wave.style.borderRadius = '50%';
    wave.style.background = color;
    wave.style.boxShadow = `0 0 20px 10px ${color}`;
    wave.style.zIndex = 50;
    
    // Start at bottom (Base tier)
    wave.style.bottom = '-20px';
    wave.style.left = '50%';
    
    universe.appendChild(wave);
    
    // Animate to center
    wave.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: 'translate(0, -325px) scale(4)', opacity: 0 }
    ], { duration: 500, easing: 'ease-out' });
    
    setTimeout(() => wave.remove(), 500);
}

// Preset Listeners
presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget || btn;
        presetBtns.forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');

        if (targetBtn.hasAttribute('data-story')) {
            const storyId = targetBtn.getAttribute('data-story');
            if (window.storyController) {
                window.storyController.loadStory(storyId, true);
            }
        } else if (targetBtn.hasAttribute('data-scenario')) {
            const scenario = targetBtn.getAttribute('data-scenario');
            if (window.storyController) {
                window.storyController.exitStory();
            }
            window.currentShocks = null;
            currentShocks = SCENARIOS[scenario];
            fireWave('#ffffff');
            setTimeout(runSimulation, 50); 
        }
    });
});

// Slider Listeners
paramEa.addEventListener('input', (e) => { lblEa.innerText = e.target.value; fireWave('#e07a5f'); setTimeout(runSimulation, 50); });
paramFp.addEventListener('input', (e) => { lblFp.innerText = e.target.value; fireWave('#39ff14'); setTimeout(runSimulation, 50); });
paramK.addEventListener('input', (e) => { lblK.innerText = e.target.value == "0" ? "Auto (Steady)" : e.target.value; fireWave('#e07a5f'); setTimeout(runSimulation, 50); });
paramL.addEventListener('input', (e) => { lblL.innerText = e.target.value; fireWave('#e07a5f'); setTimeout(runSimulation, 50); });
timeSlider.addEventListener('input', (e) => { updateUI(parseInt(e.target.value)); });

function runSimulation() {
    if (!pyodideInstance) return;
    statusEl.className = 'status-loading';
    statusEl.innerText = "Simulating...";
    
    // Get base parameters
    const params = {
        'e_A': parseFloat(paramEa.value),
        'f_p': parseFloat(paramFp.value)
    };
    
    // Get initial state
    const initState = {
        'L': parseFloat(paramL.value)
    };
    const k_val = parseFloat(paramK.value);
    if (k_val > 0) {
        initState['K'] = k_val;
    }
    
    const paramsJson = JSON.stringify(params);
    const initStateJson = JSON.stringify(initState);
    const shocksJson = JSON.stringify(window.currentShocks || currentShocks);
    
    try {
        const resultJson = pyodideInstance.runPython(`run_simulation(${PERIODS}, '${paramsJson}', '${initStateJson}', '${shocksJson}')`);
        simulationHistory = JSON.parse(resultJson);
        
        timeSlider.max = PERIODS;
        timeSlider.disabled = false;
        
                updateUI(parseInt(timeSlider.value));
        
        statusEl.className = 'status-ready';
        statusEl.innerText = "Simulation Ready";
    } catch (err) {
        statusEl.className = 'status-error';
        statusEl.innerText = "Simulation Error";
        console.error(err);
    }
}

function updateUI(t) {
    valT.innerText = t;
    const data = simulationHistory[t - 1];
    if (!data) return;

    // Nominal / Left Flank
    setMetric('val-li', formatNum(data.L_i));
    setMetric('val-s', formatNum(data.Seigniorage));
    setMetric('val-i', formatPct(data.i));
    setMetric('val-pi', formatPct(data.pi));
    setMetric('val-eh', formatPct(data.e_E_h));
    setMetric('val-gap', formatPct(data.gap));

    // Animate Nominal Gauges
    const li_pct = Math.min(100, Math.max(0, (data.L_i / 0.5) * 100));
    document.getElementById('gauge-li-fill').style.height = li_pct + '%';
    
    const s_pct = Math.min(100, Math.max(0, (data.Seigniorage / 0.10) * 100));
    document.getElementById('gauge-s-fill').style.height = s_pct + '%';

    // Real / Right Flank (Text)
    setMetric('val-y', formatNum(data.y_actual));
    setMetric('val-w', formatNum(data.w));
    setMetric('val-debt', formatPct(data.debt_to_gdp));
    setMetric('val-risk', formatPct(data.risk_premium));
    setMetric('val-eps', formatPct(data.e_epsilon_h));
    
    // Draw 3-Panel Equilibria Chart
    drawEquilibriaCharts(simulationHistory, t);
    
    // Animate Balancing Scale (tilt based on e_epsilon_h)
    const tilt = Math.max(-30, Math.min(30, data.e_epsilon_h * 100 * 3)); 
    const scaleArm = document.getElementById('scale-arm');
    if (scaleArm) scaleArm.style.transform = `rotate(${tilt}deg)`;

    // Volumetric Tanks
    setMetric('val-k', formatNum(data.K));
    setMetric('val-qid', formatPct(data.qid_to_gdp));
    
    const k_pct = Math.min(100, Math.max(0, (data.K / 2500) * 100));
    document.getElementById('tank-k-fill').style.height = k_pct + '%';
    
    const qid_pct = Math.min(100, Math.max(0, 50 + (data.qid_to_gdp * 50)));
    document.getElementById('tank-qid-fill').style.height = qid_pct + '%';

    // Boundary Badges
    badgeZlb.style.display = (data.i <= 0.0) ? 'inline-block' : 'none';
    badgeDebt.style.display = (data.debt_to_gdp > 0.60 || data.qid_to_gdp < -0.80) ? 'inline-block' : 'none'; 
    badgeHyper.style.display = (data.L_i <= 0.001 || data.pi > 0.50) ? 'inline-block' : 'none';

    // Update the Unified Engine Chart
    const modelParams = {
        alpha: 0.33,
        v: 0.20,
        e_A: (paramEa && !isNaN(parseFloat(paramEa.value))) ? parseFloat(paramEa.value) : 0.02,
        e_L: 0.01
    };
    if (typeof window.updateUnifiedEngineChart === 'function') {
        window.updateUnifiedEngineChart(data, modelParams);
    }
}


// Initialization
async function initPyodideAndEngine() {
    try {
        pyodideInstance = await loadPyodide();
        const response = await fetch('../core/engine.py');
        if (!response.ok) throw new Error(`Failed to fetch engine.py`);
        const engineCode = await response.text();

        pyodideInstance.FS.mkdir('/core');
        pyodideInstance.FS.writeFile('/core/__init__.py', '');
        pyodideInstance.FS.writeFile('/core/engine.py', engineCode);

        await pyodideInstance.runPythonAsync(`
import sys
import json
sys.path.append('/')
from core.engine import GrowthMacroModel

def run_simulation(periods, params_json, init_state_json, shocks_json):
    params = json.loads(params_json)
    init_state = json.loads(init_state_json)
    shocks = {int(k): v for k, v in json.loads(shocks_json).items()}
    
    # Initialize fresh model with base parameters and state updated from UI
    model = GrowthMacroModel(params, init_state)
    history = model.simulate(periods, shocks)
    return json.dumps(history)
        `);

        runSimulation();
    } catch (err) {
        statusEl.className = 'status-error';
        statusEl.innerText = "Init Failed";
        console.error(err);
    }
}

initPyodideAndEngine();


function drawEquilibriaCharts(history, t_current) {
    const canvas = document.getElementById('eqChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    
    if (!history || history.length === 0) return;
    const currentData = history[t_current - 1];
    if (!currentData) return;
    
    const p2 = { x: 50, y: 15, w: width - 70, h: 130 };
    const p3 = { x: 50, y: 175, w: width - 70, h: 130 };
    
    // Helper: draw axes
    function drawAxes(p, xLabel, yLabel) {
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.h);
        ctx.lineTo(p.x + p.w, p.y + p.h);
        ctx.stroke();
        
        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(yLabel, p.x - 5, p.y + 10);
        ctx.textAlign = 'center';
        ctx.fillText(xLabel, p.x + p.w / 2, p.y + p.h + 12);
    }
    
    drawAxes(p2, 'Time (t)', 'ln(Y)');
    drawAxes(p3, 'Time (t)', 'Infl (π)');
    
    // Panel 2 & 3 Setup (Time series)
    const T = history.length;
    
    // Find min/max for Panel 2
    let minLnY = Infinity, maxLnY = -Infinity;
    history.forEach(d => {
        const lny = Math.log(d.y_actual);
        const lnys = Math.log(d.y_s);
        if (lny < minLnY) minLnY = lny;
        if (lnys < minLnY) minLnY = lnys;
        if (lny > maxLnY) maxLnY = lny;
        if (lnys > maxLnY) maxLnY = lnys;
    });
    const range2 = (maxLnY - minLnY) || 1;
    
    // Find min/max for Panel 3
    let minPi = Infinity, maxPi = -Infinity;
    history.forEach(d => {
        if (d.pi < minPi) minPi = d.pi;
        if (d.pi > maxPi) maxPi = d.pi;
    });
    const range3 = (maxPi - minPi) || 0.1;
    
    function getX(t) { return p2.x + (t / (T - 1)) * p2.w; }
    
    // Draw Panel 2 (Output)
    ctx.beginPath(); ctx.strokeStyle = '#888'; ctx.setLineDash([4, 4]);
    history.forEach((d, i) => {
        const y = p2.y + p2.h - ((Math.log(d.y_s) - minLnY) / range2) * p2.h;
        if (i===0) ctx.moveTo(getX(i), y); else ctx.lineTo(getX(i), y);
    });
    ctx.stroke();
    
    ctx.beginPath(); ctx.strokeStyle = '#e07a5f'; ctx.setLineDash([]); ctx.lineWidth = 2;
    history.forEach((d, i) => {
        const y = p2.y + p2.h - ((Math.log(d.y_actual) - minLnY) / range2) * p2.h;
        if (i===0) ctx.moveTo(getX(i), y); else ctx.lineTo(getX(i), y);
    });
    ctx.stroke();
    
    // Draw Panel 3 (Inflation)
    ctx.beginPath(); ctx.strokeStyle = '#39ff14'; ctx.setLineDash([]); ctx.lineWidth = 2;
    history.forEach((d, i) => {
        const y = p3.y + p3.h - ((d.pi - minPi) / range3) * p3.h;
        if (i===0) ctx.moveTo(getX(i), y); else ctx.lineTo(getX(i), y);
    });
    ctx.stroke();
    
    // Draw Playhead
    const currX = getX(t_current - 1);
    ctx.beginPath(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.setLineDash([2, 2]); ctx.lineWidth = 1;
    ctx.moveTo(currX, p2.y); ctx.lineTo(currX, p3.y + p3.h); ctx.stroke();
    
    // Markers
    const currLnY = Math.log(currentData.y_actual);
    const currY2 = p2.y + p2.h - ((currLnY - minLnY) / range2) * p2.h;
    const currY3 = p3.y + p3.h - ((currentData.pi - minPi) / range3) * p3.h;
    
    ctx.fillStyle = '#fff'; ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(currX, currY2, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(currX, currY3, 4, 0, Math.PI*2); ctx.fill();
    
}
