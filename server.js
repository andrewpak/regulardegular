const express = require('express')
const app = express()
const {pool} = require('./dbConfig')
const bcrypt = require('bcryptjs')
const session = require('express-session')
const flash = require('express-flash')
const passport = require('passport')
const path = require('path')
const initializePassport = require('./passportConfig')

initializePassport(passport)

app.set('view engine', 'ejs')
app.use(express.urlencoded({extended: false}))

app.use(session({
    secret: 'secret',

    resave: false,

    saveUninitialized: false

}))

app.use(passport.initialize())
app.use(passport.session())
app.use(express.static(__dirname+'/public'));



app.use(flash())
const PORT = process.env.PORT || 4000

app.get('/', (req, res) => {
    res.render('index')
})

app.get('/users/register', (req, res) =>{
    res.render('register')
})

app.get('/users/login', (req, res) =>{
    res.render('login')
})
app.get('/users/logout', (req, res)=>{
    req.logOut()
    req.flash('success_msg', 'you have logged out')
    res.render('login')
})

app.get('/users/dashboard', (req, res)=>{
    res.render('dashboard', {user: req.user.name})
})

app.get('/users/main',  (req, res) => { 
    const name = req.user.name
    
    pool.query(`SELECT * FROM posts ORDER BY post_number DESC`, (err, results) =>{
        if(err)
        throw err;
    const commentArray = []
    const userPoster = []
    
        for(var i = 0;i<results.rows.length;i++){
            commentArray.push(results.rows[i].post_content)
            userPoster.push(results.rows[i].username)
        }
        console.log(commentArray[2])
        res.render('main',{comments: commentArray, userPosts: userPoster, user: name})
    })
})

app.post('/users/main', async (req,res)=>{
    let {forumPost} = req.body
    console.log({forumPost})
    pool.query(`INSERT INTO posts (username, post_content) VALUES ($1, $2) RETURNING username, post_content `,[req.user.name, forumPost], (err, results)=>{
        if(err){
            throw err
        }
        console.log(results.rows)
        res.redirect('/users/main')
    })

})

app.post('/users/register', async (req,res)=>{
    let {name, email, password, password2} = req.body

    console.log({
        name,
        email,
        password,
        password2
    })

    let errors = []

    if (!name || !email || !password || !password2){
        errors.push({message: 'please enter all fields'})
    }
    if(password.length<6){
        errors.push({message: 'password should be at least 6 characters'})
    }
    if(password != password2){
        errors.push({message: 'passwords do not match'})
    }
    if(errors.length>0){
        res.render('register', {errors})
    } else {
        //form validation has passed
        let hashedPassword = await bcrypt.hash(password, 10)
        console.log(hashedPassword)
        pool.query(
            `SELECT * FROM userID WHERE email = $1`,[email], (err, results)=> {
                if(err){
                    throw err
                } 
                console.log(results.rows)
                if(results.rows.length>0){
                    errors.push({message:'email already registered'})
                    res.render('register',{errors})
                } else {
                    pool.query(`INSERT INTO userID (name, email, password) 
                    VALUES ($1, $2, $3) 
                    RETURNING id, password`,[name, email, hashedPassword], (err, results)=>{
                      if (err){
                          throw err
                      }  
                      console.log(results.rows)
                      req.flash('success_msg','you are now registered. Please log in')
                      res.redirect('/users/login')
                    }) 
                }
            })
        
    }
})

app.post('/users/login', passport.authenticate('local',{
    successRedirect: '/users/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
}))

app.listen(PORT, () => {
    console.log('Server running on port ${PORT}')
})
