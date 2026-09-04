#!/usr/bin/env node

/**
 * Download media artwork from a Media Rankings .xlsx workbook.
 *
 * Output:
 *   src/assets/media/<media-type>/<slug>.jpg
 *   src/data/media-images.json
 *
 * Sources:
 *   Movies / TV Shows / Animes / Cartoons -> TMDB
 *   Books / Comics -> Google Books
 *   Mangas / Manwhas / Light Novels -> AniList
 *
 * Usage:
 *   npm i xlsx dotenv
 *
 *   Create .env in the project root:
 *     TMDB_BEARER_TOKEN=your_tmdb_read_access_token
 *
 *   Then:
 *     node scripts/download-media-images.mjs "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
 *
 * Optional:
 *     node scripts/download-media-images.mjs "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit" --overwrite
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import XLSX from "xlsx";
import dotenv from "dotenv";

dotenv.config();

const PROJECT_ROOT = process.cwd();
const OUT_ROOT = path.join(PROJECT_ROOT, "src", "assets", "media");
const MANIFEST_PATH = path.join(PROJECT_ROOT, "src", "data", "media-images.json");
const CACHE_PATH = path.join(PROJECT_ROOT, ".data", "media-image-cache.json");

const MEDIA_TYPES = [
  "Movies",
  "TV Shows",
  "Animes",
  "Cartoons",
  "Books",
  "Mangas",
  "Manwhas",
  "Light Novels",
  "Comics",
];

const SOURCE_SHEETS = ["Diary", "Legacy", "Want to Consume"];

const TMDB_TOKEN = process.env.TMDB_BEARER_TOKEN || "";
const OVERWRITE = process.argv.includes("--overwrite");
const workbookArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

if (!workbookArg) {
  console.error(
    'Usage: node scripts/download-media-images.mjs "<Google Sheet URL or XLSX path>" [--overwrite]'
  );
  process.exit(1);
}

const isGoogleSheetUrl =
  /^https:\/\/docs\.google\.com\/spreadsheets\/d\//i.test(workbookArg);

let WORKBOOK_PATH = null;

function googleSheetExportUrl(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error("Could not read Google Sheet ID from URL.");
  }

  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
}

async function resolveWorkbookPath() {
  if (!isGoogleSheetUrl) {
    WORKBOOK_PATH = path.resolve(workbookArg);

    if (!fs.existsSync(WORKBOOK_PATH)) {
      throw new Error(`Workbook not found:\n${WORKBOOK_PATH}`);
    }

    return WORKBOOK_PATH;
  }

  const exportUrl = googleSheetExportUrl(workbookArg);
  const tempDir = path.join(PROJECT_ROOT, ".data");
  fs.mkdirSync(tempDir, { recursive: true });

  const tempPath = path.join(tempDir, "media-rankings-download.xlsx");

  console.log("Downloading Google Sheet as XLSX...");

  const response = await fetch(exportUrl, {
    redirect: "follow",
    headers: {
      "User-Agent": "personal-dashboards-site/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Could not download Google Sheet (${response.status}). ` +
      `Make sure the sheet is shared so anyone with the link can view it.`
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (
    !contentType.includes("spreadsheet") &&
    !contentType.includes("excel") &&
    !contentType.includes("octet-stream")
  ) {
    throw new Error(
      "Google returned a page instead of the spreadsheet. " +
      "Make sure sharing is set to 'Anyone with the link' → Viewer."
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tempPath, bytes);

  WORKBOOK_PATH = tempPath;
  return WORKBOOK_PATH;
}

fs.mkdirSync(OUT_ROOT, { recursive: true });
fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function remainingMs(deadline) {
  return Math.max(0, deadline - Date.now());
}

function ensureTime(deadline, label = "book") {
  if (remainingMs(deadline) <= 0) {
    throw new Error(`${label} lookup exceeded 30 seconds`);
  }
}

async function withDeadline(promiseFactory, deadline, label) {
  ensureTime(deadline, label);

  const ms = remainingMs(deadline);

  return Promise.race([
    promiseFactory(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} lookup exceeded 30 seconds`)),
        ms
      )
    ),
  ]);
}


const RATE_LIMITS = {
  tmdb: 180,
  googleBooks: 1800,
  anilist: 1000,
  imageDownload: 120,
  isbnCover: 300,
  openLibrarySearch: 900,
  tvmaze: 500,
  kitsu: 700,
  jikan: 1200,
};

const MAX_RETRIES = 3;
const BOOK_MAX_MS = 60000;
const TITLE_MAX_MS = 60000;

async function fetchWithRetry(
  url,
  options = {},
  service = "generic",
  deadline = null,
  maxRetries = MAX_RETRIES
) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    if (deadline) ensureTime(deadline, service);

    let response;

    try {
      response = await fetch(url, options);
    } catch (err) {
      if (attempt >= maxRetries) throw err;

      let waitMs = Math.min(1500 * Math.pow(2, attempt), 6000);

      if (deadline) {
        waitMs = Math.min(waitMs, Math.max(0, remainingMs(deadline) - 250));
        if (waitMs <= 0) throw err;
      }

      console.log(
        `  ${service} network error. Retrying in ${Math.round(waitMs / 1000)}s...`
      );

      await sleep(waitMs);
      attempt++;
      continue;
    }

    if (response.status !== 429 && response.status < 500) {
      return response;
    }

    if (attempt >= maxRetries) {
      return response;
    }

    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader
      ? Number(retryAfterHeader)
      : NaN;

    let waitMs;

    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      waitMs = retryAfterSeconds * 1000;
    } else {
      const base =
        service === "googleBooks"
          ? 3000
          : service === "anilist"
            ? 3000
            : 1200;

      waitMs = Math.min(base * Math.pow(2, attempt), 8000);
    }

    if (deadline) {
      waitMs = Math.min(waitMs, Math.max(0, remainingMs(deadline) - 250));
      if (waitMs <= 0) return response;
    }

    console.log(
      `  ${service} returned ${response.status}. Retrying in ${Math.round(waitMs / 1000)}s...`
    );

    await sleep(waitMs);
    attempt++;
  }

  throw new Error(`${service} request failed after retries`);
}

async function throttledFetch(
  url,
  options = {},
  service = "generic",
  deadline = null,
  maxRetries = MAX_RETRIES
) {
  const delay = RATE_LIMITS[service] || 250;

  if (deadline) {
    ensureTime(deadline, service);
    const actualDelay = Math.min(delay, Math.max(0, remainingMs(deadline) - 250));
    if (actualDelay > 0) await sleep(actualDelay);
  } else {
    await sleep(delay);
  }

  return fetchWithRetry(url, options, service, deadline, maxRetries);
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeKey(value) {
  return cleanText(value).toLowerCase();
}

function titleKey(mediaType, name) {
  return `${normalizeKey(mediaType)}|${normalizeKey(name)}`;
}

function safeSlug(value) {
  return cleanText(value)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .slice(0, 120) || "untitled";
}

function mediaFolder(mediaType) {
  const map = {
    Movies: "movies",
    "TV Shows": "tv-shows",
    Animes: "animes",
    Cartoons: "cartoons",
    Books: "books",
    Mangas: "mangas",
    Manwhas: "manwhas",
    "Light Novels": "light-novels",
    Comics: "comics",
  };

  return map[mediaType] || safeSlug(mediaType);
}

function numericYear(value) {
  if (typeof value === "number" && value >= 1000 && value <= 3000) {
    return Math.trunc(value);
  }

  const match = cleanText(value).match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? Number(match[1]) : null;
}

function cleanISBN(value) {
  const digits = cleanText(value).replace(/\D/g, "");
  return digits.length === 10 || digits.length === 13 ? digits : "";
}

function readWorkbookTitles(filePath) {
  const wb = XLSX.readFile(filePath, {
    cellDates: true,
    raw: false,
  });

  const all = new Map();

  // Lower number = higher precedence.
  const precedence = {
    Diary: 1,
    Legacy: 2,
    "Want to Consume": 3,
  };

  for (const sheetName of SOURCE_SHEETS) {
    const sheet = wb.Sheets[sheetName];

    if (!sheet) {
      console.warn(`Sheet not found: ${sheetName}`);
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    });

    for (const row of rows) {
      const mediaType = cleanText(row["Media Type"]);
      const name = cleanText(row["Name"]);

      if (!MEDIA_TYPES.includes(mediaType) || !name) {
        continue;
      }

      const key = titleKey(mediaType, name);

      const candidate = {
        key,
        mediaType,
        name,
        releaseYear: numericYear(row["Release / Release Date"]),
        directorAuthor: cleanText(row["Director / Author"]),
        isbn13: cleanISBN(row["ISBN13"]),
        sourceSheet: sheetName,
        precedence: precedence[sheetName],
      };

      if (!all.has(key)) {
        all.set(key, candidate);
        continue;
      }

      const existing = all.get(key);

      // Keep the higher-precedence source as the base, but backfill blank metadata.
      if (candidate.precedence < existing.precedence) {
        all.set(key, {
          ...candidate,
          releaseYear: candidate.releaseYear || existing.releaseYear,
          directorAuthor: candidate.directorAuthor || existing.directorAuthor,
          isbn13: candidate.isbn13 || existing.isbn13,
        });
      } else {
        existing.releaseYear ||= candidate.releaseYear;
        existing.directorAuthor ||= candidate.directorAuthor;
        existing.isbn13 ||= candidate.isbn13;
      }
    }
  }

  return [...all.values()].sort((a, b) => {
    const mt = MEDIA_TYPES.indexOf(a.mediaType) - MEDIA_TYPES.indexOf(b.mediaType);
    return mt || a.name.localeCompare(b.name);
  });
}

function loadJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJSON(filePath, value) {
  const data = JSON.stringify(value, null, 2) + "\n";

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.writeFileSync(filePath, data, "utf8");
      return;
    } catch (err) {
      if (attempt === 4) {
        throw err;
      }

      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100 * (attempt + 1));
    }
  }
}

async function fetchJSON(
  url,
  options = {},
  service = "generic",
  deadline = null,
  maxRetries = MAX_RETRIES
) {
  const response = await throttledFetch(
    url,
    {
      ...options,
      headers: {
        "User-Agent": "personal-dashboards-site/1.0",
        ...(options.headers || {}),
      },
    },
    service,
    deadline,
    maxRetries
  );

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

function chooseByYear(results, requestedYear, dateFields) {
  if (!results?.length) return null;
  if (!requestedYear) return results[0];

  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const item of results) {
    let year = null;

    for (const field of dateFields) {
      const val = item[field];
      const match = cleanText(val).match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
      if (match) {
        year = Number(match[1]);
        break;
      }
    }

    const score = year ? Math.abs(year - requestedYear) : 9999;

    if (score < bestScore) {
      best = item;
      bestScore = score;
    }
  }

  return best || results[0];
}

/* -------------------- TMDB -------------------- */

