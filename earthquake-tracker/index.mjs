import express from "express";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
dayjs.extend(relativeTime);

const app = express();
const PORT = 8000;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

async function fetchEarthquakes(params = {}) {
  const defaults = {
    format: "geojson",
    limit: 30,
    orderby: "time",
  };
  const query = new URLSearchParams({ ...defaults, ...params });
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?${query}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("USGS API request failed");
  return res.json();
}

function formatQuake(feature) {
  const p = feature.properties;
  const [lon, lat, depth] = feature.geometry.coordinates;
  return {
    id: feature.id,
    magnitude: p.mag != null ? p.mag.toFixed(1) : "N/A",
    place:p.place || "Unknown location",
    time: dayjs(p.time).format("MMM D, YYYY [at] h:mm A"),
    timeAgo: dayjs(p.time).fromNow(),
    depth:depth != null ? depth.toFixed(1) : "N/A",
    url:p.url, lat, lon,
  };
}

app.get("/", async (req, res) => {
  try {
    const data = await fetchEarthquakes({ minmagnitude: 4.5, limit: 30 });
    const quakes = data.features.map(formatQuake);
    res.render("home", { quakes });
  } catch (err) {
    console.error(err);
    res.render("error", { message: "Could not load recent earthquakes." });
  }
});

app.get("/search", (req, res) => {
  res.render("search");
});

app.get("/results", async (req, res) => {
  const {
    minmagnitude = "2.5",
    maxmagnitude = "10",
    starttime,
    endtime,
    limit = "25",
  } = req.query;

  const params = { minmagnitude, maxmagnitude, limit };
  if (starttime) params.starttime = starttime;
  if (endtime)   params.endtime   = endtime;

  try {
    const data = await fetchEarthquakes(params);
    const quakes = data.features.map(formatQuake);
    res.render("results", {
      quakes,
      count:   data.metadata.count,
      filters: req.query,
    });
  } catch (err) {
    console.error(err);
    res.render("error", { message: "Search failed. Please try again." });
  }
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.use((req, res) => {
  res.status(404).render("error", { message: "Page not found." });
});


app.listen(PORT, () => {
  console.log(`Earthquake Tracker running at http://localhost:${PORT}`);
});
