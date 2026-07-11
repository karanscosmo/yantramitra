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

  function addMessage(text, isUser, avatar) {
    const chatStream = document.querySelector('.chat-scroll');
    if (!chatStream) return;

    const wrapper = document.createElement('div');
    wrapper.className = isUser ? 'flex justify-end' : 'flex justify-start';

    const bubble = document.createElement('div');
    bubble.className = isUser
      ? 'max-w-[80%] glass-panel rounded-2xl rounded-tr-none px-md py-sm shadow-sm'
      : 'max-w-[90%] flex gap-sm';

    if (!isUser) {
      const avatarEl = document.createElement('img');
      avatarEl.src = '/images/yantranklan-avatar.svg';
      avatarEl.alt = 'YantraNklan';
      avatarEl.className = 'w-10 h-10 rounded-full mt-1 shrink-0 border-2 border-secondary/30 self-start';
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'glass-panel rounded-2xl rounded-tl-none px-md py-sm shadow-sm border-l-4 border-l-secondary flex-1';
      
      const nameEl = document.createElement('p');
      nameEl.className = 'font-kpi-numeric text-kpi-numeric text-secondary mb-xs flex items-center gap-xs';
      nameEl.innerHTML = 'YantraNklan <span class="text-[10px] text-on-surface-variant font-normal">AI Operations Agent</span>';
      contentDiv.appendChild(nameEl);

      const textEl = document.createElement('div');
      textEl.className = 'text-on-surface text-body-md leading-relaxed';
      textEl.textContent = text;
      contentDiv.appendChild(textEl);

      bubble.appendChild(avatarEl);
      bubble.appendChild(contentDiv);
    } else {
      const textEl = document.createElement('p');
      textEl.className = 'text-on-surface';
      textEl.textContent = text;
      bubble.appendChild(textEl);
    }

    wrapper.appendChild(bubble);
    chatStream.appendChild(wrapper);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  function addTypingIndicator() {
    const chatStream = document.querySelector('.chat-scroll');
    if (!chatStream) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'flex justify-start';
    wrapper.id = 'typing-indicator';

    const bubble = document.createElement('div');
    bubble.className = 'max-w-[90%] flex gap-sm';

    const avatarEl = document.createElement('img');
    avatarEl.src = '/images/yantranklan-avatar.svg';
    avatarEl.alt = 'YantraNklan';
    avatarEl.className = 'w-10 h-10 rounded-full mt-1 shrink-0 border-2 border-secondary/30 self-start';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'glass-panel rounded-2xl rounded-tl-none px-md py-sm shadow-sm border-l-4 border-l-secondary';

    // Typing dots animation
    const dots = document.createElement('div');
    dots.className = 'flex gap-1 items-center py-1';
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
    
    const input = document.querySelector('input[type="text"]');
    if (input) { input.value = ''; }

    addTypingIndicator();

    try {
      const data = await sendMessage(message);
      removeTypingIndicator();

      if (data.error === 'api_key_missing') {
        addMessage('⚠️ ' + data.message, false);
      } else if (data.error) {
        addMessage('Error: ' + (data.detail || data.error), false);
      } else {
        addMessage(data.reply, false);
      }
    } catch (err) {
      removeTypingIndicator();
      addMessage('Connection error. Please check your network and try again.', false);
    }
  }

  function addWelcomeMessage() {
    // Clear all existing chat messages
    const chatStream = document.querySelector('.chat-scroll');
    if (chatStream) {
      chatStream.innerHTML = '';
    }

    // Add a welcome message
    addMessage("Hello! I'm YantraNklan, your operations AI assistant. I have access to your plant's real-time data including machines, alarms, work orders, and more. Ask me anything about your operations!", false);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    user = await checkAuth();
    if (!user) return;

    addWelcomeMessage();

    // Wire up the input
    const input = document.querySelector('input[type="text"]');
    const sendBtn = document.querySelector('.bg-primary-container button, button:has(.material-symbols-outlined)') || document.querySelector('button:has(span.material-symbols-outlined:contains(send))');
    
    // Find the send button - it's the one with the "send" icon
    const allButtons = document.querySelectorAll('button');
    let sendButton = null;
    allButtons.forEach(btn => {
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon && (icon.textContent.trim() === 'send' || icon.textContent.trim() === 'Send')) {
        sendButton = btn;
      }
    });

    async function doSend() {
      const msg = input ? input.value.trim() : '';
      if (msg) {
        await handleSend(msg);
      }
    }

    if (input) {
      input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          await doSend();
        }
      });
    }

    if (sendButton) {
      sendButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await doSend();
      });
    }

    // Wire up the pill/suggestion buttons
    document.querySelectorAll('.shrink-0.glass-panel').forEach(pill => {
      pill.addEventListener('click', async () => {
        const text = pill.textContent.trim();
        if (input) {
          input.value = text;
        }
        await handleSend(text);
      });
    });
  });
})();