async function tmdbSearch(item, deadline = null) {
  if (!TMDB_TOKEN) {
    throw new Error(
      "TMDB_BEARER_TOKEN is missing. Add it to a .env file in the project root."
    );
  }

  const headers = {
    Authorization: `Bearer ${TMDB_TOKEN}`,
    accept: "application/json",
  };

  let endpoint;

  if (item.mediaType === "Movies") {
    endpoint = "movie";
  } else if (item.mediaType === "TV Shows") {
    endpoint = "tv";
  } else {
    endpoint = "multi";
  }

  const url =
    `https://api.themoviedb.org/3/search/${endpoint}` +
    `?query=${encodeURIComponent(item.name)}` +
    `&include_adult=false&language=en-US&page=1`;

  const data = await fetchJSON(url, { headers }, "tmdb", deadline, 1);

  let results = (data.results || []).filter((r) => {
    if (!r.poster_path) return false;

    if (endpoint === "multi") {
      return r.media_type === "movie" || r.media_type === "tv";
    }

    return true;
  });

  const selected = chooseByYear(
    results,
    item.releaseYear,
    ["release_date", "first_air_date"]
  );

  if (!selected?.poster_path) return null;

  return {
    source: "TMDB",
    remoteUrl: `https://image.tmdb.org/t/p/w780${selected.poster_path}`,
    matchTitle: selected.title || selected.name || item.name,
    matchYear:
      numericYear(selected.release_date) ||
      numericYear(selected.first_air_date),
    sourceId: selected.id,
  };
}

