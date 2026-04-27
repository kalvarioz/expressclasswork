/**
 * Model:
 * authors table
 * GET /authors = SELECT
 * GET /addAuthor = render form
 * POST /addAuthor = INSERT
 * GET /updateAuthor = SELECT *
 * POST /updateAuthor = UPDATE
 * 
 * quotes table
 * GET /quotes = SELECT + JOIN authors
 * GET /addQuote = render form + select authors
 * POST /addQuote = INSERT (w/ authorId from form)
 * GET / updateQuote = SELECT quote and SELECT authors
 * POST /updateQuote = UPDATE
 */

import express from 'express';
import mysql from 'mysql2/promise';
import 'dotenv/config';

//new stuff
import bcrypt from 'bcrypt';
//new stuff
import session from 'express-session'

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1) // trust first proxy
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    //   cookie: { secure: true }
}))

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
// app.use((req, res, next) => {
//     res.locals.fullName = req.session.fullName || "";
//     next();
// });
app.post('/login', (req, res) => {
    if (req.body.username === process.env.ADMIN_USER &&
        req.body.password === process.env.ADMIN_PASSWORD) {
        req.session.isAuthenticated = true;
        res.redirect('/admin');
    } else {
        res.render('login.ejs', { error: 'Invalid username or password. ' });
    }
});

//routes
app.get('/admin', (req, res) => {
    res.render('home.ejs');   // public-facing page, unchanged
});

app.get('/authors', isUserAuthenticated, async (req, res) => {
    let sql = `SELECT authorId, firstName, lastName
              FROM authors
              ORDER BY lastName`;
    const [authors] = await pool.query(sql);
    // console.log(authors);
    res.render('authors.ejs', { authors })
});

//Displays the form to update an existing author
//get function for updateAuthor
app.get('/updateAuthor', isUserAuthenticated, async (req, res) => {
    // query authorId:
    let authorId = req.query.authorId;
    //build SQL script, in this case, we need to select what we need to update, 

    //Select everything from authors, but where author id= to the author you are modifying (i.e., 1 = benjamin franklin.)
    //Match date format that the database has instead of whatever is given in the standard HTML date format.
    let sql = ` SELECT *,
    DATE_FORMAT(dob, '%Y-%m-%d')ISOdob,
    DATE_FORMAT(dod, '%Y-%m-%d')ISOdod

    FROM authors
    WHERE authorId=?;
    `;
    //the usual
    const [authorInfo] = await pool.query(sql, [authorId]);
    //render the file updateAuthor.ejs, and attach information from authorInfo.
    res.render('updateAuthor.ejs', { authorInfo });
});

//route to save the updated author info into the database
app.post('/updateAuthor', async (req, res) => {
    // obtain data by doing req.body.xyz..
    // this prevents SQL injection..
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let dob = req.body.dob;
    let sex = req.body.sex;
    let authorId = req.body.authorId;
    let sql =
        `
    UPDATE authors
    SET
    firstName=?,
    lastName=?,
    dob=?,
    sex=?
    WHERE authorId=?
    `;
    let sqlParams = [firstName, lastName, dob, sex, authorId];
    const [rows] = await pool.query(sql, sqlParams);
    res.redirect('/authors')
});

//route to display the form to add a new author
app.get('/addAuthor', isUserAuthenticated, (req, res) => {
    res.render('addAuthor.ejs')
});

//route to save the author info into the database
app.post('/addAuthor', async (req, res) => {
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let dob = req.body.dob;
    let bio = req.body.bio;

    let sql = `INSERT INTO authors
               (firstName, lastName, dob, biography)
               VALUES
               (?, ?, ?, ?)`;
    let sqlParams = [firstName, lastName, dob, bio];
    const [rows] = await pool.query(sql, sqlParams);
    res.redirect('/');

});

app.get('/quotes', isUserAuthenticated, async (req, res) => {
    let sql =
        `
    SELECT quoteId, quote
    FROM quotes
    `;
    const [quote] = await pool.query(sql);
    res.render('quotes.ejs', { quote })
});

//** 
// UPDATE QUOTE:
// A bit odd, in this case, you wont need both a get and a post for this program,
// What will be needed is two SQL queries, one to get the quoteId,
// and the other to obtain the auhtor Id, (first,last name) to assign that quote.
//
// */

app.get('/updateQuote', isUserAuthenticated, async (req, res) => {
    let quoteId = req.query.quoteId;
    let sql = `SELECT * FROM quotes WHERE quoteId=?`;
    const [quoteInfo] = await pool.query(sql, [quoteId]);
    //Here is where the difference is: you create another SQL variable.
    let sql2 = `SELECT authorId,firstName,lastName FROM authors ORDER BY lastName`;
    const [authorList] = await pool.query(sql2);
    res.render('updateQuote.ejs', { quoteInfo, authorList });
});

app.get('/addQuote', async (req, res) => {
    let sql = `
    SELECT authorId, firstName, lastName FROM authors ORDER BY lastName`;
    const [authorList] = await pool.query(sql);

    res.render('addQuote.ejs', { authorList });
});

//route to display the form to add a new quote
app.post('/addQuote', async (req, res) => {
    //get list of authors
    //get list of categories
    let quote = req.body.quote
    let sql = `
    INSERT INTO quotes (quote,authorId) VALUES (?,?)
    `
    let sqlParams = [quote, authorId];
    const [rows] = await pool.query(sql, sqlParams);

    res.redirect('/quotes')
});

app.get('/login', (req, res) => {

    res.render('login.ejs', { error: 'Invalid username or password. ' });

});

app.post('/loginProcess', async (req, res) => {
    let { username, password } = req.body;
    let sql = `
    SELECT *
    FROM admin
    WHERE username=?
    `;
    const [rows] = await pool.query(sql, [username]);

    if (rows.length > 0) {//username found
        process.env.SESSION_SECRET = rows[0].password;
    }
    const match = await bcrypt.compare(password, process.env.SESSION_SECRET);

    if (match) {
        req.session.isAuthenticated = true;
        req.session.fullName = rows[0].firstName + " " + rows[0].lastName;
        res.redirect('/admin');

    } else {
        let loginError = "Incorrect password."
        res.redirect('/login', { loginError });
    }
    // res.render('welcome.ejs');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
})


app.listen(3000, () => {
    console.log("Express server running")
})
