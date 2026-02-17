# Datenquellen

CyberLage integriert öffentliche und vertrauenswürdige Feeds für die Sicherheitslage:

| Quelle | Typ | URL/API | Update-Frequenz | Beschreibung |
|--------|-----|---------|-----------------|--------------|
| BSI CERT-Bund WID | Advisories | CERT-Bund RSS/API | Mehrmals täglich | Deutsche Sicherheitshinweise |
| CISA KEV | Katalog | CISA API | Täglich | Known Exploited Vulnerabilities |
| NVD/CVE | Datenbank | NVD API 2.0 | Laufend | Schwachstellen-Datenbank |
| Microsoft Security | Feed | MS Security API | Laufend | Microsoft-spezifische Bedrohungen |
| Microsoft 365 Message Center | Tenant Feed | Microsoft Graph | Mehrmals täglich | Entra App erforderlich (ServiceMessage.Read.All) |
| Microsoft 365 Service Health | Tenant Feed | Microsoft Graph | Mehrmals täglich | Entra App erforderlich (ServiceHealth.Read.All) |
| Microsoft 365 Roadmap | Tenant Feed | Microsoft Graph | Täglich | Abgeleitet aus Message Center (planForChange/majorChange) |
| Heise Security | RSS | Heise RSS | Mehrmals täglich | Deutsche Security-Nachrichten |

Hinweis: Die Verfügbarkeit und Rate-Limits der Quellen variieren. Optional können API-Keys (z.B. NVD) die Abrufrate erhöhen.