/* -------------------- Direct ISBN Covers -------------------- */

async function directISBNCover(item, deadline) {
  if (!item.isbn13) return null;

  const remoteUrl =
    `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(item.isbn13)}-L.jpg?default=false`;

  try {
    const response = await fetchWithRetry(
      remoteUrl,
      {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "personal-dashboards-site/1.0",
          Accept: "image/*",
        },
      },
      "isbnCover",
      deadline,
      1
    );

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 1500) return null;

    return {
      source: "Open Library ISBN Cover",
      remoteUrl,
      matchTitle: item.name,
      matchYear: item.releaseYear,
      sourceId: item.isbn13,
    };
  } catch (err) {
    console.warn(`  Direct ISBN cover failed: ${err.message}`);
    return null;
  }
}

/* -------------------- Open Library Search -------------------- */

async function openLibrarySearch(item, deadline) {
  ensureTime(deadline, "Open Library");

  const params = new URLSearchParams({
    title: item.name,
    fields: "title,author_name,first_publish_year,cover_i,key",
    limit: "5",
  });

  if (item.directorAuthor) {
    params.set("author", item.directorAuthor);
  }

  const url = `https://openlibrary.org/search.json?${params.toString()}`;

  let response;

  try {
    response = await throttledFetch(
      url,
      {
        headers: {
          "User-Agent": "personal-dashboards-site/1.0",
          Accept: "application/json",
        },
      },
      "openLibrarySearch",
      deadline,
      1
    );
  } catch (err) {
    console.warn(`  Open Library search failed: ${err.message}`);
    return null;
  }

  if (!response.ok) return null;

  const data = await response.json();
  const docs = (data.docs || []).filter((d) => d.cover_i);

  if (!docs.length) return null;

  let selected = docs[0];

  if (item.releaseYear) {
    let bestScore = Number.POSITIVE_INFINITY;

    for (const doc of docs) {
      const y = Number(doc.first_publish_year || 0);
      const score = y ? Math.abs(y - item.releaseYear) : 9999;

      if (score < bestScore) {
        selected = doc;
        bestScore = score;
      }
    }
  }

  return {
    source: "Open Library",
    remoteUrl: `https://covers.openlibrary.org/b/id/${selected.cover_i}-L.jpg`,
    matchTitle: selected.title || item.name,
    matchYear: selected.first_publish_year || null,
    sourceId: selected.key || selected.cover_i,
  };
}

