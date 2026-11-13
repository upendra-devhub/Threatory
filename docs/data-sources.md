# Threatory Data Sources and Threat Intelligence Feeds

This document details the external datasets and threat intelligence feeds utilized by Threatory for deterministic URL analysis, typosquatting detection, and reputation matching.

---

## 1. Tranco Top Sites Ranking

### Overview
- **Provider:** Tranco Research Project (Inria, TU Delft, Stony Brook University)
- **URL:** [https://tranco-list.eu/](https://tranco-list.eu/)
- **Download Endpoint:** `https://tranco-list.eu/top-1m.csv.zip`
- **Purpose:** Baseline reference dataset of the top 10,000 registrable domains for lookalike/typosquatting (`URL_LOOKALIKE`) and brand subdomain misuse (`URL_BRAND_SUBDOMAIN`) detection.
- **Update Frequency:** Daily list generation; local refresh on-demand via `npm run data:tranco -w backend`.

### Licence and Terms
- **Licence:** Open scientific research dataset distributed under MIT Licence / Creative Commons Attribution 4.0 International (CC BY 4.0).
- **Attribution:** Pochat et al., *Tranco: A Research-Oriented Top Sites Ranking Hardened Against Manipulation*, NDSS 2019.
- **Usage in Threatory:** Stored locally in `backend/data/top-domains.txt` (top 10,000 unique registrable domains parsed with `tldts`). No live network requests are made during URL scanning.

---

## 2. OpenPhish Community Feed

### Overview
- **Provider:** OpenPhish (openphish.com)
- **Feed URL:** `https://openphish.com/feed.txt`
- **Format:** Plain text, line-delimited active phishing URLs.
- **Purpose:** Ingested into local MongoDB `FeedEntry` collection for local threat intelligence lookup (`URL_FEED_MATCH`).
- **Update Frequency:** Synchronized via `npm run feeds:sync -w backend` and scheduled daily cron (`0 3 * * *`).

### Licence and Terms
- **Licence:** OpenPhish Community Edition is free for non-commercial, personal, and research evaluation purposes.
- **Commercial Notice:** Commercial use, automated resale, or large-scale redistribution requires an OpenPhish Premium subscription. Copyright OpenPhish.
- **Access Restrictions:** Community feed is rate-limited and provides recently identified zero-day phishing links without warranty.
- **Usage in Threatory:** Stored locally in MongoDB. Individual URL scans query the local database and never contact OpenPhish servers.

---

## 3. URLhaus (abuse.ch)

### Overview
- **Provider:** abuse.ch (Bern University of Applied Sciences / Cyber Defense Campus)
- **Platform URL:** [https://urlhaus.abuse.ch/](https://urlhaus.abuse.ch/)
- **API Export URL:** `https://urlhaus-api.abuse.ch/v2/files/exports/{AUTH_KEY}/recent.csv`
- **Format:** Plain text / CSV with malicious URLs identified in active malware distribution.
- **Purpose:** Augments local phishing feed collection with active malware hosting infrastructure.
- **Update Frequency:** Synchronized via `npm run feeds:sync -w backend` and scheduled daily cron.

### Licence and Terms
- **Licence:** Creative Commons CC0 1.0 Universal (Public Domain Dedication).
- **Access Policy:** Keyless direct file downloads have been retired by abuse.ch. Automated ingestion requires a free account Auth-Key registered via the abuse.ch Authentication Portal (`URLHAUS_AUTH_KEY`).
- **Graceful Fallback:** If `URLHAUS_AUTH_KEY` is not provided, the synchronization service logs a warning and safely skips URLhaus without interrupting scans or failing the OpenPhish synchronization.

---

## 4. Ingestion Constraints and Guarantees

1. **Deterministic Zero-Network Scans:**
   - URL scans execute against locally cached data (disk files and local MongoDB indexes).
   - In accordance with Threatory's architectural constraints, zero outbound network or DNS traffic is generated during URL analysis.

2. **Sync Safeguards:**
   - **Payload Limits:** Maximum payload size is capped at 10 MB (`MAX_FEED_SIZE_BYTES`).
   - **Timeouts:** HTTP requests timeout after 15 seconds (`FETCH_TIMEOUT_MS`).
   - **Safe Failure:** Any fetch, parse, or network error is trapped, logged via structured logging (`pino`), and persisted as status `failed` in `FeedSyncMeta`. Sync failures never throw unhandled exceptions or affect scan evaluations.
