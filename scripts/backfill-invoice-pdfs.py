"""Idempotent one-off backfill of facturio's D1 invoice PDFs to private R2.

Resumes from a JSONL ledger after interruption. Never prints the archive secret.
"""
import json
import time
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

URL = 'https://app.facturio.ch/app/api/admin/archive-invoices'
SECRET = Path('/data/workspace/.invoice-archive-secret').read_text().strip()
LEDGER = Path('/data/workspace/facturio-app/archive-backfill.jsonl')
entries = [json.loads(line) for line in LEDGER.read_text().splitlines()] if LEDGER.exists() else []
cursor = entries[-1]['nextCursor'] if entries else None
print('resuming after', cursor, flush=True)

with LEDGER.open('a') as out:
    for batch in range(250):
        data = json.dumps({'cursor': cursor, 'take': 5}).encode()
        req = urllib.request.Request(URL, data=data, method='POST', headers={
            'Content-Type': 'application/json',
            'User-Agent': 'facturio-archive/1.0',
            'x-invoice-archive-secret': SECRET,
        })
        for attempt in range(5):
            try:
                with urllib.request.urlopen(req, timeout=110) as resp:
                    page = json.load(resp)
                break
            except (urllib.error.URLError, TimeoutError, ValueError) as exc:
                if attempt == 4:
                    raise RuntimeError(f'batch={batch} cursor={cursor} failed') from exc
                time.sleep(2 ** attempt)
        assert page['nextCursor'] != cursor or page['done'], 'cursor stalled'
        rec = {'cursor': cursor, **page}
        out.write(json.dumps(rec) + '\n')
        out.flush()
        entries.append(rec)
        cursor = page['nextCursor']
        counts = Counter(r['status'] for r in page['results'])
        print(f'batch {batch+1}: cursor={cursor} counts={dict(counts)} done={page["done"]}', flush=True)
        if page['done']:
            break
    else:
        raise RuntimeError('250-batch safety limit reached')

rows = [r for entry in entries for r in entry['results']]
unique = {r['id']: r for r in rows}
print('SUMMARY', json.dumps({'batches':len(entries), 'rows':len(rows), 'unique':len(unique),
                             'counts':dict(Counter(r['status'] for r in unique.values())),
                             'failures':[{'id':r['id'], 'error':r.get('error')} for r in unique.values() if r['status']=='failed'][:10]}), flush=True)
