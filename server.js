const http = require("node:http");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

loadDotEnv();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const ROOT_DIR = __dirname;
const OMDB_API_URL = "https://www.omdbapi.com/";
const OMDB_API_KEY = normalizeOmdbApiKey(
  process.env.OMDB_API_KEY || "PUT_YOUR_OMDB_API_KEY_HERE",
);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/api/search" && request.method === "GET") {
      await handleSearchApi(url, response);
      return;
    }

    if (url.pathname.startsWith("/api/movie/") && request.method === "GET") {
      const imdbId = decodeURIComponent(url.pathname.replace("/api/movie/", ""));
      await handleMovieApi(imdbId, response);
      return;
    }

    if (request.method !== "GET") {
      sendJson(response, 405, { message: "Méthode non autorisée." });
      return;
    }

    await serveStaticFile(url.pathname, response);
  } catch (error) {
    sendJson(response, 500, {
      message: "Erreur interne du serveur.",
      details: error.message,
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

async function handleSearchApi(url, response) {
  if (!isApiKeyConfigured()) {
    sendJson(response, 500, {
      message: "Clé API OMDb manquante côté serveur.",
      details:
        "Ajoute ta clé dans server.js ou via la variable d'environnement OMDB_API_KEY.",
    });
    return;
  }

  const query = url.searchParams.get("q")?.trim();

  if (!query) {
    sendJson(response, 400, { message: "Le paramètre q est obligatoire." });
    return;
  }

  const omdbUrl = new URL(OMDB_API_URL);
  omdbUrl.searchParams.set("apikey", OMDB_API_KEY);
  omdbUrl.searchParams.set("s", query);

  const omdbResponse = await fetch(omdbUrl);
  const data = await omdbResponse.json();

  if (!omdbResponse.ok) {
    sendJson(response, 502, {
      message: data.Error || "OMDb a renvoyé une erreur HTTP.",
      upstreamStatus: omdbResponse.status,
    });
    return;
  }

  if (data.Response === "False") {
    sendJson(response, 404, {
      message: data.Error || "Aucun résultat trouvé.",
    });
    return;
  }

  sendJson(response, 200, data);
}

async function handleMovieApi(imdbId, response) {
  if (!isApiKeyConfigured()) {
    sendJson(response, 500, {
      message: "Clé API OMDb manquante côté serveur.",
      details:
        "Ajoute ta clé dans server.js ou via la variable d'environnement OMDB_API_KEY.",
    });
    return;
  }

  if (!imdbId) {
    sendJson(response, 400, { message: "L'identifiant IMDb est obligatoire." });
    return;
  }

  const omdbUrl = new URL(OMDB_API_URL);
  omdbUrl.searchParams.set("apikey", OMDB_API_KEY);
  omdbUrl.searchParams.set("i", imdbId);
  omdbUrl.searchParams.set("plot", "full");

  const omdbResponse = await fetch(omdbUrl);
  const data = await omdbResponse.json();

  if (!omdbResponse.ok) {
    sendJson(response, 502, {
      message: data.Error || "OMDb a renvoyé une erreur HTTP.",
      upstreamStatus: omdbResponse.status,
    });
    return;
  }

  if (data.Response === "False") {
    sendJson(response, 404, {
      message: data.Error || "Film introuvable.",
    });
    return;
  }

  sendJson(response, 200, data);
}

async function serveStaticFile(requestPath, response) {
  const relativePath = requestPath === "/" ? "/index.html" : requestPath;
  const normalizedPath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT_DIR, normalizedPath);

  if (!filePath.startsWith(ROOT_DIR)) {
    sendJson(response, 403, { message: "Accès refusé." });
    return;
  }

  try {
    const fileContent = await fs.readFile(filePath);
    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
    });
    response.end(fileContent);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(response, 404, { message: "Fichier introuvable." });
      return;
    }

    throw error;
  }
}

function isApiKeyConfigured() {
  return OMDB_API_KEY && OMDB_API_KEY !== "PUT_YOUR_OMDB_API_KEY_HERE";
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");

  if (!fsSync.existsSync(envPath)) {
    return;
  }

  const envContent = fsSync.readFileSync(envPath, "utf-8");

  envContent.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function normalizeOmdbApiKey(value) {
  if (!value) {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.includes("apikey=")) {
    return trimmedValue.replace(/^\[|\]$/g, "").replace(/&+$/g, "");
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    const extractedKey = parsedUrl.searchParams.get("apikey") || "";
    return extractedKey.replace(/^\[|\]$/g, "").replace(/&+$/g, "");
  } catch {
    const match = trimmedValue.match(/apikey=([^&]+)/i);
    const extractedKey = match ? match[1] : trimmedValue;
    return extractedKey.replace(/^\[|\]$/g, "").replace(/&+$/g, "");
  }
}
