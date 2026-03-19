# Sentiment eXposed - Chrome Extension

Colorizes tweets in your X/Twitter feed based on sentiment (green = positive, yellow = neutral, red = negative). Hover a tweet to see the detected emotion label.

## Setup

1. Open `config.js` and replace `YOUR_XAI_API_KEY_HERE` with your xAI API key
   - Get one at: https://console.x.ai/
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer Mode** (top right toggle)
4. Click **Load unpacked** and select this folder
5. Navigate to x.com — tweets will be colorized as you scroll

## How It Works

- **MutationObserver** watches for new tweets injected into the DOM as you scroll
- **IntersectionObserver** only queues tweets that have been visible for 1.2 seconds (avoids wasting API calls on tweets you scroll past instantly)
- Tweets are sent to xAI in **batches of 5** with an 800ms debounce after scrolling settles
- Results are **cached in memory** — revisiting the same tweet never fires a second API call
- A small **emotion badge** appears in the top-right of each analyzed tweet
- **Hover** any tweet for a tooltip showing sentiment + emotion

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension config |
| `config.js` | Your API key + tunable settings |
| `content.js` | Main logic — DOM watching, batching, API calls, rendering |
| `styles.css` | Badge + tooltip styles |
| `popup.html` | Toolbar popup legend |

## Tuning

All the knobs are in `config.js`:

- `BATCH_SIZE` — tweets per API call (default 5)
- `VISIBILITY_DELAY` — ms a tweet must be visible before queuing (default 1200)
- `DEBOUNCE_MS` — ms to wait after scroll settles before firing (default 800)
- `MODEL` — swap to a different Grok model if desired

## Notes

- The extension only runs on x.com / twitter.com
- API key is stored in plain text in config.js — do not distribute your personal copy with the key included
- X's DOM can change — if colorization stops working, the `data-testid="tweet"` selector may need updating

sentiment.exposed // @h45hb4ng
