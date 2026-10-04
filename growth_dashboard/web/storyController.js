// storyController.js
// Handles the narrative progression, automated story playback, and requestAnimationFrame curve animation

class StoryController {
    constructor() {
        this.currentStory = null;
        this.currentChapterIndex = 0;
        this.isAnimating = false;
        this.isPlaying = false;
        this.autoplayTimer = null;
        this.animationFrameId = null;
        
        // DOM Elements
        this.hub = document.getElementById('story-hub');
        this.titleEl = document.getElementById('story-title');
        this.chapterStepEl = document.getElementById('chapter-step');
        this.chapterTitleEl = document.getElementById('chapter-title');
        this.chapterTextEl = document.getElementById('chapter-text');
        this.prevBtn = document.getElementById('story-prev-btn');
        this.playBtn = document.getElementById('story-play-btn');
        this.nextBtn = document.getElementById('story-next-btn');
        this.closeBtn = document.getElementById('story-close-btn');
        
        if (this.prevBtn) this.prevBtn.addEventListener('click', () => { this.pause(); this.prevChapter(); });
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => { this.pause(); this.nextChapter(); });
        if (this.playBtn) this.playBtn.addEventListener('click', () => this.togglePlay());
        if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.exitStory());
    }

    togglePlay() {
        if (!this.currentStory) {
            // If no story selected yet, load story 1
            this.loadStory('usTechBoom', true);
            return;
        }
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (!this.currentStory) {
            this.loadStory('usTechBoom', true);
            return;
        }
        this.isPlaying = true;
        if (this.playBtn) {
            this.playBtn.innerHTML = "⏸ Pause";
            this.playBtn.classList.add('playing');
        }
        
        // If at the end of story, restart from beginning
        if (this.currentChapterIndex >= this.currentStory.chapters.length - 1) {
            this.currentChapterIndex = 0;
            this.updateUIForChapter(0, true);
        }
        
        this.scheduleNextAutoStep();
    }

    pause() {
        this.isPlaying = false;
        if (this.autoplayTimer) {
            clearTimeout(this.autoplayTimer);
            this.autoplayTimer = null;
        }
        if (this.playBtn) {
            const isFinished = this.currentStory && this.currentChapterIndex >= this.currentStory.chapters.length - 1;
            this.playBtn.innerHTML = isFinished ? "🔄 Replay Story" : (this.currentStory ? "▶ Play Story" : "▶ Start Tour (Story 1)");
            this.playBtn.classList.remove('playing');
        }
    }

    scheduleNextAutoStep() {
        if (!this.isPlaying || !this.currentStory) return;
        if (this.currentChapterIndex >= this.currentStory.chapters.length - 1) {
            this.pause();
            return;
        }
        
        // Allow user 4.0 seconds to read the narrative, then smoothly animate to next period
        this.autoplayTimer = setTimeout(() => {
            if (!this.isPlaying) return;
            this.nextChapter(() => {
                if (this.isPlaying) {
                    this.scheduleNextAutoStep();
                }
            });
        }, 4000);
    }

    loadStory(storyId, autoStart = true) {
        if (typeof stories === 'undefined' || !stories[storyId]) return;
        
        this.pause();
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.isAnimating = false;
        
        this.currentStory = stories[storyId];
        this.currentChapterIndex = 0;
        
        // Make sure preset button is visually highlighted
        const presetBtns = document.querySelectorAll('.presets .preset-btn');
        presetBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-story') === storyId);
        });
        
        // Show hub and update header
        if (this.hub) {
            this.hub.style.display = 'block';
            this.hub.classList.add('visible');
        }
        if (this.titleEl) this.titleEl.innerText = this.currentStory.title;
        if (this.closeBtn) this.closeBtn.style.display = 'inline-block';
        
        // Feed baseParams and shocks into Pyodide via existing global simulation runner
        if (window.pyodideInstance && typeof window.runSimulation === 'function') {
            const paramEa = document.getElementById('param-ea');
            const paramFp = document.getElementById('param-fp');
            if (paramEa) {
                paramEa.value = this.currentStory.baseParams.e_A;
                const lblEa = document.getElementById('lbl-ea');
                if (lblEa) lblEa.innerText = this.currentStory.baseParams.e_A;
            }
            if (paramFp) {
                paramFp.value = this.currentStory.baseParams.f_p;
                const lblFp = document.getElementById('lbl-fp');
                if (lblFp) lblFp.innerText = this.currentStory.baseParams.f_p;
            }
            
            // Hook the shocks globally
            window.currentShocks = this.currentStory.shocks;
            
            // Run simulation 
            window.runSimulation();
        }
        
        this.updateUIForChapter(0, true);
        
        if (autoStart) {
            this.play();
        } else {
            this.pause();
        }
    }

    updateUIForChapter(index, instant = false, onComplete = null) {
        if (!this.currentStory || !this.currentStory.chapters[index]) return;
        const chapter = this.currentStory.chapters[index];
        const total = this.currentStory.chapters.length;
        
        if (this.chapterStepEl) {
            this.chapterStepEl.innerText = `Chapter ${index + 1} of ${total}`;
        }

        // Fade out text, update, fade in
        if (this.chapterTextEl) {
            this.chapterTextEl.style.opacity = 0;
            setTimeout(() => {
                if (this.chapterTitleEl) this.chapterTitleEl.innerText = `Chapter ${index + 1}: ${chapter.title}`;
                this.chapterTextEl.innerText = chapter.text;
                this.chapterTextEl.style.opacity = 1;
            }, 250);
        }

        if (this.prevBtn) this.prevBtn.disabled = index === 0;
        if (this.nextBtn) this.nextBtn.disabled = index === total - 1;

        if (instant) {
            // Jump directly
            const slider = document.getElementById('time-slider');
            if (slider) slider.value = chapter.period;
            if (typeof window.updateUI === 'function') window.updateUI(chapter.period);
            if (onComplete) onComplete();
        } else {
            // Animate smoothly to target period
            const slider = document.getElementById('time-slider');
            const currentPeriod = slider ? parseFloat(slider.value) : 1;
            this.animateToPeriod(currentPeriod, chapter.period, 1800, onComplete);
        }
    }

    nextChapter(onComplete = null) {
        if (this.isAnimating || !this.currentStory || this.currentChapterIndex >= this.currentStory.chapters.length - 1) {
            if (onComplete) onComplete();
            return;
        }
        this.currentChapterIndex++;
        this.updateUIForChapter(this.currentChapterIndex, false, onComplete);
    }

    prevChapter() {
        if (this.isAnimating || !this.currentStory || this.currentChapterIndex <= 0) return;
        this.currentChapterIndex--;
        this.updateUIForChapter(this.currentChapterIndex, false);
    }

    animateToPeriod(startPeriod, endPeriod, duration, onComplete = null) {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.isAnimating = true;
        if (this.prevBtn) this.prevBtn.disabled = true;
        if (this.nextBtn) this.nextBtn.disabled = true;
        
        const startTime = performance.now();
        
        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-in-out cubic)
            const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            const currentFractionalPeriod = startPeriod + (endPeriod - startPeriod) * ease;
            
            // Interpolate data between floor and ceil periods
            const floorP = Math.floor(currentFractionalPeriod);
            const ceilP = Math.ceil(currentFractionalPeriod);
            const fraction = currentFractionalPeriod - floorP;
            
            // Update time slider visually
            const slider = document.getElementById('time-slider');
            if (slider) slider.value = Math.round(currentFractionalPeriod);
            const valT = document.getElementById('val-t');
            if (valT) valT.innerText = Math.round(currentFractionalPeriod);
            
            if (window.simulationHistory && floorP >= 1 && ceilP <= window.simulationHistory.length) {
                const d1 = window.simulationHistory[floorP - 1];
                const d2 = ceilP === floorP ? d1 : window.simulationHistory[ceilP - 1];
                
                if (d1 && d2) {
                    const interpolatedData = this.interpolateData(d1, d2, fraction);
                    
                    const paramEa = document.getElementById('param-ea');
                    const modelParams = {
                        alpha: 0.33,
                        v: 0.20,
                        e_A: (paramEa && !isNaN(parseFloat(paramEa.value))) ? parseFloat(paramEa.value) : 0.02,
                        e_L: 0.01
                    };
                    
                    if (typeof window.updateUnifiedEngineChart === 'function') {
                        window.updateUnifiedEngineChart(interpolatedData, modelParams);
                    }
                }
            }
            
            if (progress < 1) {
                this.animationFrameId = requestAnimationFrame(step);
            } else {
                this.isAnimating = false;
                this.animationFrameId = null;
                
                // Snap to final period properly calling global updateUI to update all gauges/tanks
                if (slider) slider.value = endPeriod;
                if (typeof window.updateUI === 'function') window.updateUI(endPeriod);
                
                // Re-enable buttons based on index
                const total = this.currentStory.chapters.length;
                if (this.prevBtn) this.prevBtn.disabled = this.currentChapterIndex === 0;
                if (this.nextBtn) this.nextBtn.disabled = this.currentChapterIndex === total - 1;
                
                if (this.currentChapterIndex >= total - 1) {
                    this.pause();
                    if (this.playBtn) this.playBtn.innerHTML = "🔄 Replay Story";
                }
                
                if (onComplete) onComplete();
            }
        };
        
        this.animationFrameId = requestAnimationFrame(step);
    }
    
    interpolateData(d1, d2, fraction) {
        const result = {};
        for (const key in d1) {
            if (typeof d1[key] === 'number' && typeof d2[key] === 'number') {
                result[key] = d1[key] + (d2[key] - d1[key]) * fraction;
            } else {
                result[key] = d1[key];
            }
        }
        return result;
    }

    exitStory() {
        this.pause();
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.isAnimating = false;
        this.currentStory = null;
        this.currentChapterIndex = 0;
        
        // Reset Hub to Welcome / Standby mode
        if (this.titleEl) this.titleEl.innerText = "Macroeconomic Narrative Tour";
        if (this.chapterStepEl) this.chapterStepEl.innerText = "Standby (Manual Mode)";
        if (this.chapterTitleEl) this.chapterTitleEl.innerText = "Manual Baseline Active";
        if (this.chapterTextEl) this.chapterTextEl.innerText = "You are currently in manual exploration mode. Use the sliders below to adjust parameters, or tap any story button above to start a guided macroeconomic case study.";
        if (this.playBtn) {
            this.playBtn.innerHTML = "▶ Start Tour (Story 1)";
            this.playBtn.classList.remove('playing');
        }
        if (this.prevBtn) this.prevBtn.disabled = true;
        if (this.nextBtn) this.nextBtn.disabled = true;
        if (this.closeBtn) this.closeBtn.style.display = 'none';
        
        // Reset preset buttons highlight
        const baselineBtn = document.getElementById('btn-baseline');
        const presetBtns = document.querySelectorAll('.presets .preset-btn');
        presetBtns.forEach(btn => btn.classList.remove('active'));
        if (baselineBtn) baselineBtn.classList.add('active');
    }
}

// Make sure storyController is globally available once DOM is ready
function initStoryController() {
    if (!window.storyController) {
        window.storyController = new StoryController();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStoryController);
} else {
    initStoryController();
}
