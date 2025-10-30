# Version 1.2.1 - Bug Fix

## What's Fixed

Fixed Claude tracking issues reported in console:

### Issue 1: Invalid querySelector Syntax
**Error:** `'button:has-text("Stop")' is not a valid selector`

**Fix:** Updated `isResponseComplete()` function to use valid querySelector syntax:
- Removed invalid `:has-text()` pseudo-selector
- Now checks button `aria-label` attributes
- Falls back to iterating through all buttons and checking text content
- Properly detects when Claude response is complete

### Issue 2: Too Many Duplicate Detections
**Problem:** Observer was triggering multiple times for the same message

**Fix:** 
- Added message ID tracking to prevent duplicate processing
- Uses `data-test-render-count` attribute as unique identifier
- Maintains a Set of processed message IDs
- Significantly reduces console spam

### Issue 3: Multiple Observer Initializations
**Problem:** Observer was being set up multiple times (at DOMContentLoaded, immediate, and delayed)

**Fix:**
- Added `initialized` flag to ensure single initialization
- Wrapped observer setup in `initializeOnce()` function
- All initialization paths now check flag first
- Prevents duplicate observers and excessive processing

### Issue 4: Better User vs Assistant Detection
**Improved Logic:**
- Filters out messages with less than 30 characters (noise)
- Uses time-based heuristic: first substantial message = user, next = assistant
- Tracks `window.lastUserMessageTime` to determine message order
- More reliable than just length-based detection

## How to Update

1. Download the updated `content-claude.js` file
2. Replace the old file in your extension directory
3. Go to `chrome://extensions/`
4. Click the reload button on AI Carbon Tracker
5. Refresh your Claude.ai tab
6. Test by sending a message

## What to Expect After Update

**Console Output Should Show:**
```
🌍 Extension loaded on Claude!
🌍 DOM already ready, initializing...
🌍 Initializing Claude tracker...
🌍 Setting up Claude chat observer...
🌍 Claude chat observer initialized successfully!
🌍 Monitoring container: MAIN
```

**When You Send a Message:**
```
🌍 New message detected, length: XXX
🌍 Preview: Your message...
🌍 Treating as user message
🌍 User message tracked: XX tokens
```

**When Claude Responds:**
```
🌍 New message detected, length: XXXX
🌍 Preview: Claude's response...
🌍 Treating as assistant message
🌍 Processing complete Claude response...
🌍 ✓ Tracked: XXX tokens (claude-sonnet-4.5), X.XXXX Wh
🌍 ✓ Usage data sent to background!
[Toast notification appears]
```

**You Should NOT See:**
- ❌ Multiple "Substantial content detected" spam
- ❌ "Uncaught SyntaxError" about querySelector
- ❌ Duplicate "Setting up Claude chat observer" messages
- ❌ 33 errors in console

## Testing Checklist

After updating, verify:
- [ ] No errors in console (press F12 on claude.ai)
- [ ] Clean initialization messages
- [ ] Send a message to Claude
- [ ] See user message tracked
- [ ] See assistant message tracked
- [ ] Toast notification appears
- [ ] Click extension icon
- [ ] Stats update correctly
- [ ] Platform breakdown shows Claude data

## Technical Details

### Changed Functions

**isResponseComplete():**
```javascript
// OLD (broken):
const stopButton = document.querySelector('button:has-text("Stop")');

// NEW (fixed):
const stopButton = document.querySelector('button[aria-label*="Stop"]');
// Plus fallback checking all buttons
```

**observeChat():**
```javascript
// Added:
- processedMessages Set for deduplication
- Message ID tracking
- 30-character minimum filter
- Time-based user/assistant detection
- Better logging
```

**Initialization:**
```javascript
// Added:
- initialized flag
- initializeOnce() wrapper function
- Prevents duplicate observers
```

## Version History

**1.2.1** - Bug Fix (Current)
- Fixed invalid querySelector syntax
- Reduced duplicate detections
- Improved message classification
- Single initialization guarantee

**1.2.0** - Claude Integration
- Added Claude support
- Platform breakdown
- Multi-platform tracking

**1.1.0** - Toast Notifications
- Added toast feature

**1.0.1** - Domain Fix
- Fixed chatgpt.com support

**1.0.0** - Initial Release
- ChatGPT tracking

---

## Files Changed

- `content-claude.js` - Fixed Claude detection logic
- `manifest.json` - Version bumped to 1.2.1

## No Breaking Changes

This is a bug fix release. All existing data and functionality preserved.

---

**Download updated extension:** [ai-carbon-tracker](computer:///mnt/user-data/outputs/ai-carbon-tracker)

The Claude tracking should now work smoothly without errors! 🎉