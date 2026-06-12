// backend/services/resourceService.js

const axios = require("axios");

// ─── Adult content keyword blocklist ───────────────────────────────
const ADULT_KEYWORDS = [
  "porn", "pornography", "xxx", "sex", "nude", "naked", "erotic",
  "adult content", "hentai", "nsfw", "onlyfans", "escort", "fetish",
  "masturbat", "orgasm", "penis", "vagina", "breast", "nipple",
  "strip", "cam girl", "camgirl", "hooker", "prostitut", "hardcore",
];

const BLOCKED_DOMAINS = [
  "youtube.com", "reddit.com", "twitter.com", "instagram.com",
  "facebook.com", "tiktok.com", "pinterest.com",
  // Adult domains
  "pornhub.com", "xvideos.com", "xnxx.com", "xhamster.com",
  "onlyfans.com", "brazzers.com", "redtube.com", "youporn.com",
  "spankbang.com", "chaturbate.com",
];

// ─── Allowed academic domains (whitelist approach) ──────────────────
const ACADEMIC_DOMAINS = [
  "wikipedia.org", "britannica.com", "khan academy.org", "khanacademy.org",
  "coursera.org", "edx.org", "mit.edu", "stanford.edu", "scholar.google.com",
  "pubmed.ncbi.nlm.nih.gov", "ncbi.nlm.nih.gov", "jstor.org",
  "researchgate.net", "academia.edu", "arxiv.org", "springer.com",
  "sciencedirect.com", "nature.com", "ieee.org", "acm.org",
  "geeksforgeeks.org", "medium.com", "towardsdatascience.com",
  "docs.python.org", "developer.mozilla.org", "w3schools.com",
  "tutorialspoint.com", "stackoverflow.com",
];

/**
 * Returns true if the query contains adult/inappropriate content.
 */
function isAdultQuery(query) {
  const lower = query.toLowerCase();
  return ADULT_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Throws a user-facing error if the query is not study-appropriate.
 */
function validateQuery(query) {
  if (!query || query.trim().length < 2) {
    throw new Error("Please enter a valid study topic.");
  }
  if (isAdultQuery(query)) {
    throw new Error(
      "This tool is for academic study only. Please enter a subject, topic, or concept you'd like to learn about."
    );
  }
}

// ─── Serper Web Search ──────────────────────────────────────────────
async function fetchDuckDuckGoResults(query) {
  // Guard: reject adult queries immediately
  validateQuery(query);

  try {
    // Force academic framing in the actual search string
    const safeQuery = `${query} study notes tutorial academic site:edu OR site:org OR site:wikipedia.org`;

    const res = await axios.post(
      "https://google.serper.dev/search",
      {
        q: safeQuery,
        num: 10, // fetch more so filtering still leaves enough results
        safe: "active", // enable SafeSearch on Serper
      },
      {
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const results = res.data?.organic || [];

    return results
      .filter((r) => {
        const url = r.link?.toLowerCase() || "";
        const title = r.title?.toLowerCase() || "";
        const snippet = r.snippet?.toLowerCase() || "";

        // Block any result whose URL, title, or snippet looks adult
        const hasAdultContent =
          ADULT_KEYWORDS.some(
            (kw) => url.includes(kw) || title.includes(kw) || snippet.includes(kw)
          ) || BLOCKED_DOMAINS.some((d) => url.includes(d));

        return !hasAdultContent;
      })
      .slice(0, 5)
      .map((r) => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet,
        source: "article",
      }));
  } catch (err) {
    // Re-throw validation errors as-is; wrap others
    if (err.message.includes("academic study only")) throw err;
    console.error("Serper error:", err.message);
    return [];
  }
}

// ─── YouTube Search URLs ────────────────────────────────────────────
function getYouTubeSearchLinks(query) {
  // Guard: no YouTube links for adult queries
  validateQuery(query);

  const encoded = encodeURIComponent(query);
  return [
    {
      title: `"${query}" — Full Tutorial`,
      url: `https://www.youtube.com/results?search_query=${encoded}+full+tutorial`,
      source: "youtube",
    },
    {
      title: `"${query}" — Lecture / Course`,
      url: `https://www.youtube.com/results?search_query=${encoded}+lecture+course`,
      source: "youtube",
    },
    {
      title: `"${query}" — Explained Simply`,
      url: `https://www.youtube.com/results?search_query=${encoded}+explained+simply`,
      source: "youtube",
    },
  ];
}

// ─── Wikipedia Summary ──────────────────────────────────────────────
async function fetchWikipediaSummary(query) {
  validateQuery(query);

  const primaryQuery = query.split(",")[0].trim();
  const headers = {
    "User-Agent": "SmartStudyAssistant/1.0 (https://smart-study-assistant-vjt5.onrender.com; https://github.com/Ram-anuj-web)",
  };

  try {
    const searchRes = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        list: "search",
        srsearch: primaryQuery,
        format: "json",
        srlimit: 1,
      },
      headers, // ← add this
    });

    const topResult = searchRes.data.query.search[0];
    console.log("Wikipedia search result:", topResult);

    if (!topResult) return null;

    const title = topResult.title;

    if (isAdultQuery(title)) {
      console.log("Blocked: title flagged adult:", title);
      return null;
    }

    const summaryRes = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers } // ← add this too
    );

    const summary = summaryRes.data;

    if (isAdultQuery(summary.extract || "")) {
      console.log("Blocked: extract flagged adult");
      return null;
    }

    return {
      title: summary.title,
      summary: summary.extract,
      url: summary.content_urls.desktop.page,
      thumbnail: summary.thumbnail?.source || null,
      source: "wikipedia",
    };
  } catch (err) {
    console.error("Wikipedia API error:", err.message);
    if (err.message.includes("academic study only")) throw err;
    return null;
  }
}

module.exports = {
  fetchDuckDuckGoResults,
  getYouTubeSearchLinks,
  fetchWikipediaSummary,
  validateQuery,    // export so your route/controller can call it early
  isAdultQuery,     // export for unit testing
};