/* -------------------- Google Books -------------------- */

async function googleBooksSearch(item, deadline = null) {
  const query = item.isbn13
    ? `isbn:${item.isbn13}`
    : [
        `intitle:${item.name}`,
        item.directorAuthor ? `inauthor:${item.directorAuthor}` : "",
      ]
        .filter(Boolean)
        .join("+");

  const url =
    "https://www.googleapis.com/books/v1/volumes" +
    `?q=${encodeURIComponent(query)}&maxResults=10&printType=books`;

  const data = await fetchJSON(url, {}, "googleBooks", deadline, 1);
  const results = data.items || [];

  if (!results.length) return null;

  let selected = null;

  if (item.isbn13) {
    selected = results[0];
  } else {
    selected = chooseByYear(
      results.map((x) => ({
        ...x,
        publishedDate: x.volumeInfo?.publishedDate,
      })),
      item.releaseYear,
      ["publishedDate"]
    );
  }

  const info = selected?.volumeInfo;

  if (!info) return null;

  const imageLinks = info.imageLinks || {};

  let remoteUrl =
    imageLinks.extraLarge ||
    imageLinks.large ||
    imageLinks.medium ||
    imageLinks.small ||
    imageLinks.thumbnail ||
    imageLinks.smallThumbnail ||
    null;

  if (!remoteUrl) return null;

  remoteUrl = remoteUrl
    .replace(/^http:/, "https:")
    .replace("&edge=curl", "")
    .replace("zoom=1", "zoom=3");

  return {
    source: "Google Books",
    remoteUrl,
    matchTitle: info.title || item.name,
    matchYear: numericYear(info.publishedDate),
    sourceId: selected.id || null,
  };
}

/* -------------------- AniList -------------------- */

