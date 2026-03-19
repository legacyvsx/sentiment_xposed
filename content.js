// ============================================================
// X Sentiment Analyzer — content.js
// ============================================================

// -- State --
const analysisCache = {};
const pendingQueue = new Set();
const inFlight = new Set();
let debounceTimer = null;
let visibilityTimers = new WeakMap();

// -- Intersection Observer --
const intersectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const el = entry.target;
    if (entry.isIntersecting) {
      const timer = setTimeout(() => {
        queueTweet(el);
      }, CONFIG.VISIBILITY_DELAY);
      visibilityTimers.set(el, timer);
    } else {
      const timer = visibilityTimers.get(el);
      if (timer) {
        clearTimeout(timer);
        visibilityTimers.delete(el);
      }
    }
  });
}, { threshold: 0.5 });

// -- MutationObserver --
const mutationObserver = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      findTweetElements(node).forEach(registerTweet);
    });
  });
});

// -- Find tweet elements within a node --
function findTweetElements(root) {
  const results = [];
  if (root.querySelector && root.querySelector('[data-testid="tweetText"]')) {
    const article = root.closest('article') || root.querySelector('article');
    if (article) results.push(article);
  }
  if (root.querySelectorAll) {
    root.querySelectorAll('article[data-testid="tweet"]').forEach(el => results.push(el));
  }
  return [...new Set(results)];
}

// -- Register a tweet element --
function registerTweet(el) {
  if (el._sentimentRegistered) return;
  el._sentimentRegistered = true;

  const tweetId = getTweetId(el);
  if (!tweetId) return;

  if (analysisCache[tweetId]) {
    applyResult(el, analysisCache[tweetId]);
    return;
  }

  intersectionObserver.observe(el);
  addTooltipListener(el, tweetId);
}

// -- Extract tweet ID --
function getTweetId(el) {
  const link = el.querySelector('a[href*="/status/"]');
  if (!link) return null;
  const match = link.href.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

// -- Extract tweet text --
function getTweetText(el) {
  const textEl = el.querySelector('[data-testid="tweetText"]');
  return textEl ? textEl.innerText.trim() : null;
}

// -- Queue a tweet --
function queueTweet(el) {
  const tweetId = getTweetId(el);
  if (!tweetId) return;
  if (analysisCache[tweetId]) return;
  if (inFlight.has(tweetId)) return;

  el._tweetId = tweetId;
  pendingQueue.add(el);

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(flushQueue, CONFIG.DEBOUNCE_MS);
}

// -- Flush queue in batches --
async function flushQueue() {
  if (pendingQueue.size === 0) return;

  const batch = [];
  for (const el of pendingQueue) {
    if (batch.length >= CONFIG.BATCH_SIZE) break;
    const text = getTweetText(el);
    if (text) {
      batch.push({ el, id: el._tweetId, text });
      inFlight.add(el._tweetId);
    }
    pendingQueue.delete(el);
  }

  if (batch.length === 0) return;

  if (pendingQueue.size > 0) {
    debounceTimer = setTimeout(flushQueue, CONFIG.DEBOUNCE_MS);
  }

  try {
    const results = await analyzeBatch(batch.map(b => ({ id: b.id, text: b.text })));
    results.forEach(result => {
      const item = batch.find(b => b.id === result.id);
      if (!item) return;
      analysisCache[result.id] = result;
      inFlight.delete(result.id);
      applyResult(item.el, result);
    });
  } catch (err) {
    console.error("[XSentiment] API error:", err);
    batch.forEach(b => inFlight.delete(b.id));
  }
}

// -- Call xAI API --
async function analyzeBatch(tweets) {
  const prompt = `Analyze the sentiment and primary emotion of each tweet below.
Return ONLY a JSON array, no markdown, no explanation.
Each object must have: id (string), sentiment ("positive"/"neutral"/"negative"), emotion (one word, e.g. "joy", "anger", "fear", "sadness", "disgust", "surprise", "anticipation", "trust", "contempt", "neutral").

Tweets:
${tweets.map(t => `ID: ${t.id}\nText: ${t.text}`).join('\n\n')}`;

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CONFIG.API_KEY}`
    },
    body: JSON.stringify({
      model: CONFIG.MODEL,
      max_tokens: CONFIG.MAX_TOKENS * tweets.length,
      temperature: 0,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();
  const raw = data.choices[0].message.content.trim();
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// -- Apply color + badge --
function applyResult(el, result) {
  const color = CONFIG.COLORS[result.sentiment] || CONFIG.COLORS.neutral;
  el.style.backgroundColor = color;
  el.style.transition = "background-color 0.4s ease";
  el.style.borderRadius = "12px";

  if (!el.querySelector('.xsa-badge')) {
    const badge = document.createElement('span');
    badge.className = 'xsa-badge';
    badge.textContent = result.emotion.toUpperCase();
    badge.style.color = CONFIG.LABEL_COLORS[result.sentiment] || CONFIG.LABEL_COLORS.neutral;

    const userNameRow = el.querySelector('[data-testid="User-Name"]')
                     || el.querySelector('[data-testid="UserName"]');
    if (userNameRow) {
      userNameRow.appendChild(badge);
    }
  }
}

// -- Tooltip on hover --
function addTooltipListener(el, tweetId) {
  let tooltip = null;

  el.addEventListener('mouseenter', () => {
    const result = analysisCache[tweetId];
    if (!result) return;

    tooltip = document.createElement('div');
    tooltip.className = 'xsa-tooltip';
    tooltip.innerHTML = `
      <div class="xsa-tooltip-sentiment ${result.sentiment}">${result.sentiment.toUpperCase()}</div>
      <div class="xsa-tooltip-emotion">Emotion: <strong>${result.emotion}</strong></div>
    `;
    document.body.appendChild(tooltip);

    const rect = el.getBoundingClientRect();
    tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 8}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;
  });

  el.addEventListener('mouseleave', () => {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  });
}

// -- Initial scan --
function scanExisting() {
  document.querySelectorAll('article[data-testid="tweet"]').forEach(registerTweet);
}

// -- Boot --
function init() {
  scanExisting();
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  console.log("[XSentiment] Running — watching for tweets.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
