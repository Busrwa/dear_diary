import * as SQLite from 'expo-sqlite';
import { Note } from '../types/note';
import { ensureSchema } from './db';

type NoteRow = {
  id: string;
  title: string;
  content_html: string;
  paper_id: string;
  created_at: number;
  updated_at: number;
};

function fromRow(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    contentHtml: row.content_html,
    paperId: row.paper_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function initDatabase(db: SQLite.SQLiteDatabase) {
  await ensureSchema(db);
}

export async function listNotes(db: SQLite.SQLiteDatabase): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(
    'SELECT * FROM notes ORDER BY updated_at DESC'
  );
  return rows.map(fromRow);
}

export async function saveNote(db: SQLite.SQLiteDatabase, note: Note) {
  await db.runAsync(
    `INSERT INTO notes (id, title, content_html, paper_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       content_html = excluded.content_html,
       paper_id = excluded.paper_id,
       updated_at = excluded.updated_at`,
    note.id,
    note.title,
    note.contentHtml,
    note.paperId,
    note.createdAt,
    note.updatedAt
  );
}

export async function deleteNote(db: SQLite.SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM notes WHERE id = ?', id);
}
