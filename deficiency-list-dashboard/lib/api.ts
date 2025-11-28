import { PunchListItemsResponse, NoteResponse, NotePutResponse, RefreshResponse } from './schemas';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchPunchListItems() {
  const res = await fetch(`${API_BASE}/punch_list_items`);
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to fetch punch list items: ${res.statusText}`);
  }
  const data = await res.json();
  return PunchListItemsResponse.parse(data);
}

export async function refreshPunchListItems() {
  const res = await fetch(`${API_BASE}/punch_list_items/refresh`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to refresh punch list items: ${res.statusText}`);
  }
  const data = await res.json();
  return RefreshResponse.parse(data);
}

// Notes API - uses local Next.js API routes
export async function fetchNote(itemId: string) {
  const res = await fetch(`/api/notes?item_id=${encodeURIComponent(itemId)}`);
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to fetch note: ${res.statusText}`);
  }
  const data = await res.json();
  return NoteResponse.parse(data);
}

export async function fetchAllNotes() {
  const res = await fetch('/api/notes');
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to fetch notes: ${res.statusText}`);
  }
  const data = await res.json();
  return data.notes as Record<string, string>;
}

export async function saveNote(itemId: string, text: string) {
  const res = await fetch('/api/notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ item_id: itemId, text }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to save note: ${res.statusText}`);
  }
  const data = await res.json();
  return NotePutResponse.parse(data);
}

export async function cleanupNotes(currentItemIds: string[]) {
  const res = await fetch('/api/notes/cleanup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ current_item_ids: currentItemIds }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to cleanup notes: ${res.statusText}`);
  }
  return res.json();
}


