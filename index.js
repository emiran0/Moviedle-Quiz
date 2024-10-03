// index.js
const express = require("express");
const axios = require("axios");
require("dotenv").config(); // For using environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("TV Show & Movie Quiz App Backend is running!");
});

const TMDB_API_KEY = process.env.TMDB_API_KEY;
let targetMovie = null; // Global variable to hold the target movie

// Function to fetch and set the global target movie
async function setTargetMovie() {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/popular`,
      {
        params: {
          api_key: TMDB_API_KEY,
          language: "en-US",
          page: 1,
        },
      }
    );

    // Set the first movie from the popular list as the target movie
    if (response.data.results.length > 0) {
      targetMovie = response.data.results[0];
      console.log(`Target movie set to: ${targetMovie.title}`);
    }
  } catch (error) {
    console.error("Error setting target movie:", error);
  }
}

// Call this function when the server starts
setTargetMovie();

// Route to get movie/TV show details
app.get("/api/search", async (req, res) => {
  const { query, type } = req.query; // type can be 'movie' or 'tv'

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/${type}`,
      {
        params: {
          api_key: TMDB_API_KEY,
          query: query,
        },
      }
    );

    if (response.data.results.length > 0) {
      res.json(response.data.results[0]); // Return the first result
      console.log(response.data.results[0]);
    } else {
      res.status(404).json({ error: "No results found" });
    }
  } catch (error) {
    console.error("Error fetching data from TMDb:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Compare release year
const compareYear = (guessedYear, targetYear) => {
  guessedYear = guessedYear.split("-")[0]; // Extract just the year
  targetYear = targetYear.split("-")[0];
  return guessedYear === targetYear
    ? "green"
    : guessedYear > targetYear
    ? "yellow"
    : "gray";
};

// Compare genres (this works with genre IDs from TMDb)
const compareGenres = (guessedGenres, targetGenres) => {
  let matchCount = guessedGenres.filter((genre) =>
    targetGenres.includes(genre)
  ).length;
  return matchCount === targetGenres.length
    ? "green"
    : matchCount > 0
    ? "yellow"
    : "gray";
};

// Compare IMDb (vote average in TMDb)
const compareRating = (guessedRating, targetRating) => {
  if (guessedRating === targetRating) return "green";
  if (Math.abs(guessedRating - targetRating) <= 0.5) return "yellow";
  return "gray";
};

// Compare movies by title
app.get("/api/compare", async (req, res) => {
  const { guessedMovie } = req.query;

  // Ensure the target movie has been set
  if (!targetMovie) {
    return res.status(500).json({ error: "Target movie is not set yet" });
  }

  if (!guessedMovie) {
    return res.status(400).json({ error: "Guessed movie is required" });
  }

  try {
    // Fetch the guessed movie data from TMDb
    const guessedMovieData = await getMovieData(guessedMovie);

    if (!guessedMovieData) {
      return res.status(404).json({ error: "Guessed movie not found" });
    }

    // Perform the comparison between guessedMovieData and targetMovie
    const comparisonResult = {
      year: compareYear(
        guessedMovieData.release_date,
        targetMovie.release_date
      ),
      genres: compareGenres(guessedMovieData.genre_ids, targetMovie.genre_ids),
      imdbRating: compareRating(
        guessedMovieData.vote_average,
        targetMovie.vote_average
      ),
      director: "to be implemented", // Add logic for directors if needed
      stars: "to be implemented", // Add logic for cast if needed
      type: "movie",
    };

    // Send back the comparison result
    res.json(comparisonResult);
  } catch (error) {
    console.error("Error comparing movies:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to get movie data by title from TMDb
async function getMovieData(movieTitle) {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/movie`,
      {
        params: {
          api_key: TMDB_API_KEY,
          query: movieTitle,
        },
      }
    );

    // Return the first result or null if no results found
    return response.data.results.length > 0 ? response.data.results[0] : null;
  } catch (error) {
    console.error("Error fetching movie data:", error);
    return null;
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
