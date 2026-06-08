// backend/services/resourceService.js

const axios = require("axios");

async function fetchDuckDuckGoResults(query) {
  try {
    const res = await axios.post(
      "https://google.serper.dev/search",
      { q: `${query} explained study notes tutorial academic`, num: 8 },
      {
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const results = res.data?.organic || [];
    const blockedDomains = ["youtube.com", "reddit.com", "twitter.com", "instagram.com", "facebook.com", "tiktok.com", "pinterest.com"];

    return results
      .filter((r) => !blockedDomains.some((d) => r.link.includes(d)))
      .slice(0, 5)
      .map((r) => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet,
        source: "duckduckgo",
      }));
  } catch (err) {
    console.error("Serper error:", err.message);
    return [];
  }
}

// ─── YouTube Search URLs (no API key) ──────────────────────────────
function getYouTubeSearchLinks(query) {
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
  try {
    const searchRes = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        list: "search",
        srsearch: query,
        format: "json",
        srlimit: 1,
      },
    });

    const topResult = searchRes.data.query.search[0];
    if (!topResult) return null;

    const title = topResult.title;

    const summaryRes = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );

    return {
      title: summaryRes.data.title,
      summary: summaryRes.data.extract,
      url: summaryRes.data.content_urls.desktop.page,
      thumbnail: summaryRes.data.thumbnail?.source || null,
      source: "wikipedia",
    };
  } catch (err) {
    console.error("Wikipedia API error:", err.message);
    return null;
  }
}

module.exports = {
  fetchDuckDuckGoResults,
  getYouTubeSearchLinks,
  fetchWikipediaSummary,
};