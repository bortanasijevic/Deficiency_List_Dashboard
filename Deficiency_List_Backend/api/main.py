#!/usr/bin/env python3
"""
FastAPI wrapper for Punch List (Deficiency List) extractor.
Serves punch list item data and provides endpoints for refresh.
"""
import os
import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Auto-load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# Configuration
PUNCH_LIST_JSON_PATH = os.getenv("PUNCH_LIST_JSON_PATH", "./punch_list_items.json")
EXTRACTOR_CMD = os.getenv("EXTRACTOR_CMD", "python pull_punch_list_items.py")

# Initialize FastAPI
app = FastAPI(title="Punch List API", version="1.0.0")

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class RefreshResponse(BaseModel):
    ok: bool
    refreshedAt: str
    stderr: Optional[str] = None

# Endpoints
@app.get("/health")
def health():
    """Health check endpoint."""
    return {"ok": True}

@app.get("/punch_list_items")
def get_punch_list_items():
    """
    Load punch list item data from JSON file.
    """
    try:
        json_path = Path(PUNCH_LIST_JSON_PATH)
        
        if not json_path.exists():
            raise HTTPException(
                status_code=404, 
                detail=f"Punch list data not found at {PUNCH_LIST_JSON_PATH}"
            )
        
        # Get file modification time for lastUpdated
        mtime = json_path.stat().st_mtime
        last_updated = datetime.fromtimestamp(mtime).isoformat()
        
        # Load and parse JSON
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        # Return data as-is (should already be in correct format)
        rows = data.get('rows', [])
        
        return {
            "rows": rows,
            "lastUpdated": data.get('lastUpdated', last_updated)
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse punch list JSON: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading punch list data: {str(e)}"
        )

@app.post("/punch_list_items/refresh")
def refresh_punch_list_items():
    """
    Run the extractor to regenerate punch_list_items.json.
    Returns success status and timestamp or error details.
    """
    try:
        # Determine working directory (repo root)
        repo_root = Path(__file__).parent.parent.absolute()
        
        # Run extractor command
        result = subprocess.run(
            EXTRACTOR_CMD,
            shell=True,
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            # Redact any potential secrets from stderr
            stderr = result.stderr[:400] if result.stderr else "Unknown error"
            # Simple redaction of common secret patterns
            for pattern in ['token', 'secret', 'password', 'key']:
                if pattern in stderr.lower():
                    stderr = stderr[:100] + "... [potentially sensitive output redacted]"
                    break
            
            raise HTTPException(
                status_code=500,
                detail={
                    "ok": False,
                    "stderr": stderr
                }
            )
        
        # Success
        refreshed_at = datetime.now().isoformat()
        return {
            "ok": True,
            "refreshedAt": refreshed_at
        }
        
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=500,
            detail={
                "ok": False,
                "stderr": "Extractor command timed out after 5 minutes"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "ok": False,
                "stderr": str(e)[:400]
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081, reload=True)