async function anilistSearch(item, deadline = null) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: MANGA) {
        id
        title {
          romaji
          english
          native
        }
        startDate {
          year
        }
        coverImage {
          extraLarge
          large
        }
      }
    }
  `;

  const response = await throttledFetch(
    "https://graphql.anilist.co",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "personal-dashboards-site/1.0",
      },
      body: JSON.stringify({
        query,
        variables: { search: item.name },
      }),
    },
    "anilist",
    deadline,
    1
  );

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const media = data?.data?.Media;

  if (!media) return null;

  const remoteUrl =
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    null;

  if (!remoteUrl) return null;

  return {
    source: "AniList",
    remoteUrl,
    matchTitle:
      media.title?.english ||
      media.title?.romaji ||
      media.title?.native ||
      item.name,
    matchYear: media.startDate?.year || null,
    sourceId: media.id || null,
  };
}

async function findBookArtwork(item) {
  const deadline = Date.now() + BOOK_MAX_MS;

  // 1) Direct ISBN cover
  if (item.isbn13) {
    try {
      const direct = await withDeadline(
        () => directISBNCover(item, deadline),
        deadline,
        "Direct ISBN cover"
      );

      if (direct) return direct;
    } catch (err) {
      console.warn(`  Direct ISBN cover skipped: ${err.message}`);
    }
  }

  // 2) Open Library title/author search
  try {
    const openLibrary = await withDeadline(
      () => openLibrarySearch(item, deadline),
      deadline,
      "Open Library"
    );

    if (openLibrary) return openLibrary;
  } catch (err) {
    console.warn(`  Open Library skipped: ${err.message}`);
  }

  // 3) Google Books last
  try {
    ensureTime(deadline, "Google Books");

    console.log("  Trying Google Books fallback...");

    const google = await withDeadline(
      () => googleBooksSearch(item, deadline),
      deadline,
      "Google Books"
    );

    if (google) return google;
  } catch (err) {
    console.warn(`  Google Books skipped: ${err.message}`);
  }

  // 4) Hard stop
  return null;
}


/* -------------------- TVmaze -------------------- */

async function tvmazeSearch(item, deadline) {
  const url =
    "https://api.tvmaze.com/search/shows?q=" +
    encodeURIComponent(item.name);

  try {
    const response = await throttledFetch(
      url,
      {
        headers: {
          "User-Agent": "personal-dashboards-site/1.0",
          Accept: "application/json",
        },
      },
      "tvmaze",
      deadline,
      1
    );

    if (!response.ok) return null;

    const results = await response.json();

    const candidates = (results || [])
      .map((x) => x.show)
      .filter((show) => show && (show.image?.original || show.image?.medium));

    if (!candidates.length) return null;

    let selected = candidates[0];

    if (item.releaseYear) {
      let bestScore = Number.POSITIVE_INFINITY;

      for (const show of candidates) {
        const y = numericYear(show.premiered);
        const score = y ? Math.abs(y - item.releaseYear) : 9999;

        if (score < bestScore) {
          selected = show;
          bestScore = score;
        }
      }
    }

    return {
      source: "TVmaze",
      remoteUrl: selected.image?.original || selected.image?.medium,
      matchTitle: selected.name || item.name,
      matchYear: numericYear(selected.premiered),
      sourceId: selected.id || null,
    };
  } catch (err) {
    console.warn(`  TVmaze failed: ${err.message}`);
    return null;
  }
}


/* -------------------- Jikan / MyAnimeList -------------------- */

async function jikanSearch(item, kind, deadline) {
  const endpoint = kind === "anime" ? "anime" : "manga";

  const url =
    `https://api.jikan.moe/v4/${endpoint}` +
    `?q=${encodeURIComponent(item.name)}&limit=5&sfw=true`;

  try {
    const response = await throttledFetch(
      url,
      {
        headers: {
          "User-Agent": "personal-dashboards-site/1.0",
          Accept: "application/json",
        },
      },
      "jikan",
      deadline,
      1
    );

    if (!response.ok) return null;

    const data = await response.json();
    const results = (data.data || []).filter((x) => {
      const img =
        x.images?.jpg?.large_image_url ||
        x.images?.jpg?.image_url ||
        x.images?.webp?.large_image_url ||
        x.images?.webp?.image_url;

      return !!img;
    });

    if (!results.length) return null;

    let selected = results[0];

    if (item.releaseYear) {
      let bestScore = Number.POSITIVE_INFINITY;

      for (const result of results) {
        const year =
          result.year ||
          numericYear(result.aired?.from) ||
          numericYear(result.published?.from);

        const score = year ? Math.abs(year - item.releaseYear) : 9999;

        if (score < bestScore) {
          selected = result;
          bestScore = score;
        }
      }
    }

    const remoteUrl =
      selected.images?.jpg?.large_image_url ||
      selected.images?.webp?.large_image_url ||
      selected.images?.jpg?.image_url ||
      selected.images?.webp?.image_url ||
      null;

    if (!remoteUrl) return null;

    return {
      source: "Jikan / MyAnimeList",
      remoteUrl,
      matchTitle:
        selected.title_english ||
        selected.title ||
        item.name,
      matchYear:
        selected.year ||
        numericYear(selected.aired?.from) ||
        numericYear(selected.published?.from),
      sourceId: selected.mal_id || null,
    };
  } catch (err) {
    console.warn(`  Jikan failed: ${err.message}`);
    return null;
  }
}


