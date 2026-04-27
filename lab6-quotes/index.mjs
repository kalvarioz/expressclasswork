import express from 'express';
import mysql from 'mysql2/promise';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import session from 'express-session';
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
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
//   cookie: { secure: true }
}))

app.get('/', (req, res) => {
   res.render('login.ejs')
});

app.get('/quotes', async(req, res) => {
   let sql = `SELECT quoteId, quote
              FROM quotes
              ORDER BY quote`;
   const [quotes] = await pool.query(sql);           
   res.render('quotes.ejs', {quotes})
});

//Getting all info for a specific quote based on the quoteId
app.get('/updateQuote', async(req, res) => {
   let quoteId = req.query.quoteId;
   let sql = `SELECT *
              FROM quotes
              WHERE quoteId = ?`;
   const [quoteInfo] = await pool.query(sql, [quoteId]);              

   let sql2 = `SELECT authorId, firstName, lastName
               FROM authors
               ORDER BY lastName`;
   const [authorList] = await pool.query(sql2);              
           
   res.render('updateQuote.ejs', {quoteInfo, authorList})
});


app.get('/authors', async (req, res) => {
   let sql = `SELECT authorId, firstName, lastName
              FROM authors
              ORDER BY lastName`;
    const [authors] = await pool.query(sql); 
    console.log(authors);              
   res.render('authors.ejs', {authors})
});

//Displays the form to update an existing author
app.get('/updateAuthor', async (req, res) => {
   let authorId = req.query.authorId;
   let sql = `SELECT *, DATE_FORMAT(dob, '%Y-%m-%d') ISOdob, DATE_FORMAT(dod, '%Y-%m-%d') ISOdod
              FROM authors
              WHERE authorId = ?`;
   const [authorInfo] = await pool.query(sql, [authorId]); 
   res.render('updateAuthor.ejs', {authorInfo})
});

app.post('/updateAuthor', async (req, res) => {
   let firstName = req.body.firstName;
   let lastName = req.body.lastName;
   let dob = req.body.dob;
   let sex = req.body.sex;
   let authorId = req.body.authorId;

   let sql = `UPDATE authors
              SET
              firstName = ?,
              lastName = ?,
              dob = ?,
              sex = ?
              WHERE authorId = ?
              `;
   let sqlParams = [firstName, lastName, dob, sex, authorId];              
   const [rows] = await pool.query(sql, sqlParams);
   res.redirect('/authors')
});

//route to display the form to add a new author
app.get('/addAuthor', (req, res) => {
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

//route to display the form to add a new quote
app.get('/addQuote', (req, res) => {

    //get list of authors
    //get list of categories

   res.render('addQuote.ejs')
});



app.get('/logout', (req, res) => {
   req.session.destroy();
   res.redirect("/");
});

app.post('/loginProcess', async (req, res) => {
//    let username = req.body.username;
//    let password = req.body.password;
   let {username, password} = req.body;
   console.log(username + ": " + password);

   let hashedPassword = "";

   let sql = `SELECT *
              FROM admin
              WHERE username = ?`;
   const [rows] = await pool.query(sql, [username]);

   if (rows.length > 0) { //username was found in the database
       hashedPassword = rows[0].password;
   }
 
   const match = await bcrypt.compare(password, hashedPassword);

   if (match) {
     req.session.authenticated = true;
     req.session.fullName = rows[0].firstName + " " + rows[0].lastName;
     res.render('admin.ejs', {"fullName":req.session.fullName});
   } else {
     let loginError = "Wrong Credentials! Try again!"
     //res.locals.loginError = "wrong credentials"
     res.render('login.ejs', {loginError});
   }
});
function isUserAuthenticated(req, res, next){
    if (req.session.authenticated) { 
      next();
   } else {
     res.redirect("/");
   }
}



app.listen(3000, () => console.log("Express server running on http://localhost:3000"));
