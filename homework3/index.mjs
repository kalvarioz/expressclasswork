import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { movies } from "./data/movies.mjs";
import { formatMovieCard } from "@calvario/calvario-mov";
dotenv.config();

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");

  res.setHeader("Content-Security-Policy", [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${res.locals.nonce}' 'sha256-ZswfTY7H35rbv8WC7NXBoiC7WNu86vSzCDChNWwZZDM=' cdn.jsdelivr.net`,
    `style-src 'self' cdn.jsdelivr.net`,
    `img-src 'self' image.tmdb.org data: https:`,
    `font-src 'self' cdn.jsdelivr.net`,
    `connect-src 'self'`,
    `media-src 'self' blob: *.workers.dev`,
    `form-action 'self'`,
  ].join("; "));

  next();
});

const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
    },
});

async function getStreamUrl(objectKey) {
    const cmd = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: objectKey,
    });
    return getSignedUrl(r2, cmd, { expiresIn: 3600 });
}

async function enrichMovies(movieList) {
  const raw = await Promise.all(
    movieList.map(async (m) => {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${m.tmdbId}?api_key=${process.env.TMDB_KEY}`
      );
      const data = await response.json();
      return {
        ...m,
        poster: data.poster_path ?? null,
        rating: data.vote_average ?? null,
        overview: data.overview ?? m.description,
      };
    })
  );
  return raw.map(formatMovieCard);
}
app.get("/", async (req, res) => {
    const featured = await enrichMovies(movies.slice(0, 3));
    res.render("home", {
        featured, totalMovies: movies.length
    });
});

app.get("/movies", async (req, res) => {
    const enriched = await enrichMovies(movies);
    res.render("movies", { movies: enriched });
});
app.get("/search", (req, res) => {
    res.render("search", { results: null, query: "", genre: "all" });
});
app.get("/movies/:id", async (req, res) => {
  try {
    const movie = movies.find((m) => m.id === req.params.id);
    if (!movie) return res.status(404).send("Movie not found (for this homework i made only one movie available)");

    const streamUrl = await getStreamUrl(movie.r2Key);
    res.render("player", { movie, streamUrl });
  } catch (err) {
    console.error("Player route error:", err.message);
    res.status(500).send(`Stream error: ${err.message}`);
  }
});
app.post("/search", async (req, res) => {
  const { query, genre } = req.body;

  const filtered = movies.filter(
    (m) =>
      m.title.toLowerCase().includes(query.toLowerCase()) &&
      (genre === "all" || m.genre === genre)
  );

  const results = await enrichMovies(filtered);
  res.render("search", { results, query, genre });
});

app.listen(5000);