/* -------------------- Kitsu -------------------- */

async function kitsuSearch(item, kind, deadline) {
  const endpoint = kind === "anime" ? "anime" : "manga";

  const url =
    `https://kitsu.io/api/edge/${endpoint}` +
    `?filter[text]=${encodeURIComponent(item.name)}` +
    `&page[limit]=5`;

  try {
    const response = await throttledFetch(
      url,
      {
        headers: {
          "User-Agent": "personal-dashboards-site/1.0",
          Accept: "application/vnd.api+json",
        },
      },
      "kitsu",
      deadline,
      1
    );

    if (!response.ok) return null;

    const data = await response.json();
    const results = data.data || [];

    if (!results.length) return null;

    let selected = results[0];

    if (item.releaseYear) {
      let bestScore = Number.POSITIVE_INFINITY;

      for (const result of results) {
        const attrs = result.attributes || {};
        const year =
          numericYear(attrs.startDate) ||
          numericYear(attrs.createdAt);

        const score = year ? Math.abs(year - item.releaseYear) : 9999;

        if (score < bestScore) {
          selected = result;
          bestScore = score;
        }
      }
    }

    const attrs = selected.attributes || {};

    const remoteUrl =
      attrs.posterImage?.original ||
      attrs.posterImage?.large ||
      attrs.posterImage?.medium ||
      null;

    if (!remoteUrl) return null;

    return {
      source: "Kitsu",
      remoteUrl,
      matchTitle:
        attrs.titles?.en ||
        attrs.titles?.en_jp ||
        attrs.canonicalTitle ||
        item.name,
      matchYear:
        numericYear(attrs.startDate),
      sourceId: selected.id || null,
    };
  } catch (err) {
    console.warn(`  Kitsu failed: ${err.message}`);
    return null;
  }
}


/* -------------------- Multi-source category helpers -------------------- */

async function findAnimeArtwork(item) {
  const deadline = Date.now() + TITLE_MAX_MS;

  const attempts = [
    ["AniList", () => anilistSearch(item, deadline)],
    ["Jikan", () => jikanSearch(item, "anime", deadline)],
    ["Kitsu", () => kitsuSearch(item, "anime", deadline)],
    ["TMDB", () => tmdbSearch(item, deadline)],
  ];

  for (const [label, fn] of attempts) {
    if (remainingMs(deadline) <= 0) break;

    try {
      const result = await withDeadline(fn, deadline, label);
      if (result) return result;
    } catch (err) {
      console.warn(`  ${label} skipped: ${err.message}`);
    }
  }

  return null;
}


async function findCartoonArtwork(item) {
  const deadline = Date.now() + TITLE_MAX_MS;

  const attempts = [
    ["TMDB", () => tmdbSearch(item, deadline)],
    ["TVmaze", () => tvmazeSearch(item, deadline)],
  ];

  for (const [label, fn] of attempts) {
    if (remainingMs(deadline) <= 0) break;

    try {
      const result = await withDeadline(fn, deadline, label);
      if (result) return result;
    } catch (err) {
      console.warn(`  ${label} skipped: ${err.message}`);
    }
  }

  return null;
}


async function findTVArtwork(item) {
  const deadline = Date.now() + TITLE_MAX_MS;

  const attempts = [
    ["TMDB", () => tmdbSearch(item, deadline)],
    ["TVmaze", () => tvmazeSearch(item, deadline)],
  ];

  for (const [label, fn] of attempts) {
    if (remainingMs(deadline) <= 0) break;

    try {
      const result = await withDeadline(fn, deadline, label);
      if (result) return result;
    } catch (err) {
      console.warn(`  ${label} skipped: ${err.message}`);
    }
  }

  return null;
}


