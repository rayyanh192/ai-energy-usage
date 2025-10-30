// Content script for Claude tracking
console.log('🌍 AI Carbon Tracker: Extension loaded on Claude!');
console.log('🌍 Current URL:', window.location.href);

// Notify background that we're active
chrome.runtime.sendMessage({
  type: 'PAGE_LOADED',
  site: 'claude'
}).catch(err => console.log('Background message failed:', err));

// Store the last user message tokens for correlation
let lastUserTokens = 0;

// Model energy rates (Wh per 1000 tokens)
// Based on similar architecture to GPT models, adjusted for Claude's efficiency
const ENERGY_RATES = {
  'claude-opus-4': 2.5,         // Largest, most powerful
  'claude-opus': 2.5,
  'claude-sonnet-4.5': 1.8,     // Balanced performance
  'claude-sonnet-4': 1.8,
  'claude-sonnet-3.5': 1.5,
  'claude-sonnet': 1.5,
  'claude-haiku-3.5': 0.4,      // Fast and efficient
  'claude-haiku': 0.4,
  'claude-instant': 0.3,        // Legacy fast model
  'default': 1.8                 // Conservative default (Sonnet)
};

// Inject toast notification styles (same as ChatGPT)
function injectStyles() {
  if (document.getElementById('ai-carbon-tracker-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ai-carbon-tracker-styles';
  style.textContent = `
    .ai-carbon-toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 14px;
      min-width: 280px;
      animation: ai-carbon-toast-in 0.3s ease-out;
      cursor: pointer;
      transition: transform 0.2s, opacity 0.3s;
    }
    
    .ai-carbon-toast:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    }
    
    .ai-carbon-toast.hiding {
      animation: ai-carbon-toast-out 0.3s ease-in forwards;
    }
    
    @keyframes ai-carbon-toast-in {
      from {
        opacity: 0;
        transform: translateX(100px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes ai-carbon-toast-out {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100px);
      }
    }
    
    .ai-carbon-toast-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      font-weight: 600;
      font-size: 15px;
    }
    
    .ai-carbon-toast-icon {
      font-size: 20px;
    }
    
    .ai-carbon-toast-body {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .ai-carbon-toast-stat {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      opacity: 0.95;
    }
    
    .ai-carbon-toast-label {
      font-weight: 500;
    }
    
    .ai-carbon-toast-value {
      font-weight: 700;
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 8px;
      border-radius: 4px;
    }
    
    .ai-carbon-toast-footer {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      font-size: 11px;
      opacity: 0.8;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

// Show toast notification
async function showToast(data) {
  const result = await chrome.storage.local.get(['toastEnabled']);
  const toastEnabled = result.toastEnabled !== undefined ? result.toastEnabled : true;
  
  if (!toastEnabled) {
    console.log('🌍 Toast notifications disabled');
    return;
  }
  
  injectStyles();
  
  const existingToast = document.querySelector('.ai-carbon-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = 'ai-carbon-toast';
  
  const energyWh = data.energyWh.toFixed(3);
  const waterMl = (data.waterLiters * 1000).toFixed(2);
  const tokens = data.totalTokens.toLocaleString();
  
  toast.innerHTML = `
    <div class="ai-carbon-toast-header">
      <span class="ai-carbon-toast-icon">🌍</span>
      <span>AI Usage Tracked</span>
    </div>
    <div class="ai-carbon-toast-body">
      <div class="ai-carbon-toast-stat">
        <span class="ai-carbon-toast-label">⚡ Energy</span>
        <span class="ai-carbon-toast-value">${energyWh} Wh</span>
      </div>
      <div class="ai-carbon-toast-stat">
        <span class="ai-carbon-toast-label">💧 Water</span>
        <span class="ai-carbon-toast-value">${waterMl} mL</span>
      </div>
      <div class="ai-carbon-toast-stat">
        <span class="ai-carbon-toast-label">🔤 Tokens</span>
        <span class="ai-carbon-toast-value">${tokens}</span>
      </div>
    </div>
    <div class="ai-carbon-toast-footer">
      Model: ${data.model} • Click to dismiss
    </div>
  `;
  
  document.body.appendChild(toast);
  
  const dismissTimeout = setTimeout(() => {
    hideToast(toast);
  }, 3000);
  
  toast.addEventListener('click', () => {
    clearTimeout(dismissTimeout);
    hideToast(toast);
  });
}

function hideToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.add('hiding');
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 300);
}

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function detectClaudeModel() {
  // Method 1: Check for model selector button
  const modelSelectors = document.querySelectorAll('button, div, span');
  for (const element of modelSelectors) {
    const text = element.textContent.toLowerCase();
    if (text.includes('claude')) {
      if (text.includes('opus 4')) return 'claude-opus-4';
      if (text.includes('opus')) return 'claude-opus';
      if (text.includes('sonnet 4.5') || text.includes('sonnet-4.5')) return 'claude-sonnet-4.5';
      if (text.includes('sonnet 4') || text.includes('sonnet-4')) return 'claude-sonnet-4';
      if (text.includes('sonnet 3.5') || text.includes('sonnet-3.5')) return 'claude-sonnet-3.5';
      if (text.includes('sonnet')) return 'claude-sonnet';
      if (text.includes('haiku 3.5') || text.includes('haiku-3.5')) return 'claude-haiku-3.5';
      if (text.includes('haiku')) return 'claude-haiku';
    }
  }
  
  // Method 2: Check URL
  const url = window.location.href.toLowerCase();
  if (url.includes('opus')) return 'claude-opus';
  if (url.includes('sonnet')) return 'claude-sonnet';
  if (url.includes('haiku')) return 'claude-haiku';
  
  // Default to Sonnet 4.5 (current default on Claude)
  console.log('🌍 Could not detect specific Claude model, defaulting to Sonnet 4.5');
  return 'claude-sonnet-4.5';
}

function calculateUsage(tokens, model) {
  const ratePerToken = (ENERGY_RATES[model] || ENERGY_RATES['default']) / 1000;
  const energyWh = tokens * ratePerToken;
  const energyKwh = energyWh / 1000;
  const waterLiters = energyKwh * 0.35;
  
  return { energyWh, waterLiters };
}

function processCompleteResponse(messageElement) {
  try {
    const responseText = messageElement.innerText || messageElement.textContent;
    if (!responseText || responseText.trim().length === 0) {
      console.log('🌍 Response empty, skipping');
      return;
    }

    console.log('🌍 Processing complete Claude response...');
    console.log('🌍 Response length:', responseText.length, 'characters');

    const responseTokens = estimateTokens(responseText);
    const totalTokens = lastUserTokens + responseTokens;
    
    console.log('🌍 User tokens:', lastUserTokens);
    console.log('🌍 Response tokens:', responseTokens);
    console.log('🌍 Total tokens:', totalTokens);
    
    const model = detectClaudeModel();
    console.log('🌍 Detected model:', model);
    
    const { energyWh, waterLiters } = calculateUsage(totalTokens, model);
    
    console.log('🌍 Energy:', energyWh.toFixed(4), 'Wh');
    console.log('🌍 Water:', waterLiters.toFixed(6), 'L');
    
    chrome.runtime.sendMessage({
      type: 'USAGE_RECORDED',
      data: {
        site: 'claude',
        model: model,
        userTokens: lastUserTokens,
        responseTokens: responseTokens,
        totalTokens: totalTokens,
        energyWh: energyWh,
        waterLiters: waterLiters,
        timestamp: Date.now()
      }
    }).then(() => {
      console.log('🌍 ✓ Usage data sent to background!');
      
      showToast({
        energyWh: energyWh,
        waterLiters: waterLiters,
        totalTokens: totalTokens,
        model: model
      });
    }).catch(err => {
      console.error('🌍 ✗ Failed to send to background:', err);
    });
    
    console.log(`🌍 ✓ Tracked: ${totalTokens} tokens (${model}), ${energyWh.toFixed(4)} Wh, ${waterLiters.toFixed(4)} L`);
    
    lastUserTokens = 0;
  } catch (error) {
    console.error('🌍 Error processing response:', error);
  }
}

function isResponseComplete() {
  // Claude shows "Stop generating" or similar while streaming
  const stopButton = document.querySelector('button[aria-label*="Stop"]') || 
                     document.querySelector('button:has-text("Stop")');
  return !stopButton;
}

function waitForCompleteResponse(messageElement) {
  let checkCount = 0;
  const maxChecks = 120;
  
  const checkInterval = setInterval(() => {
    checkCount++;
    
    if (isResponseComplete() || checkCount >= maxChecks) {
      clearInterval(checkInterval);
      processCompleteResponse(messageElement);
    }
  }, 500);
}

function trackUserMessage(messageElement) {
  try {
    const text = messageElement.innerText || messageElement.textContent;
    if (text && text.trim().length > 0) {
      lastUserTokens = estimateTokens(text);
      console.log('🌍 User message tracked:', lastUserTokens, 'tokens');
      console.log('🌍 Message preview:', text.substring(0, 50) + '...');
    }
  } catch (error) {
    console.error('🌍 Error tracking user message:', error);
  }
}

function observeChat() {
  console.log('🌍 Setting up Claude chat observer...');
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          
          // Claude uses different attributes - look for message containers
          // Check for the specific render count attribute Claude uses
          if (node.hasAttribute && node.hasAttribute('data-test-render-count')) {
            const content = node.textContent;
            if (content && content.length > 20) {
              console.log('🌍 Detected new message in Claude');
              
              // Determine if user or assistant based on position/context
              // This is a simplified detection - may need refinement
              setTimeout(() => {
                // Give it a moment to determine context
                const isLikelyAssistant = content.length > 100; // Assistant responses tend to be longer
                
                if (isLikelyAssistant) {
                  console.log('🌍 Likely assistant message');
                  waitForCompleteResponse(node);
                } else {
                  console.log('🌍 Likely user message');
                  trackUserMessage(node);
                }
              }, 100);
            }
          }
          
          // Fallback: look for any substantial text additions
          if (node.textContent && node.textContent.length > 50) {
            const textPreview = node.textContent.substring(0, 100);
            console.log('🌍 Substantial content detected:', textPreview);
          }
        }
      });
    });
  });

  const chatContainer = document.querySelector('main') || 
                        document.querySelector('[role="main"]') || 
                        document.body;
  
  if (chatContainer) {
    observer.observe(chatContainer, {
      childList: true,
      subtree: true,
      characterData: true
    });
    console.log('🌍 Claude chat observer initialized successfully!');
    console.log('🌍 Monitoring container:', chatContainer.tagName);
  } else {
    console.warn('🌍 Could not find chat container, retrying...');
    setTimeout(observeChat, 1000);
  }
}

// Initialize
console.log('🌍 Document state:', document.readyState);

if (document.readyState === 'loading') {
  console.log('🌍 Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🌍 DOMContentLoaded fired');
    observeChat();
  });
} else {
  console.log('🌍 DOM already ready, initializing...');
  observeChat();
}

setTimeout(() => {
  console.log('🌍 Delayed initialization attempt...');
  observeChat();
}, 2000);