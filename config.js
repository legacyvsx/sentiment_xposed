// ============================================================
// CONFIGURATION — replace with your own xAI API key
// Get one at: https://console.x.ai/
// ============================================================

const CONFIG = {
  API_KEY: "YOUR_XAI_API_KEY_HERE",
  MODEL: "grok-4-1-fast-non-reasoning",         // cheapest/fastest for high-volume use
  MAX_TOKENS: 60,               // we only need a short JSON response

  // Batching — how many tweets to send in one API call
  BATCH_SIZE: 5,

  // How long a tweet must be visible before queuing for analysis (ms)
  VISIBILITY_DELAY: 1200,

  // How long to wait after last tweet added before firing batch (ms)
  DEBOUNCE_MS: 800,

  // Sentiment colors (rgba so tweet content stays readable)
  COLORS: {
    positive: "rgba(34, 197, 94, 0.12)",   // green
    neutral:  "rgba(234, 179, 8, 0.12)",   // yellow
    negative: "rgba(239, 68, 68, 0.12)",   // red
  },

  // Emotion label text colors
  LABEL_COLORS: {
    positive: "#16a34a",
    neutral:  "#a16207",
    negative: "#dc2626",
  }
};
