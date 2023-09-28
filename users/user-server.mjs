import restify from 'restify';
import * as util from 'util';
import { SQUser, connectDB, userParams, findOneUser, createUser, sanitizedUser } from './users-sequelize.mjs';

import DBG from 'debug';
const log = DBG('users:service');
const error = DBG('users:error');

import { default as bcrypt } from 'bcrypt';

//Set up the REST server

var server = restify.createServer({
    name: "user-Auth-Service",
    version: "0.0.1"
});

server.use(restify.plugins.authorizationParser());
server.use(check);
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser({
    mapParams: true
}));

server.listen(process.env.PORT, process.env.REST_LISTEN ? process.env.REST_LISTEN : 'localhost', function() {
    log(server.name +' listening at '+ server.url);
});

process.on('uncaughtException', function(err) {
    console.error("UNCAUGHT EXCEPTION - "+ (err.stack || err));
    process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
    console.error(`UNHANDLED PROMISE REJECTION: ${util.inspect(p)} reason: ${reason}`);
    process.exit(1);
});

// Mimic API Key authentication

var apiKeys = [
    { user: 'them', key: 'D4ED43C0-8BD6-4FE2-B358-7C0E230D11EF' } ];

function check(req, res, next) {
    if (req.authorization && req.authorization.basic) {
        var found = false;
        for (let auth of apiKeys) {
            if (auth.key === req.authorization.basic.password &&
                auth.user === req.authorization.basic.username) {
                found = true;
                break;
            }
        }
        if (found) next ();
        else {
            res.send(401, new Error('Not authenticated'));
            next(false);
        }
    } else {
        res.send(500, new Error('No Authorization Key'));
        next(false);
    }
}

server.post('/create-user', async (req, res) => {
    try {
        await connectDB();
        let result = await createUser(req);
        res.contentType = 'json';
        res.send(result);
    } catch(err) {
        res.send(500, err);
    }
});

server.post('/find-or-create', async (req, res) => {
    try {
        await connectDB();
        let user = await findOneUser(req.params.username);
        if (!user) {
            user = await createUser(req);
            if (!user) throw new Error('No user created');
        }
        res.contentType = 'json';
        res.send(user);
    } catch(err) {
        res.send(500, err);
    }
});

server.get('/find/:username', async (req, res) => {
    try {
        await connectDB();
        const user = await findOneUser(req.params.username);
        if (!user) {
            res.send(404, new Error("Did not find "+ req.params.username));
        } else {
            res.contentType = 'json';
            res.send(user);
        }
    } catch(err) {
        res.send(500, err);
    }
});

server.get('/list', async (req, res) => {
    try {
        await connectDB();
        let userlist = await SQUser.findAll({});
        userlist = userlist.map(user => sanitizedUser(user));
        if (!userlist) userlist = [];
        res.contentType = 'json';
        res.send(userlist);
    } catch(err) {
        res.send(500, err);
    }
});

server.post('/update-user/:username', async (req, res) => {
    try {
        await connectDB();
        let toupdate = userParams(req);
        await SQUser.update(toupdate, { where: { username: req.params.username }});
        const result = await findOneUser(req.params.username);
        res.contentType = 'json';
        res.send(result);
    } catch(err) {
        res.sendDate(500, err);
    }
});

server.del('/destroy/:username', async (req, res) => {
    try {
        await connectDB();
        const user = await SQUser.findOne({
            where: { username: req.params.username } });
        if (!user) {
            res.send(404, new Error("Did not find "+ req.params.username));
        } else {
            user.destroy();
            res.contentType = 'json';
            res.send({});
        }
    } catch(err) {
        res.send(500, err);
    }
});

server.post('/password-check', async (req, res) => {
    try {
        await connectDB();
        const user = await SQUser.findOne({
            where: { username: req.params.username } });
        let checked;
        if (!user) {
            checked = {
                check: false, username: req.params.username,
                message: "Could not find user"
            };
        } else {
            let pwcheck = false;
            if (user.username == req.params.username) {
                pwcheck = await bcrypt.compare(req.params.password, user.password);
            }
            if (pwcheck) {
                checked = { check: true, username: req.params.username };
            } else {
                checked = {
                    check: false, username: req.params.username,
                    message: "Incorrect username or password"
                };
            }
        }
        res.contentType = 'json';
        res.send(checked);
    } catch(err) {
        res.send(500, err);
    }
});
