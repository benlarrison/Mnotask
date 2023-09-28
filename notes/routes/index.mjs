import { default as express } from 'express';
import { NotesStore as notes } from '../models/notes-store.mjs';
import { twitterLogin } from './users.mjs';
export const router = express.Router();

import DBG from 'debug';
const debug = DBG('notes:router-users');
const error = DBG('notes:error-users');

// This is the initialized Socket.IO object we used to send messages to and from connected browsers.
import { io } from '../app.mjs';


router.get('/', async (req, res, next) => {
  try {
    const notelist = await getKeyTitlesList();
    notes.loadNotes();

    debug('Load notes from home page');
    res.render('index', {
      title: 'mnotask', notelist: notelist,
      user: req.user ? req.user : undefined,
      twitterLogin: twitterLogin
    });

    //await emitNoteTitles();
  } catch (e) { next(e); }
});

import redis from 'redis';

// We need to use this function not only in the home page router funciton but also
// When we emit Socket.IO messages for the home page
async function getKeyTitlesList() {
  const keylist = await notes.keylist();
  const keyPromises = keylist.map(key => notes.read(key));
  const notelist = await Promise.all(keyPromises);
  return notelist.map(note => {
    return { key: note.key, title: note.title };
  });
};

export const emitNoteTitles = async () => {
    try {
        const notelist = await getKeyTitlesList();
        io.of('/home').emit('notetitles', { notelist: notelist });
        
    } catch (error) {
        debug('Error in emitNoteTitles:', error);
    }
};



export function init() {
  io.of('/home').on('connect', (socket) => {
    debug('socketio connection on /home');
    notes.loadNotes();
  });

  notes.on('notecreated', emitNoteTitles);
  notes.on('noteupdate', emitNoteTitles);
  notes.on('notedestroy', emitNoteTitles);
  notes.on('loadnotes', emitNoteTitles);
  
}
