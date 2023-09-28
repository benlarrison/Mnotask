import fs from 'fs-extra';
import path from 'path';
import util from 'util';
import { default as express } from 'express';
import { default as passport } from 'passport';
import { default as passportLocal } from 'passport-local';
const LocalStrategy = passportLocal.Strategy;
import * as usersModel from '../models/users-superagent.mjs';
import { sessionCookieName } from '../app.mjs';

import passportTwitter from 'passport-twitter';
const TwitterStrategy = passportTwitter.Strategy;

export const router = express.Router();

import DBG from 'debug';
const debug = DBG('notes:router-users');
const error = DBG('notes:error-users');


const twittercallback = process.env.TWITTER_CALLBACK_HOST
    ? process.env.TWITTER_CALLBACK_HOST
    : "http://localhost:3000";
export var twitterLogin = false;
let consumer_key;
let consumer_secret;

if (typeof process.env.TWITTER_CONSUMER_KEY !== 'undefined' 
&& process.env.TWITTER_CONSUMER_KEY !== ''
&& typeof process.env.TWITTER_CONSUMER_SECRET !== 'undefined'
&& process.env.TWITTER_CONSUMER_SECRET !== '') {
    
    consumer_key = process.env.TWITTER_CONSUMER_KEY;
    consumer_secret = process.env.TWITTER_CONSUMER_SECRET;
    twitterLogin = true;
} else if (typeof process.env.TWITTER_CONSUMER_KEY_FILE !== 'undefined' && process.env.TWITTER_CONSUMER_KEY_FILE !== '' && typeof process.env.TWITTER_CONSUMER_SECRET_FILE !== 'undefined' && process.env.TWITTER_CONSUMER_SECRET_FILE !== ''){
    
    consumer_key = fs.readFileSync(process.env.TWITTER_CONSUMER_KEY_FILE, 'utf8');
    consumer_secret = fs.readFileSync(process.env.TWITTER_CONSUMER_SECRET_FILE, 'UTF8');
    twitterLogin = true;
    
}else {
    twitterLogin = false;
}

if (twitterLogin) {
    
    passport.use(new TwitterStrategy({
        consumerKey: consumer_key,
        consumerSecret: consumer_secret,
        callbackURL: `${twittercallback}/users/auth/twitter/callback`
    },
    async function(token, tokenSecret, profile, done) {
        try {
            done(null, await usersModel.findOrCreate({
                id: profile.username, username: profile.username, password: "",
                provider: profile.provider, familyName: profile.displayName,
                givenName: "", middleName: "",
                photos: profile.photos, emails: profile.emails
            }));
        } catch (e) { done(e); }
    }));
}


//When /users/auth/twitter is called, the passport middleware starts the user authentication and registration process using the TwitterStrategy
router.get('/auth/twitter', function (req, res, next){
    try {
        passport.authenticate('twitter')(req,res,next);
    } catch (e) { 
        next(e); 
    }
});

router.get('/auth/twitter/callback', function(req, res, next){
    passport.authenticate('twitter', {  successRedirect: '/',
                                        failureRedirect: '/users/login' })(req,res,next);
});
// Mounted on /users -- all these routes have /user prepended to them
router.get('/login', function(req, res, next) {
    try {
        res.render('login', { title: "Login to Notes", user: req.user, });
    } catch (e) { next(e); }
});

router.post('/login', passport.authenticate('local', {
    successRedirect: '/', // SUCESS: Go to home page
    failureRedirect: 'login', // FAIL: Go to /users/login
    })
);



router.get('/logout', function(req, res, next) {
    try {
        req.session.destroy();

        //newer versions of passport requires this
        req.logout(function(err) {
            if (err) { return next(err); }
        });     //Passport requires callback
        res.clearCookie(sessionCookieName);
        res.redirect('/');
    } catch (e) { next(e); }
});

passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            var check = await usersModel.userPasswordCheck(username, password);
            if (check.check) {
                done(null, { id: check.username, username: check.username });
            } else {
                done(null, false, check.message);
            }
        } catch (e) { 
            done(e); 
        }
    }
));

passport.serializeUser(function(user, done) {
    try {
        done(null, user.username);
    } catch (e) { 
        done(e); 
    }
});

passport.deserializeUser(async (username, done) => {
    try {
        var user = await usersModel.find(username);
        done(null, user);
    } catch(e) { done(e); }
});



// To be inserted into any route definition that requires an authenticated loggin-in user.
// If the user is not logged in, this function redirects them to /users/login so that they can log in
export function ensureAuthenticated(req, res, next) {
    try {
        // req.user is set by Passport in the deserialize function
        if (req.user) next();
        else res.redirect('/users/login');
    } catch (e) { next(e); }
}

export function initPassport(app) {
    app.use(passport.initialize());
    app.use(passport.session());
}

