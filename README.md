# Movie Finder

Mini projet `frontend + backend Node` pour rechercher des films avec l'API OMDb sans exposer la clé dans le navigateur.

## Fonctionnalités

- recherche de films ou séries par mots-clés
- affichage sous forme de cartes avec affiche, titre, année et bouton `Read More`
- chargement asynchrone via `fetch`
- détail d'un film dans une modal Bootstrap
- apparition progressive des cartes avec `IntersectionObserver`
- lazy loading des affiches
- proxy backend pour garder la clé API côté serveur

## Lancer le projet

1. Récupère une clé API sur `http://www.omdbapi.com/apikey.aspx`
2. Copie `.env.example` en `.env`
3. Remplace la valeur de `OMDB_API_KEY` dans `.env`
4. Lance le serveur :

```bash
pnpm dev
```

5. Ouvre `http://localhost:3000`
6. Recherche un film

Alternative :

```bash
bin/dev
```

Alternative rapide :

- tu peux aussi remplacer directement `PUT_YOUR_OMDB_API_KEY_HERE` dans `server.js`
- c'est acceptable pour l'exercice, mais moins propre que `.env`

## Déploiement

Le projet ne peut plus être publié sur GitHub Pages seul, car la clé API reste côté serveur.

Tu dois déployer sur une plateforme qui supporte Node.js :

- Render
- Railway
- Vercel
- Netlify Functions si tu refactors en serverless
# filmfinder
