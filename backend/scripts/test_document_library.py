#!/usr/bin/env python3
"""
Quick test for the document library API and Neo4j.
Run with: python scripts/test_document_library.py (from backend/)
Requires: backend running (uvicorn) and Neo4j.
"""

import json
import urllib.request
import urllib.error

BASE = "http://localhost:8100/api/v1"
PROFILE_ID = "profile_test_script"


def req(method, url, body=None):
    data = json.dumps(body).encode() if body else None
    req_obj = urllib.request.Request(url, data=data, method=method)
    if body:
        req_obj.add_header("Content-Type", "application/json")
    try:
        r = urllib.request.urlopen(req_obj)
        return r.status, json.loads(r.read().decode()) if r.length else {}
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def main():
    # 1. Add a test document
    print("Adding test document...")
    status, resp = req(
        "POST",
        f"{BASE}/profiles/{PROFILE_ID}/documents",
        {
            "file_hash": "a" * 64,  # fake sha256
            "filename": "test_document.pdf",
            "extracted_at": 1700000000000,
            "block_count": 5,
        },
    )
    if status != 201:
        print(f"  Add failed: {status} - {resp}")
        return
    print("  OK")

    # 2. List documents
    print("Listing documents...")
    status, data = req("GET", f"{BASE}/profiles/{PROFILE_ID}/documents")
    if status != 200:
        print(f"  List failed: {status} - {data}")
        return
    docs = data.get("documents", [])
    print(f"  Found {len(docs)} document(s)")
    for d in docs:
        print(f"    - {d.get('filename')} ({d.get('fileHash', '')[:16]}...)")

    # 3. Remove test document
    print("Removing test document...")
    status, _ = req("DELETE", f"{BASE}/profiles/{PROFILE_ID}/documents/{'a' * 64}")
    if status != 200:
        print(f"  Delete failed: {status}")
        return
    print("  OK")

    print("\nNeo4j document library is working. In Neo4j Browser (http://localhost:7475), run:")
    print("  MATCH (p:ChromeProfile)-[:HAS_DOCUMENT]->(d:Document) RETURN p, d")


if __name__ == "__main__":
    main()
