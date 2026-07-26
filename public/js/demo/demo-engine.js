(function() {
  'use strict';

  /* ─── YantraMitra Autonomous Product Demo Engine ─── */

  const STATE_KEY = 'ymDemoState';
  const SPEED_KEY = 'ymDemoSpeed';

  function getState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function saveState(s) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch {}
  }

  function clearState() {
    try { localStorage.removeItem(STATE_KEY); } catch {}
  }

  function getSpeed() {
    try {
      const spd = parseFloat(localStorage.getItem(SPEED_KEY));
      return (spd && [1, 1.25, 1.5, 2].includes(spd)) ? spd : 1;
    } catch { return 1; }
  }

  function saveSpeed(spd) {
    try { localStorage.setItem(SPEED_KEY, String(spd)); } catch {}
  }

  function isSessionFresh(state) {
    if (!state || !state.startedAt) return false;
    return (Date.now() - state.startedAt) < 35 * 60 * 1000;
  }

  const getPath = () => window.location.pathname;

  /* ─── Phonetic Dictionary for Clear Natural Indian English Pronunciation ─── */
  function phoneticNormalize(text) {
    if (!text) return '';
    return text
      .replace(/\bYantraMitra\b/gi, 'Yuntruh Mitruh')
      .replace(/\bYantraNklan\b/gi, 'Yuntruh Niklun')
      .replace(/\bCNC-101\b/gi, 'C N C 1 0 1')
      .replace(/\bCNC101\b/gi, 'C N C 1 0 1')
      .replace(/\bSKF-6208\b/gi, 'S K F 6 2 0 8')
      .replace(/\bSKF6208\b/gi, 'S K F 6 2 0 8')
      .replace(/\bWO-2026-894\b/gi, 'Work Order 2026 894')
      .replace(/\b8\.4\s*mm\/s\b/gi, '8 point 4 millimeters per second')
      .replace(/\b0\.8\s*mm\/s\b/gi, '0 point 8 millimeters per second')
      .replace(/\b2\.5\s*mm\/s\b/gi, '2 point 5 millimeters per second')
      .replace(/\b78°C\b/gi, '78 degrees Celsius')
      .replace(/\b42°C\b/gi, '42 degrees Celsius')
      .replace(/\b45Nm\b/gi, '45 Newton meters')
      .replace(/\b₹4,80,000\b/g, '4 lakh 80 thousand rupees')
      .replace(/\b₹4\.8L\b/gi, '4 point 8 lakh rupees')
      .replace(/\b₹18,500\b/g, '18 thousand 5 hundred rupees')
      .replace(/\b₹6,000\b/g, '6 thousand rupees')
      .replace(/\b₹12,500\b/g, '12 thousand 5 hundred rupees')
      .replace(/\bMTBF\b/g, 'M T B F')
      .replace(/\bMTTR\b/g, 'M T T R')
      .replace(/\bOEE\b/g, 'O E E')
      .replace(/\bLOTO\b/g, 'Lockout Tagout')
      .replace(/\bRUL\b/g, 'Remaining Useful Life')
      .replace(/\b94\.2%\b/g, '94 point 2 percent')
      .replace(/\b98\.4%\b/g, '98 point 4 percent')
      .replace(/\b98\.6%\b/g, '98 point 6 percent')
      .replace(/\b1\.2%\b/g, '1 point 2 percent')
      .replace(/\b1\.8\b/g, '1 point 8');
  }

  /* ─── Exact Page-by-Page Product Workflow Pipeline ─── */
  const STEPS = [
    { id: 'home-intro', route: '/', title: 'System Introduction & Product Architecture' },
    { id: 'login-auth', route: '/login', title: 'Enterprise Single Sign-On Authentication' },
    { id: 'step-1-dashboard', route: '/dashboard', title: 'Command Center & Anomaly Alert Arrival' },
    { id: 'step-2-assets', route: '/assets', title: 'Asset Fleet & Telemetry Drilldown' },
    { id: 'step-3-digital-twin', route: '/digital-twin', title: '3D Digital Twin Spindle Inspection' },
    { id: 'step-4-anomaly', route: '/anomaly', title: 'Anomaly Evidence & Diagnostic Spectrum' },
    { id: 'step-5-ai-assistant', route: '/ai-console', title: 'YantraNklan AI Diagnostic Chat' },
    { id: 'step-6-knowledge-graph', route: '/map', title: 'Global Map & Knowledge Graph Lineage' },
    { id: 'step-7-agents', route: '/agents', title: 'AI Agent Mission Control Deployment' },
    { id: 'step-8-maintenance', route: '/work-orders', title: 'Work Order Creation & LOTO Execution' },
    { id: 'step-9-reports', route: '/ai-console', title: 'Executive Maintenance Report & PDF Export' },
    { id: 'step-10-reliability', route: '/reliability', title: 'Reliability Analytics & ML Forecast' },
    { id: 'step-11-twin-return', route: '/digital-twin', title: 'Digital Twin Restored Health (99%)' },
    { id: 'end-summary', route: '/dashboard', title: 'Shift Completion Summary & Closing' }
  ];

  /* ─── High-Fidelity Studio Indian Male Speech Engine ─── */
  class StudioIndianMaleVoiceNarrator {
    constructor() {
      this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
      this.voice = null;
      this.isMuted = false;
      this.activeUtterance = null;
      this.initVoices();
    }

    initVoices() {
      if (!this.synth) return;
      const selectVoice = () => {
        const voices = this.synth.getVoices();
        if (!voices || voices.length === 0) return;

        // Best Indian English Male Voice Priority Match
        const indianMale = voices.find(v => 
          (v.lang === 'en-IN' || v.lang === 'hi-IN' || v.name.includes('India') || v.name.includes('IN')) &&
          (v.name.includes('Male') || v.name.includes('Ravi') || v.name.includes('Rishi') || v.name.includes('Prabhat') || v.name.includes('Google') || v.name.includes('en-IN'))
        ) || voices.find(v => v.lang === 'en-IN' || v.lang === 'hi-IN') || voices.find(v => v.lang.startsWith('en'));

        if (indianMale) {
          this.voice = indianMale;
        }
      };

      selectVoice();
      if (typeof this.synth.onvoiceschanged !== 'undefined') {
        this.synth.onvoiceschanged = selectVoice;
      }
    }

    speakChunk(text, rateMultiplier = 1, onWordBoundary = null, onEnd = null) {
      if (!this.synth || this.isMuted) {
        if (onEnd) setTimeout(onEnd, 100);
        return;
      }

      // DO NOT call cancel() here to avoid cutting off audio mid-word!
      const phoneticText = phoneticNormalize(text);
      const utterance = new SpeechSynthesisUtterance(phoneticText);
      this.activeUtterance = utterance;

      if (this.voice) {
        utterance.voice = this.voice;
        utterance.lang = this.voice.lang || 'en-IN';
      } else {
        utterance.lang = 'en-IN';
      }

      utterance.pitch = 0.96; // Authoritative, human Indian male tone
      utterance.rate = Math.min(1.8, 0.88 * rateMultiplier); // Smooth natural speed

      if (onWordBoundary) {
        utterance.onboundary = (event) => {
          if (event.name === 'word') {
            onWordBoundary(event.charIndex, event.charLength);
          }
        };
      }

      let hasEnded = false;
      const done = () => {
        if (hasEnded) return;
        hasEnded = true;
        this.activeUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onend = done;
      utterance.onerror = (err) => {
        console.warn('Speech utterance ended or errored:', err);
        done();
      };

      this.synth.speak(utterance);
    }

    stop() {
      if (this.synth) {
        this.activeUtterance = null;
        this.synth.cancel();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      if (this.isMuted && this.synth) this.stop();
      return this.isMuted;
    }
  }

  let engine = null;

  class AutonomousDemoEngine {
    constructor() {
      this.state = getState();
      this.speed = getSpeed();
      this.overlayEl = null;
      this.controlsEl = null;
      this.captionEl = null;
      this.cursorEl = null;
      this.isRunning = false;
      this.autoTimer = null;
      this.narrationTimer = null;
      this.narrator = new StudioIndianMaleVoiceNarrator();
    }

    /* ─── Public Control API ─── */
    start() {
      // 3-Second Recording Countdown Overlay
      this.showCountdown(() => {
        const newState = {
          active: true,
          stepIdx: 0,
          status: 'running',
          startedAt: Date.now(),
          paused: false
        };
        saveState(newState);
        this.state = newState;

        if (getPath() !== '/') {
          window.location.href = '/';
        } else {
          this.init();
        }
      });
    }

    showCountdown(onComplete) {
      const existing = document.querySelector('.ym-demo-countdown');
      if (existing) existing.remove();

      const el = document.createElement('div');
      el.className = 'ym-demo-countdown visible';
      el.innerHTML = `
        <div class="countdown-card">
          <div class="countdown-badge">🔴 RECORDING MODE</div>
          <div class="countdown-title">Get Ready to Record</div>
          <div class="countdown-number">3</div>
          <div class="countdown-sub">Autonomous Demonstration Launching...</div>
        </div>
      `;
      document.body.appendChild(el);

      let count = 3;
      const numEl = el.querySelector('.countdown-number');
      const timer = setInterval(() => {
        count--;
        if (count > 0) {
          if (numEl) numEl.textContent = count;
        } else {
          clearInterval(timer);
          el.remove();
          if (onComplete) onComplete();
        }
      }, 1000);
    }

    stop() {
      clearState();
      this.state = null;
      this.narrator.stop();
      this.cleanupUI();
      this.isRunning = false;
    }

    pause() {
      if (!this.state) return;
      this.state.paused = true;
      saveState(this.state);
      this.narrator.stop();
      if (this.autoTimer) clearTimeout(this.autoTimer);
      if (this.narrationTimer) clearTimeout(this.narrationTimer);
      this.updateControlsUI();
    }

    resume() {
      if (!this.state) return;
      this.state.paused = false;
      saveState(this.state);
      this.updateControlsUI();
      this.executeCurrentStep();
    }

    cycleSpeed() {
      const speeds = [1, 1.25, 1.5, 2];
      const curIdx = speeds.indexOf(this.speed);
      this.speed = speeds[(curIdx + 1) % speeds.length];
      saveSpeed(this.speed);
      this.updateControlsUI();
    }

    skip() {
      if (!this.state) return;
      this.narrator.stop();
      this.advanceStep();
    }

    restart() {
      this.stop();
      setTimeout(() => this.start(), 300);
    }

    exit() {
      this.stop();
      document.querySelectorAll('.ym-demo-summary, .ym-demo-overlay, .ym-demo-cursor, .ym-demo-countdown').forEach(el => el.remove());
    }

    /* ─── Page Load Synchronization ─── */
    init() {
      // STRICT MANUAL START: Never auto-run unless active state exists and status is 'running'!
      if (!this.state || !this.state.active || this.state.status !== 'running') return;
      if (!isSessionFresh(this.state)) {
        this.stop();
        return;
      }

      let currentStep = STEPS[this.state.stepIdx];
      if (!currentStep) {
        this.stop();
        return;
      }

      const curPath = getPath();
      // Auto-sync step index to current URL path
      if (currentStep.route !== curPath && !(currentStep.route !== '/' && curPath.startsWith(currentStep.route))) {
        const matchingIdx = STEPS.findIndex(s => s.route === curPath || (s.route !== '/' && curPath.startsWith(s.route)));
        if (matchingIdx !== -1) {
          this.state.stepIdx = matchingIdx;
          saveState(this.state);
          currentStep = STEPS[matchingIdx];
        } else {
          window.location.href = currentStep.route;
          return;
        }
      }

      this.isRunning = true;
      this.ensureUI();
      setTimeout(() => {
        this.executeCurrentStep();
      }, 700 / this.speed);
    }

    /* ─── UI Setup ─── */
    ensureUI() {
      this.injectCSS();
      if (!document.querySelector('.ym-demo-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'ym-demo-overlay active';
        overlay.innerHTML = `
          <div class="ym-demo-controls">
            <div class="demo-header">
              <span class="pulse-dot"></span>
              <span>YANTRAMITRA AUTONOMOUS DEMO</span>
            </div>
            <div class="demo-step-info">
              <span class="demo-step-num">Step <span class="demo-step-current">${this.state.stepIdx + 1}</span> of ${STEPS.length - 1}</span>
              <span class="demo-title">${STEPS[this.state.stepIdx]?.title || ''}</span>
            </div>
            <div class="demo-progress-bar">
              <div class="demo-progress-fill" style="width: ${((this.state.stepIdx + 1) / STEPS.length) * 100}%"></div>
            </div>
            <div class="demo-btn-row">
              <button class="demo-btn" data-action="speed"><span class="material-symbols-outlined">speed</span> <span class="demo-speed-label">${this.speed}x</span></button>
              <button class="demo-btn" data-action="audio"><span class="material-symbols-outlined">volume_up</span> <span class="demo-audio-label">Audio On</span></button>
              <button class="demo-btn" data-action="pause"><span class="material-symbols-outlined">pause</span> <span class="demo-btn-label">Pause</span></button>
              <button class="demo-btn" data-action="skip"><span class="material-symbols-outlined">skip_next</span> Skip</button>
              <button class="demo-btn" data-action="restart"><span class="material-symbols-outlined">replay</span> Restart</button>
              <button class="demo-btn danger" data-action="exit"><span class="material-symbols-outlined">close</span> Exit</button>
            </div>
          </div>

          <div class="ym-demo-caption">
            <div class="caption-header">
              <span class="caption-dot"></span>
              <span class="caption-tag">REAL-TIME INDIAN ENGLISH NARRATION</span>
            </div>
            <div class="caption-text"></div>
          </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action]');
          if (!btn) return;
          const action = btn.dataset.action;
          if (action === 'speed') {
            this.cycleSpeed();
          } else if (action === 'pause') {
            this.state.paused ? this.resume() : this.pause();
          } else if (action === 'audio') {
            const isMuted = this.narrator.toggleMute();
            const label = overlay.querySelector('.demo-audio-label');
            const icon = overlay.querySelector('[data-action="audio"] .material-symbols-outlined');
            if (isMuted) {
              if (label) label.textContent = 'Muted';
              if (icon) icon.textContent = 'volume_off';
            } else {
              if (label) label.textContent = 'Audio On';
              if (icon) icon.textContent = 'volume_up';
            }
          } else if (action === 'skip') {
            this.skip();
          } else if (action === 'restart') {
            this.restart();
          } else if (action === 'exit') {
            this.exit();
          }
        });
      }

      this.overlayEl = document.querySelector('.ym-demo-overlay');
      this.controlsEl = this.overlayEl.querySelector('.ym-demo-controls');
      this.captionEl = this.overlayEl.querySelector('.ym-demo-caption');
      this.ensureCursor();
      this.updateControlsUI();
    }

    ensureCursor() {
      if (document.querySelector('.ym-demo-cursor')) {
        this.cursorEl = document.querySelector('.ym-demo-cursor');
        return;
      }
      const cursor = document.createElement('div');
      cursor.className = 'ym-demo-cursor';
      cursor.innerHTML = `
        <div class="cursor-pointer">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4.5 3.5L18.5 15.5L14.5 16.5L16.8 21.2L14.8 22.2L12.5 17.5L10.2 20.2L4.5 3.5Z" fill="#413fd6" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
        </div>
      `;
      document.body.appendChild(cursor);
      this.cursorEl = cursor;
    }

    injectCSS() {
      if (document.getElementById('ym-demo-styles')) return;
      const link = document.createElement('link');
      link.id = 'ym-demo-styles';
      link.rel = 'stylesheet';
      link.href = '/css/demo.css';
      document.head.appendChild(link);
    }

    updateControlsUI() {
      if (!this.controlsEl || !this.state) return;
      const stepNum = this.controlsEl.querySelector('.demo-step-current');
      if (stepNum) stepNum.textContent = Math.min(this.state.stepIdx + 1, STEPS.length - 1);

      const titleEl = this.controlsEl.querySelector('.demo-title');
      if (titleEl) titleEl.textContent = STEPS[this.state.stepIdx]?.title || '';

      const progress = this.controlsEl.querySelector('.demo-progress-fill');
      if (progress) progress.style.width = (((this.state.stepIdx + 1) / STEPS.length) * 100) + '%';

      const spdLabel = this.controlsEl.querySelector('.demo-speed-label');
      if (spdLabel) spdLabel.textContent = this.speed + 'x';

      const pauseBtn = this.controlsEl.querySelector('[data-action="pause"]');
      if (pauseBtn) {
        if (this.state.paused) {
          pauseBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> <span class="demo-btn-label">Resume</span>';
        } else {
          pauseBtn.innerHTML = '<span class="material-symbols-outlined">pause</span> <span class="demo-btn-label">Pause</span>';
        }
      }
    }

    /* ─── Cursor & Interactions ─── */
    moveCursorTo(x, y, duration = 600) {
      if (!this.cursorEl) return Promise.resolve();
      const adjDur = Math.max(150, duration / this.speed);
      this.cursorEl.classList.add('visible');
      this.cursorEl.style.transition = `transform ${adjDur}ms cubic-bezier(0.25, 1, 0.5, 1)`;
      this.cursorEl.style.transform = `translate(${x}px, ${y}px)`;
      return new Promise(r => setTimeout(r, adjDur));
    }

    moveCursorToElement(selectorOrEl, duration = 600, offsetX = 0, offsetY = 0) {
      const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
      if (!el) {
        return this.moveCursorTo(window.innerWidth / 2, window.innerHeight / 2, duration);
      }
      const rect = el.getBoundingClientRect();
      const x = rect.left + (rect.width / 2) + offsetX;
      const y = rect.top + (rect.height / 2) + offsetY;
      return this.moveCursorTo(x, y, duration).then(() => el);
    }

    clickCursor(targetEl) {
      if (!this.cursorEl) return Promise.resolve();
      this.cursorEl.classList.add('clicking');
      this.createRipple();

      return new Promise(resolve => {
        setTimeout(() => {
          this.cursorEl.classList.remove('clicking');
          if (targetEl) {
            if (typeof targetEl.click === 'function') targetEl.click();
            targetEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }
          setTimeout(resolve, 200 / this.speed);
        }, 120 / this.speed);
      });
    }

    createRipple() {
      if (!this.cursorEl) return;
      const rect = this.cursorEl.getBoundingClientRect();
      const ripple = document.createElement('div');
      ripple.className = 'ym-demo-ripple';
      ripple.style.left = rect.left + 'px';
      ripple.style.top = rect.top + 'px';
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }

    typeInput(selectorOrEl, text, charSpeed = 40) {
      const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
      if (!el) return Promise.resolve();
      el.focus();
      el.value = '';

      const adjSpeed = Math.max(10, charSpeed / this.speed);

      return new Promise(resolve => {
        let idx = 0;
        const timer = setInterval(() => {
          if (!this.isRunning || (this.state && this.state.paused)) {
            clearInterval(timer);
            return;
          }
          if (idx < text.length) {
            el.value += text[idx];
            el.dispatchEvent(new Event('input', { bubbles: true }));
            idx++;
          } else {
            clearInterval(timer);
            el.dispatchEvent(new Event('change', { bubbles: true }));
            setTimeout(resolve, 200 / this.speed);
          }
        }, adjSpeed);
      });
    }

    dragCursor(startX, startY, endX, endY, duration = 1200, targetEl = null) {
      const adjDur = Math.max(300, duration / this.speed);
      return this.moveCursorTo(startX, startY, 300).then(() => {
        this.cursorEl.classList.add('clicking');
        if (targetEl) {
          targetEl.dispatchEvent(new MouseEvent('mousedown', { clientX: startX, clientY: startY, bubbles: true }));
        }

        const steps = 24;
        const stepMs = adjDur / steps;
        let step = 0;

        return new Promise(resolve => {
          const moveTimer = setInterval(() => {
            step++;
            const progress = step / steps;
            const curX = startX + (endX - startX) * progress;
            const curY = startY + (endY - startY) * progress;
            this.cursorEl.style.transform = `translate(${curX}px, ${curY}px)`;

            if (targetEl) {
              targetEl.dispatchEvent(new MouseEvent('mousemove', { clientX: curX, clientY: curY, bubbles: true }));
            }

            if (step >= steps) {
              clearInterval(moveTimer);
              this.cursorEl.classList.remove('clicking');
              if (targetEl) {
                targetEl.dispatchEvent(new MouseEvent('mouseup', { clientX: endX, clientY: endY, bubbles: true }));
              }
              setTimeout(resolve, 200 / this.speed);
            }
          }, stepMs);
        });
      });
    }

    scrollWindowTo(targetY, duration = 1400) {
      const adjDur = Math.max(300, duration / this.speed);
      const startY = window.scrollY;
      const distance = targetY - startY;
      const startTime = performance.now();

      return new Promise(resolve => {
        const stepScroll = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / adjDur, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          window.scrollTo(0, startY + distance * ease);

          if (progress < 1) {
            requestAnimationFrame(stepScroll);
          } else {
            setTimeout(resolve, 200 / this.speed);
          }
        };
        requestAnimationFrame(stepScroll);
      });
    }

    /* ─── Event-Driven Chunked Speech Queue ─── */
    speakChunks(chunks) {
      if (!this.captionEl) return Promise.resolve();
      const container = this.captionEl.querySelector('.caption-text');
      if (!container) return Promise.resolve();

      this.captionEl.classList.add('visible');

      let chunkIdx = 0;

      return new Promise(resolve => {
        const speakNextChunk = () => {
          if (!this.isRunning || (this.state && this.state.paused)) {
            resolve();
            return;
          }
          if (chunkIdx >= chunks.length) {
            setTimeout(resolve, 600 / this.speed);
            return;
          }

          const rawText = chunks[chunkIdx];
          chunkIdx++;

          const words = rawText.split(/\s+/);
          container.innerHTML = words.map((w, i) => `<span class="caption-word" data-word-idx="${i}">${w} </span>`).join('');
          const wordEls = container.querySelectorAll('.caption-word');

          let chunkEnded = false;
          const finishChunk = () => {
            if (chunkEnded) return;
            chunkEnded = true;
            setTimeout(speakNextChunk, 350 / this.speed);
          };

          // Audio speech synthesis chunk execution (event-driven, no premature cancel!)
          this.narrator.speakChunk(
            rawText,
            this.speed,
            (charIdx, charLen) => {
              const textUpToChar = rawText.substring(0, charIdx);
              const wordIndex = textUpToChar.trim().split(/\s+/).length - 1;
              wordEls.forEach((wEl, idx) => {
                if (idx === wordIndex) wEl.classList.add('active');
                else wEl.classList.remove('active');
              });
            },
            () => finishChunk()
          );
        };

        speakNextChunk();
      });
    }

    hideCaption() {
      if (this.captionEl) this.captionEl.classList.remove('visible');
      if (this.narrationTimer) clearTimeout(this.narrationTimer);
      this.narrator.stop();
    }

    advanceToStepIndex(nextIdx) {
      if (!this.state) return;
      this.hideCaption();

      if (nextIdx >= STEPS.length) {
        this.state.status = 'completed';
        saveState(this.state);
        this.cleanupUI();
        this.showEndSummary();
        return;
      }

      this.state.stepIdx = nextIdx;
      saveState(this.state);

      const nextStep = STEPS[nextIdx];
      if (nextStep) {
        const curPath = getPath();
        if (nextStep.route !== curPath && !(nextStep.route !== '/' && curPath.startsWith(nextStep.route))) {
          window.location.href = nextStep.route;
        } else {
          this.executeCurrentStep();
        }
      }
    }

    advanceStep() {
      if (!this.state) return;
      this.advanceToStepIndex(this.state.stepIdx + 1);
    }

    /* ─── Workflow Execution across All Product Pages ─── */
    async executeCurrentStep() {
      if (!this.state || !this.isRunning || this.state.paused) return;
      const step = STEPS[this.state.stepIdx];
      if (!step) return;

      this.updateControlsUI();

      switch (step.id) {
        case 'home-intro':
          await this.runHomeIntro();
          break;
        case 'login-auth':
          await this.runLoginAuth();
          break;
        case 'step-1-dashboard':
          await this.runStep1Dashboard();
          break;
        case 'step-2-assets':
          await this.runStep2Assets();
          break;
        case 'step-3-digital-twin':
          await this.runStep3DigitalTwin();
          break;
        case 'step-4-anomaly':
          await this.runStep4Anomaly();
          break;
        case 'step-5-ai-assistant':
          await this.runStep5AIAssistant();
          break;
        case 'step-6-knowledge-graph':
          await this.runStep6KnowledgeGraph();
          break;
        case 'step-7-agents':
          await this.runStep7Agents();
          break;
        case 'step-8-maintenance':
          await this.runStep8Maintenance();
          break;
        case 'step-9-reports':
          await this.runStep9Reports();
          break;
        case 'step-10-reliability':
          await this.runStep10Reliability();
          break;
        case 'step-11-twin-return':
          await this.runStep11TwinReturn();
          break;
        case 'end-summary':
          this.showEndSummary();
          break;
        default:
          this.advanceStep();
      }
    }

    /* ─── STEP 0: LANDING PAGE ─── */
    async runHomeIntro() {
      const chunks = [
        "Welcome to YantraMitra, the AI-powered Industrial Digital Twin platform.",
        "Traditional maintenance relies on reactive repairs, costing industrial plants millions in unplanned downtime.",
        "YantraMitra unifies 3D Digital Twins, Hybrid RAG, Knowledge Graphs, and Multi-Agent AI to deliver predictive maintenance across Indian manufacturing facilities.",
        "Let us authenticate as a reliability engineer to enter the live operating platform."
      ];

      const narrationPromise = this.speakChunks(chunks);

      await new Promise(r => setTimeout(r, 1000 / this.speed));
      await this.scrollWindowTo(700, 2200);
      await new Promise(r => setTimeout(r, 1000 / this.speed));
      await this.scrollWindowTo(1500, 2400);
      await new Promise(r => setTimeout(r, 1000 / this.speed));
      await this.scrollWindowTo(2400, 2400);
      await new Promise(r => setTimeout(r, 800 / this.speed));
      await this.scrollWindowTo(0, 1600);

      await narrationPromise;

      const loginBtn = await this.moveCursorToElement('a[href="/login"], .ym-home-auth a[href="/login"]', 700);
      await this.clickCursor(loginBtn || document.querySelector('a[href="/login"]'));

      this.advanceToStepIndex(1);
    }

    /* ─── STEP 1: LOGIN AUTHENTICATION ─── */
    async runLoginAuth() {
      const chunks = [
        "Authenticating reliability engineer into the YantraMitra Industrial Operations Platform.",
        "Entering enterprise single sign-on credentials for admin at yantramitra dot com.",
        "Initializing session and loading the Global Command Center."
      ];

      const narrationPromise = this.speakChunks(chunks);

      await new Promise(r => setTimeout(r, 600 / this.speed));

      try {
        const resp = await fetch('/api/auth/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if (resp.ok) {
          await narrationPromise;
          this.advanceToStepIndex(2);
          return;
        }
      } catch {}

      const emailInput = document.getElementById('email') || document.querySelector('input[type="email"], input[name="email"], input');
      if (emailInput) {
        await this.moveCursorToElement(emailInput, 600);
        await this.clickCursor(emailInput);
        await this.typeInput(emailInput, 'admin@yantramitra.com', 40);
      }

      const passInput = document.getElementById('password') || document.querySelector('input[type="password"]');
      if (passInput) {
        await this.moveCursorToElement(passInput, 500);
        await this.clickCursor(passInput);
        await this.typeInput(passInput, 'Demo@2026', 40);
      }

      const submitBtn = document.querySelector('button[type="submit"]') || document.querySelector('button');
      if (submitBtn) {
        await this.moveCursorToElement(submitBtn, 500);
        await this.clickCursor(submitBtn);
      }

      await narrationPromise;
      this.advanceToStepIndex(2);
    }

    /* ─── STEP 2: DASHBOARD & CRITICAL ALERT ─── */
    async runStep1Dashboard() {
      const chunks = [
        "The engineer begins work on the Global Command Center dashboard.",
        "Real-time telemetry streams across 29 connected industrial assets in Pune, Ahmedabad, Chennai, Bengaluru, and Nagpur.",
        "A critical alert arrives! CNC-101 spindle vibration has exceeded safety limits at 8.4 millimeters per second.",
        "The engineer immediately clicks to inspect the anomalous asset."
      ];

      const narrationPromise = this.speakChunks(chunks);

      document.querySelectorAll('[data-kpi-route], .kpi-card').forEach((card, idx) => {
        setTimeout(() => {
          card.classList.add('glow-indigo');
          setTimeout(() => card.classList.remove('glow-indigo'), 1000);
        }, idx * 250);
      });

      await new Promise(r => setTimeout(r, 1800 / this.speed));

      let alertCard = document.querySelector('[data-alert-id="cnc-101"], .critical-alert-card');
      if (!alertCard) {
        alertCard = document.createElement('div');
        alertCard.className = 'ym-demo-alert-toast pulsing-red';
        alertCard.innerHTML = `
          <div class="alert-icon"><span class="material-symbols-outlined">warning</span></div>
          <div class="alert-content">
            <div class="alert-badge">CRITICAL TELEMETRY ANOMALY</div>
            <div class="alert-title">CNC-101 Spindle Vibration Exceeds Threshold</div>
            <div class="alert-desc">Measured: 8.4 mm/s | Limit: 2.5 mm/s | Temp: 78°C (Elevated)</div>
          </div>
          <button class="alert-btn">Inspect Asset Telemetry →</button>
        `;
        document.body.appendChild(alertCard);
        requestAnimationFrame(() => alertCard.classList.add('visible'));
      }

      const targetBtn = alertCard.querySelector('.alert-btn') || alertCard;
      await this.moveCursorToElement(targetBtn, 700);
      await this.clickCursor(targetBtn);

      await narrationPromise;
      alertCard.remove();
      this.advanceToStepIndex(3);
    }

    /* ─── STEP 3: ASSETS FLEET PAGE ─── */
    async runStep2Assets() {
      const navLink = document.querySelector('a[href="/assets"]');
      if (navLink && getPath() !== '/assets') {
        await this.moveCursorToElement(navLink, 600);
        await this.clickCursor(navLink);
        this.advanceToStepIndex(3);
        return;
      }

      const chunks = [
        "Opening Asset Fleet to inspect health scores and sensor coverage across all manufacturing cells.",
        "Selecting CNC-101 to open its telemetry inspector and 3D Digital Twin."
      ];

      const narrationPromise = this.speakChunks(chunks);

      await new Promise(r => setTimeout(r, 1000 / this.speed));

      const cncCard = document.querySelector('[data-asset-id="cnc-101"], .asset-card, main tr, main');
      if (cncCard) {
        await this.moveCursorToElement(cncCard, 600);
        await this.clickCursor(cncCard);
      }

      await narrationPromise;
      this.advanceToStepIndex(4);
    }

    /* ─── STEP 4: 3D DIGITAL TWIN ─── */
    async runStep3DigitalTwin() {
      const navLink = document.querySelector('a[href="/digital-twin"]');
      if (navLink && getPath() !== '/digital-twin') {
        await this.moveCursorToElement(navLink, 600);
        await this.clickCursor(navLink);
        this.advanceToStepIndex(4);
        return;
      }

      const chunks = [
        "Inside the 3D Digital Twin environment. CNC-101 displays an elevated temperature of 78 degrees Celsius and severe vibration spikes.",
        "Rotating the 3D model allows the engineer to inspect the spindle assembly.",
        "Clicking on the spindle assembly reveals high frequency vibration harmonics in the primary bearing."
      ];

      const narrationPromise = this.speakChunks(chunks);

      await new Promise(r => setTimeout(r, 1000 / this.speed));

      const canvasEl = document.querySelector('canvas, #ym-twin-canvas, .digital-twin-container, main');

      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        await this.dragCursor(rect.left + rect.width * 0.4, rect.top + rect.height * 0.5, rect.left + rect.width * 0.7, rect.top + rect.height * 0.5, 1200, canvasEl);
        await new Promise(r => setTimeout(r, 300 / this.speed));
        await this.dragCursor(rect.left + rect.width * 0.5, rect.top + rect.height * 0.7, rect.left + rect.width * 0.5, rect.top + rect.height * 0.3, 1000, canvasEl);
      }

      const componentEl = document.querySelector('[data-component="spindle"], .spindle-component, .glass-card:nth-child(2), main');
      if (componentEl) {
        await this.moveCursorToElement(componentEl, 600);
        await this.clickCursor(componentEl);
      }

      await narrationPromise;
      this.advanceToStepIndex(5);
    }

    /* ─── STEP 5: ANOMALY INVESTIGATION ─── */
    async runStep4Anomaly() {
      const navLink = document.querySelector('a[href="/anomaly"]');
      if (navLink && getPath() !== '/anomaly') {
        await this.moveCursorToElement(navLink, 600);
        await this.clickCursor(navLink);
        this.advanceToStepIndex(5);
        return;
      }

      const chunks = [
        "Opening Anomaly Investigation.",
        "Spectral analysis reveals high frequency sideband harmonics characteristic of outer raceway bearing spalling.",
        "The engineer opens YantraNklan AI Console for multi-agent root cause analysis."
      ];

      const narrationPromise = this.speakChunks(chunks);

      await new Promise(r => setTimeout(r, 1200 / this.speed));
      await narrationPromise;
      this.advanceToStepIndex(6);
    }

    /* ─── STEP 6: YANTRANPLAN MULTI-AGENT AI ANALYSIS ─── */
    async runStep5AIAssistant() {
      const aiNavLink = document.querySelector('a[href="/ai-console"]');
      if (aiNavLink && getPath() !== '/ai-console') {
        await this.moveCursorToElement(aiNavLink, 600);
        await this.clickCursor(aiNavLink);
        this.advanceToStepIndex(6);
        return;
      }

      const chunks = [
        "The engineer opens the YantraNklan AI Assistant to diagnose the failure.",
        "Asking: Why is CNC-101 vibrating excessively?",
        "Multi-agent reasoning analyzes Knowledge Graphs, maintenance logs, and SKF technical manuals.",
        "AI confirms severe outer raceway micro-spalling on SKF-6208 Spindle Ball Bearing with 94.2 percent confidence."
      ];

      const narrationPromise = this.speakChunks(chunks);

      await new Promise(r => setTimeout(r, 800 / this.speed));

      const chatInput = document.querySelector('#ym-chat-input, .ai-console-input input, textarea, input[type="text"]');
      if (chatInput) {
        await this.moveCursorToElement(chatInput, 600);
        await this.clickCursor(chatInput);
        await this.typeInput(chatInput, 'Why is CNC-101 vibrating excessively?', 40);
      }

      const sendBtn = document.querySelector('#ym-chat-send, button[type="submit"], .ai-console-send, button');
      if (sendBtn) {
        await this.moveCursorToElement(sendBtn, 400);
        await this.clickCursor(sendBtn);
      }

      let thinkingBox = document.querySelector('.ym-demo-ai-thinking');
      if (!thinkingBox) {
        thinkingBox = document.createElement('div');
        thinkingBox.className = 'ym-demo-ai-thinking visible';
        thinkingBox.innerHTML = `
          <div class="thinking-header"><span class="spinner"></span> YantraNklan Multi-Agent Reasoning Engine</div>
          <div class="thinking-steps">
            <div class="step-item step-1">🔍 Searching Knowledge Graph for CNC-101 topology...</div>
            <div class="step-item step-2">📜 Querying Maintenance Logs & Past Incidents...</div>
            <div class="step-item step-3">📖 Parsing SKF Bearing Technical Manuals...</div>
            <div class="step-item step-4">🤖 Executing Diagnostic Multi-Agent Workflow...</div>
          </div>
          <div class="response-stream"></div>
        `;
        document.body.appendChild(thinkingBox);
      }

      const steps = thinkingBox.querySelectorAll('.step-item');
      for (let i = 0; i < steps.length; i++) {
        await new Promise(r => setTimeout(r, 500 / this.speed));
        steps[i].classList.add('done');
      }

      const responseText = `
### 🚨 Diagnostic Analysis: CNC-101 Spindle Anomaly
- **Root Cause**: Severe outer-raceway micro-spalling on **SKF-6208 Spindle Ball Bearing**.
- **Affected Component**: Primary Spindle Bearing Assembly (Tag: CNC101-BRG-01).
- **Confidence / Probability**: **94.2% Risk Confidence**.
- **Recommended Action**: Replace SKF-6208 bearing and perform spindle lubrication realignment within **24 hours** to prevent catastrophic seizure.
      `;

      const streamEl = thinkingBox.querySelector('.response-stream');
      if (streamEl) {
        streamEl.innerHTML = '';
        for (let i = 0; i < responseText.length; i += 3) {
          streamEl.innerHTML = responseText.slice(0, i) + '<span class="caret">█</span>';
          await new Promise(r => setTimeout(r, 15 / this.speed));
        }
        streamEl.innerHTML = responseText;
      }

      await narrationPromise;
      setTimeout(() => {
        thinkingBox.remove();
        this.advanceToStepIndex(7);
      }, 800 / this.speed);
    }

    /* ─── STEP 7: GLOBAL MAP & KNOWLEDGE GRAPH ─── */
    async runStep6KnowledgeGraph() {
      const mapNavLink = document.querySelector('a[href="/map"]');
      if (mapNavLink && getPath() !== '/map') {
        await this.moveCursorToElement(mapNavLink, 600);
        await this.clickCursor(mapNavLink);
        this.advanceToStepIndex(7);
        return;
      }

      const chunks = [
        "Opening Global Map and Knowledge Graph to trace failure lineage.",
        "The graph connects CNC-101 to the spindle assembly, SKF-6208 bearing, and technician logs.",
        "It confirms a missed lubrication cycle 3 weeks ago caused friction buildup and premature bearing fatigue."
      ];

      const narrationPromise = this.speakChunks(chunks);

      await new Promise(r => setTimeout(r, 800 / this.speed));

      let graphContainer = document.querySelector('.ym-demo-kg-visualizer');
      if (!graphContainer) {
        graphContainer = document.createElement('div');
        graphContainer.className = 'ym-demo-kg-visualizer visible';
        graphContainer.innerHTML = `
          <div class="kg-title">YANTRAMITRA KNOWLEDGE GRAPH LINEAGE</div>
          <div class="kg-nodes">
            <div class="kg-node node-machine active">CNC-101 (Machine)</div>
            <div class="kg-arrow">➔</div>
            <div class="kg-node node-sub">Spindle Assembly</div>
            <div class="kg-arrow">➔</div>
            <div class="kg-node node-comp alert">SKF-6208 Bearing</div>
            <div class="kg-arrow">➔</div>
            <div class="kg-node node-event">Missed Lubrication (Dec 14)</div>
            <div class="kg-arrow">➔</div>
            <div class="kg-node node-tech">Tech: R. Kumar</div>
          </div>
        `;
        document.body.appendChild(graphContainer);
      }

      const nodes = graphContainer.querySelectorAll('.kg-node');
      for (let i = 0; i < nodes.length; i++) {
        await this.moveCursorToElement(nodes[i], 450);
        nodes[i].classList.add('highlighted');
        await new Promise(r => setTimeout(r, 350 / this.speed));
      }

      await narrationPromise;
      setTimeout(() => {
        graphContainer.remove();
        this.advanceToStepIndex(8);
      }, 500 / this.speed);
    }

    /* ─── STEP 8: AI AGENTS MISSION CONTROL ─── */
    async runStep7Agents() {
      const agentsNavLink = document.querySelector('a[href="/agents"]');
      if (agentsNavLink && getPath() !== '/agents') {
        await this.moveCursorToElement(agentsNavLink, 600);
        await this.clickCursor(agentsNavLink);
        this.advanceToStepIndex(8);
        return;
      }

      const chunks = [
        "Opening Agent Mission Control.",
        "Diagnostic Agent, Maintenance Agent, and Parts Planner collaborate autonomously to orchestrate the repair mission."
      ];

      const narrationPromise = this.speakChunks(chunks);

      await new Promise(r => setTimeout(r, 1200 / this.speed));
      await narrationPromise;
      this.advanceToStepIndex(9);
    }

    /* ─── STEP 9: MAINTENANCE WORK ORDER CREATION & EXECUTION ─── */
    async runStep8Maintenance() {
      const woNavLink = document.querySelector('a[href="/work-orders"]');
      if (woNavLink && getPath() !== '/work-orders') {
        await this.moveCursorToElement(woNavLink, 600);
        await this.clickCursor(woNavLink);
        this.advanceToStepIndex(9);
        return;
      }

      const chunks = [
        "Navigating to Maintenance Work Orders. Creating emergency Work Order 2026 894 for CNC-101 with Critical priority, assigned to lead technician Rajesh Kumar.",
        "Executing Lockout Tagout safety checks, replacing SKF-6208 bearing, torquing spindle housing to 45 Newton meters, and marking work order resolved."
      ];

      const narrationPromise = this.speakChunks(chunks);

      await new Promise(r => setTimeout(r, 800 / this.speed));

      let modalEl = document.querySelector('.ym-demo-wo-modal');
      if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.className = 'ym-demo-wo-modal visible';
        modalEl.innerHTML = `
          <div class="modal-box">
            <div class="modal-header">
              <span class="material-symbols-outlined">build</span>
              <span>Create Emergency Work Order</span>
            </div>
            <div class="modal-form">
              <div class="form-group">
                <label>Machine Asset</label>
                <input type="text" id="wo-machine" value="" placeholder="Selecting asset...">
              </div>
              <div class="form-group">
                <label>Priority Level</label>
                <select id="wo-priority">
                  <option value="NORMAL">Normal</option>
                  <option value="CRITICAL">🔴 CRITICAL</option>
                </select>
              </div>
              <div class="form-group">
                <label>Assigned Lead Technician</label>
                <input type="text" id="wo-tech" value="" placeholder="Assigning technician...">
              </div>
              <div class="form-group">
                <label>Task Scope / Description</label>
                <textarea id="wo-desc" rows="3" placeholder="Writing scope..."></textarea>
              </div>
              <div class="modal-actions">
                <button id="wo-submit-btn" class="btn-primary">✓ Create Work Order #WO-2026-894</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modalEl);
      }

      const mInput = modalEl.querySelector('#wo-machine');
      await this.moveCursorToElement(mInput, 500);
      await this.clickCursor(mInput);
      await this.typeInput(mInput, 'CNC-101 (Pune Automotive)', 35);

      const pSelect = modalEl.querySelector('#wo-priority');
      await this.moveCursorToElement(pSelect, 400);
      await this.clickCursor(pSelect);
      pSelect.value = 'CRITICAL';

      const tInput = modalEl.querySelector('#wo-tech');
      await this.moveCursorToElement(tInput, 400);
      await this.clickCursor(tInput);
      await this.typeInput(tInput, 'Rajesh Kumar (Senior Reliability Engineer)', 35);

      const dInput = modalEl.querySelector('#wo-desc');
      await this.moveCursorToElement(dInput, 400);
      await this.clickCursor(dInput);
      await this.typeInput(dInput, 'Emergency SKF-6208 spindle bearing replacement to resolve 8.4mm/s vibration anomaly.', 30);

      const subBtn = modalEl.querySelector('#wo-submit-btn');
      await this.moveCursorToElement(subBtn, 500);
      await this.clickCursor(subBtn);

      modalEl.remove();

      let drawer = document.querySelector('.ym-demo-wo-drawer');
      if (!drawer) {
        drawer = document.createElement('div');
        drawer.className = 'ym-demo-wo-drawer visible';
        drawer.innerHTML = `
          <div class="drawer-header">
            <span class="badge badge-progress">IN PROGRESS</span>
            <h3>Work Order #WO-2026-894 — CNC-101</h3>
          </div>
          <div class="drawer-checklist">
            <h4>Safety & Maintenance Checklist</h4>
            <label class="check-item"><input type="checkbox" id="chk-1"> <span>LOTO Safety Lockout & Tagout Applied</span></label>
            <label class="check-item"><input type="checkbox" id="chk-2"> <span>Spindle Housing Disassembled</span></label>
            <label class="check-item"><input type="checkbox" id="chk-3"> <span>SKF-6208 Bearing Installed & Torqued to 45Nm</span></label>
            <label class="check-item"><input type="checkbox" id="chk-4"> <span>Vibration Recalibration Passed (0.8 mm/s)</span></label>
          </div>
          <div class="drawer-notes">
            <label>Technician Execution Notes</label>
            <textarea id="wo-exec-notes" rows="2"></textarea>
          </div>
          <button id="wo-complete-btn" class="btn-success">✓ Mark Work Order Resolved</button>
        `;
        document.body.appendChild(drawer);
      }

      for (let i = 1; i <= 4; i++) {
        const chk = drawer.querySelector(`#chk-${i}`);
        if (chk) {
          await this.moveCursorToElement(chk, 400);
          await this.clickCursor(chk);
          chk.checked = true;
          chk.closest('.check-item').classList.add('done');
          await new Promise(r => setTimeout(r, 250 / this.speed));
        }
      }

      const notesText = drawer.querySelector('#wo-exec-notes');
      if (notesText) {
        await this.moveCursorToElement(notesText, 400);
        await this.clickCursor(notesText);
        await this.typeInput(notesText, 'SKF-6208 installed. Spindle re-torqued. Vibration returned to nominal 0.8 mm/s.', 30);
      }

      const compBtn = drawer.querySelector('#wo-complete-btn');
      if (compBtn) {
        await this.moveCursorToElement(compBtn, 500);
        await this.clickCursor(compBtn);
        drawer.querySelector('.badge').textContent = 'RESOLVED / COMPLETED';
        drawer.querySelector('.badge').className = 'badge badge-success';
      }

      await narrationPromise;
      setTimeout(() => {
        drawer.remove();
        this.advanceToStepIndex(10);
      }, 800 / this.speed);
    }

    /* ─── STEP 10: EXECUTIVE REPORTS & PDF EXPORT ─── */
    async runStep9Reports() {
      const chunks = [
        "Generating an executive maintenance report.",
        "Total repair cost is 18 thousand 5 hundred rupees, preventing 14 hours of breakdown.",
        "Net downtime loss saved is 4 lakh 80 thousand rupees. Exporting report as PDF."
      ];

      const narrationPromise = this.speakChunks(chunks);

      await new Promise(r => setTimeout(r, 800 / this.speed));

      let pdfModal = document.querySelector('.ym-demo-pdf-modal');
      if (!pdfModal) {
        pdfModal = document.createElement('div');
        pdfModal.className = 'ym-demo-pdf-modal visible';
        pdfModal.innerHTML = `
          <div class="pdf-container">
            <div class="pdf-toolbar">
              <span class="pdf-title">📄 Executive_Maintenance_Report_WO2026894.pdf</span>
              <button id="pdf-export-btn" class="pdf-export"><span class="material-symbols-outlined">download</span> Export PDF</button>
            </div>
            <div class="pdf-body">
              <div class="pdf-header-block">
                <h2>YANTRAMITRA EXECUTIVE MAINTENANCE REPORT</h2>
                <p>Asset: CNC-101 Spindle | Plant: Pune Automotive | Date: July 2026</p>
              </div>
              <div class="pdf-section">
                <h3>Executive Summary</h3>
                <p>Proactive AI diagnosis prevented catastrophic spindle seizure. Total repair time: 1.8 hours.</p>
              </div>
              <div class="pdf-grid">
                <div class="pdf-stat"><span class="lbl">Total Repair Cost</span><span class="val">₹18,500</span></div>
                <div class="pdf-stat"><span class="lbl">Avoided Downtime</span><span class="val">14 Hours</span></div>
                <div class="pdf-stat highlight"><span class="lbl">Downtime Loss Saved</span><span class="val">₹4,80,000</span></div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(pdfModal);
      }

      const expBtn = pdfModal.querySelector('#pdf-export-btn');
      await this.moveCursorToElement(expBtn, 700);
      await this.clickCursor(expBtn);

      const toast = document.createElement('div');
      toast.className = 'ym-demo-toast';
      toast.innerHTML = '📥 Executive Maintenance Report Exported as PDF!';
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add('visible'), 100);

      await narrationPromise;
      setTimeout(() => {
        pdfModal.remove();
        toast.remove();
        this.advanceToStepIndex(11);
      }, 800 / this.speed);
    }

    /* ─── STEP 11: RELIABILITY ANALYTICS & ML FORECAST ─── */
    async runStep10Reliability() {
      const relNavLink = document.querySelector('a[href="/reliability"]');
      if (relNavLink && getPath() !== '/reliability') {
        await this.moveCursorToElement(relNavLink, 600);
        await this.clickCursor(relNavLink);
        this.advanceToStepIndex(11);
        return;
      }

      const chunks = [
        "Reviewing plant-wide reliability analytics and machine learning forecasts.",
        "Mean Time Between Failures increases to 1,480 hours while Mean Time To Repair drops to 1 point 8 hours.",
        "Failure probability drops to nominal 1 point 2 percent, extending Remaining Useful Life to 180 days."
      ];

      const narrationPromise = this.speakChunks(chunks);

      await new Promise(r => setTimeout(r, 800 / this.speed));

      let cardsEl = document.querySelector('.ym-demo-analytics-overlay');
      if (!cardsEl) {
        cardsEl = document.createElement('div');
        cardsEl.className = 'ym-demo-analytics-overlay visible';
        cardsEl.innerHTML = `
          <div class="analytics-card"><span class="title">Mean Time Between Failures (MTBF)</span><span class="val pulse">1,480 hrs ↑</span></div>
          <div class="analytics-card"><span class="title">Mean Time To Repair (MTTR)</span><span class="val">1.8 hrs ↓</span></div>
          <div class="analytics-card"><span class="title">Overall Equipment Effectiveness (OEE)</span><span class="val">98.6% ↑</span></div>
          <div class="analytics-card highlight"><span class="title">Monthly Unplanned Downtime Cost Saved</span><span class="val">₹4,80,000</span></div>
        `;
        document.body.appendChild(cardsEl);
      }

      await narrationPromise;
      setTimeout(() => {
        cardsEl.remove();
        this.advanceToStepIndex(12);
      }, 800 / this.speed);
    }

    /* ─── STEP 12: DIGITAL TWIN RESTORED HEALTH ─── */
    async runStep11TwinReturn() {
      const dtNavLink = document.querySelector('a[href="/digital-twin"]');
      if (dtNavLink && getPath() !== '/digital-twin') {
        await this.moveCursorToElement(dtNavLink, 600);
        await this.clickCursor(dtNavLink);
        this.advanceToStepIndex(12);
        return;
      }

      const chunks = [
        "Returning to the 3D Digital Twin.",
        "CNC-101 vibration has dropped to nominal 0 point 8 millimeters per second.",
        "Asset status is restored to 100 percent HEALTHY."
      ];

      const narrationPromise = this.speakChunks(chunks);

      await new Promise(r => setTimeout(r, 800 / this.speed));

      let twinBadge = document.querySelector('.ym-demo-twin-healthy');
      if (!twinBadge) {
        twinBadge = document.createElement('div');
        twinBadge.className = 'ym-demo-twin-healthy visible';
        twinBadge.innerHTML = `
          <div class="healthy-header">
            <span class="green-dot"></span>
            <span>ASSET HEALTH RESTORED — CNC-101</span>
          </div>
          <div class="healthy-metrics">
            <div class="metric"><span class="m-lbl">Health Score</span><span class="m-val text-green">99%</span></div>
            <div class="metric"><span class="m-lbl">Vibration</span><span class="m-val">0.8 mm/s</span></div>
            <div class="metric"><span class="m-lbl">Temperature</span><span class="m-val">42°C</span></div>
            <div class="metric"><span class="m-lbl">Status</span><span class="m-val text-green">NOMINAL</span></div>
          </div>
        `;
        document.body.appendChild(twinBadge);
      }

      await narrationPromise;
      setTimeout(() => {
        twinBadge.remove();
        this.advanceToStepIndex(13);
      }, 800 / this.speed);
    }

    /* ─── STEP 13: SHIFT COMPLETION SUMMARY ─── */
    showEndSummary() {
      const chunks = [
        "Shift complete. All critical maintenance actions executed autonomously with full industrial traceability.",
        "Summary: 1 task completed, 1 critical alert resolved, 1 executive report exported, and 4 lakh 80 thousand rupees downtime loss saved.",
        "Thank you for watching YantraMitra. Ask your machines anything."
      ];
      this.speakChunks(chunks);

      const existing = document.querySelector('.ym-demo-summary');
      if (existing) existing.remove();

      const el = document.createElement('div');
      el.className = 'ym-demo-summary visible';
      el.innerHTML = `
        <div class="summary-container">
          <div class="summary-badge">DEMO COMPLETE</div>
          <div class="summary-title">YantraMitra</div>
          <div class="summary-subtitle">Ask Your Machines Anything.</div>
          <div class="summary-tagline">AI-Powered Industrial Digital Twin Platform</div>

          <div class="summary-stats-grid">
            <div class="stat-card">
              <span class="stat-num">1</span>
              <span class="stat-lbl">Shift Tasks Completed</span>
            </div>
            <div class="stat-card">
              <span class="stat-num">1</span>
              <span class="stat-lbl">Alerts Resolved (CNC-101)</span>
            </div>
            <div class="stat-card">
              <span class="stat-num">1 PDF</span>
              <span class="stat-lbl">Executive Reports Exported</span>
            </div>
            <div class="stat-card highlight">
              <span class="stat-num">14 Hours</span>
              <span class="stat-lbl">₹4,80,000 Downtime Saved</span>
            </div>
          </div>

          <div class="summary-buttons">
            <button class="summary-btn primary" data-action="replay"><span class="material-symbols-outlined">replay</span> Replay Complete Demo</button>
            <button class="summary-btn secondary" data-action="explore"><span class="material-symbols-outlined">explore</span> Explore Yourself</button>
            <button class="summary-btn outline" data-action="contact"><span class="material-symbols-outlined">mail</span> Contact Team</button>
          </div>
        </div>
      `;
      document.body.appendChild(el);

      el.querySelector('[data-action="replay"]')?.addEventListener('click', () => {
        el.remove();
        this.restart();
      });
      el.querySelector('[data-action="explore"]')?.addEventListener('click', () => {
        el.remove();
        this.stop();
      });
      el.querySelector('[data-action="contact"]')?.addEventListener('click', () => {
        el.remove();
        this.stop();
        window.location.href = '/contact';
      });
    }

    /* ─── Cleanup ─── */
    cleanupUI() {
      document.querySelectorAll('.ym-demo-overlay, .ym-demo-cursor, .ym-demo-summary, .ym-demo-countdown, .ym-demo-alert-toast, .ym-demo-ai-thinking, .ym-demo-kg-visualizer, .ym-demo-wo-modal, .ym-demo-wo-drawer, .ym-demo-pdf-modal, .ym-demo-analytics-overlay, .ym-demo-twin-healthy').forEach(el => el.remove());
      this.overlayEl = null;
      this.controlsEl = null;
      this.captionEl = null;
      this.cursorEl = null;
      if (this.autoTimer) clearTimeout(this.autoTimer);
      if (this.narrationTimer) clearTimeout(this.narrationTimer);
      this.narrator.stop();
    }
  }

  /* ─── Global YMDemo Namespace ─── */
  window.YMDemo = {
    start() {
      if (!engine) engine = new AutonomousDemoEngine();
      engine.start();
    },
    stop() {
      if (engine) engine.stop();
    },
    pause() {
      if (engine) engine.pause();
    },
    resume() {
      if (engine) engine.resume();
    },
    skip() {
      if (engine) engine.skip();
    },
    restart() {
      if (engine) engine.restart();
    },
    exit() {
      if (engine) engine.exit();
    },
    init() {
      engine = new AutonomousDemoEngine();
      engine.init();
    },
    isActive() {
      const state = getState();
      return !!(state && state.active && state.status === 'running' && isSessionFresh(state));
    }
  };

  /* ─── Auto Initialization ONLY when actively running ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (YMDemo.isActive()) YMDemo.init();
    });
  } else {
    if (YMDemo.isActive()) YMDemo.init();
  }

})();
