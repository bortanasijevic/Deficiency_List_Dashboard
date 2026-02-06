#!/usr/bin/env python3
"""
Pull punch list (deficiency list) items from Procore API.
Similar structure to pull_rfis_rest_final_patched.py but for punch list items.
"""
import os
import sys
import json
import time
import re
from datetime import date, datetime, timedelta, timezone
from typing import List, Dict, Optional
from urllib.parse import quote, urlencode

import requests
from dateutil import parser as dt_parser

# Import auth manager from RFI project
# Use shared token location - same as RFI Dashboard and Deficiency List Dashboard
SHARED_TOKENS_PATH = os.path.expanduser("~/Projects/DEC/Pull_RFI_related_to_drawings/tokens.json")
TOKENS_PATH = os.getenv("TOKENS_PATH") or SHARED_TOKENS_PATH
os.environ['TOKENS_PATH'] = TOKENS_PATH

# Add RFI_Python_Data_Extraction to path to import auth_manager
RFI_PYTHON_PATH = os.path.expanduser("~/Projects/DEC/RFI_Python_Data_Extraction")
sys.path.append(RFI_PYTHON_PATH)
from auth_manager_refresh_only import ensure_access_token

# ----------------------- Config -----------------------
COMPANY_ID = os.getenv("PROCORE_COMPANY_ID") or "598134325680979"
PROJECT_ID = os.getenv("PROCORE_PROJECT_ID") or "598134325936838"

# Try both REST and VAPID APIs
REST_BASE = "https://api.procore.com/rest/v1.0"
VAPID_BASE = "https://api.procore.com/vapid"

# Team CC list for email reminders
TEAM_CC_EMAILS = [
    "gsilvat@domacoencocorp.com",
    "mcrow@domacoencocorp.com",
    "ddurocher@domacoencocorp.com",
    "mkimbler@domacoencocorp.com",
    "gpeters@domacoencocorp.com",
]

OUTPUT_JSON = os.getenv("OUTPUT_JSON", "punch_list_items.json")

# ----------------------- HTTP helpers -----------------------
def auth_headers(tokens: dict) -> dict:
    return {
        "Authorization": f"Bearer {tokens['access_token']}",
        "Procore-Company-Id": str(COMPANY_ID),
        "Accept": "application/json",
    }

def list_punch_list_items(tokens: dict, project_id: str, per_page: int = 100) -> list:
    """
    Fetch all punch list items from Procore API.
    Uses the REST API endpoint: /rest/v1.0/punch_items
    """
    items = []
    page = 1
    
    # Use the confirmed working endpoint
    endpoint = f"{REST_BASE}/punch_items"
    
    print(f"✓ Using endpoint: {endpoint}")
    
    # Fetch all pages
    while True:
        params = {
            "project_id": project_id,
            "per_page": per_page,
            "page": page
        }
        
        r = requests.get(endpoint, headers=auth_headers(tokens), params=params, timeout=60)
        
        if r.status_code == 401:
            tokens = ensure_access_token()
            r = requests.get(endpoint, headers=auth_headers(tokens), params=params, timeout=60)
        
        r.raise_for_status()
        batch = r.json()
        
        if not batch or (isinstance(batch, list) and len(batch) == 0):
            break
        
        if isinstance(batch, list):
            items.extend(batch)
        elif isinstance(batch, dict) and 'data' in batch:
            items.extend(batch['data'])
        else:
            break
        
        # Check pagination
        link = r.headers.get("Link", "")
        total = int(r.headers.get("total", "0") or "0")
        per = int(r.headers.get("per-page", str(per_page)) or str(per_page))
        
        if 'rel="next"' in link:
            page += 1
        elif total and len(items) < total:
            page += 1
        else:
            break
        
        time.sleep(0.2)  # Be polite to API
    
    return items

