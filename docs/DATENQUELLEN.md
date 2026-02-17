# Data Sources

CyberLage integrates public and trusted feeds for cybersecurity situational awareness.

| Source | Type | URL/API | Update Frequency | Description |
|---|---|---|---|---|
| BSI CERT-Bund WID | Advisories | CERT-Bund RSS/API | Multiple times daily | German security advisories |
| CISA KEV | Catalog | CISA API | Daily | Known Exploited Vulnerabilities |
| NVD/CVE | Database | NVD API 2.0 | Continuous | Vulnerability database |
| Microsoft Security | Feed | MS Security API | Continuous | Microsoft-specific threats |
| Microsoft 365 Message Center | Tenant feed | Microsoft Graph | Multiple times daily | Requires Entra app (`ServiceMessage.Read.All`) |
| Microsoft 365 Service Health | Tenant feed | Microsoft Graph | Multiple times daily | Requires Entra app (`ServiceHealth.Read.All`) |
| Microsoft 365 Roadmap | Tenant feed | Microsoft Graph | Daily | Derived from Message Center (`planForChange/majorChange`) |
| Heise Security | RSS | Heise RSS | Multiple times daily | German security news |

Note: source availability and rate limits vary. Optional API keys (for example NVD) can improve throughput.
