(function() {
  const API_STREAM = '/api/ai-chat/stream';
  const API_UPLOAD = '/api/ai-upload';
  const CHAT_HISTORY_KEY = 'ym_cc_chat_history';
  const CHAT_CONTEXT_KEY = 'ym_cc_chat_context';

  let streaming = false, abortController = null;
  let conversationId = 'command_center_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let chatHistory = [];
  let fileAttachments = [];
  let documentContexts = [];
  let currentMissions = [], currentAgents = [];

  function toast(msg, type) {
    const c = document.getElementById('ym-toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'rounded-full border px-5 py-3 text-sm font-bold shadow-xl pointer-events-auto transition-opacity duration-300 ' + (type === 'error' ? 'border-error/20 bg-error/95 text-white' : 'border-primary/20 bg-white/95 text-primary');
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2600);
  }

  function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  function markdownToHtml(text) {
    if (!text) return '<p class="my-1" style="font-size:16px;line-height:1.7"></p>';
    let html = escapeHtml(text);
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-surface-container rounded-lg p-4 my-3 overflow-x-auto border border-outline-variant/20" style="font-size:14px;line-height:1.6"><code>$2</code></pre>');
    html = html.replace(/### (.+)/g, '<h3 class="font-bold mt-4 mb-2 text-on-surface" style="font-size:18px">$1</h3>');
    html = html.replace(/## (.+)/g, '<h2 class="font-bold mt-4 mb-2 text-on-surface" style="font-size:20px">$1</h2>');
    html = html.replace(/# (.+)/g, '<h1 class="font-bold mt-4 mb-2 text-on-surface" style="font-size:22px">$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code class="bg-surface-container px-1.5 rounded" style="font-size:16px">$1</code>');
    html = html.replace(/^- (.+)/gm, '<li class="ml-5 list-disc text-on-surface" style="font-size:16px;line-height:1.7;margin-bottom:4px">$1</li>');
    html = html.replace(/^\d+\. (.+)/gm, '<li class="ml-5 list-decimal text-on-surface" style="font-size:16px;line-height:1.7;margin-bottom:4px">$1</li>');
    html = html.replace(/\[([^\]]+)\]\((\/[^\)]+)\)/g, '<a href="$2" class="text-primary font-semibold underline underline-offset-2 hover:text-primary/80 transition-colors" style="font-size:16px">$1</a>');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary font-semibold underline underline-offset-2" style="font-size:16px">$1</a>');
    html = html.replace(/\n{2,}/g, '</p><p class="my-1.5" style="font-size:16px;line-height:1.7">');
    html = html.replace(/\n/g, '<br/>');
    html = '<p class="my-1.5" style="font-size:16px;line-height:1.7">' + html + '</p>';
    html = html.replace(/<p class="my-1\.5" style="font-size:16px;line-height:1\.7"><\/p>/g, '');
    return html;
  }

  function buildMissionContext() {
    if (!currentMissions.length) return '';
    const parts = [];
    parts.push(`COMMAND CENTER MISSION CONTEXT (${currentMissions.length} total):`);
    const byStatus = {};
    currentMissions.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
    parts.push(`Status breakdown: ${Object.entries(byStatus).map(([s, c]) => `${s}: ${c}`).join(', ')}`);
    const overdue = currentMissions.filter(o => o.status !== 'done' && o.dueDate && new Date(o.dueDate) < new Date());
    if (overdue.length) parts.push(`Overdue: ${overdue.length} missions`);
    const critical = currentMissions.filter(o => o.priority === 'critical');
    if (critical.length) parts.push(`Critical priority: ${critical.length} missions`);
    const agents = [...new Set(currentMissions.map(o => o.assignedTo).filter(Boolean))];
    if (agents.length) parts.push(`Assigned agents: ${agents.join(', ')}`);
    parts.push('\nRecent/Key Missions:');
    currentMissions.slice(0, 10).forEach(o => {
      const machine = currentAgents.find(m => m.id === o.assignedAgentId);
      const plant = o.plant || (machine?.plant || 'Unknown');
      parts.push(`- #${String(o.id).substring(0,8)} | ${o.mission || o.name} | ${o.status?.toUpperCase()} | ${o.priority?.toUpperCase()} | ${o.assignedTo || 'Unassigned'} | Due: ${o.dueDate ? new Date(o.dueDate).toLocaleDateString() : '—'} | Plant: ${plant}`);
    });
    return parts.join('\n');
  }

  function addMessage(text, isUser, opts) {
    const container = document.getElementById('ym-chat-messages');
    if (!container) return;
    opts = opts || {};
    const wrapper = document.createElement('div');
    wrapper.className = 'flex ' + (isUser ? 'justify-end' : 'justify-start') + ' mb-4 msg-enter';
    wrapper.dataset.msgId = opts.id || Date.now().toString(36);

    if (isUser) {
      const bubble = document.createElement('div');
      bubble.className = 'max-w-[80%] glass-panel rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm bg-primary/5 border border-primary/10';
      bubble.innerHTML = '<p class="text-on-surface" style="font-size:16px;line-height:1.6">' + escapeHtml(text) + '</p>';
      wrapper.appendChild(bubble);
    } else {
      const bubble = document.createElement('div');
      bubble.className = 'max-w-[90%] flex gap-2.5';
      const avatar = document.createElement('img');
      avatar.src = '/assets/images/yantranklan-avatar-ai.jpg';
      avatar.className = 'w-10 h-10 rounded-full mt-0.5 shrink-0 border-2 border-secondary/30 self-start';
      const contentDiv = document.createElement('div');
      contentDiv.className = 'glass-panel rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm border-l-4 border-l-secondary flex-1 min-w-0';
      const header = document.createElement('div');
      header.className = 'flex items-center gap-2 mb-1 flex-wrap';
      header.innerHTML = '<span class="font-kpi-numeric text-secondary" style="font-size:14px">YantraNklan</span>';
      if (opts.model) header.innerHTML += '<span class="text-on-surface-variant bg-secondary/10 px-1.5 py-0.5 rounded font-medium" style="font-size:10px">' + escapeHtml(opts.model) + '</span>';
      contentDiv.appendChild(header);
      const textEl = document.createElement('div');
      textEl.className = 'text-on-surface ai-response';
      textEl.style.cssText = 'font-size:16px;line-height:1.6';
      textEl.innerHTML = opts.streaming ? '' : markdownToHtml(text);
      contentDiv.appendChild(textEl);
      if (!opts.streaming) {
        const actions = document.createElement('div');
        actions.className = 'flex items-center gap-1 mt-1.5 pt-1.5 border-t border-outline-variant/10';
        actions.innerHTML = '<button class="ym-action-btn text-on-surface-variant/50 hover:text-primary transition-colors p-1" data-action="copy" title="Copy"><span class="material-symbols-outlined" style="font-size:18px">content_copy</span></button><button class="ym-action-btn text-on-surface-variant/50 hover:text-primary transition-colors p-1" data-action="regenerate" title="Regenerate"><span class="material-symbols-outlined" style="font-size:18px">refresh</span></button>';
        actions.querySelector('[data-action="copy"]').addEventListener('click', function() {
          navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard'));
        });
        actions.querySelector('[data-action="regenerate"]').addEventListener('click', function() {
          const prevMsg = wrapper.previousElementSibling;
          if (prevMsg && prevMsg.dataset.msgId) {
            const userMsgEl = container.querySelector('[data-msgId="' + prevMsg.dataset.msgId + '"]');
            if (userMsgEl) {
              const userText = userMsgEl.textContent;
              wrapper.remove();
              sendMessage(userText, true);
            }
          }
        });
        contentDiv.appendChild(actions);
      }
      bubble.appendChild(avatar);
      bubble.appendChild(contentDiv);
      wrapper.appendChild(bubble);
    }
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
    return wrapper;
  }

  function addTypingIndicator() {
    removeTypingIndicator();
    const container = document.getElementById('ym-chat-messages');
    if (!container) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'flex justify-start mb-4 msg-enter';
    wrapper.id = 'typing-indicator';
    wrapper.innerHTML = '<div class="flex gap-2.5"><img src="/assets/images/yantranklan-avatar-ai.jpg" class="w-10 h-10 rounded-full mt-0.5 shrink-0 border-2 border-secondary/30 self-start"/><div class="glass-panel rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border-l-4 border-l-secondary"><div class="flex gap-1.5 items-center"><span class="w-2.5 h-2.5 bg-secondary rounded-full animate-bounce-dot" style="animation-delay:0s"></span><span class="w-2.5 h-2.5 bg-secondary rounded-full animate-bounce-dot" style="animation-delay:0.16s"></span><span class="w-2.5 h-2.5 bg-secondary rounded-full animate-bounce-dot" style="animation-delay:0.32s"></span></div></div></div>';
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
  }

  function removeTypingIndicator() { const el = document.getElementById('typing-indicator'); if (el) el.remove(); }

  function setLoading(loading) {
    const input = document.getElementById('ym-chat-input');
    const sendBtn = document.getElementById('ym-chat-send-btn');
    const cancelBtn = document.getElementById('ym-chat-cancel-btn');
    const micBtn = document.getElementById('ym-chat-mic-btn');
    if (loading) {
      if (input) input.disabled = true;
      if (sendBtn) { sendBtn.disabled = true; sendBtn.classList.add('hidden'); }
      if (cancelBtn) cancelBtn.classList.remove('hidden');
      if (micBtn) micBtn.style.display = 'none';
      addTypingIndicator();
    } else {
      if (input) input.disabled = false;
      if (sendBtn) { sendBtn.classList.remove('hidden'); updateSendBtn(); }
      if (cancelBtn) cancelBtn.classList.add('hidden');
      if (micBtn) micBtn.style.removeProperty('display');
      removeTypingIndicator();
    }
    streaming = loading;
  }

  async function sendMessage(message, isRegen) {
    if (!message.trim() || streaming) return;

    addMessage(message, true);
    chatHistory.push({ role: 'user', content: message });
    saveHistory();
    setLoading(true);

    const context = buildMissionContext();

    try {
      abortController = new AbortController();
      const response = await fetch(API_STREAM, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId,
          history: chatHistory.slice(-10),
          attachmentContext: context + (documentContexts.length > 0 ? '\n\n' + documentContexts.map(d => d.text).join('\n\n') : ''),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) throw new Error(await response.text());

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let firstChunk = true;
      let assistantWrapper = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                if (firstChunk) {
                  assistantWrapper = addMessage('', false, { streaming: true, model: parsed.model });
                  firstChunk = false;
                }
                if (assistantWrapper) {
                  const textEl = assistantWrapper.querySelector('.ai-response');
                  if (textEl) textEl.innerHTML = markdownToHtml(fullResponse);
                  document.getElementById('ym-chat-messages').scrollTop = document.getElementById('ym-chat-messages').scrollHeight;
                }
              }
            } catch {}
          }
        }
      }

      if (assistantWrapper) {
        const textEl = assistantWrapper.querySelector('.ai-response');
        if (textEl) {
          textEl.innerHTML = markdownToHtml(fullResponse);
          const actions = document.createElement('div');
          actions.className = 'flex items-center gap-1 mt-1.5 pt-1.5 border-t border-outline-variant/10';
          actions.innerHTML = '<button class="ym-action-btn text-on-surface-variant/50 hover:text-primary transition-colors p-1" data-action="copy" title="Copy"><span class="material-symbols-outlined" style="font-size:18px">content_copy</span></button><button class="ym-action-btn text-on-surface-variant/50 hover:text-primary transition-colors p-1" data-action="regenerate" title="Regenerate"><span class="material-symbols-outlined" style="font-size:18px">refresh</span></button>';
          actions.querySelector('[data-action="copy"]').addEventListener('click', function() {
            navigator.clipboard.writeText(fullResponse).then(() => toast('Copied to clipboard'));
          });
          actions.querySelector('[data-action="regenerate"]').addEventListener('click', function() {
            const prevMsg = assistantWrapper.previousElementSibling;
            if (prevMsg && prevMsg.dataset.msgId) {
              const userMsgEl = document.getElementById('ym-chat-messages').querySelector('[data-msgId="' + prevMsg.dataset.msgId + '"]');
              if (userMsgEl) {
                const userText = userMsgEl.textContent;
                assistantWrapper.remove();
                sendMessage(userText, true);
              }
            }
          });
          const contentDiv = assistantWrapper.querySelector('.glass-panel') || assistantWrapper.querySelector('[class*="rounded-2xl"]');
          if (contentDiv) contentDiv.appendChild(actions);
        }
      }

      chatHistory.push({ role: 'assistant', content: fullResponse });
      saveHistory();

    } catch (e) {
      if (e.name !== 'AbortError') {
        removeTypingIndicator();
        addMessage('Sorry, I encountered an error. Please try again.', false);
        toast('Failed to get AI response', 'error');
      }
    } finally {
      fileAttachments = [];
      documentContexts = [];
      updateFilePreview();
      setLoading(false);
    }
  }

  function setupSuggestedPrompts() {
    const container = document.getElementById('ym-suggested-pills');
    if (!container) return;
    const prompts = [
      'Show overdue missions',
      'Find critical priority missions',
      'Create mission for pump P-102',
      'Assign agent to mission #abc123',
      'Summarize pending work',
      'Filter by Pune plant'
    ];
    container.innerHTML = prompts.map(p => '<button class="ym-pill shrink-0 glass-panel rounded-full text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all border border-outline-variant/30 whitespace-nowrap" style="padding:6px 14px;font-size:12px;font-weight:700;letter-spacing:0.03em">' + escapeHtml(p) + '</button>').join('');
    container.addEventListener('click', function(e) {
      const btn = e.target.closest('.ym-pill');
      if (!btn) return;
      const input = document.getElementById('ym-chat-input');
      if (input) { input.value = btn.textContent.trim(); updateSendBtn(); input.focus(); }
    });
  }

  function updateSendBtn() {
    const input = document.getElementById('ym-chat-input');
    const btn = document.getElementById('ym-chat-send-btn');
    if (!input || !btn) return;
    btn.disabled = !input.value.trim() || streaming;
  }

  function saveHistory() {
    try { localStorage.setItem(CHAT_HISTORY_KEY + '_' + conversationId, JSON.stringify(chatHistory.slice(-50))); } catch {}
  }

  function loadHistory() {
    try { const saved = localStorage.getItem(CHAT_HISTORY_KEY + '_' + conversationId); if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed)) { chatHistory = parsed; return true; } } } catch {}
    return false;
  }

  function restoreMessages() {
    const container = document.getElementById('ym-chat-messages');
    if (!container) return;
    container.innerHTML = '';
    for (const msg of chatHistory) {
      if (msg.role === 'user') addMessage(msg.content, true, { id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 4) });
      else if (msg.role === 'assistant') addMessage(msg.content, false, { id: 'ai_' + Date.now() + '_' + Math.random().toString(36).slice(2, 4), model: 'llama-3.3-70b-versatile' });
    }
    if (!chatHistory.length) showWelcome();
  }

  function showWelcome() {
    const container = document.getElementById('ym-chat-messages');
    if (!container) return;
    container.innerHTML = '';
    addMessage("Hello! I'm **YantraNklan**, your YantraMitra AI operations copilot. I have full context of all current missions including statuses, priorities, assignments, and due dates.\n\nI can help you:\n- **Find** missions by status, priority, plant, or agent\n- **Create** new missions with proper details\n- **Update** status, priority, or assignments\n- **Filter** and summarize pending work\n- **Analyze** overdue or critical missions\n\nWhat would you like to do?", false, { model: 'connected' });
  }

  function setupFileUpload() {
    const attachBtn = document.getElementById('ym-chat-attach-btn');
    const fileInput = document.getElementById('ym-chat-file-input');
    const preview = document.getElementById('ym-chat-file-preview');
    if (!attachBtn || !fileInput || !preview) return;

    attachBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      const files = Array.from(fileInput.files);
      fileInput.value = '';
      for (const file of files) {
        if (fileAttachments.length >= 5) { toast('Maximum 5 files allowed'); break; }
        try {
          const formData = new FormData();
          formData.append('files', file);
          const res = await fetch(API_UPLOAD, { method: 'POST', credentials: 'same-origin', body: formData });
          const data = await res.json();
          if (data.files?.[0]) {
            fileAttachments.push({ name: file.name, type: file.type, text: data.files[0].text, size: file.size });
          }
        } catch { toast('Failed to upload ' + file.name, 'error'); }
      }
      updateFilePreview();
    });
  }

  function updateFilePreview() {
    const preview = document.getElementById('ym-chat-file-preview');
    if (!preview) return;
    if (fileAttachments.length === 0) { preview.innerHTML = ''; preview.classList.add('hidden'); return; }
    preview.classList.remove('hidden');
    preview.innerHTML = fileAttachments.map((f, i) => '<span class="glass-panel rounded-full px-2.5 py-0.5 text-xs flex items-center gap-1 text-on-surface-variant"><span>' + escapeHtml(f.name) + '</span><button type="button" data-idx="' + i + '" class="ml-1 hover:text-error transition-colors material-symbols-outlined" style="font-size:16px">close</button></span>').join('');
    preview.querySelectorAll('button[data-idx]').forEach(btn => {
      btn.addEventListener('click', () => { fileAttachments.splice(Number(btn.dataset.idx), 1); updateFilePreview(); });
    });
  }

  function setupMic() {
    const micBtn = document.getElementById('ym-chat-mic-btn');
    if (!micBtn) return;
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { micBtn.style.display = 'none'; return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let micActive = false;

    recognition.onresult = (e) => {
      const input = document.getElementById('ym-chat-input');
      if (!input) return;
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      input.value = transcript;
      updateSendBtn();
    };

    recognition.onend = () => {
      micActive = false;
      micBtn.classList.remove('ym-mic-active');
      micBtn.textContent = 'mic';
    };

    micBtn.addEventListener('click', function() {
      if (micActive) { recognition.stop(); return; }
      try { recognition.start(); } catch (e) { if (e.name === 'InvalidStateError') { recognition.stop(); setTimeout(() => recognition.start(), 200); } }
    });
  }

  function setupCancel() {
    document.getElementById('ym-chat-cancel-btn')?.addEventListener('click', function() {
      if (abortController) abortController.abort();
    });
  }

  async function checkAuth() {
    try { const r = await fetch('/api/auth/me', { credentials: 'same-origin' }); if (!r.ok) { window.location.href = '/'; return null; } const me = await r.json(); if (!me || !me.id) { window.location.href = '/'; return null; } return me; }
    catch { window.location.href = '/'; return null; }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;

    // Load missions/agents for context
    try {
      const [missionsRes, agentsRes] = await Promise.all([
        fetch('/api/missions', { credentials: 'same-origin' }).then(r => r.json()),
        fetch('/api/agents', { credentials: 'same-origin' }).then(r => r.json())
      ]);
      currentMissions = missionsRes || [];
      currentAgents = agentsRes || [];
    } catch {}

    const panel = document.getElementById('ym-chat-panel');
    const toggle = document.getElementById('ym-chat-toggle');
    const closeBtn = document.getElementById('ym-chat-close');
    const input = document.getElementById('ym-chat-input');
    const sendBtn = document.getElementById('ym-chat-send-btn');

    if (!loadHistory()) showWelcome();
    else restoreMessages();

    setupSuggestedPrompts();
    setupFileUpload();
    setupMic();
    setupCancel();

    input?.addEventListener('input', updateSendBtn);
    input?.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const msg = this.value.trim();
        if (msg && !streaming) { this.value = ''; updateSendBtn(); sendMessage(msg); }
      }
    });

    sendBtn?.addEventListener('click', function() {
      const msg = input?.value.trim();
      if (msg && !streaming) { if (input) input.value = ''; updateSendBtn(); sendMessage(msg); }
    });

    toggle?.addEventListener('click', () => {
      panel.classList.remove('hidden');
      toggle.style.display = 'none';
      setTimeout(() => input?.focus(), 100);
    });

    closeBtn?.addEventListener('click', () => {
      panel.classList.add('hidden');
      toggle.style.display = 'flex';
    });

    updateSendBtn();
  });
})();