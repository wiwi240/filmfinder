# Movie Finder

Small `frontend + Node backend` project that lets users search movies and series with the OMDb API without exposing the API key in the browser.

## Stack

- HTML
- CSS
- Vanilla JavaScript
- Bootstrap 5
- Node.js HTTP server
- OMDb API

## Features

- search movies or series by keyword
- display results as cards with poster, title, year, and a `Read More` button
- asynchronous data loading with `fetch`
- movie details displayed in a Bootstrap modal
- progressive reveal on scroll with `IntersectionObserver`
- lazy loading for posters
- backend proxy to keep the OMDb API key on the server side

## Run the project

1. Get an API key from `http://www.omdbapi.com/apikey.aspx`
2. Copy `.env.example` to `.env`
3. Set your key in `.env`

```env
OMDB_API_KEY=your_api_key_here
```

4. Start the server:

```bash
pnpm dev
```

5. Open `http://127.0.0.1:3000`

Alternative:

```bash
bin/dev
```

Quick fallback:

- you can also replace `PUT_YOUR_OMDB_API_KEY_HERE` directly in `server.js`
- this works for the exercise, but `.env` is cleaner

## Build

There is no build step in this project.

- no bundler
- no transpiler
- no static compilation pipeline

The app runs directly with the local Node server:

```bash
pnpm dev
```

or:

```bash
bin/dev
```

## Notes

- do not open `index.html` directly
- do not use Live Server for this version
- the app must be opened through the local Node server because the frontend calls backend routes such as `/api/search`

## Deployment

This project cannot be hosted on GitHub Pages alone because the API key stays on the server side.

Use a platform that supports Node.js, such as:

- Render
- Railway
- Vercel
- Netlify Functions after a serverless refactor
