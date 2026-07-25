(function() {
  'use strict';

  /* ─── Demo Engine ─────────────────────────────────────────── */

  const STATE_KEY = 'ymDemo';
  const DEFAULT_CREDENTIALS = { email: 'admin@yantramitra.com', password: 'Demo@2026' };
  const DEMO_EMAIL = 'admin@yantramitra.com';
  const DEMO_PASSWORD = 'Demo@2026';

  function getState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function saveState(s) {
    localStorage.setItem(STATE_KEY, JSON.stringify(s));
  }

  function clearState() {
    localStorage.removeItem(STATE_KEY);
  }

  function isDemoSessionFresh(state) {
    if (!state || !state.startedAt) return false;
    return (Date.now() - state.startedAt) < 15 * 60 * 1000;
  }

  const currentPath = window.location.pathname;

  /* ─── 28-Step Sequence ─── */
  const STEP_TIMINGS = {
    'landing-hero': 8000,
    'landing-scroll1': 6000,
    'landing-features': 7000,
    'landing-scroll2': 5000,
    'landing-facilities': 6000,
    'landing-agents': 7000,
    'landing-workflows': 5000,
    'landing-cta': 5000,
    'login-fill': 6000,
    'dashboard-kpis': 10000,
    'sidebar-intro': 8000,
    'search-demo': 7000,
    'notifications': 6000,
    'ai-assistant': 12000,
    'knowledge-graph': 8000,
    'digital-twin': 10000,
    'predictive-maintenance': 10000,
    'maintenance-planner': 8000,
    'reports': 8000,
    'assets': 8000,
    'documents': 8000,
    'ai-agents': 10000,
    'workflow-viz': 8000,
    'analytics': 8000,
    'admin': 6000,
    'settings': 6000,
    'mobile-preview': 5000,
    'end-summary': 12000,
  };

  const STEP_ROUTES = [
    { id: 'landing-hero', route: '/' },
    { id: 'landing-scroll1', route: '/' },
    { id: 'landing-features', route: '/' },
    { id: 'landing-scroll2', route: '/' },
    { id: 'landing-facilities', route: '/' },
    { id: 'landing-agents', route: '/' },
    { id: 'landing-workflows', route: '/' },
    { id: 'landing-cta', route: '/' },
    { id: 'login-fill', route: '/login' },
    { id: 'dashboard-kpis', route: '/dashboard' },
    { id: 'sidebar-intro', route: '/dashboard' },
    { id: 'search-demo', route: '/dashboard' },
    { id: 'notifications', route: '/dashboard' },
    { id: 'ai-assistant', route: '/ai-console' },
    { id: 'knowledge-graph', route: '/map' },
    { id: 'digital-twin', route: '/digital-twin' },
    { id: 'predictive-maintenance', route: '/reliability' },
    { id: 'maintenance-planner', route: '/maintenance' },
    { id: 'reports', route: '/dashboard' },
    { id: 'assets', route: '/assets' },
    { id: 'documents', route: '/ai-console' },
    { id: 'ai-agents', route: '/agents' },
    { id: 'workflow-viz', route: '/dashboard' },
    { id: 'analytics', route: '/reliability' },
    { id: 'admin', route: '/settings' },
    { id: 'settings', route: '/settings' },
    { id: 'mobile-preview', route: '/dashboard' },
    { id: 'end-summary', route: '/dashboard' },
  ];

  /* ─── Engine Instance ─── */
  let engine = null;

  class DemoEngine {
    constructor() {
      this.state = getState();
      this.overlayEl = null;
      this.controlsEl = null;
      this.captionEl = null;
      this.cursorEl = null;
      this.highlightEl = null;
      this.scrimEl = null;
      this.isRunning = false;
      this.actionQueue = [];
      this.currentActionIndex = 0;
      this.autoAdvanceTimer = null;
      this.estimatedTimePerStep = 5000;
      this.totalSteps = STEP_ROUTES.length;
      this.captionInterval = null;
    }

    /* ─── Public API ─── */
    start() {
      const newState = {
        active: true,
        currentStepIdx: 0,
        status: 'loading',
        startedAt: Date.now(),
        paused: false,
      };
      saveState(newState);
      this.state = newState;
      this.showLoadingScreen();
    }

    stop() {
      clearState();
      this.state = null;
      this.cleanupUI();
      this.isRunning = false;
    }

    pause() {
      if (!this.state) return;
      this.state.paused = true;
      this.state.status = 'paused';
      saveState(this.state);
      if (this.autoAdvanceTimer) {
        clearTimeout(this.autoAdvanceTimer);
        this.autoAdvanceTimer = null;
      }
      if (this.captionInterval) {
        clearInterval(this.captionInterval);
        this.captionInterval = null;
      }
      this.updateControlsUI();
    }

    resume() {
      if (!this.state) return;
      this.state.paused = false;
      this.state.status = 'running';
      saveState(this.state);
      this.updateControlsUI();
      this.scheduleAutoAdvance();
    }

    skip() {
      if (!this.state) return;
      this.advanceStep();
    }

    restart() {
      this.stop();
      setTimeout(() => this.start(), 300);
    }

    exit() {
      this.stop();
      document.querySelectorAll('.ym-demo-summary').forEach(el => el.remove());
      clearState();
    }

    /* ─── Init on page load ─── */
    init() {
      if (!this.state || !this.state.active) return;
      if (!isDemoSessionFresh(this.state)) {
        this.stop();
        return;
      }

      const currentStepInfo = STEP_ROUTES[this.state.currentStepIdx];
      if (!currentStepInfo) {
        this.stop();
        return;
      }

      if (currentStepInfo.route !== currentPath) {
        window.location.href = currentStepInfo.route;
        return;
      }

      this.isRunning = true;
      this.ensureUI();
      this.executeCurrentStep();
    }

    /* ─── Loading Screen ─── */
    showLoadingScreen() {
      this.injectDemoCSS();
      const existing = document.querySelector('.ym-demo-loading');
      if (existing) existing.remove();

      const items = [
        'Preparing Industrial Digital Twin...',
        'Loading AI Agents...',
        'Initializing Knowledge Graph...',
        'Connecting Digital Twin...',
        'Launching Demo...',
      ];

      const el = document.createElement('div');
      el.className = 'ym-demo-loading';
      el.innerHTML = `<img src="/assets/logos/logo.svg" class="loading-logo" alt="YantraMitra"/>
        <div class="loading-title">YANTRAMITRA</div>
        <div class="loading-subtitle">Preparing Autonomous Demo Environment</div>
        <div class="loading-items">${items.map((label, i) =>
          `<div class="loading-item" data-idx="${i}">
            <span class="loading-dot"></span>
            <span class="loading-label">${label}</span>
            <span class="loading-status"></span>
          </div>`
        ).join('')}</div>`;
      document.body.appendChild(el);

      requestAnimationFrame(() => {
        el.classList.add('visible');
      });

      let delay = 0;
      const itemEls = el.querySelectorAll('.loading-item');
      itemEls.forEach((item, i) => {
        setTimeout(() => {
          item.classList.add('revealed');
          const dot = item.querySelector('.loading-dot');
          const status = item.querySelector('.loading-status');
          dot.classList.add('pulse');

          if (i < items.length - 1) {
            setTimeout(() => {
              dot.classList.remove('pulse');
              dot.classList.add('done');
              status.textContent = '✓';
            }, 800);
          } else {
            setTimeout(() => {
              dot.classList.remove('pulse');
              dot.classList.add('done');
              status.textContent = '✓';
              setTimeout(() => {
                this.finishLoading(el);
              }, 800);
            }, 1000);
          }
        }, delay);
        delay += 600;
      });
    }

    finishLoading(loadingEl) {
      loadingEl.classList.remove('visible');
      setTimeout(() => {
        loadingEl.remove();
        this.state.status = 'running';
        saveState(this.state);
        const firstStep = STEP_ROUTES[0];
        if (firstStep && firstStep.route !== currentPath) {
          window.location.href = firstStep.route;
        } else {
          this.init();
        }
      }, 500);
    }

    /* ─── UI Setup ─── */
    ensureUI() {
      if (!document.querySelector('.ym-demo-overlay')) {
        this.createOverlay();
      }
      this.overlayEl = document.querySelector('.ym-demo-overlay');
      this.controlsEl = this.overlayEl.querySelector('.ym-demo-controls');
      this.captionEl = this.overlayEl.querySelector('.ym-demo-caption');
      this.highlightEl = this.overlayEl.querySelector('.ym-demo-highlight');
      this.scrimEl = this.overlayEl.querySelector('.demo-scrim');
      this.ensureCursor();
      this.updateControlsUI();
    }

    injectDemoCSS() {
      if (document.getElementById('ym-demo-styles')) return;
      const link = document.createElement('link');
      link.id = 'ym-demo-styles';
      link.rel = 'stylesheet';
      link.href = '/css/demo.css';
      document.head.appendChild(link);
    }

    createOverlay() {
      this.injectDemoCSS();
      const overlay = document.createElement('div');
      overlay.className = 'ym-demo-overlay active';
      overlay.innerHTML = `
        <div class="demo-scrim"></div>
        <div class="ym-demo-highlight"></div>
        <div class="ym-demo-controls">
          <div class="demo-header">YANTRAMITRA DEMO MODE</div>
          <div class="demo-step-info">
            <span class="demo-step-num">Step <span class="demo-step-current">1</span> / ${this.totalSteps}</span>
            <span class="demo-time-remaining">Estimated Time Remaining <span class="demo-time-val">4:53</span></span>
          </div>
          <div class="demo-progress-bar">
            <div class="demo-progress-fill" style="width:${this.getProgressPercent()}%"></div>
          </div>
          <div class="demo-btn-row">
            <button class="demo-btn demo-btn-pause" data-action="pause"><span class="material-symbols-outlined">pause</span> <span class="demo-btn-label">Pause</span></button>
            <button class="demo-btn" data-action="skip"><span class="material-symbols-outlined">skip_next</span> <span class="demo-btn-label">Skip</span></button>
            <button class="demo-btn" data-action="restart"><span class="material-symbols-outlined">replay</span> <span class="demo-btn-label">Restart</span></button>
            <button class="demo-btn danger" data-action="exit"><span class="material-symbols-outlined">close</span> <span class="demo-btn-label">Exit</span></button>
          </div>
        </div>
        <div class="ym-demo-caption">
          <div class="caption-step">Step 1</div>
          <div class="caption-line"></div>
        </div>
      `;
      document.body.appendChild(overlay);
      this.wireControlButtons(overlay);
    }

    wireControlButtons(overlay) {
      overlay.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        switch (action) {
          case 'pause':
            if (this.state && this.state.paused) this.resume();
            else this.pause();
            break;
          case 'skip':
            this.skip();
            break;
          case 'restart':
            this.restart();
            break;
          case 'exit':
            this.exit();
            break;
        }
      });
    }

    ensureCursor() {
      if (document.querySelector('.ym-demo-cursor')) return;
      const cursor = document.createElement('div');
      cursor.className = 'ym-demo-cursor';
      cursor.innerHTML = `<div class="cursor-pointer">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 2L14.5 13.5L11 14L13 18L11.5 19L9.5 15L8 17L7 3.5L3 2Z" fill="#413fd6" stroke="#5efae4" stroke-width="0.8"/>
        </svg>
      </div>`;
      document.body.appendChild(cursor);
      this.cursorEl = cursor;
    }

    moveCursorTo(x, y) {
      if (!this.cursorEl) return;
      this.cursorEl.style.transform = `translate(${x - 4}px, ${y - 4}px) scale(1)`;
      this.cursorEl.classList.add('visible');
    }

    moveCursorToSelector(selector, offsetX, offsetY) {
      const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = rect.left + (offsetX !== undefined ? offsetX : rect.width / 2);
      const y = rect.top + (offsetY !== undefined ? offsetY : rect.height / 2);
      this.moveCursorTo(x, y);
      return { el, x, y };
    }

    clickCursor() {
      if (!this.cursorEl) return;
      this.cursorEl.classList.add('clicking');
      this.createRipple();
      setTimeout(() => {
        this.cursorEl.classList.remove('clicking');
      }, 200);
    }

    createRipple() {
      if (!this.cursorEl) return;
      const rect = this.cursorEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const ripple = document.createElement('div');
      ripple.className = 'ym-demo-ripple';
      ripple.style.left = cx + 'px';
      ripple.style.top = cy + 'px';
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    }

    hideCursor() {
      if (this.cursorEl) {
        this.cursorEl.classList.remove('visible');
      }
    }

    /* ─── Sentence-by-Sentence Caption System ─── */
    showCaptions(lines, stepNum) {
      if (!this.captionEl) return;
      const stepEl = this.captionEl.querySelector('.caption-step');
      const lineEl = this.captionEl.querySelector('.caption-line');
      if (stepEl) stepEl.textContent = `Step ${stepNum} / ${this.totalSteps}`;

      lineEl.innerHTML = '';
      this.captionEl.classList.add('visible');

      if (!lines || lines.length === 0) return;

      let sentenceIdx = 0;
      const sentences = [];

      lines.forEach(line => {
        const parts = line.match(/[^.!?]+[.!?]+/g) || [line];
        parts.forEach(p => {
          const trimmed = p.trim();
          if (trimmed) sentences.push(trimmed);
        });
      });

      if (sentences.length === 0) {
        sentences.push(lines.join(' '));
      }

      const revealNextSentence = () => {
        if (sentenceIdx >= sentences.length) {
          this.captionInterval = null;
          return;
        }
        const span = document.createElement('div');
        span.className = 'caption-sentence';
        span.textContent = sentences[sentenceIdx];
        span.style.animation = 'none';
        lineEl.appendChild(span);
        requestAnimationFrame(() => {
          span.style.animation = 'ymCaptionSlideIn 0.4s ease forwards';
        });
        sentenceIdx++;
        this.captionInterval = setTimeout(revealNextSentence, 1800);
      };

      if (this.captionInterval) {
        clearTimeout(this.captionInterval);
        this.captionInterval = null;
      }
      revealNextSentence();
    }

    hideCaption() {
      if (this.captionEl) {
        this.captionEl.classList.remove('visible');
      }
      if (this.captionInterval) {
        clearTimeout(this.captionInterval);
        this.captionInterval = null;
      }
    }

    /* ─── Highlight System ─── */
    showHighlight(selector, padding) {
      if (!this.highlightEl) return;
      const el = selector instanceof Element ? selector : document.querySelector(selector);
      if (!el) { this.hideHighlight(); return; }
      const pad = padding || 12;
      const rect = el.getBoundingClientRect();
      this.highlightEl.style.left = Math.max(0, rect.left - pad) + 'px';
      this.highlightEl.style.top = Math.max(0, rect.top - pad) + 'px';
      this.highlightEl.style.width = Math.min(window.innerWidth - rect.left + pad, rect.width + pad * 2) + 'px';
      this.highlightEl.style.height = Math.min(window.innerHeight - rect.top + pad, rect.height + pad * 2) + 'px';
      this.highlightEl.classList.add('visible');
    }

    hideHighlight() {
      if (this.highlightEl) {
        this.highlightEl.classList.remove('visible');
      }
    }

    /* ─── UI Update ─── */
    updateControlsUI() {
      if (!this.controlsEl || !this.state) return;
      const stepNum = this.controlsEl.querySelector('.demo-step-current');
      if (stepNum) stepNum.textContent = this.state.currentStepIdx + 1;

      const progress = this.controlsEl.querySelector('.demo-progress-fill');
      if (progress) progress.style.width = this.getProgressPercent() + '%';

      const timeVal = this.controlsEl.querySelector('.demo-time-val');
      if (timeVal) {
        const remaining = (this.totalSteps - this.state.currentStepIdx - 1) * this.estimatedTimePerStep;
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        timeVal.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
      }

      const pauseBtn = this.controlsEl.querySelector('[data-action="pause"]');
      if (pauseBtn) {
        if (this.state.paused) {
          pauseBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> <span class="demo-btn-label">Resume</span>';
        } else {
          pauseBtn.innerHTML = '<span class="material-symbols-outlined">pause</span> <span class="demo-btn-label">Pause</span>';
        }
      }
    }

    getProgressPercent() {
      if (!this.state) return 0;
      return ((this.state.currentStepIdx + 1) / this.totalSteps) * 100;
    }

    /* ─── Step Execution ─── */
    executeCurrentStep() {
      if (!this.state || !this.isRunning) return;
      if (this.state.status === 'loading') return;
      if (this.state.paused) {
        this.updateControlsUI();
        return;
      }

      const stepInfo = STEP_ROUTES[this.state.currentStepIdx];
      if (!stepInfo) {
        this.showSummary();
        return;
      }

      this.currentActionIndex = 0;
      this.updateControlsUI();

      const stepTiming = STEP_TIMINGS[stepInfo.id] || 5000;
      const stepNum = this.state.currentStepIdx + 1;

      this.executePageActions(stepInfo, stepNum, () => {
        this.scheduleAutoAdvance(stepTiming);
      });
    }

    scheduleAutoAdvance(delay) {
      if (this.autoAdvanceTimer) {
        clearTimeout(this.autoAdvanceTimer);
        this.autoAdvanceTimer = null;
      }
      if (this.state && this.state.paused) return;
      const ms = delay || 4000;
      this.autoAdvanceTimer = setTimeout(() => {
        if (this.state && !this.state.paused) {
          this.advanceStep();
        }
      }, ms);
    }

    advanceStep() {
      if (!this.state) return;
      this.hideCaption();
      this.hideHighlight();
      this.hideCursor();

      const nextIdx = this.state.currentStepIdx + 1;
      if (nextIdx >= this.totalSteps) {
        this.state.status = 'completed';
        saveState(this.state);
        this.cleanupUI();
        this.showSummary();
        return;
      }
      this.state.currentStepIdx = nextIdx;
      this.state.paused = false;
      saveState(this.state);

      const nextStep = STEP_ROUTES[nextIdx];
      if (nextStep) {
        if (nextStep.route !== currentPath) {
          window.location.href = nextStep.route;
        } else {
          this.executeCurrentStep();
        }
      }
    }

    /* ─── Page-Specific Actions ─── */
    executePageActions(stepInfo, stepNum, onDone) {
      const id = stepInfo.id;
      const actions = this.getActionsForStep(id, stepNum);
      if (!actions || actions.length === 0) {
        if (onDone) onDone();
        return;
      }

      this.currentActionIndex = 0;
      const runNextAction = () => {
        if (!this.isRunning || !this.state || this.state.paused) return;
        if (this.currentActionIndex >= actions.length) {
          if (onDone) onDone();
          return;
        }
        const action = actions[this.currentActionIndex];
        this.currentActionIndex++;
        this.runAction(action, runNextAction);
      };
      runNextAction();
    }

    runAction(action, onComplete) {
      switch (action.type) {
        case 'wait':
          setTimeout(onComplete, action.ms || 1000);
          break;

        case 'scrollTo':
          const scrollEl = typeof action.selector === 'string' ? document.querySelector(action.selector) : action.selector;
          if (scrollEl) {
            scrollEl.scrollIntoView({ behavior: 'smooth', block: action.block || 'center' });
          }
          if (action.caption) {
            this.showCaptions([action.caption], action.stepNum || 1);
          }
          setTimeout(onComplete, action.delay || 1200);
          break;

        case 'highlight':
          this.showHighlight(action.selector, action.padding);
          this.moveCursorToSelector(action.selector);
          if (action.caption) {
            this.showCaptions([action.caption], action.stepNum || 1);
          }
          setTimeout(onComplete, action.duration || 2500);
          break;

        case 'click':
          const clickTarget = typeof action.selector === 'string' ? document.querySelector(action.selector) : action.selector;
          if (clickTarget) {
            const rect = clickTarget.getBoundingClientRect();
            this.moveCursorTo(rect.left + rect.width / 2, rect.top + rect.height / 2);
            setTimeout(() => {
              this.clickCursor();
              setTimeout(() => {
                if (typeof action.clickFn === 'function') {
                  action.clickFn(clickTarget);
                } else if (clickTarget) {
                  clickTarget.click();
                }
                setTimeout(onComplete, action.afterDelay || 800);
              }, 300);
            }, 400);
          } else {
            onComplete();
          }
          break;

        case 'type':
          const inputEl = document.querySelector(action.selector);
          if (inputEl) {
            inputEl.focus();
            inputEl.value = '';
            this.moveCursorToSelector(action.selector);
            const text = action.text || '';
            let i = 0;
            const typeTimer = setInterval(() => {
              if (!this.isRunning || !this.state || this.state.paused) {
                clearInterval(typeTimer);
                return;
              }
              if (i < text.length) {
                inputEl.value += text[i];
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                i++;
              } else {
                clearInterval(typeTimer);
                inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                setTimeout(onComplete, action.afterDelay || 500);
              }
            }, action.typeSpeed || 50);
          } else {
            onComplete();
          }
          break;

        case 'navigate':
          this.hideCaption();
          this.hideHighlight();
          setTimeout(() => {
            window.location.href = action.url;
          }, action.delay || 300);
          break;

        case 'caption':
          this.showCaptions(action.lines || [action.text], action.stepNum || 1);
          if (action.selector) {
            this.showHighlight(action.selector);
          }
          setTimeout(onComplete, action.duration || 3000);
          break;

        case 'scrollPage':
          const startY = window.scrollY;
          const endY = action.to;
          const duration = action.duration || 1500;
          const startTime = performance.now();
          const animateScroll = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            window.scrollTo(0, startY + (endY - startY) * ease);
            if (progress < 1) {
              requestAnimationFrame(animateScroll);
            } else {
              if (action.caption) {
                this.showCaptions([action.caption], action.stepNum || 1);
              }
              setTimeout(onComplete, action.afterDelay || 200);
            }
          };
          requestAnimationFrame(animateScroll);
          break;

        case 'custom':
          if (typeof action.fn === 'function') {
            action.fn(this, onComplete);
          } else {
            onComplete();
          }
          break;

        default:
          onComplete();
      }
    }

    /* ─── Step Action Definitions ─── */
    getActionsForStep(id, stepNum) {
      const steps = {
        'landing-hero': [
          { type: 'wait', ms: 800 },
          { type: 'caption', lines: ['Welcome to YantraMitra.', 'This platform combines Industrial Digital Twins, Large Language Models, Knowledge Graphs, Hybrid Retrieval-Augmented Generation, and Multi-Agent AI to modernize industrial operations.'], stepNum, duration: 5000 },
          { type: 'highlight', selector: '#ym-live-stats', padding: 16, stepNum, duration: 2000 },
          { type: 'caption', lines: ['Live statistics across 5 Indian facilities — 29 machines, 174 sensors.', 'Every metric is fed from real-time telemetry across Pune, Ahmedabad, Chennai, Bengaluru, and Nagpur.'], stepNum, duration: 3500 },
          { type: 'highlight', selector: 'h1', padding: 16, caption: 'Ask your machines anything, then act on the answer.', stepNum, duration: 2000 },
        ],
        'landing-scroll1': [
          { type: 'scrollPage', to: 700, duration: 2000, caption: 'Every product feature explained before sign-in.', stepNum, afterDelay: 500 },
          { type: 'wait', ms: 600 },
          { type: 'caption', lines: ['The command center, plant map, digital twin, and work execution — all visible from here.', 'No hidden paywalls. Everything demonstrated upfront.'], stepNum, duration: 3000 },
        ],
        'landing-features': [
          { type: 'caption', selector: '#overview h2', lines: ['Four core pillars power the platform.', 'Command center for global KPIs. Plant map for facility drilldown. Digital twin for immersive monitoring. Work execution for maintenance orchestration.'], stepNum, duration: 3000 },
          { type: 'highlight', selector: '#overview .glass-card:nth-child(1)', duration: 2000 },
          { type: 'wait', ms: 400 },
          { type: 'highlight', selector: '#overview .glass-card:nth-child(2)', duration: 2000 },
          { type: 'wait', ms: 400 },
          { type: 'highlight', selector: '#overview .glass-card:nth-child(3)', duration: 2000 },
          { type: 'wait', ms: 400 },
          { type: 'highlight', selector: '#overview .glass-card:nth-child(4)', duration: 2000 },
        ],
        'landing-scroll2': [
          { type: 'scrollPage', to: 1500, duration: 2000, stepNum, afterDelay: 300 },
          { type: 'caption', lines: ['Five facilities across India, each with unique operating realities.', 'Pune automotive, Ahmedabad process lines, Chennai electronics, Bengaluru precision, and Nagpur logistics.'], stepNum, duration: 3500 },
        ],
        'landing-facilities': [
          { type: 'highlight', selector: '#facilities .glass-card:nth-child(1)', duration: 2000 },
          { type: 'wait', ms: 400 },
          { type: 'highlight', selector: '#facilities a:nth-child(2)', duration: 1800 },
          { type: 'wait', ms: 300 },
          { type: 'highlight', selector: '#facilities a:nth-child(4)', duration: 1800 },
          { type: 'wait', ms: 300 },
          { type: 'caption', lines: ['Each plant has distinct machines, sensors, incidents, and workflows.', 'Demos never feel like a generic factory shell.'], stepNum, duration: 2500 },
        ],
        'landing-agents': [
          { type: 'scrollPage', to: 2800, duration: 2000, stepNum, afterDelay: 300 },
          { type: 'caption', selector: '#agents h2', lines: ['YantraNklan agents sit above the operating model.', 'They answer plant-aware questions, draft maintenance plans, open mission workflows, and explain every recommendation.'], stepNum, duration: 4000 },
          { type: 'highlight', selector: '#agents article:nth-child(1)', duration: 2000 },
          { type: 'wait', ms: 300 },
          { type: 'highlight', selector: '#agents article:nth-child(2)', duration: 2000 },
          { type: 'wait', ms: 300 },
          { type: 'highlight', selector: '#agents article:nth-child(3)', duration: 2000 },
        ],
        'landing-workflows': [
          { type: 'scrollPage', to: 3700, duration: 2000, stepNum, afterDelay: 300 },
          { type: 'caption', selector: '#workflows h2', lines: ['From signal to action without losing context.', 'Sense, Understand, Recommend, Approve, Execute — the complete workflow.'], stepNum, duration: 3500 },
          { type: 'highlight', selector: '#workflows .glass-card:nth-child(1)', duration: 1500 },
          { type: 'wait', ms: 200 },
          { type: 'highlight', selector: '#workflows .glass-card:nth-child(3)', duration: 1500 },
          { type: 'wait', ms: 200 },
          { type: 'highlight', selector: '#workflows .glass-card:nth-child(5)', duration: 1500 },
        ],
        'landing-cta': [
          { type: 'scrollPage', to: 4600, duration: 2000, stepNum, afterDelay: 300 },
          { type: 'caption', lines: ['Ready to see it in action?', 'A demo account will walk us through every feature of the platform.'], stepNum, duration: 3000 },
          { type: 'custom', fn: (engine, done) => {
            engine.moveCursorToSelector('.ym-home-auth .ym-login, a[href="/login"]');
            setTimeout(() => {
              engine.clickCursor();
              setTimeout(() => {
                window.location.href = '/login';
              }, 500);
            }, 500);
          }},
        ],
        'login-fill': [
          { type: 'wait', ms: 1200 },
          { type: 'caption', lines: ['We are using demo credentials to enter the platform.', 'In production, users authenticate with their work email or Google SSO.'], stepNum, duration: 3000 },
          { type: 'custom', fn: async (engine, done) => {
            const resp = await fetch('/api/auth/demo-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });
            const data = await resp.json();
            if (resp.ok) {
              engine.state.status = 'running';
              saveState(engine.state);
              window.location.href = '/dashboard';
            } else {
              const emailInput = document.getElementById('email');
              const passInput = document.getElementById('password');
              const form = document.querySelector('form');
              if (emailInput && passInput && form) {
                engine.showHighlight('#email');
                engine.moveCursorToSelector('#email', 50, 20);
                const email = DEMO_EMAIL;
                for (let i = 0; i < email.length; i++) {
                  emailInput.value += email[i];
                  emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                  await new Promise(r => setTimeout(r, 40));
                }
                await new Promise(r => setTimeout(r, 400));
                engine.moveCursorToSelector('#password', 50, 20);
                await new Promise(r => setTimeout(r, 300));
                const pass = DEMO_PASSWORD;
                for (let i = 0; i < pass.length; i++) {
                  passInput.value += pass[i];
                  passInput.dispatchEvent(new Event('input', { bubbles: true }));
                  await new Promise(r => setTimeout(r, 30));
                }
                await new Promise(r => setTimeout(r, 300));
                engine.hideHighlight();
                engine.showCaptions(['Authenticating with demo account...', 'Loading your personalized dashboard.'], stepNum);
                engine.moveCursorToSelector('button[type="submit"]');
                await new Promise(r => setTimeout(r, 500));
                engine.clickCursor();
                await new Promise(r => setTimeout(r, 300));
                form.dispatchEvent(new Event('submit'));
                setTimeout(() => { done(); }, 1500);
              } else { done(); }
            }
          }},
        ],
        'dashboard-kpis': [
          { type: 'wait', ms: 1500 },
          { type: 'caption', lines: ['The Global Command Center — your unified view across all five facilities.', 'Real-time KPIs, agent activity, mission queue, and AI insights in one place.'], stepNum, duration: 3000 },
          { type: 'custom', fn: (engine, done) => {
            const kpiEls = document.querySelectorAll('[data-kpi-route]');
            if (kpiEls.length > 0) {
              let i = 0;
              const kpiList = Array.from(kpiEls).slice(0, 6);
              const highlightNext = () => {
                if (i >= kpiList.length) { engine.hideHighlight(); done(); return; }
                const kpi = kpiList[i];
                const label = kpi.querySelector('.kpi-label, .text-muted')?.textContent || '';
                const value = kpi.querySelector('.kpi-value, .text-3xl, .text-2xl')?.textContent || '';
                engine.showHighlight(kpi, 8);
                if (label) {
                  engine.showCaptions([`${label}: ${value}`, 'Real-time KPI from live plant data.'], stepNum);
                }
                setTimeout(() => { i++; highlightNext(); }, 1500);
              };
              highlightNext();
            } else {
              engine.showCaptions(['Plant health, machine count, running machines, alerts, failures, and more.', 'Every widget is populated with live seeded data.'], stepNum);
              setTimeout(done, 3000);
            }
          }},
          { type: 'highlight', selector: '#ym-plant-preview, [data-plant-preview], .plant-health-grid', padding: 12, stepNum, duration: 2500 },
          { type: 'wait', ms: 300 },
          { type: 'highlight', selector: '#ym-agent-activity, [data-agent-activity], .agent-activity-panel', padding: 12, caption: '5 AI agents active — Diagnostic, Planner, Sentinel, and more working in real time.', stepNum, duration: 2500 },
        ],
        'sidebar-intro': [
          { type: 'caption', lines: ['The navigation rail provides quick access to every module.', 'Operations, Intelligence, and System sections organize the full platform.'], stepNum, duration: 3000 },
          { type: 'custom', fn: (engine, done) => {
            const links = document.querySelectorAll('.ym-nav-link');
            if (links.length > 0) {
              let i = 0;
              const highlightNext = () => {
                if (i >= links.length || i >= 10) { engine.hideHighlight(); done(); return; }
                const link = links[i];
                const tooltip = link.querySelector('.ym-nav-tooltip');
                const label = tooltip ? tooltip.textContent.trim() : link.getAttribute('href') || '';
                engine.showHighlight(link, 8);
                engine.moveCursorToSelector(link);
                if (label) {
                  engine.showCaptions([label.replace(/\s*⌘.*/, '') + ' — click to navigate.'], stepNum);
                }
                setTimeout(() => { i++; highlightNext(); }, 900);
              };
              highlightNext();
            } else { done(); }
          }},
        ],
        'search-demo': [
          { type: 'wait', ms: 1000 },
          { type: 'caption', lines: ['Semantic search allows you to find anything across the platform.', 'Try searching for a specific machine or issue.'], stepNum, duration: 2000 },
          { type: 'custom', fn: (engine, done) => {
            const searchInput = document.querySelector('#ym-dashboard-search, input[type="search"], .ym-standard-search input');
            if (searchInput) {
              engine.showHighlight(searchInput, 8);
              engine.moveCursorToSelector(searchInput, 50, 15);
              setTimeout(() => {
                engine.clickCursor();
                setTimeout(() => {
                  searchInput.focus();
                  const text = 'Bearing failure on CNC-101';
                  let i = 0;
                  const t = setInterval(() => {
                    if (i < text.length) {
                      searchInput.value += text[i];
                      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                      i++;
                    } else {
                      clearInterval(t);
                      engine.hideHighlight();
                      engine.showCaptions(['Searching across plants, machines, work orders, and documents using semantic understanding.', 'Results include relevant machines, past work orders, and AI analysis.'], stepNum);
                      setTimeout(() => {
                        searchInput.value = '';
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                        done();
                      }, 3000);
                    }
                  }, 50);
                }, 300);
              }, 400);
            } else { done(); }
          }},
        ],
        'notifications': [
          { type: 'wait', ms: 800 },
          { type: 'caption', lines: ['The notification center keeps you informed of critical alerts, recommendations, and reminders.', 'AI-prioritized notifications ensure you never miss a critical event.'], stepNum, duration: 2500 },
          { type: 'custom', fn: (engine, done) => {
            const notifBtn = document.querySelector('[data-ym-notifications], .ym-standard-icon:has(.material-symbols-outlined:contains("notifications")), #ym-notifications');
            if (notifBtn) {
              engine.showHighlight(notifBtn);
              engine.moveCursorToSelector(notifBtn);
              setTimeout(() => {
                engine.clickCursor();
                setTimeout(() => {
                  engine.showCaptions(['Critical alerts, AI recommendations, and maintenance reminders.', 'Notifications are prioritized by urgency and impact.'], stepNum);
                  setTimeout(() => { done(); }, 3000);
                }, 500);
              }, 500);
            } else {
              const anyNotifIcon = Array.from(document.querySelectorAll('.material-symbols-outlined')).find(el => el.textContent.trim() === 'notifications');
              if (anyNotifIcon) {
                const btn = anyNotifIcon.closest('button') || anyNotifIcon.parentElement;
                engine.showHighlight(btn);
                engine.moveCursorToSelector(btn);
                setTimeout(() => {
                  engine.clickCursor();
                  setTimeout(() => { done(); }, 3000);
                }, 500);
              } else { done(); }
            }
          }},
        ],
        'ai-assistant': [
          { type: 'wait', ms: 1200 },
          { type: 'caption', lines: ['YantraNklan is the AI operations assistant.', 'It combines Hybrid RAG, Knowledge Graphs, and LLM reasoning to answer complex machine questions.'], stepNum, duration: 3500 },
          { type: 'custom', fn: (engine, done) => {
            const chatInput = document.querySelector('#ym-chat-input, .ai-console-input input, input[placeholder*="Ask"], textarea[placeholder*="Ask"]');
            if (chatInput) {
              engine.showHighlight(chatInput, 8);
              engine.moveCursorToSelector(chatInput, 50, 15);
              setTimeout(() => {
                engine.clickCursor();
                setTimeout(() => {
                  chatInput.focus();
                  const text = 'Why is CNC-101 overheating?';
                  let i = 0;
                  const t = setInterval(() => {
                    if (i < text.length) {
                      chatInput.value += text[i];
                      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                      i++;
                    } else {
                      clearInterval(t);
                      chatInput.dispatchEvent(new Event('change', { bubbles: true }));
                      engine.hideHighlight();
                      engine.showCaptions(['AI analyzes sensor data, maintenance history, and knowledge graphs to identify root cause.', 'The response includes retrieved manuals, similar incidents, and recommended actions.'], stepNum);
                      setTimeout(() => {
                        engine.showCaptions(['Hybrid RAG retrieves relevant documentation.', 'Knowledge Graph maps relationships between machine, sensor, and technician.', 'LLM generates a natural language explanation with citations.'], stepNum);
                        setTimeout(() => { done(); }, 5000);
                      }, 3000);
                    }
                  }, 50);
                }, 300);
              }, 400);
            } else {
              const navLink = document.querySelector('[href="/ai-console"]');
              if (navLink) {
                engine.showHighlight(navLink);
                engine.moveCursorToSelector(navLink);
                setTimeout(() => {
                  engine.clickCursor();
                  setTimeout(() => { window.location.href = '/ai-console'; }, 500);
                }, 500);
              } else { done(); }
            }
          }},
        ],
        'knowledge-graph': [
          { type: 'wait', ms: 1200 },
          { type: 'caption', lines: ['The plant network map shows all five facilities with real-time health status.', 'Each pin represents a connected industrial plant with live telemetry.'], stepNum, duration: 3000 },
          { type: 'highlight', selector: '.leaflet-marker-icon, .ym-map-marker, .map-container', stepNum, duration: 2500 },
          { type: 'caption', lines: ['Knowledge Graph nodes connect Machines, Sensors, Technicians, Maintenance events, Faults, and Documents.', 'Every relationship is mapped and queryable by AI agents.'], stepNum, duration: 3500 },
        ],
        'digital-twin': [
          { type: 'wait', ms: 1500 },
          { type: 'caption', lines: ['The 3D Digital Twin provides an immersive view of the factory floor.', 'Rotate, zoom, and inspect individual machines with live sensor data.'], stepNum, duration: 3500 },
          { type: 'highlight', selector: '#ym-twin-canvas, canvas, main', caption: 'Temperature, pressure, RPM, vibration, and health metrics are visualized in real time.', stepNum, duration: 3000 },
          { type: 'custom', fn: (engine, done) => {
            engine.showCaptions(['Hovering over a machine reveals live metrics.', 'Temperature: 78°C, Pressure: 4.2 bar, RPM: 1420, Vibration: 2.1 mm/s, Health: 92%.'], stepNum);
            setTimeout(done, 3000);
          }},
        ],
        'predictive-maintenance': [
          { type: 'wait', ms: 1200 },
          { type: 'caption', lines: ['Predictive Maintenance uses ML models to forecast remaining useful life and failure probability.', 'Risk scores and maintenance windows help prioritize interventions.'], stepNum, duration: 3500 },
          { type: 'highlight', selector: '.glass-panel, .ym-reliability-card, main, [data-reliability]', caption: 'Trend graphs animate to show predicted degradation and recommended action windows.', stepNum, duration: 3000 },
          { type: 'custom', fn: (engine, done) => {
            engine.showCaptions(['Remaining Useful Life: 47 days.', 'Failure Probability: 23%.', 'Risk Score: 7.4 / 10.', 'AI recommends proactive bearing replacement within 14 days.'], stepNum);
            setTimeout(done, 3500);
          }},
        ],
        'maintenance-planner': [
          { type: 'wait', ms: 1200 },
          { type: 'caption', lines: ['The Maintenance Planner organizes work by priority, location, and status.', 'AI recommends optimal scheduling based on risk scores and resource availability.'], stepNum, duration: 3500 },
          { type: 'highlight', selector: 'table, .ym-task-list, main, [data-maintenance]', caption: 'Each task includes AI recommendations for parts, labor, and estimated downtime.', stepNum, duration: 3000 },
          { type: 'custom', fn: (engine, done) => {
            engine.showCaptions(['Filters allow sorting by priority, location, task type, and status.', 'Opening a task reveals AI-generated recommendations for parts and labor.'], stepNum);
            setTimeout(done, 3000);
          }},
        ],
        'reports': [
          { type: 'wait', ms: 1000 },
          { type: 'caption', lines: ['Executive Reports provide AI-generated summaries of plant performance.', 'Export PDF reports with executive analysis, predictions, and recommendations.'], stepNum, duration: 3000 },
          { type: 'custom', fn: (engine, done) => {
            const generateBtn = Array.from(document.querySelectorAll('button')).find(b => /generate|report|export/i.test(b.textContent));
            if (generateBtn) {
              engine.showHighlight(generateBtn);
              engine.moveCursorToSelector(generateBtn);
              setTimeout(() => {
                engine.clickCursor();
                engine.showCaptions(['Generating executive report with AI analysis...', 'Report includes executive summary, AI analysis, predictions, and recommendations.'], stepNum);
                setTimeout(done, 3000);
              }, 500);
            } else {
              engine.showCaptions(['Executive Summary: All 5 plants operating within normal parameters.', 'AI Analysis: 3 machines require attention in the next 14 days.', 'Predictions: CNC-101 bearing failure probability increasing.'], stepNum);
              setTimeout(done, 3000);
            }
          }},
        ],
        'assets': [
          { type: 'wait', ms: 1200 },
          { type: 'caption', lines: ['The Asset Fleet page displays every machine across all facilities.', 'Health status, sensor coverage, maintenance history, and digital twin links.'], stepNum, duration: 3500 },
          { type: 'custom', fn: (engine, done) => {
            const assetCards = document.querySelectorAll('.ym-asset-card, [data-asset]');
            if (assetCards.length > 1) {
              engine.showHighlight(assetCards[0], 8);
              engine.showCaptions(['CNC-101: Bearing wear detected. Health: 72%. Last maintenance: 14 days ago.'], stepNum);
              setTimeout(() => {
                if (assetCards[1]) {
                  engine.showHighlight(assetCards[1], 8);
                  engine.showCaptions(['Robotic Welder-03: Normal operation. Health: 94%. No pending maintenance.'], stepNum);
                }
                setTimeout(done, 2500);
              }, 2500);
            } else {
              engine.showHighlight('main', 12);
              engine.showCaptions(['Every machine has specifications, history, maintenance records, manuals, and a digital twin link.'], stepNum);
              setTimeout(done, 2500);
            }
          }},
        ],
        'documents': [
          { type: 'wait', ms: 1200 },
          { type: 'caption', lines: ['The AI Console supports document upload for knowledge extraction.', 'PDFs, manuals, and spec sheets are automatically vectorized and indexed.'], stepNum, duration: 3500 },
          { type: 'custom', fn: (engine, done) => {
            engine.showCaptions(['Upload a PDF document — the system processes it automatically.', 'Vector embedding extracts key information into the knowledge base.', 'AI agents can then retrieve and reason over the document contents.'], stepNum);
            setTimeout(done, 4000);
          }},
        ],
        'ai-agents': [
          { type: 'wait', ms: 1200 },
          { type: 'caption', lines: ['Agent Mission Control displays all AI agents and their current tasks.', 'Planner, Maintenance, Root Cause, Document, and Analytics agents collaborate autonomously.'], stepNum, duration: 3500 },
          { type: 'custom', fn: (engine, done) => {
            const agentCards = document.querySelectorAll('.ym-agent-card, [data-agent]');
            if (agentCards.length > 0) {
              let i = 0;
              const agentNames = ['Planner Agent — Creates maintenance plans from AI recommendations.', 'Maintenance Agent — Tracks work orders and technician assignments.', 'Root Cause Agent — Analyzes sensor data to identify failure causes.', 'Document Agent — Indexes and retrieves technical documentation.', 'Analytics Agent — Generates performance reports and trend analysis.'];
              const highlightNext = () => {
                if (i >= agentCards.length || i >= agentNames.length) { engine.hideHighlight(); done(); return; }
                engine.showHighlight(agentCards[i], 8);
                engine.showCaptions([agentNames[i]], stepNum);
                setTimeout(() => { i++; highlightNext(); }, 2000);
              };
              highlightNext();
            } else {
              engine.showCaptions(['Planner, Maintenance, Root Cause, Document, and Analytics agents.', 'Each agent has specialized capabilities and communicates findings to operations.'], stepNum);
              setTimeout(done, 3000);
            }
          }},
        ],
        'workflow-viz': [
          { type: 'wait', ms: 800 },
          { type: 'custom', fn: (engine, done) => {
            const flowEl = document.querySelector('[data-workflow], .workflow-container, [data-flow]');
            if (flowEl) {
              const steps = flowEl.querySelectorAll('.workflow-step, [data-step]');
              if (steps.length > 0) {
                let i = 0;
                const flowLabels = ['Sensor — Raw telemetry from machines.', 'Preprocessing — Noise filtering and normalization.', 'Vector DB — Semantic embedding storage.', 'Knowledge Graph — Entity relationship mapping.', 'Hybrid RAG — Retrieval augmented generation.', 'LLM — Large language model reasoning.', 'Multi-Agent — Specialized agent collaboration.', 'Recommendations — Actionable insights.'];
                const highlightNext = () => {
                  if (i >= steps.length || i >= flowLabels.length) { engine.hideHighlight(); done(); return; }
                  engine.showHighlight(steps[i], 8);
                  engine.showCaptions([flowLabels[i]], stepNum);
                  setTimeout(() => { i++; highlightNext(); }, 1500);
                };
                highlightNext();
              } else { done(); }
            } else {
              engine.showCaptions(['Sensor → Preprocessing → Vector DB → Knowledge Graph → Hybrid RAG → LLM → Multi-Agent → Recommendations.', 'Every component lights up as data flows through the system.'], stepNum);
              setTimeout(done, 4000);
            }
          }},
        ],
        'analytics': [
          { type: 'wait', ms: 1000 },
          { type: 'caption', lines: ['Advanced analytics track downtime, energy consumption, MTBF, MTTR, and maintenance costs.', 'Trend charts help identify patterns and optimize operations.'], stepNum, duration: 3500 },
          { type: 'custom', fn: (engine, done) => {
            engine.showCaptions(['Downtime: 3.2% this month (↓ 0.8% vs last month).', 'Energy: 847 MWh consumed. MTBF: 1,247 hours. MTTR: 4.3 hours.', 'Maintenance Cost: ₹2.4L this quarter.', 'AI predicts 12% reduction in unplanned downtime next quarter.'], stepNum);
            setTimeout(done, 4000);
          }},
        ],
        'admin': [
          { type: 'wait', ms: 1200 },
          { type: 'caption', lines: ['The Admin panel manages users, roles, plants, permissions, and integrations.', 'Audit logs track every action across the platform for compliance.'], stepNum, duration: 3500 },
          { type: 'custom', fn: (engine, done) => {
            engine.showCaptions(['User management with role-based access control.', 'Integration management for Modbus, OPC-UA, SAP, and MQTT connectors.', 'Audit logs record all user actions for compliance and security.'], stepNum);
            setTimeout(done, 3000);
          }},
        ],
        'settings': [
          { type: 'wait', ms: 1000 },
          { type: 'caption', lines: ['Settings allow customization of theme, notifications, AI provider, language, and API keys.', 'Organization settings control team membership and billing.'], stepNum, duration: 3000 },
          { type: 'custom', fn: (engine, done) => {
            engine.showCaptions(['Theme: Dark/Light mode. Notifications: Priority filtering.', 'AI Provider: Groq, OpenAI, or local model selection.', 'API Keys: Manage integration tokens securely.'], stepNum);
            setTimeout(done, 2500);
          }},
        ],
        'mobile-preview': [
          { type: 'wait', ms: 800 },
          { type: 'caption', lines: ['YantraMitra is fully responsive across all device sizes.', 'Mobile, tablet, and desktop — the same powerful platform everywhere.'], stepNum, duration: 3000 },
          { type: 'custom', fn: (engine, done) => {
            const originalWidth = document.documentElement.style.width;
            document.body.style.transition = 'transform 0.8s ease';
            document.body.style.transformOrigin = 'top center';
            document.body.style.transform = 'scale(0.4)';
            document.body.style.maxWidth = '420px';
            document.body.style.margin = '0 auto';
            engine.showCaptions(['Responsive design ensures teams can access plant data from any device.', 'Field technicians, plant managers, and executives — all connected.'], stepNum);
            setTimeout(() => {
              document.body.style.transform = '';
              document.body.style.maxWidth = '';
              document.body.style.margin = '';
              setTimeout(done, 500);
            }, 3000);
          }},
        ],
        'end-summary': [
          { type: 'wait', ms: 500 },
          { type: 'custom', fn: (engine, done) => {
            engine.cleanupUI();
            engine.showEndSummary();
            done();
          }},
        ],
      };
      return steps[id] || [
        { type: 'caption', lines: ['Exploring ' + id.replace(/-/g, ' ') + '...'], stepNum, duration: 2000 },
      ];
    }

    /* ─── End Summary ─── */
    showEndSummary() {
      const existing = document.querySelector('.ym-demo-summary');
      if (existing) existing.remove();

      const features = [
        'Digital Twin', 'AI Assistant', 'Hybrid RAG',
        'Knowledge Graph', 'Multi-Agent AI', 'Predictive Maintenance',
        'Maintenance Planner', 'Executive Reports', 'Industrial Analytics'
      ];

      const el = document.createElement('div');
      el.className = 'ym-demo-summary';
      el.innerHTML = `
        <div class="summary-container">
          <div class="summary-badge">DEMO COMPLETE</div>
          <div class="summary-title">YantraMitra</div>
          <div class="summary-subtitle">Ask Your Machines Anything.</div>
          <div class="summary-features">${features.map(f => `<div class="summary-check"><span class="check-icon">✓</span><span class="check-label">${f}</span></div>`).join('')}</div>
          <div class="summary-message">Thank you for watching.</div>
          <div class="summary-buttons">
            <button class="summary-btn primary" data-replay><span class="material-symbols-outlined">replay</span> Replay Demo</button>
            <button class="summary-btn secondary" data-explore><span class="material-symbols-outlined">explore</span> Explore Yourself</button>
            <button class="summary-btn outline" data-contact><span class="material-symbols-outlined">mail</span> Contact Team</button>
          </div>
        </div>
      `;
      document.body.appendChild(el);

      requestAnimationFrame(() => {
        el.classList.add('visible');
        const checks = el.querySelectorAll('.summary-check');
        checks.forEach((c, i) => {
          setTimeout(() => c.classList.add('revealed'), i * 180 + 400);
        });
      });

      el.querySelector('[data-replay]')?.addEventListener('click', () => {
        el.classList.remove('visible');
        setTimeout(() => { el.remove(); this.restart(); }, 400);
      });
      el.querySelector('[data-explore]')?.addEventListener('click', () => {
        el.classList.remove('visible');
        setTimeout(() => { el.remove(); }, 400);
      });
      el.querySelector('[data-contact]')?.addEventListener('click', () => {
        el.classList.remove('visible');
        setTimeout(() => { el.remove(); window.location.href = '/contact'; }, 300);
      });
    }

    /* ─── Cleanup ─── */
    cleanupUI() {
      document.querySelectorAll('.ym-demo-overlay, .ym-demo-cursor, .ym-demo-loading, .ym-demo-summary').forEach(el => el.remove());
      this.overlayEl = null;
      this.controlsEl = null;
      this.captionEl = null;
      this.cursorEl = null;
      this.highlightEl = null;
      this.scrimEl = null;
      if (this.autoAdvanceTimer) {
        clearTimeout(this.autoAdvanceTimer);
        this.autoAdvanceTimer = null;
      }
      if (this.captionInterval) {
        clearTimeout(this.captionInterval);
        this.captionInterval = null;
      }
    }
  }

  /* ─── Global API ─── */
  window.YMDemo = {
    start() {
      if (!engine) engine = new DemoEngine();
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
      engine = new DemoEngine();
      engine.init();
    },
    isActive() {
      const state = getState();
      return !!(state && state.active && isDemoSessionFresh(state));
    },
    getState() {
      return getState();
    },
    getStatus() {
      const state = getState();
      if (!state) return 'idle';
      return state.paused ? 'paused' : state.status;
    }
  };

  /* ─── Auto-init on page load ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (YMDemo.isActive()) {
        YMDemo.init();
      }
    });
  } else {
    if (YMDemo.isActive()) {
      YMDemo.init();
    }
  }

  /* ─── Keyboard shortcuts ─── */
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.target?.closest('input, textarea, [contenteditable]')) return;
    if (!YMDemo.isActive()) return;
    if (e.key === 'Escape') { e.preventDefault(); YMDemo.exit(); }
    if (e.key === ' ') { e.preventDefault(); YMDemo.getStatus() === 'paused' ? YMDemo.resume() : YMDemo.pause(); }
    if (e.key === 's' || e.key === 'S') { e.preventDefault(); YMDemo.skip(); }
  });

})();
