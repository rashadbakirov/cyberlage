// © 2025 CyberLage
/**
 * CyberRadar Fetcher - Main Entry Point
 * Azure Functions v4 Programming Model
 */

// Import all function registrations — Phase 1: Fetching
import './src/functions/timer-fetch';
import './src/functions/manual-fetch';

// Phase 2: AI Enrichment
import './src/functions/enrichment-timer';
import './src/functions/enrichment-manual';
import './src/functions/re-enrich';
import './src/functions/re-enrich-v3';
import './src/functions/re-enrich-timer';
import './src/functions/re-enrich-v3-timer';
import './src/functions/prompt-lab-sample';

// The app.timer() and app.http() calls in each function file register
// the functions when this module is loaded by the Azure Functions runtime


