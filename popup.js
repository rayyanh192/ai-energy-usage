// Popup script for AI Carbon Tracker

// Conversion factors
const CONVERSIONS = {
  water: {
    cups: 0.237,      // liters per cup
    bottles: 0.5,     // liters per bottle
    bathtubs: 150,    // liters per bathtub
    pools: 50000      // liters per pool
  },
  energy: {
    phoneCharge: 0.012,  // kWh per phone charge
    bulbHour: 0.01       // kWh per hour of 10W bulb
  }
};

// Format numbers for display
function formatNumber(num, decimals = 2) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else if (num >= 1) {
    return num.toFixed(decimals);
  } else if (num >= 0.01) {
    return num.toFixed(decimals);
  } else if (num > 0) {
    return num.toFixed(4);
  }
  return '0';
}

// Display usage statistics
function displayUsage(total, session) {
  // Session stats
  document.getElementById('session-conversations').textContent = 
    session.conversationCount || 0;
  document.getElementById('session-energy').textContent = 
    formatNumber(session.totalEnergyWh || 0, 2);
  document.getElementById('session-water').textContent = 
    formatNumber(session.totalWaterLiters || 0, 3);

  // Total water conversions
  const totalWaterL = total.totalWaterLiters || 0;
  document.getElementById('total-water-cups').textContent = 
    formatNumber(totalWaterL / CONVERSIONS.water.cups, 1);
  document.getElementById('total-water-bottles').textContent = 
    formatNumber(totalWaterL / CONVERSIONS.water.bottles, 1);
  document.getElementById('total-water-bathtubs').textContent = 
    formatNumber(totalWaterL / CONVERSIONS.water.bathtubs, 3);
  document.getElementById('total-water-pools').textContent = 
    formatNumber(totalWaterL / CONVERSIONS.water.pools, 6);

  // Total energy conversions
  const totalEnergyKwh = (total.totalEnergyWh || 0) / 1000;
  document.getElementById('total-energy-kwh').textContent = 
    formatNumber(totalEnergyKwh, 4);
  document.getElementById('total-phone-charges').textContent = 
    formatNumber(totalEnergyKwh / CONVERSIONS.energy.phoneCharge, 1);
  document.getElementById('total-bulb-hours').textContent = 
    formatNumber(totalEnergyKwh / CONVERSIONS.energy.bulbHour, 1);

  // Total conversations
  document.getElementById('total-conversations-count').textContent = 
    total.conversationCount || 0;

  // Model breakdown
  displayModelBreakdown(total.modelBreakdown);
}

// Display model breakdown
function displayModelBreakdown(modelBreakdown) {
  if (!modelBreakdown || Object.keys(modelBreakdown).length === 0) {
    document.getElementById('model-breakdown-section').style.display = 'none';
    return;
  }

  document.getElementById('model-breakdown-section').style.display = 'block';
  const container = document.getElementById('model-breakdown-content');
  container.innerHTML = '';

  // Sort by count
  const models = Object.entries(modelBreakdown)
    .sort((a, b) => b[1].count - a[1].count);

  models.forEach(([model, stats]) => {
    const modelDiv = document.createElement('div');
    modelDiv.className = 'model-item';
    modelDiv.innerHTML = `
      <div class="model-name">${model}</div>
      <div class="model-stats">
        ${stats.count} conversations • ${formatNumber(stats.tokens)} tokens • ${formatNumber(stats.energyWh, 2)} Wh
      </div>
    `;
    container.appendChild(modelDiv);
  });
}

// Load and display data
async function loadData() {
  try {
    const result = await chrome.storage.local.get(['totalUsage', 'sessionUsage', 'toastEnabled']);
    
    const total = result.totalUsage || {
      totalTokens: 0,
      totalEnergyWh: 0,
      totalWaterLiters: 0,
      conversationCount: 0,
      modelBreakdown: {}
    };
    
    const session = result.sessionUsage || {
      totalTokens: 0,
      totalEnergyWh: 0,
      totalWaterLiters: 0,
      conversationCount: 0,
      startTime: Date.now(),
      modelBreakdown: {}
    };
    
    // Load toast setting (default to true)
    const toastEnabled = result.toastEnabled !== undefined ? result.toastEnabled : true;
    document.getElementById('toast-notifications').checked = toastEnabled;
    
    displayUsage(total, session);
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Reset session data
async function resetSession() {
  if (confirm('Reset this session\'s data? (Total data will be preserved)')) {
    await chrome.storage.local.set({
      sessionUsage: {
        totalTokens: 0,
        totalEnergyWh: 0,
        totalWaterLiters: 0,
        conversationCount: 0,
        startTime: Date.now(),
        modelBreakdown: {}
      }
    });
    
    // Update badge
    chrome.action.setBadgeText({ text: '' });
    
    loadData();
  }
}

// Reset all data
async function resetAll() {
  if (confirm('⚠️ Reset ALL data? This cannot be undone!')) {
    if (confirm('Are you absolutely sure? This will delete all tracking history.')) {
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
      
      // Update badge
      chrome.action.setBadgeText({ text: '' });
      
      loadData();
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  
  // Set up button listeners
  document.getElementById('reset-session').addEventListener('click', resetSession);
  document.getElementById('reset-all').addEventListener('click', resetAll);
  
  // Set up toast notification toggle
  document.getElementById('toast-notifications').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.local.set({ toastEnabled: enabled });
    console.log('Toast notifications:', enabled ? 'enabled' : 'disabled');
  });
  
  // Refresh data every 2 seconds while popup is open
  setInterval(loadData, 2000);
});