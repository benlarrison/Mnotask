// import modules
import { default as express } from 'express';
import { default as hbs } from 'hbs';
import * as path from 'path';
// import * as favicon from 'serve-favicon';
import { default as cookieParser } from 'cookie-parser';
import { default as bodyParser } from 'body-parser';
import * as http from 'http';
import { approotdir } from './approotdir.mjs';
import socketio from 'socket.io';
import passportSocketIo from 'passport.socketio';

const __dirname = approotdir;

// with this approach, we do not have to explicitly call the dotenv.config function.
import dotenv from 'dotenv/config.js';
import fs from 'fs';

// Routers
import { router as indexRouter, init as homeInit } from './routes/index.mjs';
import { router as notesRouter, init as notesInit } from './routes/notes.mjs';
import { router as usersRouter, initPassport } from './routes/users.mjs';

import session from 'express-session';
import sessionFileStore from 'session-file-store';
import RedisStore from 'connect-redis';
import redis from 'redis';
var sessionStore;

// Initialize the express app
export const app = express();

import  {
    normalizePort, onError, onListening, handle404, basicErrorHandler
} from './appsupport.mjs';


export const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

export const server = http.createServer(app);


if (typeof process.env.REDIS_ENDPOINT !== 'undefined' && process.env.REDIS_ENDPOINT !== '') {
    const redisClient = redis.createClient({
        socket: {
            host: process.env.REDIS_ENDPOINT,
            port: '6379'
        }
    });
    redisClient.connect();

    redisClient.on('error', (error) => {
        console.log("Redis connection error: ", error);
    });

    redisClient.on('connect', () => {
       console.log('Connected to Redis server');
    });

    sessionStore = new RedisStore({
        client: redisClient,
    });

} else {
    const FileStore = sessionFileStore(session);
    sessionStore = new FileStore({ path: "sessions" });
}
const FileStore = sessionFileStore(session);
sessionStore = new FileStore({ path: "sessions" });


export const io = socketio(server);
export const sessionCookieName = 'notescookie.sid';
const sessionSecret = 'keyboard mouse';


io.use(passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: sessionCookieName,
    secret: sessionSecret,
    store: sessionStore,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
}));


import redisIO from 'socket.io-redis';
if (typeof process.env.REDIS_ENDPOINT !== 'undefined' && process.env.REDIS_ENDPOINT !== '') {
    io.adapter(redisIO({ host: process.env.REDIS_ENDPOINT, port: 6379 }));
}

// For the updated socket.io redis adapter.
// install peer dependency if necessary
//import createAdapter from '@socket.io/redis-adapter';
//if (typeof process.env.REDIS_ENDPOINT !== 'undefined' && process.env.REDIS_ENDPOINT !== '') {
//
//    const redisPubClient = redis.createClient({
//        socket: {
//            host: process.env.REDIS_ENDPOINT,
//            port: '6379'
//        }
//    });
//    //redisPubClient.connect();
//
//    const redisSubClient = redis.createClient({
//        socket: {
//            host: process.env.REDIS_ENDPOINT,
//            port: '6379'
//        }
//    });
//    //redisSubClient.connect();
//    Promise.all([redisPubClient.connect(), redisSubClient.connect()]).then(() => {
//        io.adapter(createAdapter(redisPubClient, redisSubClient));
//    });
//}



//Loggers
import { default as logger } from 'morgan';
import { default as rfs } from 'rotating-file-stream';
import { default as DBG } from 'debug';
const debug = DBG('notes:debug');
const dbgerror = DBG('notes:error');





server.on('request', (req, res) => {
    debug(`${new Date().toISOString()} request ${req.method} ${req.url}`);
});
server.on('error', onError);
server.on('listening', onListening);



import { useModel as useNotesModel } from './models/notes-store.mjs';
useNotesModel(process.env.NOTES_MODEL ? process.env.NOTES_MODEL : "memory")
.then(() => {
    homeInit();
    notesInit();
})
.catch(error => { onError({ code: "ENOTESSTORE", error }); });


function onAuthorizeSuccess(data, accept){
    console.log('successful connection to socket.io with Passport');
    accept(null, true);
}

function onAuthorizeFail(data, message, error, accept){
    if(error) {
        dbgerror("Passport not initialized, connect to socket.io directly:", message);
        //throw new Error(message);
        // The accept-callback still allows us to decide whether to accept the connect
        accept(null, true);
    } else {
        console.log(message);
        accept(null, true);
    }
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(`${__dirname}/partials`);

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
app.use(logger(process.env.REQUEST_LOG_FORMAT || 'dev', {
    stream: process.env.REQUEST_LOG_FILE ?
    rfs.createStream(process.env.REQUEST_LOG_FILE, {
        size: '10M',        // rotate every 10 MegaBytes written
        interval: '1d',     // rotate daily
        compress: 'gzip'    // compress rotated files
    })
    : process.stdout
}));

//It is possible to set up multiple logs.
if (process.env.REQUEST_LOG_FILE) {
    app.use(logger(process.env.REQUEST_LOG_FORMAT || 'dev'));
}


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/assets/vendor/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use('/assets/vendor/jquery', express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist')));

app.use('/assets/vendor/popper.js', express.static(path.join(__dirname, 'node_modules', 'popper.js', 'dist', 'umd')));
app.use('/assets/vendor/twitter/logo-white.png', express.static(path.join(__dirname, 'logo-white.png')));
const popperPath = `${__dirname}/node_modules/popper.js/dist/umd/popper.min.js`
const popperStaticPath = `${__dirname}/public/assets/vendor/popper.js/popper.min.js`


app.use('/assets/vendor/bootstrap-icons', express.static(path.join(__dirname, 'node_modules', 'bootstrap-icons')));

app.use(session({
    store: sessionStore,
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true,
    name: sessionCookieName
}));
initPassport(app);


// Router function lists
app.use('/', indexRouter);
app.use('/notes', notesRouter);
app.use('/users', usersRouter);

app.use(handle404);
app.use(basicErrorHandler);


server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
