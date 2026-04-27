import express from 'express';
import mysql from 'mysql2/promise';
import 'dotenv/config';
import bcrypt from 'bcrypt';
//new stuff
import session from 'express-session'

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
// app.use(session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false
// }));

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
//   cookie: { secure: true } <- only for production
}))

const pool = mysql.createPool({
    host: process.env.HOST_NAME,
    user: process.env.HOST_USERNAME,
    password: process.env.HOST_PASSWORD,
    database: process.env.HOST_DATABASE,
    connectionLimit: 10,
    waitForConnections: true
});
//routes
app.get('/', (req, res) => {
    res.render('login.ejs');
});

app.get('/settings', isUserAuthenticated,(req, res) => {
    res.render('settings.ejs');
});
app.get('/profile', isUserAuthenticated, (req, res) => {
    // if(req.session.authenticated){
    //     res.render('profile.ejs');
    // }else{
    //     res.redirect('/');
    // }

    res.render('profile.ejs');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


//route that checks username and password
app.post('/loginProcess', async(req, res) => {
    let{username,password} = req.body;
    let hashedPassword = "";
    let sql = `
    SELECT *
    FROM admin
    WHERE username=?
    `;
    const [rows] = await pool.query(sql, [username]);

    if (rows.length > 0){//username found
        hashedPassword = rows[0].password;
    }
    const match = await bcrypt.compare(password, hashedPassword);
    
    if(match){
        req.session.isAuthenticated = true;
        req.session.fullName = rows[0].firstName + " " + rows[0].lastName;
        res.render('welcome.ejs', {"fullName":req.session.fullName});
    }else{
        let loginError = "Incorrect password."
        res.render('login.ejs',{loginError});
    }
    // res.render('welcome.ejs');
});
//middleware


function isUserAuthenticated(req,res,next){
    if(req.session.authenticated){
        next();
    }else{
        res.redirect('/');
    }
}
//middleware funciton that sets users full name. reusable and useful when you need it many times.
app.use ((req,res,next)=>{
    res,locals.fullName = req.session.fullName || "";
    next(); //next middleware/route
});

app.listen(3000, () => {
    console.log("Express server running")
})
