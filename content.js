// Content script for ChatGPT tracking
console.log('🌍 AI Carbon Tracker: Extension loaded!');
console.log('🌍 Current URL:', window.location.href);

// Notify background that we're active
chrome.runtime.sendMessage({
  type: 'PAGE_LOADED',
  site: 'chatgpt'
}).catch(err => console.log('Background message failed:', err));

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