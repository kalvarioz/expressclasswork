import express from 'express';
import mysql from 'mysql2/promise';
import 'dotenv/config';
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const pool = mysql.createPool({
    host: process.env.HOST_NAME,
    user: process.env.HOST_USERNAME,
    password: process.env.HOST_PASSWORD,
    database: process.env.HOST_DATABASE,
    connectionLimit: 10,
    waitForConnections: true
});

app.get('/', async (req, res) => {
    try {
        const [authors] = await pool.query(`SELECT authorId, firstName, lastName FROM authors ORDER BY lastName`);
        const [categories] = await pool.query(`SELECT DISTINCT category FROM quotes ORDER BY category`);
        res.render('home.ejs', { authors, categories });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});

app.get('/api/author/:authorId', async (req, res) => {
    const [authorInfo] = await pool.query(`SELECT * FROM authors WHERE authorId = ?`, [req.params.authorId]);
    res.send(authorInfo);
});

app.get('/addAuthor', (req, res) => {
    res.render('addAuthor.ejs', {});
});

app.post('/addAuthor', async (req, res) => {
    try {
        let { firstName, lastName, sex, dob, dod, biography, portrait } = req.body;
        if (!dod || dod.trim() === '') dod = null;
        await pool.query(
            `INSERT INTO authors (firstName, lastName, sex, dob, dod, biography, portrait) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [firstName, lastName, sex, dob, dod, biography, portrait]
        );
        res.render('addAuthor.ejs', { success: `Author "${firstName} ${lastName}" added successfully!` });
    } catch (err) {
        console.error("Database error:", err);
        res.render('addAuthor.ejs', { error: "Failed to add author. Please try again." });
    }
});

app.get('/newQuote', async (req, res) => {
    try {
        const [authors] = await pool.query(`SELECT authorId, firstName, lastName FROM authors ORDER BY lastName`);
        const [categories] = await pool.query(`SELECT DISTINCT category FROM quotes ORDER BY category`);
        res.render('newQuote.ejs', { authors, categories });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});

app.post('/newQuote', async (req, res) => {
    try {
        let { quote, authorId, category } = req.body;
        if (!quote || quote.trim().length < 5) {
            const [authors] = await pool.query(`SELECT authorId, firstName, lastName FROM authors ORDER BY lastName`);
            const [categories] = await pool.query(`SELECT DISTINCT category FROM quotes ORDER BY category`);
            return res.render('newQuote.ejs', {
                authors, categories,
                error: "Quote must be at least 5 characters.",
                formData: req.body
            });
        }
        await pool.query(`INSERT INTO quotes (quote, authorId, category) VALUES (?, ?, ?)`, [quote.trim(), authorId, category]);
        res.redirect('/');
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});

app.get("/dbTest", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT CURDATE()");
        res.send(rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});

app.get("/searchByKeyword", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT quote, firstName, lastName, authorId FROM quotes NATURAL JOIN authors WHERE quote LIKE ?`,
            [`%${req.query.keyword}%`]
        );
        res.render("quotes.ejs", { rows, heading: `Quotes containing "${req.query.keyword}"` });
    } catch (err) { res.status(500).send("Database error!"); }
});

app.get("/searchByAuthor", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT quote, firstName, lastName, authorId FROM quotes NATURAL JOIN authors WHERE authorId = ?`,
            [req.query.authorId]
        );
        const authorName = rows.length > 0 ? `${rows[0].firstName} ${rows[0].lastName}` : "this author";
        res.render("quotes.ejs", { rows, heading: `Quotes by ${authorName}` });
    } catch (err) { res.status(500).send("Database error!"); }
});

app.get("/searchByGender", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT quote, firstName, lastName, authorId FROM quotes NATURAL JOIN authors WHERE sex = ?`,
            [req.query.gender]
        );
        const label = req.query.gender === 'M' ? 'Male' : 'Female';
        res.render("quotes.ejs", { rows, heading: `Quotes by ${label} authors` });
    } catch (err) { res.status(500).send("Database error!"); }
});

app.get("/searchByCategory", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT quote, firstName, lastName, authorId FROM quotes NATURAL JOIN authors WHERE category = ?`,
            [req.query.categoryId]
        );
        res.render("quotes.ejs", { rows, heading: `${req.query.categoryId} quotes` });
    } catch (err) { res.status(500).send("Database error!"); }
});

app.get("/searchByLikes", async (req, res) => {
    try {
        const minimum = req.query.minimum || "0";
        const maximum = req.query.maximum || 200;
        const [rows] = await pool.query(
            `SELECT quote, firstName, lastName, likes, authorId FROM quotes NATURAL JOIN authors WHERE likes BETWEEN ? AND ? ORDER BY likes DESC`,
            [minimum, maximum]
        );
        res.render("likes.ejs", { rows, heading: `Quotes by likes` });
    } catch (err) { res.status(500).send("Database error!"); }
});

app.listen(3000, () => console.log("Express server running on http://localhost:3000"));
