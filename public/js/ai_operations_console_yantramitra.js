(function() {
  const API_URL = '/api/ai-chat';
  let user = null;

  async function checkAuth() {
    try {
      const r = await fetch('/api/auth/me');
      if (!r.ok) { window.location.href = '/login'; return null; }
      const me = await r.json();
      if (!me || !me.id) { window.location.href = '/login'; return null; }
      return me;
    } catch { window.location.href = '/login'; return null; }
  }

  async function sendMessage(message) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ message })
    });
    return response.json();
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function markdownToHtml(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-surface-container rounded-lg p-3 text-xs font-mono my-2 overflow-x-auto border border-outline-variant/20"><code>$2</code></pre>');
    html = html.replace(/### (.+)/g, '<h3 class="font-bold text-sm mt-3 mb-1">$1</h3>');
    html = html.replace(/## (.+)/g, '<h2 class="font-bold text-base mt-3 mb-1">$1</h2>');
    html = html.replace(/# (.+)/g, '<h1 class="font-bold text-lg mt-3 mb-1">$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/^- (.+)/gm, '<li class="ml-4 list-disc text-sm">$1</li>');
    html = html.replace(/^\d+\. (.+)/gm, '<li class="ml-4 list-decimal text-sm">$1</li>');
    html = html.replace(/\|(.+)\|/g, function(match) {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c.trim()))) return '';
      return '<span class="inline-block px-2 py-0.5">' + cells.join('</span><span class="inline-block px-2 py-0.5">') + '</span>';
    });
    html = html.replace(/\n{2,}/g, '</p><p class="my-2">');
    html = html.replace(/\n/g, '<br/>');
    html = '<p class="my-2">' + html + '</p>';
    html = html.replace(/<p class="my-2"><\/p>/g, '');
    return html;
  }

  function addMessage(text, isUser, extra) {
    const chatStream = document.querySelector('.chat-scroll');
    if (!chatStream) return;

    const wrapper = document.createElement('div');
    wrapper.className = isUser ? 'flex justify-end mb-3' : 'flex justify-start mb-3';

    if (isUser) {
      const bubble = document.createElement('div');
      bubble.className = 'max-w-[80%] glass-panel rounded-2xl rounded-tr-none px-md py-sm shadow-sm bg-primary/5 border border-primary/10';
      bubble.innerHTML = '<p class="text-on-surface text-body-md">' + escapeHtml(text) + '</p>';
      wrapper.appendChild(bubble);
    } else {
      const bubble = document.createElement('div');
      bubble.className = 'max-w-[95%] flex gap-sm';

      const avatarEl = document.createElement('img');
      avatarEl.src = '/images/yantranklan-avatar-ai.jpg';
      avatarEl.alt = 'YantraNklan';
      avatarEl.className = 'w-10 h-10 rounded-full mt-1 shrink-0 border-2 border-secondary/30 self-start';

      const contentDiv = document.createElement('div');
      contentDiv.className = 'glass-panel rounded-2xl rounded-tl-none px-md py-sm shadow-sm border-l-4 border-l-secondary flex-1';

      const nameEl = document.createElement('div');
      nameEl.className = 'font-kpi-numeric text-kpi-numeric text-secondary mb-xs flex items-center gap-xs';
      nameEl.innerHTML = 'YantraNklan' + (extra?.model ? ' <span class="text-[10px] text-on-surface-variant font-normal px-2 py-0.5 rounded bg-secondary/10">' + extra.model + '</span>' : '') + (extra?.warning ? ' <span class="text-[10px] text-tertiary font-normal">⚠️ ' + escapeHtml(extra.warning) + '</span>' : '');
      contentDiv.appendChild(nameEl);

      const textEl = document.createElement('div');
      textEl.className = 'text-on-surface text-body-md leading-relaxed ai-response';
      textEl.innerHTML = markdownToHtml(text);
      contentDiv.appendChild(textEl);

      if (extra?.charts) {
        const chartDiv = document.createElement('div');
        chartDiv.className = 'mt-2 grid grid-cols-2 gap-2';
        chartDiv.innerHTML = extra.charts;
        contentDiv.appendChild(chartDiv);
      }

      if (extra?.tables) {
        const tableDiv = document.createElement('div');
        tableDiv.className = 'mt-2 overflow-x-auto';
        tableDiv.innerHTML = extra.tables;
        contentDiv.appendChild(tableDiv);
      }

      bubble.appendChild(avatarEl);
      bubble.appendChild(contentDiv);
      wrapper.appendChild(bubble);
    }

    chatStream.appendChild(wrapper);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  function addTypingIndicator() {
    const chatStream = document.querySelector('.chat-scroll');
    if (!chatStream) return;
    const existing = document.getElementById('typing-indicator');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'flex justify-start mb-3';
    wrapper.id = 'typing-indicator';

    const bubble = document.createElement('div');
    bubble.className = 'max-w-[95%] flex gap-sm';

    const avatarEl = document.createElement('img');
    avatarEl.src = '/images/yantranklan-avatar-ai.jpg';
    avatarEl.alt = 'YantraNklan';
    avatarEl.className = 'w-10 h-10 rounded-full mt-1 shrink-0 border-2 border-secondary/30 self-start';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'glass-panel rounded-2xl rounded-tl-none px-md py-sm shadow-sm border-l-4 border-l-secondary';

    const dots = document.createElement('div');
    dots.className = 'flex gap-1 items-center py-2 px-1';
    dots.innerHTML = '<span class="w-2 h-2 bg-secondary rounded-full animate-bounce" style="animation-delay:0s"></span><span class="w-2 h-2 bg-secondary rounded-full animate-bounce" style="animation-delay:0.15s"></span><span class="w-2 h-2 bg-secondary rounded-full animate-bounce" style="animation-delay:0.3s"></span>';
    contentDiv.appendChild(dots);

    bubble.appendChild(avatarEl);
    bubble.appendChild(contentDiv);
    wrapper.appendChild(bubble);
    chatStream.appendChild(wrapper);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  async function handleSend(message) {
    if (!message.trim()) return;
    addMessage(message, true);
    const input = document.querySelector('main input[type="text"], .chat-scroll ~ section input[type="text"]');
    if (input) input.value = '';
    addTypingIndicator();

    try {
      const data = await sendMessage(message);
      removeTypingIndicator();
      if (data.error === 'api_key_missing') {
        addMessage('I need an OpenAI API key to provide intelligent responses. Currently answering from database context. ' + (data.message || ''), false, { model: 'db-fallback' });
      } else if (data.error === 'api_quota_exceeded' || data.warning?.includes('quota')) {
        addMessage(data.reply || 'I encountered a quota limitation. Here is what I know from the database:', false, { model: 'db-fallback', warning: 'API quota limited - using database context' });
      } else if (data.error) {
        addMessage('I encountered an error. ' + (data.detail || data.message || data.error), false, { model: 'error' });
      } else {
        addMessage(data.reply, false, { model: data.model || 'gpt-4o-mini', warning: data.warning });
      }
    } catch (err) {
      removeTypingIndicator();
      addMessage('Connection error. Please check your network and try again.', false, { model: 'error' });
    }
  }

  function addWelcomeMessage() {
    const chatStream = document.querySelector('.chat-scroll');
    if (chatStream) chatStream.innerHTML = '';
    const context = new URLSearchParams(window.location.search).get('context');
    const welcome = context
      ? `Hello! I'm YantraNklan. I see you came from the Digital Twin with context for **${context}**. I have full access to your plant's real-time operational data including:

• **${plantsCount || 5}** plants with facility hierarchy
• Machine health, OEE, and sensor readings
• Active alarms and work orders
• Maintenance history and digital twin state
• Production KPIs and energy metrics

Ask me to:
- Investigate a specific machine or alarm
- Predict failures or generate maintenance plans
- Compare plant performance
- Optimize energy usage or production
- Generate executive reports

How can I help with ${context}?`
      : "Hello! I'm **YantraNklan**, your operations AI assistant. I have access to your plant's real-time data including machines, alarms, work orders, and more.\n\nI can help you with:\n- **Investigate** why a machine is overheating or faulting\n- **Predict** the next bearing failure or maintenance need\n- **Compare** OEE and performance across plants\n- **Generate** maintenance plans and executive reports\n- **Optimize** energy usage and production throughput\n\nWhat would you like to explore?";
    addMessage(welcome, false, { model: 'connected' });
  }

  let plantsCount = 5;

  document.addEventListener('DOMContentLoaded', async () => {
    user = await checkAuth();
    if (!user) return;
    try {
      const plants = await fetch('/api/plants', { credentials: 'same-origin' }).then(r => r.json()).catch(() => []);
      plantsCount = plants.length || 5;
    } catch {}
    addWelcomeMessage();
    const input = document.querySelector('main input[type="text"], section input[placeholder*="operations"], section input[type="text"]');
    const allButtons = document.querySelectorAll('button');
    let sendButton = null;
    allButtons.forEach(btn => {
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon && (icon.textContent.trim() === 'send' || icon.textContent.trim() === 'Send')) sendButton = btn;
    });

    async function doSend() {
      const msg = input ? input.value.trim() : '';
      if (msg) await handleSend(msg);
    }

    if (input) {
      input.addEventListener('keydown', async e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); await doSend(); }
      });
    }
    if (sendButton) sendButton.addEventListener('click', async e => { e.preventDefault(); await doSend(); });

    const existingMic = Array.from(document.querySelectorAll('main button')).find(btn => btn.textContent.trim() === 'mic');
    if (existingMic && input) {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (Recognition) {
        const recognition = new Recognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';
        recognition.onresult = event => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
          input.value = transcript.trim(); input.focus();
        };
        existingMic.addEventListener('click', () => recognition.start());
      }
    }

    const context = new URLSearchParams(window.location.search).get('context');
    if (context && input) input.value = 'Investigate ' + context + ' using the latest alarms, sensor readings, and work orders.';

    document.querySelectorAll('.shrink-0.glass-panel, [class*="glass-panel"][class*="rounded-full"]').forEach(pill => {
      pill.addEventListener('click', async () => {
        const text = pill.textContent.trim();
        if (input) { input.value = text; }
        await handleSend(text);
      });
    });
  });
})();