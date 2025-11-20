// Content script for ChatGPT tracking
console.log('🌍 AI Carbon Tracker: Extension loaded!');
console.log('🌍 Current URL:', window.location.href);

// Notify background that we're active
chrome.runtime.sendMessage({
  type: 'PAGE_LOADED',
  site: 'chatgpt'
}).catch(err => console.log('Background message failed:', err));

// Inject toast notification styles
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
  // Check if toast notifications are enabled
  const result = await chrome.storage.local.get(['toastEnabled']);
  const toastEnabled = result.toastEnabled !== undefined ? result.toastEnabled : true;
  
  if (!toastEnabled) {
    console.log('🌍 Toast notifications disabled');
    return;
  }
  
  // Inject styles if not already present
  injectStyles();
  
  // Remove any existing toast
  const existingToast = document.querySelector('.ai-carbon-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'ai-carbon-toast';
  
  // Format the values for display
  const energyWh = data.energyWh.toFixed(3);
  const waterMl = (data.waterLiters * 1000).toFixed(2);
  const tokens = data.totalTokens.toLocaleString();
  const cups = (data.waterLiters / 0.237).toFixed(3);
  
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
  
  // Add to page
  document.body.appendChild(toast);
  
  // Auto-dismiss after 3 seconds
  const dismissTimeout = setTimeout(() => {
    hideToast(toast);
  }, 9000);
  
  // Click to dismiss immediately
  toast.addEventListener('click', () => {
    clearTimeout(dismissTimeout);
    hideToast(toast);
  });
}

// Hide toast with animation
function hideToast(toast) {
  if (!toast || !toast.parentNode) return;
  
  toast.classList.add('hiding');
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 300);
}

// Store the last user message tokens for correlation
let lastUserTokens = 0;

// Model energy rates (Wh per 1000 tokens)
const ENERGY_RATES = {
  'gpt-3.5-turbo': 0.5,
  'gpt-4': 2.0,
  'gpt-4-turbo': 1.5,
  'o1': 3.0,
  'o1-mini': 1.0,
  'default': 2.0
};

