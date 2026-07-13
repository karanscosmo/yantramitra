(function() {
  const API_CHAT = '/api/ai-chat';
  const API_STREAM = '/api/ai-chat/stream';
  const API_UPLOAD = '/api/ai-upload';
  const CHAT_HISTORY_KEY = 'ym_chat_history';

  let streaming = false, abortController = null, recognition = null, micActive = false;
  let conversationId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let chatHistory = [];
  let fileAttachments = [];
  let documentContexts = [];

  function toast(msg, type) {
    const el = document.getElementById('ym-toast');
    if (!el) return;
    document.getElementById('ym-toast-msg').textContent = msg;
    el.classList.remove('translate-y-32', 'opacity-0');
    el.querySelector('.material-symbols-outlined').textContent = type === 'error' ? 'error' : 'check_circle';
    clearTimeout(el._toastTimer);
    el._toastTimer = setTimeout(() => el.classList.add('translate-y-32', 'opacity-0'), 3000);
  }

  function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  function markdownToHtml(text) {
    if (!text) return '<p class="my-1" style="font-size:18px;line-height:1.7"></p>';
    let html = escapeHtml(text);
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-surface-container rounded-lg p-4 my-3 overflow-x-auto border border-outline-variant/20" style="font-size:14px;line-height:1.6"><code>$2</code></pre>');
    html = html.replace(/### (.+)/g, '<h3 class="font-bold mt-4 mb-2 text-on-surface" style="font-size:18px">$1</h3>');
    html = html.replace(/## (.+)/g, '<h2 class="font-bold mt-4 mb-2 text-on-surface" style="font-size:20px">$1</h2>');
    html = html.replace(/# (.+)/g, '<h1 class="font-bold mt-4 mb-2 text-on-surface" style="font-size:22px">$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code class="bg-surface-container px-1.5 rounded" style="font-size:16px">$1</code>');
    html = html.replace(/^- (.+)/gm, '<li class="ml-5 list-disc text-on-surface" style="font-size:18px;line-height:1.7;margin-bottom:4px">$1</li>');
    html = html.replace(/^\d+\. (.+)/gm, '<li class="ml-5 list-decimal text-on-surface" style="font-size:18px;line-height:1.7;margin-bottom:4px">$1</li>');
    html = html.replace(/\[([^\]]+)\]\((\/[^\)]+)\)/g, '<a href="$2" class="text-primary font-semibold underline underline-offset-2 hover:text-primary/80 transition-colors" style="font-size:18px">$1</a>');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary font-semibold underline underline-offset-2" style="font-size:18px">$1</a>');
    html = html.replace(/\n{2,}/g, '</p><p class="my-1.5" style="font-size:18px;line-height:1.7">');
    html = html.replace(/\n/g, '<br/>');
    html = '<p class="my-1.5" style="font-size:18px;line-height:1.7">' + html + '</p>';
    html = html.replace(/<p class="my-1\.5" style="font-size:18px;line-height:1\.7"><\/p>/g, '');
    return html;
  }

  function addMessage(text, isUser, opts) {
    const container = document.getElementById('ym-chat-messages');
    if (!container) return;
    opts = opts || {};
    const wrapper = document.createElement('div');
    wrapper.className = 'flex ' + (isUser ? 'justify-end' : 'justify-start') + ' mb-5 msg-enter';
    wrapper.dataset.msgId = opts.id || Date.now().toString(36);

    if (isUser) {
      const bubble = document.createElement('div');
      bubble.className = 'max-w-[80%] glass-panel rounded-2xl rounded-tr-none px-5 py-3 shadow-sm bg-primary/5 border border-primary/10';
      bubble.innerHTML = '<p class="text-on-surface" style="font-size:18px;line-height:1.7">' + escapeHtml(text) + '</p>';
      wrapper.appendChild(bubble);
    } else {
      const bubble = document.createElement('div');
      bubble.className = 'max-w-[90%] flex gap-3';
      const avatar = document.createElement('img');
      avatar.src = '/assets/images/yantranklan-avatar-ai.jpg';
      avatar.className = 'w-14 h-14 rounded-full mt-0.5 shrink-0 border-2 border-secondary/30 self-start';
      const contentDiv = document.createElement('div');
      contentDiv.className = 'glass-panel rounded-2xl rounded-tl-none px-5 py-3 shadow-sm border-l-4 border-l-secondary flex-1 min-w-0';
      const header = document.createElement('div');
      header.className = 'flex items-center gap-2 mb-1.5 flex-wrap';
      header.innerHTML = '<span class="font-kpi-numeric text-secondary" style="font-size:16px">YantraNklan</span>';
      if (opts.model) header.innerHTML += '<span class="text-on-surface-variant bg-secondary/10 px-2 py-0.5 rounded font-medium" style="font-size:11px">' + escapeHtml(opts.model) + '</span>';
      contentDiv.appendChild(header);
      const textEl = document.createElement('div');
      textEl.className = 'text-on-surface ai-response';
      textEl.style.cssText = 'font-size:18px;line-height:1.7';
      textEl.innerHTML = opts.streaming ? '' : markdownToHtml(text);
      contentDiv.appendChild(textEl);
      if (!opts.streaming) {
        const actions = document.createElement('div');
        actions.className = 'flex items-center gap-1 mt-1.5 pt-1.5 border-t border-outline-variant/10';
        actions.innerHTML = '<button class="ym-action-btn text-on-surface-variant/50 hover:text-primary transition-colors p-1.5" data-action="copy" title="Copy"><span class="material-symbols-outlined" style="font-size:20px">content_copy</span></button><button class="ym-action-btn text-on-surface-variant/50 hover:text-primary transition-colors p-1.5" data-action="regenerate" title="Regenerate"><span class="material-symbols-outlined" style="font-size:20px">refresh</span></button>';
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
    wrapper.className = 'flex justify-start mb-5 msg-enter';
    wrapper.id = 'typing-indicator';
    wrapper.innerHTML = '<div class="flex gap-3"><img src="/assets/images/yantranklan-avatar-ai.jpg" class="w-14 h-14 rounded-full mt-0.5 shrink-0 border-2 border-secondary/30 self-start"/><div class="glass-panel rounded-2xl rounded-tl-none px-5 py-4 shadow-sm border-l-4 border-l-secondary"><div class="flex gap-2 items-center"><span class="w-3 h-3 bg-secondary rounded-full animate-bounce-dot" style="animation-delay:0s"></span><span class="w-3 h-3 bg-secondary rounded-full animate-bounce-dot" style="animation-delay:0.16s"></span><span class="w-3 h-3 bg-secondary rounded-full animate-bounce-dot" style="animation-delay:0.32s"></span></div></div></div>';
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
  }

  function removeTypingIndicator() { const el = document.getElementById('typing-indicator'); if (el) el.remove(); }

  function setLoading(loading) {
    const input = document.getElementById('ym-chat-input');
    const sendBtn = document.getElementById('ym-send-btn');
    const cancelBtn = document.getElementById('ym-cancel-btn');
    const micBtn = document.getElementById('ym-mic-btn');
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

    if (!isRegen) {
      addMessage(message, true, { id: 'u_' + Date.now() });
      chatHistory.push({ role: 'user', content: message });
    }

    const input = document.getElementById('ym-chat-input');
    if (input) input.value = '';
    setLoading(true);
    abortController = new AbortController();

    try {
      const attachmentContext = documentContexts.length > 0 ? documentContexts.map(d => d.text).join('\n\n') : '';
      let payload = { message, conversationId, history: chatHistory.slice(-20) };
      if (attachmentContext) payload.attachmentContext = attachmentContext;

      if (fileAttachments.length > 0) {
        const formData = new FormData();
        for (const f of fileAttachments) formData.append('files', f.file);
        formData.append('message', message);
        formData.append('conversationId', conversationId);
        const fileNames = fileAttachments.map(f => f.file.name).join(', ');
        addMessage('', false, { id: 'ai_' + Date.now(), model: 'parsing', streaming: false });
        const lastMsg = document.querySelector('[data-msgid="ai_' + Date.now() + '"]');
        if (lastMsg) {
          const textDiv = lastMsg.querySelector('.ai-response') || lastMsg.querySelector('[style*="font-size"]');
          if (textDiv) {
            textDiv.innerHTML = [
              '<div class="space-y-2 py-2">',
              '<div class="flex items-center gap-2.5 text-on-surface-variant"><span class="material-symbols-outlined text-primary" style="font-size:18px">upload_file</span><span style="font-size:13px;font-weight:600">Uploading ' + fileNames + '...</span></div>',
              '<div class="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden"><div class="h-full rounded-full bg-primary transition-all" id="ym-upload-progress" style="width:25%"></div></div>',
              '<div class="flex items-center gap-2.5 text-on-surface-variant"><span class="material-symbols-outlined animate-spin text-primary" style="font-size:18px">sync</span><span style="font-size:12px" id="ym-upload-status">Parsing content...</span></div>',
              '</div>'
            ].join('');
          }
        }
        setLoading(true);

        /* Update progress stages */
        setTimeout(() => { const p = document.getElementById('ym-upload-progress'); if(p) p.style.width = '50%'; }, 300);
        setTimeout(() => { const s = document.getElementById('ym-upload-status'); if(s) s.textContent = 'Indexing documents...'; const p = document.getElementById('ym-upload-progress'); if(p) p.style.width = '75%'; }, 600);
        setTimeout(() => { const s = document.getElementById('ym-upload-status'); if(s) s.textContent = 'Analyzing with AI...'; const p = document.getElementById('ym-upload-progress'); if(p) p.style.width = '90%'; }, 1000);

        const resp = await fetch(API_UPLOAD, { method: 'POST', credentials: 'same-origin', body: formData, signal: abortController.signal });
        setLoading(false);
        fileAttachments = [];
        document.getElementById('ym-file-preview').innerHTML = '';
        document.getElementById('ym-file-preview').classList.add('hidden');
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: 'Upload failed' }));
          if (lastMsg) lastMsg.remove();
          addMessage(err.error || 'Upload failed. Please try again.', false, { model: 'error' });
          return;
        }
        const data = await resp.json();
        if (lastMsg) lastMsg.remove();
        if (data.extractedText) {
          documentContexts.push({ text: data.extractedText, sources: data.sources || [], timestamp: Date.now() });
          try { localStorage.setItem('ym_doc_contexts', JSON.stringify({ cid: conversationId, contexts: documentContexts.slice(-5) })); } catch {}
        }
        if (data.reply) { addMessage(data.reply, false, { model: data.model || 'llama-3.3-70b-versatile' }); chatHistory.push({ role: 'assistant', content: data.reply }); saveHistory(); }
        return;
      }

      const useStream = true;
      if (useStream) {
        const resp = await fetch(API_STREAM, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
          body: JSON.stringify(payload), signal: abortController.signal
        });

        if (!resp.ok) {
          setLoading(false);
          const err = await resp.json().catch(() => ({ error: 'Request failed. Please try again.', code: 'unknown' }));
          if (err.error === 'api_key_missing') { addMessage(err.message || 'OPENAI_API_KEY is not configured. Set it in your environment to enable AI chat.', false, { model: 'offline' }); return; }
          const userMsg = err.code === 'stream_setup_failed' ? (err.error || 'Chat service unavailable.') : (err.error || 'Request failed. Please try again.');
          addMessage(userMsg, false, { model: 'error' });
          return;
        }

        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('text/event-stream')) {
          const wrapper = addMessage('', false, { id: 'ai_' + Date.now(), model: 'llama-3.3-70b-versatile', streaming: true });
          const contentDiv = wrapper ? wrapper.querySelector('.ai-response') : null;
          let fullText = '';
          let hasContent = false;

          try {
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') { hasContent = true; break; }
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                      fullText += parsed.content;
                      if (contentDiv) contentDiv.innerHTML = markdownToHtml(fullText);
                      document.getElementById('ym-chat-messages').scrollTop = document.getElementById('ym-chat-messages').scrollHeight;
                      hasContent = true;
                    }
                    if (parsed.error) toast(parsed.error, 'error');
                  } catch {}
                }
              }
            }
          } catch {}

          if (contentDiv && fullText) contentDiv.innerHTML = markdownToHtml(fullText);
          if (fullText) {
            chatHistory.push({ role: 'assistant', content: fullText });
            saveHistory();
          }
          setLoading(false);
          if (!hasContent) { wrapper?.remove(); await sendNonStreaming(payload); }
          else { addActionsToLastMessage(); }
        } else {
          setLoading(false);
          const data = await resp.json();
          handleResponse(data);
        }
      } else {
        await sendNonStreaming(payload);
      }
    } catch (err) {
      setLoading(false);
      if (err.name === 'AbortError') { addMessage('Response cancelled.', false, { model: 'cancelled' }); }
      else { addMessage(err.message || 'Connection error. Please check your network and try again.', false, { model: 'error' }); }
    }
  }

  async function sendNonStreaming(payload) {
    try {
      const resp = await fetch(API_CHAT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify(payload), signal: abortController.signal
      });
      setLoading(false);
      if (!resp.ok) {
        setLoading(false);
        const err = await resp.json().catch(() => ({ error: 'Request failed. Please try again.', code: 'unknown' }));
        if (err.error === 'api_key_missing') { addMessage(err.message || 'OPENAI_API_KEY is not configured. Set it to enable AI chat.', false, { model: 'offline' }); return; }
        addMessage(err.message || err.error || 'Request failed. Please try again.', false, { model: 'error' });
        return;
      }
      const data = await resp.json();
      handleResponse(data);
    } catch (err) {
      setLoading(false);
      if (err.name !== 'AbortError') addMessage(err.message || 'Connection error. Please try again.', false, { model: 'error' });
    }
  }

  function handleResponse(data) {
    if (data.reply) {
      addMessage(data.reply, false, { model: data.model || 'llama-3.3-70b-versatile', fallback: data.fallback });
      chatHistory.push({ role: 'assistant', content: data.reply });
      saveHistory();
      addActionsToLastMessage();
    } else {
      addMessage('Received an unexpected response.', false, { model: 'error' });
    }
  }

  function addActionsToLastMessage() {
    const container = document.getElementById('ym-chat-messages');
    if (!container) return;
    const last = container.lastElementChild;
    if (!last || last.id === 'typing-indicator') return;
    const contentDiv = last.querySelector('.glass-panel');
    if (!contentDiv || contentDiv.querySelector('.ym-action-btn')) return;

    const actions = document.createElement('div');
    actions.className = 'flex items-center gap-1 mt-1.5 pt-1.5 border-t border-outline-variant/10';
    const text = contentDiv.querySelector('.ai-response')?.textContent || '';
    actions.innerHTML = '<button class="ym-action-btn text-on-surface-variant/50 hover:text-primary transition-colors p-1.5" data-action="copy" title="Copy"><span class="material-symbols-outlined" style="font-size:20px">content_copy</span></button><button class="ym-action-btn text-on-surface-variant/50 hover:text-primary transition-colors p-1.5" data-action="regenerate" title="Regenerate"><span class="material-symbols-outlined" style="font-size:20px">refresh</span></button>';
    actions.querySelector('[data-action="copy"]').addEventListener('click', function() {
      navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard'));
    });
    actions.querySelector('[data-action="regenerate"]').addEventListener('click', function() {
      const prevMsg = last.previousElementSibling;
      if (prevMsg && prevMsg.dataset.msgId) {
        const userMsgEl = container.querySelector('[data-msgId="' + prevMsg.dataset.msgId + '"]');
        if (userMsgEl) {
          last.remove();
          sendMessage(userMsgEl.textContent, true);
        }
      }
    });
    contentDiv.appendChild(actions);
  }

  function setupFileUpload() {
    const fileInput = document.getElementById('ym-file-input');
    const attachBtn = document.getElementById('ym-attach-btn');
    const preview = document.getElementById('ym-file-preview');
    if (!fileInput || !attachBtn || !preview) return;
    attachBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', function() {
      for (const file of this.files) {
        if (fileAttachments.some(f => f.file.name === file.name && f.file.size === file.size)) continue;
        fileAttachments.push({ file });
        const chip = document.createElement('div');
        chip.className = 'flex items-center gap-1.5 bg-surface-container rounded-lg px-3 py-1.5 text-xs font-medium border border-outline-variant/20';
        chip.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">description</span><span class="truncate max-w-[140px]" style="font-size:13px">' + escapeHtml(file.name) + '</span><button class="ym-remove-file material-symbols-outlined text-on-surface-variant hover:text-error" style="font-size:18px">close</button>';
        chip.querySelector('.ym-remove-file').addEventListener('click', function() {
          const idx = fileAttachments.findIndex(f => f.file.name === file.name && f.file.size === file.size);
          if (idx > -1) fileAttachments.splice(idx, 1);
          chip.remove();
          if (fileAttachments.length === 0) preview.classList.add('hidden');
        });
        preview.appendChild(chip);
        preview.classList.remove('hidden');
      }
      this.value = '';
    });
  }

  function setupMic() {
    const micBtn = document.getElementById('ym-mic-btn');
    const input = document.getElementById('ym-chat-input');
    if (!micBtn || !input) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { micBtn.style.opacity = '0.3'; micBtn.title = 'Speech recognition not supported'; return; }
    recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = function() { micActive = true; micBtn.classList.add('ym-mic-active'); micBtn.textContent = 'mic_off'; toast('Listening...'); };
    recognition.onend = function() { micActive = false; micBtn.classList.remove('ym-mic-active'); micBtn.textContent = 'mic'; if (input.value.trim()) updateSendBtn(); };
    recognition.onerror = function(event) {
      micActive = false; micBtn.classList.remove('ym-mic-active'); micBtn.textContent = 'mic';
      if (event.error === 'not-allowed') toast('Microphone blocked. Allow mic access in browser settings.', 'error');
      else if (event.error === 'no-speech') toast('No speech detected.', 'error');
      else toast('Mic error: ' + event.error, 'error');
    };
    recognition.onresult = function(event) {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) { input.value = transcript.trim(); updateSendBtn(); }
      }
      if (!event.results[event.results.length - 1]?.isFinal) input.value = transcript;
    };
    micBtn.addEventListener('click', function() {
      if (micActive) { recognition.stop(); return; }
      try { recognition.start(); } catch (e) { if (e.name === 'InvalidStateError') { recognition.stop(); setTimeout(() => recognition.start(), 200); } }
    });
  }

  function setupSuggestedPrompts() {
    const container = document.getElementById('ym-suggested-pills');
    if (!container) return;
    const prompts = [
      'Compare OEE across all 5 plants',
      'Show active alarms on Pune line',
      'Predict failure for CNC Cell PNA-01',
      'Create work order for bearing replacement',
      'Energy usage report by plant',
      'Summarize agent mission status'
    ];
    container.innerHTML = prompts.map(p => '<button class="ym-pill shrink-0 glass-panel rounded-full text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all border border-outline-variant/30 whitespace-nowrap">' + escapeHtml(p) + '</button>').join('');
    container.addEventListener('click', function(e) {
      const btn = e.target.closest('.ym-pill');
      if (!btn) return;
      const input = document.getElementById('ym-chat-input');
      if (input) { input.value = btn.textContent.trim(); updateSendBtn(); input.focus(); }
    });
  }

  function updateSendBtn() {
    const input = document.getElementById('ym-chat-input');
    const btn = document.getElementById('ym-send-btn');
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
    addMessage("Hello! I'm **YantraNklan**, your YantraMitra AI operations copilot. I have real-time access to your complete operational data including all 5 plants, machines, alarms, work orders, agents, and digital twin state.\n\nI can:\n- **Compare** OEE, health, and performance across plants\n- **Investigate** machine faults with sensor evidence\n- **Predict** failures and maintenance needs\n- **Create** and track work orders\n- **Generate** executive reports and energy analysis\n- **Route** you to the right tool — [Dashboard](/dashboard), [Map](/map), [Assets](/assets), [Work Orders](/work-orders)\n\nWhat would you like to explore?", false, { model: 'connected' });
  }

  function setupClearChat() {
    document.getElementById('ym-clear-chat')?.addEventListener('click', function() {
      if (streaming && abortController) { abortController.abort(); setLoading(false); }
      chatHistory = [];
      documentContexts = [];
      try { localStorage.removeItem(CHAT_HISTORY_KEY + '_' + conversationId); } catch {}
      try { localStorage.removeItem('ym_doc_contexts'); } catch {}
      showWelcome();
      fileAttachments = [];
      const preview = document.getElementById('ym-file-preview');
      if (preview) { preview.innerHTML = ''; preview.classList.add('hidden'); }
      toast('Conversation cleared');
    });
  }

  function setupCancel() {
    document.getElementById('ym-cancel-btn')?.addEventListener('click', function() {
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

    const input = document.getElementById('ym-chat-input');
    const sendBtn = document.getElementById('ym-send-btn');

    if (!loadHistory()) showWelcome();
    else restoreMessages();

    setupSuggestedPrompts();
    setupFileUpload();
    setupMic();
    setupClearChat();
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

    updateSendBtn();

    setInterval(function() {
      const s = document.getElementById('ym-ai-status');
      if (s) s.textContent = streaming ? 'Thinking...' : 'Online';
      const d = document.getElementById('ym-ai-status-dot');
      if (d) d.classList.toggle('status-pulse-teal', !streaming);
    }, 2000);
  });
})();
