import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const NOTES_FILE = path.join(process.cwd(), 'data', 'notes.json');

// Ensure the notes file exists
async function ensureNotesFile() {
  try {
    await fs.access(NOTES_FILE);
  } catch {
    await fs.mkdir(path.dirname(NOTES_FILE), { recursive: true });
    await fs.writeFile(NOTES_FILE, JSON.stringify({}));
  }
}

// Read notes from file
async function readNotes(): Promise<Record<string, string>> {
  await ensureNotesFile();
  const data = await fs.readFile(NOTES_FILE, 'utf-8');
  return JSON.parse(data);
}

// Write notes to file
async function writeNotes(notes: Record<string, string>) {
  await ensureNotesFile();
  await fs.writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));
}

// GET /api/notes - Get all notes or a specific note
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');

    const notes = await readNotes();

    if (itemId) {
      return NextResponse.json({
        item_id: itemId,
        text: notes[itemId] || '',
      });
    }

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error reading notes:', error);
    return NextResponse.json(
      { error: 'Failed to read notes' },
      { status: 500 }
    );
  }
}

// POST /api/notes - Save a note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_id, text } = body;

    if (!item_id) {
      return NextResponse.json(
        { error: 'item_id is required' },
        { status: 400 }
      );
    }

    const notes = await readNotes();
    notes[item_id] = text || '';
    await writeNotes(notes);

    return NextResponse.json({
      ok: true,
      item_id,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving note:', error);
    return NextResponse.json(
      { error: 'Failed to save note' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes - Delete a note or multiple notes
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');

    const notes = await readNotes();

    if (itemId) {
      // Delete a single note
      delete notes[itemId];
    } else {
      // Delete multiple notes (for cleanup)
      const body = await request.json();
      const { item_ids } = body;

      if (Array.isArray(item_ids)) {
        item_ids.forEach((id) => delete notes[id]);
      }
    }

    await writeNotes(notes);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}

