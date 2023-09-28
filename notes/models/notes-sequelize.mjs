import { Note, AbstractNotesStore } from './Notes.mjs';
import Sequelize from 'sequelize';
import {
    connectDB as connectSequlz,
    close as closeSequlz
} from './sequlz.mjs';
import DBG from 'debug';
const debug = DBG('notes:notes-sequelize');
const error = DBG('notes:error-sequelize');

let sequelize;
export class SQNote extends Sequelize.Model {}

async function connectDB() {
    if (sequelize) return;
    sequelize = await connectSequlz();
    SQNote.init({
        notekey: {  type: Sequelize.DataTypes.STRING,
                    primaryKey: true, unique: true },
        title: Sequelize.DataTypes.STRING,
        body: Sequelize.DataTypes.TEXT
    }, { sequelize,
        modelName: 'SQNote' 
    });
    await SQNote.sync();
}

export default class SequelizeNotesStore extends AbstractNotesStore {

    async close() {
        closeSequlz();
        sequelize = undefined;
    }

    async update(key, title, body) {
        await connectDB();
        const note = await SQNote.findOne({ where: { notekey: key} })
        if (!note) {
            throw new Error(`No note found for ${key}`);
        } else {
            await SQNote.update({ title, body }, 
                { where: { notekey: key } });
            const note = await this.read(key);
            console.log("Emit updated note");
            this.emitUpdated(note);
            return note;
        }
    }

    async create(key, title, body) {
        await connectDB();
        const sqnote = await SQNote.create({ notekey: key, title, body });
        const note = new Note(sqnote.notekey, sqnote.title, sqnote.body);
        this.emitCreated(note);
        return note;
    }

    async read(key) {
        await connectDB();
        const note = await SQNote.findOne({ where: { notekey: key } });
        if (!note) {
            throw new Error(`No note found for ${key}`);
        } else {
            return new Note(note.notekey, note.title, note.body);
        }
    }

    async destroy(key) {
        await connectDB();
        await SQNote.destroy({ where: { notekey: key } });
        this.emitDestroyed(key);
    }

    async keylist() {
        await connectDB();
        const notes = await SQNote.findAll({ attributes: ['notekey'] });
        const notekeys = notes.map(note => note.notekey);
        return notekeys;
    }

    async count() {
        await connectDB();
        const count = await SQNote.count();
        return count;
    }
}