async function findMangaArtwork(item) {
  const deadline = Date.now() + TITLE_MAX_MS;

  const attempts = [
    ["AniList", () => anilistSearch(item, deadline)],
    ["Jikan", () => jikanSearch(item, "manga", deadline)],
    ["Kitsu", () => kitsuSearch(item, "manga", deadline)],
  ];

  for (const [label, fn] of attempts) {
    if (remainingMs(deadline) <= 0) break;

    try {
      const result = await withDeadline(fn, deadline, label);
      if (result) return result;
    } catch (err) {
      console.warn(`  ${label} skipped: ${err.message}`);
    }
  }

  if (item.isbn13 && remainingMs(deadline) > 0) {
    try {
      const direct = await withDeadline(
        () => directISBNCover(item, deadline),
        deadline,
        "ISBN cover"
      );
      if (direct) return direct;
    } catch (err) {
      console.warn(`  ISBN cover skipped: ${err.message}`);
    }
  }

  return null;
}


async function findLightNovelArtwork(item) {
  const deadline = Date.now() + TITLE_MAX_MS;

  const attempts = [
    ["AniList", () => anilistSearch(item, deadline)],
    ["Kitsu", () => kitsuSearch(item, "manga", deadline)],
  ];

  for (const [label, fn] of attempts) {
    if (remainingMs(deadline) <= 0) break;

    try {
      const result = await withDeadline(fn, deadline, label);
      if (result) return result;
    } catch (err) {
      console.warn(`  ${label} skipped: ${err.message}`);
    }
  }

  if (item.isbn13 && remainingMs(deadline) > 0) {
    try {
      const direct = await withDeadline(
        () => directISBNCover(item, deadline),
        deadline,
        "ISBN cover"
      );
      if (direct) return direct;
    } catch (err) {
      console.warn(`  ISBN cover skipped: ${err.message}`);
    }
  }

  if (remainingMs(deadline) > 0) {
    try {
      const google = await withDeadline(
        () => googleBooksSearch(item, deadline),
        deadline,
        "Google Books"
      );
      if (google) return google;
    } catch (err) {
      console.warn(`  Google Books skipped: ${err.message}`);
    }
  }

  return null;
}


async function findComicArtwork(item) {
  const deadline = Date.now() + TITLE_MAX_MS;

  if (item.isbn13) {
    try {
      const direct = await withDeadline(
        () => directISBNCover(item, deadline),
        deadline,
        "ISBN cover"
      );
      if (direct) return direct;
    } catch (err) {
      console.warn(`  ISBN cover skipped: ${err.message}`);
    }
  }

  if (remainingMs(deadline) > 0) {
    try {
      const openLibrary = await withDeadline(
        () => openLibrarySearch(item, deadline),
        deadline,
        "Open Library"
      );
      if (openLibrary) return openLibrary;
    } catch (err) {
      console.warn(`  Open Library skipped: ${err.message}`);
    }
  }

  if (remainingMs(deadline) > 0) {
    try {
      const google = await withDeadline(
        () => googleBooksSearch(item, deadline),
        deadline,
        "Google Books"
      );
      if (google) return google;
    } catch (err) {
      console.warn(`  Google Books skipped: ${err.message}`);
    }
  }

  return null;
}

/* -------------------- lookup routing -------------------- */

async function findArtwork(item) {
  if (item.mediaType === "Movies") {
    const deadline = Date.now() + TITLE_MAX_MS;
    return withDeadline(
      () => tmdbSearch(item, deadline),
      deadline,
      "TMDB"
    );
  }

  if (item.mediaType === "TV Shows") {
    return findTVArtwork(item);
  }

  if (item.mediaType === "Animes") {
    return findAnimeArtwork(item);
  }

  if (item.mediaType === "Cartoons") {
    return findCartoonArtwork(item);
  }

  if (item.mediaType === "Books") {
    return findBookArtwork(item);
  }

  if (item.mediaType === "Mangas") {
    return findMangaArtwork(item);
  }

  if (item.mediaType === "Manwhas") {
    return findMangaArtwork(item);
  }

  if (item.mediaType === "Light Novels") {
    return findLightNovelArtwork(item);
  }

  if (item.mediaType === "Comics") {
    return findComicArtwork(item);
  }

  return null;
}

function guessExtension(remoteUrl, contentType) {
  const lowerType = cleanText(contentType).toLowerCase();

  if (lowerType.includes("png")) return ".png";
  if (lowerType.includes("webp")) return ".webp";
  if (lowerType.includes("jpeg") || lowerType.includes("jpg")) return ".jpg";

  const pathname = new URL(remoteUrl).pathname.toLowerCase();

  if (pathname.endsWith(".png")) return ".png";
  if (pathname.endsWith(".webp")) return ".webp";

  return ".jpg";
}

