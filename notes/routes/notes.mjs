// const util = require('util');
import { default as express } from 'express';
import { NotesStore as notes } from '../models/notes-store.mjs';
import { ensureAuthenticated } from './users.mjs';
import { twitterLogin } from './users.mjs';
export const router = express.Router();

import { emitNoteTitles } from './index.mjs';
import { io } from '../app.mjs';

import {
    postMessage, destroyMessage, recentMessages, emitter as msgEvents
} from '../models/messages-sequelize.mjs';

import DBG from 'debug';
const debug = DBG('notes:home');
const error = DBG('notes:error-home');

//Receive notifications of new messages, or destroyed messages from the model
msgEvents.on('newmessage', newmsg => {
    io.of(newmsg.namespace).to(newmsg.room).emit('newmessage', newmsg);
});
msgEvents.on('destroymessage', data => {
    io.of(data.namespace).to(data.room).emit('destroymessage', data);
});

export function init() {
    io.of('/notes').on('connect', async (socket) => {
        let notekey = socket.handshake.query.key;
        if (notekey) {
            socket.join(notekey);

            socket.on('create-message', async (newmsg, fn) => {
                try {
                    await postMessage(
                        newmsg.from, newmsg.namespace, newmsg.room, newmsg.message
                    );
                    fn('ok'); //acknowledgement function.  Anything supplied to fn will arive as the second argument to the callback function on the client.  The acknowledgement function works across the browser-server boundary.
                } catch (err) {
                    error(`FAIL to create message: ${err}`);
                }
            });
            
            socket.on('delete-message', async (data) => {
                try {
                    await destroyMessage(data.id);
                } catch (err) {
                    error(`FAIL to destroy message: ${err}`);
                }
            });

            socket.on('newmessage', newmsg => {
                var msgtxt = [
                    '<div id="note-message-%id%" class="card">',
                    '<div class="card-header card">',
                    '<h5 class="card-title">%from%</h5>',
                    '<div class="card-text">%message%</div>',
                    '<small style="display: block">%timestamp%</small>',
                    '</div>',
                    '<button type="button" class="btn btn primary message-del-button" ',
                    'data-id="%id%" data-namespace="%namespace%" ',
                    'data-room="%room%">',
                    'Delete',
                    '</button>',
                    '</div>',
                    '</div>',
                    '</div>'
                ].join('\n')
                .replace(/%id%/g, newmsg.id)
                .replace(/%from%/g, newmsg.from)
                .replace(/%namespace%/g, newmsg.namespace)
                .replace(/%room%/g, newmsg.room)
                .replace(/%message%/g, newmsg.message)
                .replace(/%timestamp%/g, newmsg.timestamp);
                $('#noteMessages').prepend(msgtxt);
            });

            


        }   
    });

    notes.on('noteupdated', note => {
        const toemit = {
            key: note.key, title: note.title, body: note.body
        };
        io.of('/notes').to(note.key).emit('noteupdated', toemit);
        emitNoteTitles();
    });
    notes.on('notedestroyed', key => {
        io.of('/notes').to(key).emit('notedestroyed', key);
        emitNoteTitles();
    });
}

// Add Note.
router.get('/add', ensureAuthenticated, async (req, res, next) => {
    try {
        res.render('noteedit', {
            title: "Add a Note",
            docreate: true, notekey: "",
            user: req.user, note: undefined, twitterLogin: twitterLogin
        });
    } catch (err) { next(err); }
});

// Save Note (update)
router.post('/save', ensureAuthenticated, async (req, res, next) => {
    try {
        let note;
        if (req.body.docreate === "create") {
            note = await notes.create(req.body.notekey, req.body.title, req.body.body);
        } else {
            note = await notes.update(req.body.notekey, req.body.title, req.body.body);
        }
        res.redirect('/notes/view?key=' + req.body.notekey);
    } catch (err) {
        return next(err);
    }
});

// Read Note (read)
router.get('/view', async (req, res, next) => {
    try {
        let note = await notes.read(req.query.key);
        const messages = await recentMessages('/notes', req.query.key);
        res.render('noteview', {
            title: note ? note.title : "",
            notekey: req.query.key,
            user: req.user ? req.user : undefined,
            note: note, twitterLogin: twitterLogin, 
            messages
        });
    } catch (err) {
        return next(err);
    }
});


// Edit Note (update)
router.get('/edit', ensureAuthenticated, async (req, res, next) => {
    try {
        const note = await notes.read(req.query.key);
        res.render('noteedit', {
            title: note ? ("Edit " + note.title) : "Add a Note",
            docreate: false,
            notekey: req.query.key, 
            user: req.user,
            note: note, twitterLogin: twitterLogin
        });
    } catch (err) {
        return next(err);
    }
});

// Destroy Note (destroy)
router.get('/destroy', ensureAuthenticated,  async (req, res, next) => {
    try {
        const note = await notes.read(req.query.key);
        res.render('notedestroy', {
            title: note ? `Delete ${note.title}` : "",
            notekey: req.query.key, 
            user: req.user,
            note: note, twitterLogin: twitterLogin
        });
    } catch (err) {
        return next(err);
    }
});

// Confirm Destroy Note (destroy)
router.post('/destroy/confirm', ensureAuthenticated, async (req, res, next) => {
    try {
        await notes.destroy(req.body.notekey);
        res.redirect('/');
    } catch (err) { next(err); }
});