def calculate_days_late(due_date_str: Optional[str], status: str) -> int:
    """Calculate days late for a punch list item."""
    if not due_date_str or status in ["Closed", "Resolved"]:
        return 0
    
    try:
        due_date = dt_parser.parse(due_date_str).date() if isinstance(due_date_str, str) else due_date_str
        if isinstance(due_date, str):
            due_date = dt_parser.parse(due_date).date()
        
        today = date.today()
        if due_date >= today:
            return 0
        
        delta = today - due_date
        return delta.days
    except Exception:
        return 0

def calculate_days_in_court(assignments: List[Dict], created_at: Optional[str]) -> int:
    """
    Calculate days in court (days since first assignment or creation).
    Similar to RFI logic.
    """
    if not assignments or len(assignments) == 0:
        return 0
    
    # Find the earliest assignment date
    earliest_date = None
    
    for assignment in assignments:
        # The API provides notified_at for when assignment was made
        assigned_at = assignment.get('notified_at') or assignment.get('assigned_at') or assignment.get('created_at')
        if assigned_at:
            try:
                dt = dt_parser.parse(assigned_at).date()
                if earliest_date is None or dt < earliest_date:
                    earliest_date = dt
            except Exception:
                pass
    
    # Fallback to created_at if no assignment dates
    if earliest_date is None and created_at:
        try:
            earliest_date = dt_parser.parse(created_at).date()
        except Exception:
            pass
    
    if earliest_date is None:
        return 0
    
    today = date.today()
    delta = today - earliest_date
    return max(0, delta.days)

def extract_ball_in_court(assignments: List[Dict]) -> str:
    """Extract ball in court string from assignments."""
    if not assignments:
        return ""
    
    names = []
    for assignment in assignments:
        # The API returns login_information directly in assignments
        login_info = assignment.get('login_information') or assignment.get('assignee') or assignment.get('user')
        if login_info:
            name = login_info.get('name') or login_info.get('login', '')
            vendor = assignment.get('vendor', {})
            company = vendor.get('name', '') if isinstance(vendor, dict) else ''
            if name:
                if company:
                    names.append(f"{name} ({company})")
                else:
                    names.append(name)
    
    return "; ".join(names) if names else ""

def extract_assignee_emails(assignments: List[Dict]) -> List[str]:
    """Extract email addresses from assignments."""
    emails = []
    for assignment in assignments:
        # The API returns login_information directly in assignments
        login_info = assignment.get('login_information') or assignment.get('assignee') or assignment.get('user')
        if login_info:
            email = login_info.get('login') or login_info.get('email', '')
            if email and '@' in email:
                emails.append(email)
    return emails

def extract_company_names(assignments: List[Dict]) -> str:
    """Extract company names from assignments."""
    if not assignments:
        return ""
    
    companies = set()
    for assignment in assignments:
        vendor = assignment.get('vendor', {})
        if isinstance(vendor, dict):
            company = vendor.get('name', '')
            if company:
                companies.add(company)
    
    return "; ".join(sorted(companies)) if companies else ""

def build_item_link(project_id: str, item_id: int) -> str:
    """Build Procore link to punch list item."""
    return f"https://us02.procore.com/{project_id}/project/punch_list/{item_id}"

def build_mailto_link(item: Dict, project_id: str) -> str:
    """Build mailto link for email reminder."""
    assignments = item.get('assignments', [])
    assignee_emails = extract_assignee_emails(assignments)
    
    item_number = item.get('position') or item.get('id', '')
    name = item.get('name') or 'Punch List Item'
    due_date = item.get('due_date', '')
    days_in_court = calculate_days_in_court(assignments, item.get('created_at'))
    link = build_item_link(project_id, item.get('id', 0))
    
    # Extract company name for greeting (use first company if multiple)
    company_names = extract_company_names(assignments)
    company_name = company_names.split('; ')[0] if company_names else ""
    greeting = f"Hi {company_name}" if company_name else "Hi"
    
    subject = f"Punch List Item {item_number}: {name} — Required documentation"
    body = f"""{greeting},

Reminder for this punch list item. It has been in your court for {days_in_court} days.
Due date: {due_date}

Item link: {link}

Please upload the required documentation to close this punch list item.
If something is preventing you from completing the item, please let us know and provide an expected timeline.

Thank you,"""
    
    to_part = ";".join(assignee_emails) if assignee_emails else ""
    cc_part = ";".join(TEAM_CC_EMAILS)
    
    # Use quote() instead of urlencode() to encode spaces as %20 instead of +
    params = urlencode({
        'cc': cc_part,
        'subject': subject,
        'body': body
    }, quote_via=quote)
    
    return f"mailto:{to_part}?{params}" if to_part else f"mailto:?{params}"

