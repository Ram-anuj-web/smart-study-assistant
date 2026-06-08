// backend/services/resourceService.js

const axios = require("axios");

// ─── DuckDuckGo Search ──────────────────────────────────────────────
async function fetchDuckDuckGoResults(query) {
  try {
    const res = await axios.get("https://api.duckduckgo.com/", {
      params: {
        q: `${query} study tutorial`,
        format: "json",
        no_redirect: 1,
        no_html: 1,
      },
    });

    const results = [];

    // Main abstract result
    if (res.data.AbstractURL && res.data.AbstractText) {
      results.push({
        title: res.data.Heading,
        url: res.data.AbstractURL,
        snippet: res.data.AbstractText,
        source: "duckduckgo",
      });
    }

    // Related topics
    const related = res.data.RelatedTopics?.slice(0, 4)
      .filter((t) => t.FirstURL && t.Text)
      .map((t) => ({
        title: t.Text?.slice(0, 80),
        url: t.FirstURL,
        snippet: t.Text,
        source: "duckduckgo",
      })) || [];

    return [...results, ...related];
  } catch (err) {
    console.error("DuckDuckGo error:", err.message);
    return [];
  }
}

// ─── YouTube Search URLs (no API key) ──────────────────────────────
function getYouTubeSearchLinks(query) {
  const encoded = encodeURIComponent(query);
  return [
    {
      title: `"${query}" — Tutorials on YouTube`,
      url: `https://www.youtube.com/results?search_query=${encoded}+tutorial`,
      source: "youtube",
    },
    {
      title: `"${query}" — Lectures on YouTube`,
      url: `https://www.youtube.com/results?search_query=${encoded}+lecture`,
      source: "youtube",
    },
    {
      title: `"${query}" — Explained on YouTube`,
      url: `https://www.youtube.com/results?search_query=${encoded}+explained`,
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