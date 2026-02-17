// © 2025 CyberLage
/**
 * NIS2 Sector Codes and Descriptions
 * Maps sector codes to localized names and essential/important classification.
 */

export interface SectorInfo {
  de: string;
  en: string;
  essential: boolean;
}

export const NIS2_SECTORS: Record<string, SectorInfo> = {
  // Essential entities (§28 BSIG)
  energy:                 { de: "Energy", en: "Energy", essential: true },
  transport:              { de: "Transport", en: "Transport", essential: true },
  banking:                { de: "Banking", en: "Banking", essential: true },
  financial_market:       { de: "Financial market infrastructure", en: "Financial market infrastructure", essential: true },
  health:                 { de: "Health", en: "Health", essential: true },
  water:                  { de: "Drinking water / Waste water", en: "Drinking water / Waste water", essential: true },
  digital_infrastructure: { de: "Digital infrastructure", en: "Digital infrastructure", essential: true },
  space:                  { de: "Space", en: "Space", essential: true },
  public_admin:           { de: "Public administration", en: "Public administration", essential: true },

  // Important entities (§29 BSIG)
  postal:                 { de: "Postal and courier", en: "Postal and courier", essential: false },
  waste:                  { de: "Waste management", en: "Waste management", essential: false },
  chemicals:              { de: "Chemicals", en: "Chemicals", essential: false },
  food:                   { de: "Food", en: "Food", essential: false },
  manufacturing:          { de: "Manufacturing", en: "Manufacturing", essential: false },
  digital_services:       { de: "Digital services", en: "Digital services", essential: false },
  research:               { de: "Research", en: "Research", essential: false },

  // Cross-sector (referenced by DORA)
  finance:                { de: "Finance", en: "Finance", essential: true },
  insurance:              { de: "Insurance", en: "Insurance", essential: false },
  investment:             { de: "Investment", en: "Investment", essential: false },
};