async function downloadImage(remoteUrl, basePath) {
  const response = await throttledFetch(
    remoteUrl,
    {
      headers: {
        "User-Agent": "personal-dashboards-site/1.0",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    },
    "imageDownload"
  );

  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.startsWith("image/")) {
    throw new Error(`Expected image, received ${contentType || "unknown type"}`);
  }

  const extension = guessExtension(remoteUrl, contentType);
  const filePath = basePath + extension;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, bytes);

  return filePath;
}

function relativeAssetPath(filePath) {
  return path
    .relative(path.join(PROJECT_ROOT, "src"), filePath)
    .split(path.sep)
    .join("/");
}

async function main() {
  await resolveWorkbookPath();

  console.log(`Workbook: ${WORKBOOK_PATH}`);
  console.log(`Output:   ${OUT_ROOT}`);
  console.log("");

  const items = readWorkbookTitles(WORKBOOK_PATH);
  const cache = loadJSON(CACHE_PATH, {});
  const manifest = loadJSON(MANIFEST_PATH, {});

  console.log(`Found ${items.length} unique media titles.\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < items.length; index++) {
    const item = items[index];

    const folder = path.join(OUT_ROOT, mediaFolder(item.mediaType));
    const basename = safeSlug(item.name);
    const existingManifest = manifest[item.key];

    const existingFile =
      existingManifest?.localPath
        ? path.join(PROJECT_ROOT, "src", existingManifest.localPath)
        : null;

    console.log(
      `[${index + 1}/${items.length}] ${item.mediaType} — ${item.name}`
    );

    if (!OVERWRITE && existingFile && fs.existsSync(existingFile)) {
      console.log("  ✓ already downloaded");
      skipped++;
      continue;
    }

    if (!OVERWRITE && existingManifest && existingManifest.localPath === null) {
      console.log(`  ○ skipped known failure (${existingManifest.error || "no artwork"})`);
      skipped++;
      continue;
    }

    try {
      let artwork = cache[item.key] || null;

      // Only reuse a cache entry when it contains a valid image URL.
      // Previous failed/partial attempts are automatically retried.
      if (!artwork || !artwork.remoteUrl || OVERWRITE) {
        artwork = await findArtwork(item);

        if (artwork && artwork.remoteUrl) {
          cache[item.key] = artwork;
          saveJSON(CACHE_PATH, cache);
        }
      }

      if (!artwork?.remoteUrl) {
        throw new Error("No artwork match found");
      }

      const basePath = path.join(folder, basename);

      // Remove an old copy with another common extension.
      if (OVERWRITE) {
        for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
          const candidate = basePath + ext;
          if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
        }
      }

      const downloadedPath = await downloadImage(
        artwork.remoteUrl,
        basePath
      );

      manifest[item.key] = {
        mediaType: item.mediaType,
        name: item.name,
        releaseYear: item.releaseYear,
        directorAuthor: item.directorAuthor,
        isbn13: item.isbn13,
        localPath: relativeAssetPath(downloadedPath),
        remoteUrl: artwork.remoteUrl,
        imageSource: artwork.source,
        sourceId: artwork.sourceId,
        matchedTitle: artwork.matchTitle,
        matchedYear: artwork.matchYear,
      };

      saveJSON(MANIFEST_PATH, manifest);

      console.log(
        `  ✓ ${manifest[item.key].localPath} (${artwork.source})`
      );

      downloaded++;

      // API-specific throttling is handled by throttledFetch().
    } catch (err) {
      console.log(`  ✗ ${err.message}`);

      manifest[item.key] = {
        mediaType: item.mediaType,
        name: item.name,
        releaseYear: item.releaseYear,
        directorAuthor: item.directorAuthor,
        isbn13: item.isbn13,
        localPath: null,
        error: err.message,
      };

      saveJSON(MANIFEST_PATH, manifest);
      failed++;

      // Brief pause after a failed title before continuing.
      await sleep(500);
    }
  }

  console.log("\nFinished.");
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped:    ${skipped}`);
  console.log(`Failed:     ${failed}`);
  console.log(`Manifest:   ${MANIFEST_PATH}`);

  if (failed) {
    console.log(
      "\nFailures are saved in the manifest. Fix the title/release metadata or add the image manually, then rerun with --overwrite if needed."
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