// Estimate tokens from text (rough approximation)
function estimateTokens(text) {
  // Average: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

// Detect which ChatGPT model is being used
function detectChatGPTModel() {
  // Method 1: Check the model selector button
  const modelButton = document.querySelector('button[class*="model"]');
  if (modelButton) {
    const text = modelButton.innerText.toLowerCase();
    if (text.includes('gpt-4o')) return 'gpt-4-turbo';
    if (text.includes('gpt-4')) return 'gpt-4';
    if (text.includes('gpt-3.5')) return 'gpt-3.5-turbo';
    if (text.includes('o1-preview')) return 'o1';
    if (text.includes('o1-mini')) return 'o1-mini';
  }

  // Method 2: Check for model dropdown
  const dropdown = document.querySelector('[role="combobox"]');
  if (dropdown) {
    const text = dropdown.innerText.toLowerCase();
    if (text.includes('gpt-4o')) return 'gpt-4-turbo';
    if (text.includes('gpt-4')) return 'gpt-4';
    if (text.includes('o1')) return 'o1';
  }

  // Method 3: Check page elements for any model indicators
  const pageText = document.body.innerText.toLowerCase();
  if (pageText.includes('gpt-4o')) return 'gpt-4-turbo';
  if (pageText.includes('gpt-4')) return 'gpt-4';

  // Default to GPT-4 (conservative estimate)
  return 'gpt-4';
}

// Calculate energy and water usage
function calculateUsage(tokens, model) {
  const ratePerToken = (ENERGY_RATES[model] || ENERGY_RATES['default']) / 1000;
  const energyWh = tokens * ratePerToken;
  
  // Water: 0.35 liters per kWh
  const energyKwh = energyWh / 1000;
  const waterLiters = energyKwh * 0.35;
  
  return { energyWh, waterLiters };
}

// Process a complete AI response
function processCompleteResponse(messageElement) {
  try {
    const responseText = messageElement.innerText || messageElement.textContent;
    if (!responseText || responseText.trim().length === 0) {
      console.log('🌍 Response empty, skipping');
      return;
    }

    console.log('🌍 Processing complete response...');
    console.log('🌍 Response length:', responseText.length, 'characters');

    const responseTokens = estimateTokens(responseText);
    const totalTokens = lastUserTokens + responseTokens;
    
    console.log('🌍 User tokens:', lastUserTokens);
    console.log('🌍 Response tokens:', responseTokens);
    console.log('🌍 Total tokens:', totalTokens);
    
    // Detect model
    const model = detectChatGPTModel();
    console.log('🌍 Detected model:', model);
    
    // Calculate usage
    const { energyWh, waterLiters } = calculateUsage(totalTokens, model);
    
    console.log('🌍 Energy:', energyWh.toFixed(4), 'Wh');
    console.log('🌍 Water:', waterLiters.toFixed(6), 'L');
    
    // Send to background for aggregation
    chrome.runtime.sendMessage({
      type: 'USAGE_RECORDED',
      data: {
        site: 'chatgpt',
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
      
      // Show toast notification
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
    
    // Reset user tokens
    lastUserTokens = 0;
  } catch (error) {
    console.error('🌍 Error processing response:', error);
  }
}

// Check if response is complete (streaming finished)
function isResponseComplete(messageElement) {
  // Check if there's a "Stop generating" button
  const stopButton = document.querySelector('button[aria-label*="Stop"]');
  return !stopButton;
}

// Wait for streaming response to complete
function waitForCompleteResponse(messageElement) {
  let checkCount = 0;
  const maxChecks = 120; // 60 seconds max
  
  const checkInterval = setInterval(() => {
    checkCount++;
    
    if (isResponseComplete() || checkCount >= maxChecks) {
      clearInterval(checkInterval);
      processCompleteResponse(messageElement);
    }
  }, 500);
}

// Track user messages
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

// Main observer for chat messages
function observeChat() {
  console.log('🌍 Setting up chat observer...');
  
  // Debug: Log what we can find in the DOM
  console.log('🌍 DOM inspection:');
  console.log('  - Has <main>:', !!document.querySelector('main'));
  console.log('  - Has [role="main"]:', !!document.querySelector('[role="main"]'));
  console.log('  - Has [data-message-author-role]:', !!document.querySelector('[data-message-author-role]'));
  
  // Try to find any messages already on the page
  const existingMessages = document.querySelectorAll('[data-message-author-role]');
  console.log('  - Existing messages found:', existingMessages.length);
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          
          // METHOD 1: Check for data-message-author-role attribute
          const userMessage = node.querySelector('[data-message-author-role="user"]');
          if (userMessage) {
            console.log('🌍 Detected user message (method 1)');
            trackUserMessage(userMessage);
          }
          
          if (node.getAttribute && node.getAttribute('data-message-author-role') === 'user') {
            console.log('🌍 Detected user message (method 2)');
            trackUserMessage(node);
          }
          
          const assistantMessage = node.querySelector('[data-message-author-role="assistant"]');
          if (assistantMessage) {
            console.log('🌍 Detected assistant message (method 1)');
            waitForCompleteResponse(assistantMessage);
          }
          
          if (node.getAttribute && node.getAttribute('data-message-author-role') === 'assistant') {
            console.log('🌍 Detected assistant message (method 2)');
            waitForCompleteResponse(node);
          }
          
          // METHOD 2: Alternative class-based detection (fallback)
          // ChatGPT sometimes uses different structures
          if (node.className && typeof node.className === 'string') {
            // Look for user/assistant message patterns
            if (node.className.includes('group') && node.innerText) {
              const text = node.innerText.trim();
              if (text.length > 10) {
                console.log('🌍 Detected message via class (fallback method)');
                // Try to determine if it's user or assistant
                // This is a fallback and less reliable
              }
            }
          }
        }
      });
    });
  });

  // Find the main chat container
  const chatContainer = document.querySelector('main') || 
                        document.querySelector('[role="main"]') || 
                        document.querySelector('.flex.flex-col') ||
                        document.body;
  
  if (chatContainer) {
    observer.observe(chatContainer, {
      childList: true,
      subtree: true
    });
    console.log('🌍 Chat observer initialized successfully!');
    console.log('🌍 Monitoring container:', chatContainer.tagName);
  } else {
    console.warn('🌍 Could not find chat container, retrying...');
    setTimeout(observeChat, 1000);
  }
}

// Initialize when page is ready
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

// Also try to initialize after a short delay (in case DOM isn't ready)
setTimeout(() => {
  console.log('🌍 Delayed initialization attempt...');
  observeChat();
}, 2000);