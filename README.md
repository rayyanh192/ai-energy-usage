# 🌍 AI Carbon Footprint Tracker

A Chrome extension that tracks the energy and water consumption of your ChatGPT and Claude conversations.

## Features

- **Multi-Platform Support**: Tracks both ChatGPT and Claude conversations
- **Real-time Tracking**: Monitors every conversation automatically
- **🎉 Toast Notifications**: Instant popup showing usage after each response
- **Energy Metrics**: Calculate electricity usage in Wh and kWh
- **Water Metrics**: Track water consumption used for data center cooling
- **Multiple Scales**: See your usage in cups, bottles, bathtubs, swimming pools, phone charges, and more
- **Model Detection**: Automatically detects which AI model you're using
- **Platform Breakdown**: See usage split between ChatGPT and Claude
- **Model Breakdown**: See which specific models you use most
- **Session & Total Stats**: Track current session and all-time totals
- **Settings**: Toggle toast notifications on/off

## Installation

### Method 1: Load Unpacked (Developer Mode)

1. **Download the extension files**
   - Download or clone this repository

2. **Open Chrome Extensions**
   - Go to `chrome://extensions/`
   - Or click the three-dot menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the extension**
   - Click "Load unpacked"
   - Select the `ai-carbon-tracker` folder
   - The extension icon should appear in your toolbar

5. **Pin the extension (optional)**
   - Click the puzzle icon in your toolbar
   - Find "AI Carbon Footprint Tracker"
   - Click the pin icon to keep it visible

## Usage

1. **Visit ChatGPT or Claude**
   - Go to https://chatgpt.com (or https://chat.openai.com)
   - Or go to https://claude.ai
   - The extension automatically starts tracking

2. **Have conversations**
   - Use ChatGPT or Claude normally
   - Each conversation is tracked automatically
   - You'll see a badge on the extension icon with the session count
   - **NEW:** A toast notification appears after each response showing the usage!

3. **View your stats**
   - Click the extension icon to see your environmental impact
   - View combined stats across both platforms
   - See platform breakdown (ChatGPT vs Claude)
   - See model breakdown (which specific models you use)
   - View both session and all-time statistics

4. **Customize settings**
   - Toggle toast notifications on/off in the Settings section
   - Choose whether to see instant feedback after each response

5. **Reset data**
   - "Reset Session" - Clear current session (keeps total data)
   - "Reset All Data" - Clear everything (requires confirmation)

## How It Works

### Architecture

**Frontend (content.js)**
- Monitors ChatGPT page for new messages
- Detects which GPT model is being used
- Estimates token count from message length
- Calculates energy and water usage
- Sends data to background script

**Backend (background.js)**
- Receives usage data from all tabs
- Aggregates totals and breakdowns
- Stores data persistently
- Updates extension badge

**Popup UI (popup.html/js/css)**
- Displays statistics in multiple formats
- Refreshes in real-time
- Provides data management controls

### Calculation Methodology

**Token Estimation:**
- Uses ~4 characters per token (rough approximation)
- Counts both input (user) and output (AI) tokens

**Energy Consumption:**
| Model | Energy per 1000 tokens |
|-------|------------------------|
| GPT-3.5 Turbo | 0.5 Wh |
| GPT-4 | 2.0 Wh |
| GPT-4 Turbo | 1.5 Wh |
| O1 | 3.0 Wh |
| O1-mini | 1.0 Wh |

**Water Consumption:**
- Data centers use ~0.35 liters per kWh for cooling
- Formula: `water (L) = energy (kWh) × 0.35`

**Conversion Scales:**
- **Water**: Cups (237ml), Bottles (500ml), Bathtubs (150L), Pools (50,000L)
- **Energy**: Phone charges (0.012 kWh), Light bulb hours (0.01 kWh)

### Limitations

⚠️ **These are estimates based on published research:**
- Actual consumption varies by data center efficiency
- Token estimation is approximate
- Real-time streaming may affect accuracy
- Model detection may not be perfect for new models

## File Structure

```
ai-carbon-tracker/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content.js            # ChatGPT page monitor
├── popup.html            # UI structure
├── popup.js              # UI logic
├── popup.css             # UI styling
├── generate_icons.py     # Icon generator script
├── icons/
│   ├── icon16.png        # 16x16 icon
│   ├── icon48.png        # 48x48 icon
│   └── icon128.png       # 128x128 icon
└── README.md             # This file
```

## Development

### Modifying the Extension

1. Make changes to the files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload any ChatGPT tabs to apply changes

### Debugging

- **Content Script**: Open DevTools on ChatGPT page → Console
- **Background Script**: Click "Inspect views: service worker" on extension card
- **Popup**: Right-click extension icon → Inspect popup

### Custom Icons

To create custom icons:
1. Edit `generate_icons.py` or replace PNG files directly
2. Icons should be 16x16, 48x48, and 128x128 pixels
3. Run: `python3 generate_icons.py`

## Future Enhancements

Potential features to add:
- [ ] Support for Claude, DeepSeek, Gemini
- [ ] Export data to CSV/JSON
- [ ] Visualization graphs
- [ ] Daily/weekly reports
- [ ] Carbon offset suggestions
- [ ] Comparison with peers
- [ ] More accurate token counting (tiktoken library)
- [ ] API call interception for exact token counts
- [x] Toast notifications (✅ Added in v1.1.0)
- [ ] Customizable toast duration and position
- [ ] Sound notifications

## Privacy

- **No data collection**: All data stays local on your device
- **No external servers**: Extension doesn't communicate with any servers
- **Chrome storage only**: Uses chrome.storage.local
- **No message content stored**: Only metadata (token counts, timestamps)

## Research Sources

Estimates based on:
- "Power Hungry Processing: Watts Driving the Cost of AI Deployment?" (2023)
- "The Carbon Footprint of Machine Learning Training Will Plateau, Then Shrink" (2022)
- Data center cooling water usage reports from Google, Microsoft

## License

MIT License - Feel free to modify and distribute

## Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve calculations
- Add support for more chatbots

## Support

If you encounter issues:
1. Check the console for errors (F12)
2. Verify you're on chat.openai.com
3. Try reloading the extension
4. Check Chrome version compatibility (requires Manifest V3 support)

---

**Made with 🌍 for a more sustainable AI future**