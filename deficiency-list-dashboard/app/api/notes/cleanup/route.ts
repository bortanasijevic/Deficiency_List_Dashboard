import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const NOTES_FILE = path.join(process.cwd(), 'data', 'notes.json');

// Read notes from file
async function readNotes(): Promise<Record<string, string>> {
  try {
    await fs.access(NOTES_FILE);
    const data = await fs.readFile(NOTES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Write notes to file
async function writeNotes(notes: Record<string, string>) {
  await fs.mkdir(path.dirname(NOTES_FILE), { recursive: true });
  await fs.writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));
}

// POST /api/notes/cleanup - Remove notes for items that no longer exist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { current_item_ids } = body;

    if (!Array.isArray(current_item_ids)) {
      return NextResponse.json(
        { error: 'current_item_ids must be an array' },
        { status: 400 }
      );
    }

    const notes = await readNotes();
    const noteIds = Object.keys(notes);
    const currentIdsSet = new Set(current_item_ids);

    // Find orphaned notes (notes for items that no longer exist)
    const orphanedIds = noteIds.filter((id) => !currentIdsSet.has(id));

    // Remove orphaned notes
    orphanedIds.forEach((id) => delete notes[id]);

    await writeNotes(notes);

    return NextResponse.json({
      ok: true,
      removed_count: orphanedIds.length,
      removed_ids: orphanedIds,
    });
  } catch (error) {
    console.error('Error cleaning up notes:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup notes' },
      { status: 500 }
    );
  }
}

