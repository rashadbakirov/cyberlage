// © 2025 CyberLage
/**
 * NIS2 Sector Codes and Descriptions
 * Maps sector codes to German/English names and essential/important classification.
 */

export interface SectorInfo {
  de: string;
  en: string;
  essential: boolean;
}

export const NIS2_SECTORS: Record<string, SectorInfo> = {
  // Essential entities (§28 BSIG — besonders wichtige Einrichtungen)
  energy:                 { de: 'Energie', en: 'Energy', essential: true },
  transport:              { de: 'Verkehr', en: 'Transport', essential: true },
  banking:                { de: 'Bankwesen', en: 'Banking', essential: true },
  financial_market:       { de: 'Finanzmarktinfrastruktur', en: 'Financial market infrastructure', essential: true },
  health:                 { de: 'Gesundheitswesen', en: 'Health', essential: true },
  water:                  { de: 'Trinkwasser / Abwasser', en: 'Drinking water / Waste water', essential: true },
  digital_infrastructure: { de: 'Digitale Infrastruktur', en: 'Digital infrastructure', essential: true },
  space:                  { de: 'Weltraum', en: 'Space', essential: true },
  public_admin:           { de: 'Öffentliche Verwaltung', en: 'Public administration', essential: true },

  // Important entities (§29 BSIG — wichtige Einrichtungen)
  postal:                 { de: 'Post und Kurier', en: 'Postal and courier', essential: false },
  waste:                  { de: 'Abfallbewirtschaftung', en: 'Waste management', essential: false },
  chemicals:              { de: 'Chemie', en: 'Chemicals', essential: false },
  food:                   { de: 'Lebensmittel', en: 'Food', essential: false },
  manufacturing:          { de: 'Verarbeitendes Gewerbe', en: 'Manufacturing', essential: false },
  digital_services:       { de: 'Digitale Dienste', en: 'Digital services', essential: false },
  research:               { de: 'Forschung', en: 'Research', essential: false },

  // Cross-sector (referenced by DORA)
  finance:                { de: 'Finanzwesen', en: 'Finance', essential: true },
  insurance:              { de: 'Versicherungswesen', en: 'Insurance', essential: false },
  investment:             { de: 'Investmentwesen', en: 'Investment', essential: false },
};