def process_punch_list_items(raw_items: List[Dict], project_id: str) -> List[Dict]:
    """Process raw punch list items into dashboard format."""
    processed = []
    
    for item in raw_items:
        # Skip closed items
        closed_at = item.get('closed_at')
        status = item.get('status') or item.get('workflow_status', '')
        if closed_at or status in ['Closed', 'Resolved']:
            continue
        
        assignments = item.get('assignments', [])
        
        # Extract description text (remove HTML tags if present)
        description = item.get('description', '')
        if description and '<' in description:
            # Simple HTML tag removal
            description = re.sub(r'<[^>]+>', '', description).strip()
        
        processed_item = {
            'id': str(item.get('id', '')),
            'number': str(item.get('position') or item.get('id', '')),
            'subject': item.get('name') or description or 'Punch List Item',
            'status': status,
            'assigned_to': extract_ball_in_court(assignments),
            'company_name': extract_company_names(assignments),
            'due_date': item.get('due_date', ''),
            'days_late': calculate_days_late(item.get('due_date'), status),
            'days_in_court': calculate_days_in_court(assignments, item.get('created_at')),
            'link': build_item_link(project_id, item.get('id', 0)),
            'mailto_reminder': build_mailto_link(item, project_id),
        }
        
        processed.append(processed_item)
    
    return processed

def main():
    """Main function to pull and process punch list items."""
    print("=" * 80)
    print("Punch List Items Extractor")
    print("=" * 80)
    print(f"Company ID: {COMPANY_ID}")
    print(f"Project ID: {PROJECT_ID}")
    print()
    
    # Get authentication tokens
    print("Step 1: Loading and refreshing tokens...")
    try:
        tokens = ensure_access_token()
        print("✓ Tokens loaded and validated")
    except Exception as e:
        print(f"✗ Error loading tokens: {e}")
        return
    
    print()
    
    # Fetch punch list items
    print("Step 2: Fetching punch list items...")
    try:
        raw_items = list_punch_list_items(tokens, PROJECT_ID)
        print(f"✓ Retrieved {len(raw_items)} punch list item(s)")
    except Exception as e:
        print(f"✗ Error fetching punch list items: {e}")
        print("  This is expected if the API endpoint is not yet configured.")
        print("  The dashboard structure is ready and will work once API access is configured.")
        raw_items = []
    
    print()
    
    # Process items
    if raw_items:
        print("Step 3: Processing items...")
        processed_items = process_punch_list_items(raw_items, PROJECT_ID)
        print(f"✓ Processed {len(processed_items)} items")
        
        # Save to JSON
        output_data = {
            'rows': processed_items,
            'lastUpdated': datetime.now(timezone.utc).isoformat(),
        }
        
        with open(OUTPUT_JSON, 'w') as f:
            json.dump(output_data, f, indent=2, default=str)
        
        print(f"✓ Saved to {OUTPUT_JSON}")
    else:
        print("Step 3: No items to process (API endpoint not yet configured)")
        # Create empty structure for testing
        output_data = {
            'rows': [],
            'lastUpdated': datetime.now(timezone.utc).isoformat(),
        }
        with open(OUTPUT_JSON, 'w') as f:
            json.dump(output_data, f, indent=2)
        print(f"✓ Created empty structure in {OUTPUT_JSON}")
    
    print()
    print("=" * 80)
    print("Done!")
    print("=" * 80)

if __name__ == "__main__":
    main()

