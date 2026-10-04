// unifiedEngineChart.js
// Unified HTML5 Canvas component combining Long-Run Structural Anchor and Short-Run IS Curve

class UnifiedEngineChart {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = document.getElementById(canvasId);
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        }
    }

    // Helper to draw clean directional arrowheads along a line segment
    drawArrow(ctx, x1, y1, x2, y2, color) {
        const headlen = 7;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 2) return;
        const angle = Math.atan2(dy, dx);
        
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    render(currentData, modelParams) {
        if (!this.canvas) {
            this.canvas = document.getElementById(this.canvasId);
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        }
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#1e293b'; // Slate background
        ctx.fillRect(0, 0, w, h);

        const p = modelParams || {};
        const alpha = p.alpha !== undefined ? p.alpha : 0.33;
        const v = p.v !== undefined ? p.v : 0.20;
        const e_A = p.e_A !== undefined ? p.e_A : 0.02;
        const e_L = p.e_L !== undefined ? p.e_L : 0.01;

        const d = currentData || {};
        const rho_star = d.rho_star !== undefined ? d.rho_star : (alpha * ((e_A / (1 - alpha)) + e_L) / v);
        const e_ys = d.e_ys !== undefined ? d.e_ys : ((e_A / (1 - alpha)) + e_L);
        const rho_current = d.rho !== undefined ? d.rho : rho_star;
        const u_current = d.u !== undefined ? d.u : rho_star;
        const e_y_current = d.e_y !== undefined ? d.e_y : e_ys;

        const margin = { top: 40, right: 60, bottom: 40, left: 60 };
        const innerW = w - margin.left - margin.right;
        const innerH = h - margin.top - margin.bottom;

        // Dynamic domain bounds covering both Long-Run and Short-Run
        const maxRho = Math.max(0.12, rho_current * 1.35, rho_star * 1.35, u_current * 1.35);
        const maxGrowth = Math.max(0.08, e_ys * 1.6, e_y_current * 1.6);
        const minX = Math.min(0, e_y_current * 1.2, e_ys * 1.2);
        const minY = Math.min(0, u_current * 1.2, rho_star * 1.2);
        const rangeX = maxGrowth - minX;
        const rangeY = maxRho - minY;

        const getX = (growth) => margin.left + ((growth - minX) / rangeX) * innerW;
        const getY = (rate) => margin.top + innerH - ((rate - minY) / rangeY) * innerH;

        // --- 0. Title Banner ---
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Unified Macro Engine: Rates vs Growth', margin.left, 20);

        // --- 1. Axes & Grid ---
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Y-axis
        const xZero = getX(0);
        ctx.moveTo(xZero, margin.top);
        ctx.lineTo(xZero, margin.top + innerH);
        // X-axis
        const yZero = getY(0);
        ctx.moveTo(margin.left, yZero);
        ctx.lineTo(margin.left + innerW, yZero);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Rates (ρ, u)', xZero - 6, margin.top + 8);
        ctx.textAlign = 'center';
        ctx.fillText('Growth Rates (g)', margin.left + innerW / 2, yZero + 28);

        // Ticks
        const yTicks = [minY, (minY + maxRho) * 0.5, maxRho];
        ctx.textAlign = 'right';
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        yTicks.forEach(val => {
            const yPos = getY(val);
            ctx.beginPath();
            ctx.strokeStyle = '#334155';
            ctx.moveTo(margin.left - 3, yPos);
            ctx.lineTo(margin.left + innerW, yPos);
            ctx.stroke();
            ctx.fillText((val * 100).toFixed(1) + '%', margin.left - 5, yPos + 3);
        });

        const xTicks = [minX, (minX + maxGrowth) * 0.5, maxGrowth];
        ctx.textAlign = 'center';
        xTicks.forEach(val => {
            const xPos = getX(val);
            ctx.beginPath();
            ctx.strokeStyle = '#334155';
            ctx.moveTo(xPos, margin.top);
            ctx.lineTo(xPos, margin.top + innerH + 3);
            ctx.stroke();
            ctx.fillText((val * 100).toFixed(1) + '%', xPos, yZero + 14);
        });

        // --- LAYER 1: The Long-Run Structural Anchor (Background) ---
        ctx.save();
        ctx.globalAlpha = 0.5; // Faded stroke for background

        // K_hat: rho = (alpha / v) * K_hat
        const slope1 = alpha / v;
        const k1_end = Math.min(maxGrowth, maxRho / slope1);
        const rho1_end = slope1 * k1_end;

        ctx.beginPath();
        ctx.strokeStyle = '#f97316'; 
        ctx.lineWidth = 2.5;
        ctx.moveTo(getX(0), getY(0));
        ctx.lineTo(getX(k1_end), getY(rho1_end));
        ctx.stroke();
        ctx.fillStyle = '#f97316';
        ctx.fillText('K̂', getX(k1_end) + 8, getY(rho1_end) + 4);

        // Y_p_hat: rho = (1/v) * Y_p_hat - c
        const c = (e_A + (1 - alpha) * e_L) / v;
        const slope2 = 1 / v;
        const x2_0 = c * v; // X-intercept
        const yp2_end = Math.min(maxGrowth, (maxRho + c) / slope2);
        const rho2_end = slope2 * yp2_end - c;

        ctx.beginPath();
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2.5;
        ctx.moveTo(getX(x2_0), getY(0));
        ctx.lineTo(getX(yp2_end), getY(rho2_end));
        ctx.stroke();
        ctx.fillStyle = '#ea580c';
        ctx.fillText('Ŷ_p', getX(yp2_end) + 10, getY(rho2_end) + 4);

        // The Anchor Point
        const anchorX = getX(e_ys);
        const anchorY = getY(rho_star);

        ctx.beginPath();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(anchorX, anchorY);
        ctx.lineTo(anchorX, yZero);
        ctx.moveTo(anchorX, anchorY);
        ctx.lineTo(xZero, anchorY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`ρ*=${(rho_star * 100).toFixed(1)}%`, xZero - 5, anchorY - 4);
        ctx.textAlign = 'left';
        ctx.fillText(`e_ys=${(e_ys * 100).toFixed(1)}%`, anchorX + 4, yZero + 12);

        ctx.beginPath();
        ctx.fillStyle = '#1e293b';
        ctx.arc(anchorX, anchorY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();

        // --- LAYER 2: The Short-Run IS Curve & Policy Target (Foreground) ---
        ctx.save();
        
        let is_slope;
        if (Math.abs(e_y_current - e_ys) < 0.0001) {
            is_slope = - (maxRho / maxGrowth); // Fallback downward slope
        } else {
            is_slope = (u_current - rho_star) / (e_y_current - e_ys);
        }
        
        // Find intersections with canvas boundaries
        // y = is_slope * (x - e_ys) + rho_star
        // x = (y - rho_star) / is_slope + e_ys
        let x_at_max_rho = (maxRho - rho_star) / is_slope + e_ys;
        let x_at_min_rho = (minY - rho_star) / is_slope + e_ys;
        
        ctx.beginPath();
        ctx.strokeStyle = '#e07a5f';
        ctx.lineWidth = 3;
        ctx.moveTo(getX(x_at_max_rho), getY(maxRho));
        ctx.lineTo(getX(x_at_min_rho), getY(minY));
        ctx.stroke();

        ctx.fillStyle = '#e07a5f';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('IS Curve', getX(x_at_max_rho) + 10, getY(maxRho) + 15);

        // Policy Rate (u) Line
        const uY = getY(u_current);
        ctx.beginPath();
        ctx.strokeStyle = '#39ff14'; // Neon Green
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(margin.left, uY);
        ctx.lineTo(margin.left + innerW, uY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#39ff14';
        ctx.textAlign = 'left';
        ctx.fillText(`Policy Target (u) = ${(u_current * 100).toFixed(1)}%`, margin.left + 5, uY - 6);

        // Active State Marker
        const activeX = getX(e_y_current);
        const activeY = uY;

        ctx.beginPath();
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.moveTo(activeX, activeY);
        ctx.lineTo(activeX, yZero);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#39ff14';
        ctx.textAlign = 'center';
        ctx.fillText(`e_y = ${(e_y_current * 100).toFixed(1)}%`, activeX, yZero - 6);

        // Glowing Marker
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#39ff14';
        ctx.beginPath();
        ctx.fillStyle = '#e07a5f';
        ctx.arc(activeX, activeY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // --- LAYER 3: Transitional Dynamics & Force Arrows ---
        ctx.save();
        
        // 1. Structural forces along Long-Run curves (based on current MPK rho)
        const rhoDiff = rho_current - rho_star;
        if (Math.abs(rhoDiff) > 0.001) {
            // Draw current rho level
            const currentY = getY(rho_current);
            ctx.beginPath();
            ctx.strokeStyle = '#fb923c';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([2, 2]);
            ctx.moveTo(margin.left, currentY);
            ctx.lineTo(margin.left + innerW, currentY);
            ctx.stroke();
            
            ctx.fillStyle = '#fb923c';
            ctx.font = 'bold 9px system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`Current ρ=${(rho_current * 100).toFixed(1)}%`, margin.left + innerW + 4, currentY + 3);

            // Calculate intersections with structural curves
            const k_hat_curr = (rho_current * v) / alpha;
            const yp_hat_curr = (rho_current + c) * v;

            const isAbove = rhoDiff > 0;
            const dir = isAbove ? -1 : 1;
            const arrowGrowthStep = maxGrowth * 0.08;
            const slope1 = alpha / v;
            const slope2 = 1 / v;

            // Arrow along K_hat line
            const g1_start = k_hat_curr;
            const g1_end = g1_start + dir * arrowGrowthStep;
            const r1_end = slope1 * g1_end;
            if (g1_start >= minX && g1_start <= maxGrowth && rho_current >= minY && rho_current <= maxRho) {
                ctx.beginPath();
                ctx.fillStyle = '#f97316';
                ctx.arc(getX(g1_start), getY(rho_current), 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
                this.drawArrow(ctx, getX(g1_start), getY(rho_current), getX(g1_end), getY(r1_end), '#fdba74');
            }

            // Arrow along Y_p line
            const g2_start = yp_hat_curr;
            const g2_end = g2_start + dir * arrowGrowthStep;
            const r2_end = slope2 * g2_end - c;
            if (g2_start >= minX && g2_start <= maxGrowth && rho_current >= minY && rho_current <= maxRho) {
                ctx.beginPath();
                ctx.fillStyle = '#ea580c';
                ctx.arc(getX(g2_start), getY(rho_current), 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
                this.drawArrow(ctx, getX(g2_start), getY(rho_current), getX(g2_end), getY(r2_end), '#fed7aa');
            }
        }
        
        // 2. Direct gravity pull from Short-Run State to Long-Run Anchor
        const distToAnchor = Math.hypot(e_y_current - e_ys, u_current - rho_star);
        if (distToAnchor > 0.002) { // Only draw if we are sufficiently far from steady-state
            // Move start point slightly away from the active marker to prevent overlap
            const angle = Math.atan2(rho_star - u_current, e_ys - e_y_current);
            const startDist = 0.004; // offset in growth-rate terms roughly
            const drawStartX = getX(e_y_current + startDist * Math.cos(angle));
            const drawStartY = getY(u_current + startDist * Math.sin(angle) * (rangeY/rangeX)); 
            
            // Just use pixel math for the arrow to ensure it looks right
            const pStartX = activeX;
            const pStartY = activeY;
            const pEndX = anchorX;
            const pEndY = anchorY;
            
            const pDist = Math.hypot(pEndX - pStartX, pEndY - pStartY);
            if (pDist > 15) {
                const pAngle = Math.atan2(pEndY - pStartY, pEndX - pStartX);
                const sX = pStartX + 12 * Math.cos(pAngle);
                const sY = pStartY + 12 * Math.sin(pAngle);
                const eX = pEndX - 12 * Math.cos(pAngle);
                const eY = pEndY - 12 * Math.sin(pAngle);
                
                ctx.globalAlpha = 0.7;
                ctx.setLineDash([2, 2]);
                this.drawArrow(ctx, sX, sY, eX, eY, '#39ff14');
                ctx.globalAlpha = 1.0;
                ctx.setLineDash([]);
            }
        }
        
        ctx.restore();
    }
}

window.unifiedEngineChartInstance = null;
window.updateUnifiedEngineChart = function(currentPeriodData, modelParams) {
    if (!window.unifiedEngineChartInstance) {
        window.unifiedEngineChartInstance = new UnifiedEngineChart('unifiedEngineChart');
    }
    window.unifiedEngineChartInstance.render(currentPeriodData, modelParams);
};

function initUnifiedEngineBaseline() {
    const defaultParams = { alpha: 0.33, v: 0.20, e_A: 0.02, e_L: 0.01 };
    const defaultData = { rho: 0.06575, rho_star: 0.06575, e_ys: 0.03985, u: 0.06575, e_y: 0.03985 };
    window.updateUnifiedEngineChart(defaultData, defaultParams);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUnifiedEngineBaseline);
} else {
    setTimeout(initUnifiedEngineBaseline, 10);
}
