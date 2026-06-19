const POSTER_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450">
      <rect width="300" height="450" fill="#e9ecef" />
      <text x="50%" y="50%" text-anchor="middle" fill="#6c757d" font-family="Arial, sans-serif" font-size="22">
        Affiche indisponible
      </text>
    </svg>
  `);

const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-input");
const searchButton = document.querySelector("#search-button");
const feedbackElement = document.querySelector("#feedback");
const loadingIndicator = document.querySelector("#loading-indicator");
const resultsContainer = document.querySelector("#results");
const resultsSummary = document.querySelector("#results-summary");

const modalElement = document.querySelector("#movie-modal");
const movieModal = new bootstrap.Modal(modalElement);

const modalType = document.querySelector("#modal-type");
const modalTitle = document.querySelector("#modal-title");
const modalPoster = document.querySelector("#modal-poster");
const modalYear = document.querySelector("#modal-year");
const modalRuntime = document.querySelector("#modal-runtime");
const modalGenre = document.querySelector("#modal-genre");
const modalPlot = document.querySelector("#modal-plot");
const modalDirector = document.querySelector("#modal-director");
const modalActors = document.querySelector("#modal-actors");
const modalRating = document.querySelector("#modal-rating");

let cardsObserver;
const DEFAULT_QUERY = "Batman";

initialize();

function initialize() {
  if (window.location.protocol === "file:") {
    resultsSummary.textContent = "Le projet doit être lancé via le serveur local.";
    showFeedback(
      "N'ouvre pas index.html directement. Lance `node server.js`, puis ouvre http://127.0.0.1:3000.",
      "danger",
    );
    return;
  }

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSearch();
  });

  searchInput.value = DEFAULT_QUERY;
  handleSearch();
}

async function handleSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    showFeedback("Saisis un titre avant de lancer la recherche.", "warning");
    return;
  }

  setLoading(true);
  hideFeedback();
  clearResults();

  try {
    const searchResults = await searchMovies(query);
    renderResults(searchResults, query);
  } catch (error) {
    showFeedback(formatErrorMessage(error), "danger");
    resultsSummary.textContent = "Aucun résultat affiché.";
  } finally {
    setLoading(false);
  }
}

async function searchMovies(query) {
  const url = new URL("/api/search", window.location.origin);
  url.searchParams.set("q", query);

  const response = await fetch(url);
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.message || "La requête de recherche a échoué.");
  }

  if (data.Response === "False") {
    throw new Error(data.Error || "La recherche n'a retourné aucun résultat.");
  }

  return data.Search;
}

async function fetchMovieDetails(imdbId) {
  const url = new URL(`/api/movie/${encodeURIComponent(imdbId)}`, window.location.origin);

  const response = await fetch(url);
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.message || "Impossible de récupérer les détails du film.");
  }

  if (data.Response === "False") {
    throw new Error(data.Error || "Aucun détail disponible pour ce film.");
  }

  return data;
}

function renderResults(movies, query) {
  resultsSummary.textContent = `${movies.length} résultat(s) pour "${query}".`;

  const fragment = document.createDocumentFragment();

  movies.forEach((movie) => {
    const column = document.createElement("article");
    column.className = "col-12 col-md-6 col-xl-4 movie-card";

    column.innerHTML = `
      <div class="movie-card__surface">
        ${renderPoster(movie.Poster, movie.Title)}
        <div class="movie-card__content">
          <span class="movie-card__type">${escapeHtml(movie.Type)}</span>
          <h3 class="movie-card__title">${escapeHtml(movie.Title)}</h3>
          <p class="movie-card__meta mb-0">Sortie : ${escapeHtml(movie.Year)}</p>
          <button class="btn read-more-button mt-auto" data-imdb-id="${escapeHtml(movie.imdbID)}">
            Read More
          </button>
        </div>
      </div>
    `;

    fragment.appendChild(column);
  });

  resultsContainer.appendChild(fragment);
  bindReadMoreButtons();
  observeCards();
}

function renderPoster(posterUrl, title) {
  if (!posterUrl || posterUrl === "N/A") {
    return `
      <div class="movie-poster movie-poster--placeholder rounded-top">
        <span>Affiche indisponible</span>
      </div>
    `;
  }

  return `
    <img
      class="movie-poster rounded-top"
      src="${escapeAttribute(posterUrl)}"
      alt="Affiche de ${escapeAttribute(title)}"
      loading="lazy"
    />
  `;
}

function bindReadMoreButtons() {
  const buttons = document.querySelectorAll(".read-more-button");

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const imdbId = button.dataset.imdbId;

      button.disabled = true;
      button.textContent = "Chargement...";

      try {
        const movie = await fetchMovieDetails(imdbId);
        fillModal(movie);
        movieModal.show();
      } catch (error) {
        showFeedback(formatErrorMessage(error), "danger");
      } finally {
        button.disabled = false;
        button.textContent = "Read More";
      }
    });
  });
}

function fillModal(movie) {
  modalType.textContent = movie.Type || "Film";
  modalTitle.textContent = movie.Title || "Titre indisponible";
  modalYear.textContent = movie.Year || "Année inconnue";
  modalRuntime.textContent = movie.Runtime || "Durée inconnue";
  modalGenre.textContent = movie.Genre || "Genre inconnu";
  modalPlot.textContent = movie.Plot || "Aucun résumé disponible.";
  modalDirector.textContent = movie.Director || "Inconnu";
  modalActors.textContent = movie.Actors || "Inconnus";
  modalRating.textContent = movie.imdbRating ? `${movie.imdbRating}/10` : "Non noté";

  if (!movie.Poster || movie.Poster === "N/A") {
    modalPoster.classList.add("modal-poster--placeholder");
    modalPoster.src = POSTER_PLACEHOLDER;
    modalPoster.alt = "Affiche indisponible";
  } else {
    modalPoster.classList.remove("modal-poster--placeholder");
    modalPoster.src = movie.Poster;
    modalPoster.alt = `Affiche de ${movie.Title}`;
  }
}

function observeCards() {
  if (cardsObserver) {
    cardsObserver.disconnect();
  }

  cardsObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.15,
    },
  );

  const cards = document.querySelectorAll(".movie-card");
  cards.forEach((card) => cardsObserver.observe(card));
}

function clearResults() {
  resultsContainer.innerHTML = "";
}

function setLoading(isLoading) {
  loadingIndicator.classList.toggle("d-none", !isLoading);
  searchButton.disabled = isLoading;
}

function showFeedback(message, variant) {
  feedbackElement.className = `alert alert-${variant} mb-0`;
  feedbackElement.textContent = message;
}

function hideFeedback() {
  feedbackElement.className = "alert d-none mb-0";
  feedbackElement.textContent = "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function formatErrorMessage(error) {
  if (error instanceof TypeError) {
    return "Impossible de joindre le serveur local. Lance `node server.js`, puis ouvre http://127.0.0.1:3000.";
  }

  return error.message || "Une erreur est survenue.";
}

async function parseJsonResponse(response) {
  const rawBody = await response.text();

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    const isHtmlResponse = rawBody.trim().startsWith("<!DOCTYPE") || rawBody.trim().startsWith("<html");

    if (isHtmlResponse) {
      throw new Error(
        "Le frontend reçoit du HTML au lieu du JSON API. Ouvre l'application via http://127.0.0.1:3000 et non via Live Server ou index.html.",
      );
    }

    throw new Error("La réponse du serveur n'est pas un JSON valide.");
  }
}
