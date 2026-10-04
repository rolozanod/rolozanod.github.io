class RateVsGrowthChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error(`Canvas with id ${canvasId} not found`);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    render(currentData) {
        if (!currentData) return;
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;
        
        ctx.clearRect(0, 0, width, height);

        // Define plotting area margins
        const p1 = { x: 50, y: 15, w: width - 70, h: height - 40 };

        // 1. Dynamic Scaling
        const rates = [currentData.rho_star, currentData.u];
        if (currentData.rho) rates.push(currentData.rho);
        const rMin = Math.min(...rates);
        const rMax = Math.max(...rates);
        const rSpan = Math.max(0.06, (rMax - rMin) * 1.6);
        const rCenter = (rMin + rMax) / 2;
        const minU = Math.max(0, rCenter - rSpan / 2);
        const maxU = minU + rSpan;
        const rangeU = maxU - minU;

        const growths = [currentData.e_ys, currentData.e_y];
        const gMin = Math.min(...growths);
        const gMax = Math.max(...growths);
        const gSpan = Math.max(0.07, (gMax - gMin) * 1.7);
        const gCenter = (gMin + gMax) / 2;
        const minEy = gCenter - gSpan / 2;
        const maxEy = gCenter + gSpan / 2;
        const rangeEy = maxEy - minEy;

        const getEyX = (ey) => p1.x + ((ey - minEy) / rangeEy) * p1.w;
        const getUY = (u) => p1.y + p1.h - ((u - minU) / rangeU) * p1.h;

        // 2. Axes Setup
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p1.x, p1.y + p1.h);
        ctx.lineTo(p1.x + p1.w, p1.y + p1.h);
        ctx.stroke();

        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Rate (u)', p1.x - 5, p1.y + 10);
        ctx.textAlign = 'center';
        ctx.fillText('Growth (e_y)', p1.x + p1.w / 2, p1.y + p1.h + 25);

        // Axis ticks
        ctx.fillStyle = '#777';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        [minU, (minU + maxU) / 2, maxU].forEach(val => {
            const yPos = getUY(val);
            ctx.beginPath(); ctx.moveTo(p1.x - 3, yPos); ctx.lineTo(p1.x, yPos); ctx.stroke();
            ctx.fillText((val * 100).toFixed(1) + '%', p1.x - 5, yPos + 3);
        });

        ctx.textAlign = 'center';
        [minEy, (minEy + maxEy) / 2, maxEy].forEach(val => {
            const xPos = getEyX(val);
            ctx.beginPath(); ctx.moveTo(xPos, p1.y + p1.h); ctx.lineTo(xPos, p1.y + p1.h + 3); ctx.stroke();
            ctx.fillText((val * 100).toFixed(1) + '%', xPos, p1.y + p1.h + 12);
        });

        const currEyX = getEyX(currentData.e_y);
        const currUY = getUY(currentData.u);
        const eysX = getEyX(currentData.e_ys);
        const rhoY = getUY(currentData.rho_star);

        // 3. IS Curve (structural slope derived from engine multiplier)
        const pixelSlope = Math.max(0.6, Math.min(2.2, (p1.h / rangeU) / (p1.w / rangeEy) * 6.67 * 0.25));
        const clipToBox = (cx, cy, s) => {
            let x1 = p1.x + 4, y1 = cy + s * (x1 - cx);
            if (y1 < p1.y + 4) { y1 = p1.y + 4; x1 = cx + (p1.y + 4 - cy) / s; }
            if (y1 > p1.y + p1.h - 4) { y1 = p1.y + p1.h - 4; x1 = cx + (p1.y + p1.h - 4 - cy) / s; }
            let x2 = p1.x + p1.w - 4, y2 = cy + s * (x2 - cx);
            if (y2 < p1.y + 4) { y2 = p1.y + 4; x2 = cx + (p1.y + 4 - cy) / s; }
            if (y2 > p1.y + p1.h - 4) { y2 = p1.y + p1.h - 4; x2 = cx + (p1.y + p1.h - 4 - cy) / s; }
            return { x1, y1, x2, y2 };
        };
        const isLine = clipToBox(currEyX, currUY, pixelSlope);

        ctx.beginPath(); ctx.strokeStyle = '#e07a5f'; ctx.lineWidth = 2.5; ctx.setLineDash([]);
        ctx.moveTo(isLine.x1, isLine.y1); ctx.lineTo(isLine.x2, isLine.y2); ctx.stroke();
        ctx.fillStyle = '#e07a5f'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('IS Curve', Math.max(p1.x + 8, isLine.x1 + 4), Math.max(p1.y + 14, isLine.y1 + 12));

        // 4. Reference Lines
        ctx.beginPath(); ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.moveTo(p1.x, rhoY); ctx.lineTo(p1.x + p1.w, rhoY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(eysX, p1.y); ctx.lineTo(eysX, p1.y + p1.h); ctx.stroke();

        ctx.beginPath(); ctx.strokeStyle = '#39ff14'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        ctx.moveTo(p1.x, currUY); ctx.lineTo(p1.x + p1.w, currUY); ctx.stroke();

        ctx.beginPath(); ctx.strokeStyle = 'rgba(224, 122, 95, 0.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]);
        ctx.moveTo(currEyX, currUY); ctx.lineTo(currEyX, p1.y + p1.h); ctx.stroke();

        ctx.font = '10px sans-serif'; ctx.fillStyle = '#39ff14'; ctx.textAlign = 'left';
        ctx.fillText(`Rate u = ${(currentData.u * 100).toFixed(1)}%`, p1.x + 6, currUY - 5);
        ctx.fillStyle = '#aaa'; ctx.textAlign = 'right';
        ctx.fillText(`MPK ρ* = ${(currentData.rho_star * 100).toFixed(1)}%`, p1.x + p1.w - 6, rhoY - 5);

        // 5. Crossing Markers
        ctx.setLineDash([]);
        if (Math.hypot(currEyX - eysX, currUY - rhoY) < 8) {
            ctx.fillStyle = '#e07a5f'; ctx.shadowBlur = 10; ctx.shadowColor = '#39ff14';
            ctx.beginPath(); ctx.arc(currEyX, currUY, 6, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
            ctx.fillText(`Equilibrium (e_y = e_ys, u = ρ*)`, currEyX + 10, currUY - 8);
        } else {
            ctx.fillStyle = '#222'; ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(eysX, rhoY, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#bbb'; ctx.font = '9px sans-serif'; ctx.textAlign = eysX > (p1.x + p1.w / 2) ? 'right' : 'left';
            ctx.fillText('Potential', eysX + (eysX > (p1.x + p1.w / 2) ? -8 : 8), rhoY + 12);

            ctx.fillStyle = '#e07a5f'; ctx.shadowBlur = 10; ctx.shadowColor = '#e07a5f';
            ctx.beginPath(); ctx.arc(currEyX, currUY, 6, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
            
            ctx.beginPath(); ctx.moveTo(currEyX - 3, currUY); ctx.lineTo(currEyX + 3, currUY);
            ctx.moveTo(currEyX, currUY - 3); ctx.lineTo(currEyX, currUY + 3); ctx.stroke();
            
            ctx.fillStyle = '#e07a5f'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = currEyX > (p1.x + p1.w / 2) ? 'right' : 'left';
            ctx.fillText(`Actual Output`, currEyX + (currEyX > (p1.x + p1.w / 2) ? -10 : 10), currUY - 8);
        }
    }
}
