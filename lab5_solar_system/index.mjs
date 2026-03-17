import express from 'express';
const planets = (await import('npm-solarsystem')).default;

const app = express();
app.set("view engine", "ejs");
app.set('views', './views');
app.use(express.static("public"));

const KEY='5589438';
const NASA_KEY='BOdJgf7TZaZL6c8I6mMUy7vstaCf24fJA2dhsQdU';
async function getNasaPOD() {
    const today = new Date().toISOString().split('T')[0];
    const fallbackDate = '2025-03-11';

    for (const date of [today, fallbackDate]) {
        try {
            const res = await fetch(
                `https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}&date=${date}`
            );
            const data = await res.json();
            if (data.url) return data;
        } catch (err) {
            console.error(`NASA APOD fetch failed for ${date}:`, err.message);
        }
    }
    return null;
}
async function getPixabayImage() {
    try {
        const page = Math.floor(Math.random() * 10) + 1;
        const res = await fetch(
            `https://pixabay.com/api/?key=5589438-47a0bca778bf23fc2e8c5bf3e&per_page=50&orientation=horizontal&q=solar%20system`
        );
        const data = await res.json();
        if (data.hits && data.hits.length > 0) {
            const random = data.hits[Math.floor(Math.random() * data.hits.length)];
            return random.largeImageURL;
        }
    } catch (err) {
        console.error('Pixabay fetch failed:', err.message);
    }
    return null;
}

app.get('/', async (req, res) => {
    const pixabayImage = await getPixabayImage();
    res.render('home', { pixabayImage });
});


app.get('/planetInfo', (req, res) => {
   const planetName = req.query.planet;
   const validPlanets = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
   if (!validPlanets.includes(planetName)) {
      return res.status(404).send(" Planet Not Found. " + validPlanets.join(', '));
   }
   const planetInfo = planets[`get${planetName}`]();
   planetInfo.name = planetName;
   res.render('planet', { planetInfo })
});

app.get('/nasa-pod', async (req, res) => {
    const pod = await getNasaPOD();
    if (!pod) {
        return res.status(500).send('Could not load NASA Picture of the Day. Try again later.');
    }
    res.render('nasapod', { pod });
});
app.get('/asteroids', (req, res) => {
    const asteroidInfo = planets.getAsteroids();
    res.render('asteroid', { asteroidInfo });
});

// Comets
app.get('/comets', (req, res) => {
    const cometInfo = planets.getComets();
    res.render('comet', { cometInfo });
});
app.listen(3000, () => {
   console.log('server started');
});
