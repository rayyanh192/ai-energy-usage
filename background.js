// Background service worker for AI Carbon Tracker

console.log('AI Carbon Tracker: Background service worker started');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_LOADED') {
    console.log(`Tracker active on ${message.site}`);
  } else if (message.type === 'USAGE_RECORDED') {
    aggregateUsage(message.data);
  }
});

// Aggregate usage data
async function aggregateUsage(newUsage) {
  try {
    // Get existing data from storage
    const result = await chrome.storage.local.get(['totalUsage', 'sessionUsage', 'history']);
    
    // Initialize or get total usage
    const totalUsage = result.totalUsage || {
      totalTokens: 0,
      totalEnergyWh: 0,
      totalWaterLiters: 0,
      conversationCount: 0,
      modelBreakdown: {}
    };
    
    // Initialize or get session usage
    const sessionUsage = result.sessionUsage || {
      totalTokens: 0,
      totalEnergyWh: 0,
      totalWaterLiters: 0,
      conversationCount: 0,
      startTime: Date.now(),
      modelBreakdown: {}
    };
    
    // Initialize or get history
    const history = result.history || [];
    
    // Update totals
    totalUsage.totalTokens += newUsage.totalTokens;
    totalUsage.totalEnergyWh += newUsage.energyWh;
    totalUsage.totalWaterLiters += newUsage.waterLiters;
    totalUsage.conversationCount += 1;
    
    // Update model breakdown for total
    if (!totalUsage.modelBreakdown[newUsage.model]) {
      totalUsage.modelBreakdown[newUsage.model] = {
        count: 0,
        tokens: 0,
        energyWh: 0
      };
    }
    totalUsage.modelBreakdown[newUsage.model].count += 1;
    totalUsage.modelBreakdown[newUsage.model].tokens += newUsage.totalTokens;
    totalUsage.modelBreakdown[newUsage.model].energyWh += newUsage.energyWh;
    
    // Update session
    sessionUsage.totalTokens += newUsage.totalTokens;
    sessionUsage.totalEnergyWh += newUsage.energyWh;
    sessionUsage.totalWaterLiters += newUsage.waterLiters;
    sessionUsage.conversationCount += 1;
    
    // Update model breakdown for session
    if (!sessionUsage.modelBreakdown[newUsage.model]) {
      sessionUsage.modelBreakdown[newUsage.model] = {
        count: 0,
        tokens: 0,
        energyWh: 0
      };
    }
    sessionUsage.modelBreakdown[newUsage.model].count += 1;
    sessionUsage.modelBreakdown[newUsage.model].tokens += newUsage.totalTokens;
    sessionUsage.modelBreakdown[newUsage.model].energyWh += newUsage.energyWh;
    
    // Add to history (keep last 100 interactions)
    history.push(newUsage);
    if (history.length > 100) {
      history.shift();
    }
    
    // Save everything to storage
    await chrome.storage.local.set({
      totalUsage: totalUsage,
      sessionUsage: sessionUsage,
      history: history,
      lastUpdated: Date.now()
    });
    
    console.log('Usage aggregated:', {
      conversations: totalUsage.conversationCount,
      energyWh: totalUsage.totalEnergyWh.toFixed(4),
      waterL: totalUsage.totalWaterLiters.toFixed(4)
    });
    
    // Update badge with session count
    updateBadge(sessionUsage.conversationCount);
    
  } catch (error) {
    console.error('Error aggregating usage:', error);
  }
}

// Update extension badge
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#10B981' }); // Green
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Reset badge when browser starts
chrome.runtime.onStartup.addListener(() => {
  updateBadge(0);
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('AI Carbon Tracker installed');
  
  // Initialize storage if needed
  const result = await chrome.storage.local.get(['totalUsage']);
  if (!result.totalUsage) {
    await chrome.storage.local.set({
      totalUsage: {
        totalTokens: 0,
        totalEnergyWh: 0,
        totalWaterLiters: 0,
        conversationCount: 0,
        modelBreakdown: {}
      },
      sessionUsage: {
        totalTokens: 0,
        totalEnergyWh: 0,
        totalWaterLiters: 0,
        conversationCount: 0,
        startTime: Date.now(),
        modelBreakdown: {}
      },
      history: []
    });
  }
});