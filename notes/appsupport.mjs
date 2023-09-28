import { port } from './app.mjs';
import { server } from './app.mjs';
import { default as DBG } from 'debug';
const debug = DBG('notes:debug');
const dbgerror = DBG('notes:error');

// app.mjs export ports as follows:
// export const port = normalizePort(process.env.PORT || '3000');

import { NotesStore } from './models/notes-store.mjs';

async function catchProcessDeath() {
    debug('urk...');
    await NotesStore.close();
    process.exit(0);
}

process.on('SIGTERM', catchProcessDeath);
process.on('SIGINT', catchProcessDeath);
process.on('SIGHUP', catchProcessDeath);

process.on('exit', () => {debug('exiting...'); });

process.on('uncaughtException', function(err) {
    console.error(`I've crashed!!! = ${err.stack || err}`);
});

import * as util from 'util';
process.on('unhandledRejection', (reason, p) => {
    console.error(`Unhandled Rejection at: ${util.inspect(p)} reason: ${reason}`);
});


//This function handles safely converting a port number string that we might get from the environment into a number.
export function normalizePort(val) {
    const port = parseInt(val, 10);
    if (isNaN(port)) {
        return val; // named pipe
    }
    if (port >= 0) {
        return port; // port number
    }
    return false;
}

// This function handles errors from the HTTP server object.  Some of these errors will simply cause the server to exit
export function onError(error) {
    dbgerror(error);

    if (error.syscall !== 'listen') {
        throw error;
    }
    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    switch (error.code) {
        case 'EACCES': 
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        case 'ENOTESSTORE':
            console.error(`Notes data store initialization failure because `, error.error);
            process.exit(1);
            break;
        default:
            throw error;
    }
}

// Prints a user-friendly message when the server starts listening
export function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    debug(`Listening on ${bind}`);
}

// The preceding code prints a user-friendly message when the server starts listening.
export function handle404(req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
}

export function basicErrorHandler(err, req, res, next) {
    debug('basicErrorHandler err=', err);
    // Defer to built-in error handler if headesrSent
    if (res.headersSent) {
        return next(err);
    }
    //Set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    //  Render the error page
    res.status(err.status || 500); //set the HTTP status code
    res.render('error'); //render the error page
}
