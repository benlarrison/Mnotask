// Name the fields using symbols to make them private
const _note_key = Symbol('key');
const _note_title = Symbol('title');
const _note_body = Symbol('body');

// The note class describes a single note that our application will manage.
export class Note {
    constructor(key, title, body) {
        this[_note_key] = key;
        this[_note_title] = title;
        this[_note_body] = body;
    }

    get key() {
        return this[_note_key];
    }

    get title() {
        return this[_note_title];
    }

    get body() {
        return this[_note_body];
    }
    
    set title(newTitle) {
        this[_note_title] = newTitle;
    }

    set body(newBody) {
        this[_note_body] = newBody;
    }

    get JSON() {
        return JSON.stringify({
            key: this.key, title: this.title, body: this.body
        });
    }

    static fromJSON(json) {
        const data = JSON.parse(json);
        if (typeof data !== 'object'
            || !data.hasOwnProperty('key')
            || typeof data.key !== 'string'
            || !data.hasOwnProperty('title')
            || typeof data.title !== 'string'
            || !data.hasOwnProperty('body')
            || typeof data.body !== 'string') {
                throw new Error(`Not a Note: ${json}`);
            }
            const note = new Note(data.key, data.title, data.body);
            return note;
        
    }

}

import EventEmitter from 'events';

// The AbstractNotesStore class defines the interface that our application will use to manage notes
export class AbstractNotesStore extends EventEmitter {
    async close() { } // Some datastores keep an open connection to the database. This method allows us to close that connection.
    async update(key, title, body) { } // Update an existing note
    async create(title, body) { } // Create a new note
    async read(key) { } // Read a note
    async destroy(key) { } // Delete a note
    async keylist() { } // List all note keys
    async count() { } // Count the number of notes

    loadNotes() { this.emit('loadnotes'); }
    emitCreated(note) { this.emit('notecreated', note); }
    emitUpdated(note) { this.emit('noteupdated', note); }
    emitDestroyed(key) { this.emit('notedestroyed', key); }
}