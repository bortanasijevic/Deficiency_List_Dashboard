# Deficiency List Dashboard Backend

FastAPI backend for the Deficiency List (Punch List) Dashboard. Pulls punch list items from Procore API and serves them to the frontend dashboard.

## Features

- 🔄 **Automatic Token Refresh**: Uses shared Procore API tokens with file locking
- 📊 **Punch List Items API**: Fetches and serves punch list items from Procore
- 🔒 **Race Condition Protection**: File locking prevents token refresh conflicts
- 🚀 **FastAPI**: Modern async API framework

## Prerequisites

- Python 3.8+
- Access to Procore API
- Shared token file (see [Token Management](#token-management) below)

## Token Management

### Shared Token Strategy

This backend **shares the same Procore API tokens** with:
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

### Configuration

The backend automatically uses the shared token location. You can override it by setting the `TOKENS_PATH` environment variable:

```bash
export TOKENS_PATH=~/Projects/DEC/Pull_RFI_related_to_drawings/tokens.json
```

Or create a `.env` file in this directory:
```env
TOKENS_PATH=~/Projects/DEC/Pull_RFI_related_to_drawings/tokens.json
```

### Token Refresh Behavior

- **Automatic refresh**: Tokens are automatically refreshed when they're near expiry (within 2 minutes)
- **File locking**: The auth manager uses file locking to prevent race conditions when multiple processes try to refresh simultaneously
- **Verification**: On first use, the auth manager prints the token file path:
  ```
  [auth] Using tokens from: /Users/.../Pull_RFI_related_to_drawings/tokens.json
  ```

### Verifying Token Configuration

When you start the backend API, you should see a message indicating which token file is being used:
```
[auth] Using tokens from: /absolute/path/to/tokens.json
```

If you see a different path than expected, check your `TOKENS_PATH` environment variable.

## Installation

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment** (optional):
   ```bash
   export TOKENS_PATH=~/Projects/DEC/Pull_RFI_related_to_drawings/tokens.json
   export PROCORE_COMPANY_ID=598134325680979
   export PROCORE_PROJECT_ID=598134325936838
   ```

## Running the Backend

### Development Mode

```bash
cd ~/Projects/DEC/Deficiency_List_Dashboard/Deficiency_List_Backend
uvicorn api.main:app --port 8081 --reload
```

The API will be available at `http://localhost:8081`.

### Production Mode

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8081
```

## API Endpoints

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "ok": true
}
```

### GET `/punch_list_items`

Returns the list of punch list items.

**Response:**
```json
{
  "rows": [
    {
      "id": "string",
      "number": "string",
      "subject": "string",
      "status": "string",
      "assigned_to": "string",
      "company_name": "string",
      "due_date": "YYYY-MM-DD",
      "days_late": 0,
      "days_in_court": 0,
      "link": "https://...",
      "mailto_reminder": "mailto:..."
    }
  ],
  "lastUpdated": "ISO datetime"
}
```

### POST `/punch_list_items/refresh`

Triggers a data refresh by running the extractor script.

**Response:**
```json
{
  "ok": true,
  "refreshedAt": "ISO datetime"
}
```

## Manual Data Refresh

You can also run the extractor script directly:

```bash
python pull_punch_list_items.py
```

This will:
1. Load and refresh tokens (using shared token file)
2. Fetch punch list items from Procore API
3. Process and save to `punch_list_items.json`

## Project Structure

```
Deficiency_List_Backend/
├── api/
│   └── main.py              # FastAPI application
├── pull_punch_list_items.py # Extractor script
├── punch_list_items.json    # Output data file
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Dependencies

- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `requests` - HTTP client
- `python-dateutil` - Date parsing
- `pydantic` - Data validation

## Troubleshooting

**Token errors:**
- Verify `TOKENS_PATH` points to the shared token file
- Check that the token file exists and is readable/writable
- Ensure the auth manager can access `RFI_Python_Data_Extraction/auth_manager_refresh_only.py`

**API connection errors:**
- Verify Procore API credentials are correct
- Check network connectivity
- Ensure tokens are valid (they refresh automatically)

**Import errors:**
- Ensure `RFI_Python_Data_Extraction` is in the expected location
- Check that `auth_manager_refresh_only.py` exists in that project

## License

Proprietary - DEC Internal Use Only

