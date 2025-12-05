# Deficiency List Dashboard

A modern dashboard for tracking Procore punch list (deficiency list) items, built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- 📊 **Real-time Punch List Tracking**: View and manage all punch list items in a comprehensive table
- 🔍 **Smart Search**: Filter items by number, subject, or assigned party
- 📝 **Modal Notes Editing**: Edit notes in a popup dialog with auto-save
- 🔄 **Data Refresh**: Manual refresh with fallback to cached data on failure
- 📧 **Email Integration**: Quick email reminders with pre-populated content
- 🔗 **External Links**: Direct access to punch list item documentation
- 🎨 **Color-Coded Status**: Visual indicators for days late and days in court
- 💾 **Local File Storage**: Notes saved to `data/notes.json` on your computer

## Prerequisites

- Node.js 18+ and npm/pnpm/yarn
- Backend API running at `http://localhost:8081` (see [Backend README](../Deficiency_List_Backend/README.md))
- Shared Procore API tokens (see [Token Management](#token-management) below)

## Quick Start

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### 2. Configure Environment

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
```

### 3. Start Backend API

In a separate terminal, start the Python backend:

```bash
cd ../Deficiency_List_Backend
uvicorn api.main:app --port 8081 --reload
```

See the [Backend README](../Deficiency_List_Backend/README.md) for detailed setup instructions.

### 4. Start Development Server

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

## Token Management

### Shared Token Strategy

This dashboard **shares the same Procore API tokens** with:
- **RFI Dashboard** (`RFI_Python_Data_Extraction`)
- **Deficiency List Dashboard** (`Pull_RFI_related_to_drawings`)

**Why Share Tokens?**
- ✅ **Prevents conflicts**: When one program refreshes tokens, all benefit
- ✅ **More efficient**: Fewer API calls to Procore, lower risk of rate limiting
- ✅ **Single source of truth**: One token file to manage
- ✅ **Race condition protection**: File locking prevents simultaneous refresh conflicts

### Token File Location

The shared tokens are stored at:
```
~/Projects/DEC/Pull_RFI_related_to_drawings/tokens.json
```

The backend automatically uses this shared location. Token refresh is handled automatically by the backend API.

### Verifying Token Configuration

When you start the backend API, you should see:
```
[auth] Using tokens from: /Users/.../Pull_RFI_related_to_drawings/tokens.json
```

This confirms the backend is using the shared token file.

## Project Structure

```
deficiency-list-dashboard/
├── app/                    # Next.js App Router
│   ├── api/                # Next.js API routes
│   │   └── notes/          # Local notes API
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard page
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── PunchListHeader.tsx # Header component
│   ├── PunchListTable.tsx  # Main table component
│   ├── NotesModal.tsx      # Notes editor modal
│   └── ErrorBanner.tsx     # Error display
├── lib/
│   ├── api.ts              # API client functions
│   ├── schemas.ts          # Zod validation schemas
│   └── utils.ts            # Utility functions
└── data/
    └── notes.json          # Local notes storage (gitignored)
```

## Available Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Validation**: Zod
- **State Management**: React hooks
- **Storage**: localStorage (for caching)

## License

Proprietary - DEC Internal Use Only
