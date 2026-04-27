import express from 'express';
import mysql from 'mysql2/promise';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import session from 'express-session';

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use((req, res, next) => {
    res.locals.fullName = req.session.fullName || "";
    next();
});

const pool = mysql.createPool({
    host: process.env.HOST_NAME,
    user: process.env.HOST_USERNAME,
    password: process.env.HOST_PASSWORD,
    database: process.env.HOST_DATABASE,
    connectionLimit: 10,
    waitForConnections: true
});

function isUserAuthenticated(req, res, next) {
    if (req.session.isAuthenticated) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/admin', isUserAuthenticated, (req, res) => {
    res.render('home.ejs', { "fullName": req.session.fullName });
});

app.get('/authors', isUserAuthenticated, async (req, res) => {
    let sql = `SELECT authorId, firstName, lastName, portrait
               FROM authors
               ORDER BY lastName`;
    const [authors] = await pool.query(sql);
    res.render('authors.ejs', { authors });
});

// Displays the form to update an existing author
app.get('/updateAuthor', isUserAuthenticated, async (req, res) => {
    let authorId = req.query.authorId;
    let sql = `SELECT *,
    DATE_FORMAT(dob, '%Y-%m-%d') AS ISOdob,
    DATE_FORMAT(dod, '%Y-%m-%d') AS ISOdod
    FROM authors
    WHERE authorId=?`;
    const [authorInfo] = await pool.query(sql, [authorId]);
    res.render('updateAuthor.ejs', { authorInfo });
});

// Route to save the updated author info into the database
app.post('/updateAuthor', isUserAuthenticated, async (req, res) => {
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let dob = req.body.dob;
    let dod = req.body.dod;
    let sex = req.body.sex;
    let profession = req.body.profession;
    let country = req.body.country;
    let portrait = req.body.portrait;
    let biography= req.body.biography;
    let authorId = req.body.authorId;

    let sql = `UPDATE authors
               SET firstName=?, lastName=?, dob=?, dod=?,sex=?, profession=?, country=?, portrait=?, biography=?
               WHERE authorId=?`;
    let sqlParams = [firstName, lastName, dob, dod, sex, profession, country, portrait, biography, authorId];
    await pool.query(sql, sqlParams);
    res.redirect('/authors');
});

// Route to display the form to add a new author
app.get('/addAuthor', isUserAuthenticated, (req, res) => {
    res.render('addAuthor.ejs');
});

// Route to save the author info into the database
app.post('/addAuthor', isUserAuthenticated, async (req, res) => {
    let firstName = req.body.firstName;
    let lastName= req.body.lastName;
    let dob= req.body.dob;
    let dod= req.body.dod;
    let sex = req.body.sex;
    let profession = req.body.profession;
    let country= req.body.country;
    let portrait= req.body.portrait;
    let bio= req.body.bio;

    let sql = `INSERT INTO authors
               (firstName, lastName, dob, dod, sex, profession, country, portrait, biography)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    let sqlParams = [firstName, lastName, dob, dod, sex, profession, country, portrait, bio];
    await pool.query(sql, sqlParams);

    res.redirect('/authors');
});

app.get('/quotes', isUserAuthenticated, async (req, res) => {
    let sql = `
        SELECT q.quoteId, q.quote, q.category, q.likes, a.firstName, a.lastName
        FROM quotes q
        JOIN authors a ON q.authorId = a.authorId
        ORDER BY q.quoteId
    `;
    const [quotes] = await pool.query(sql);
    res.render('quotes.ejs', { quotes });
});

app.get('/updateQuote', isUserAuthenticated, async (req, res) => {
    let quoteId = req.query.quoteId;
    let sql = `SELECT * FROM quotes WHERE quoteId=?`;
    const [quoteInfo] = await pool.query(sql, [quoteId]);
    let sql2 = `SELECT authorId, firstName, lastName FROM authors ORDER BY lastName`;
    const [authorList] = await pool.query(sql2);
    res.render('updateQuote.ejs', { quoteInfo, authorList });
});

app.post('/updateQuote', isUserAuthenticated, async (req, res) => {
    let quoteId  = req.body.quoteId;
    let quote = req.body.quote;
    let authorId = req.body.authorId;
    let category = req.body.category;
    let sql = `UPDATE quotes SET quote=?, authorId=?, category=? WHERE quoteId=?`;
    await pool.query(sql, [quote, authorId, category, quoteId]);
    res.redirect('/quotes');
});

app.get('/addQuote', isUserAuthenticated, async (req, res) => {
    let sql = `SELECT authorId, firstName, lastName FROM authors ORDER BY lastName`;
    const [authorList] = await pool.query(sql);
    res.render('addQuote.ejs', { authorList });
});

app.post('/addQuote', isUserAuthenticated, async (req, res) => {
    let quote = req.body.quote;
    let authorId = req.body.authorId;
    let category = req.body.category;
    let sql = `INSERT INTO quotes (quote, authorId, category) VALUES (?, ?, ?)`;
    await pool.query(sql, [quote, authorId, category]);
    res.redirect('/quotes');
});

app.get('/deleteAuthor', isUserAuthenticated, async (req, res) => {
    await pool.query(`DELETE FROM authors WHERE authorId=?`, [req.query.authorId]);
    res.redirect('/authors');
});

app.get('/deleteQuote', isUserAuthenticated, async (req, res) => {
    await pool.query(`DELETE FROM quotes WHERE quoteId=?`, [req.query.quoteId]);
    res.redirect('/quotes');
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

// Login routes
app.get('/login', (req, res) => {
    res.render('login.ejs');
});

app.post('/loginProcess', async (req, res) => {
    let { username, password } = req.body;
    let hashedPassword = "";
    let sql = `SELECT * FROM admin WHERE username=?`;
    const [rows] = await pool.query(sql, [username]);
    if (rows.length > 0) {
        hashedPassword = rows[0].password;
    }
    const match = await bcrypt.compare(password, hashedPassword);
    if (match) {
        req.session.isAuthenticated = true;
        req.session.fullName = rows[0].firstName + " " + rows[0].lastName;
        res.redirect("/admin");
    } else {
        let loginError = "Incorrect password.";
        res.render('login.ejs', { loginError });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.listen(3000, () => {
    console.log("Express server running");
});