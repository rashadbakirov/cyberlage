#!/usr/bin/env node
/* eslint-disable no-console */

function isNonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value) {
  if (!isNonEmpty(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function env(name) {
  return process.env[name];
}

function validate() {
  const errors = [];

  if (String(env("SKIP_ENV_PRECHECK") || "").toLowerCase() === "true") {
    console.warn("[prebuild-check] SKIP_ENV_PRECHECK=true, checks skipped.");
    return errors;
  }

  const nextAuthUrl = env("NEXTAUTH_URL");
  if (!isHttpUrl(nextAuthUrl)) {
    errors.push("NEXTAUTH_URL fehlt oder ist keine gueltige http(s)-URL.");
  }

  const nextAuthSecret = env("NEXTAUTH_SECRET");
  if (!isNonEmpty(nextAuthSecret)) {
    errors.push("NEXTAUTH_SECRET fehlt.");
  }

  const encryptionKey = env("ENCRYPTION_KEY");
  if (!isNonEmpty(encryptionKey) || !/^[a-fA-F0-9]{64}$/.test(encryptionKey.trim())) {
    errors.push("ENCRYPTION_KEY fehlt oder ist nicht 64 Hex-Zeichen lang.");
  }

  const cosmosEndpoint = env("COSMOS_ENDPOINT");
  if (!isHttpUrl(cosmosEndpoint)) {
    errors.push("COSMOS_ENDPOINT fehlt oder ist keine gueltige http(s)-URL.");
  }

  const cosmosKey = env("COSMOS_KEY");
  if (!isNonEmpty(cosmosKey)) {
    errors.push("COSMOS_KEY fehlt.");
  }

  const entraClientId = env("AUTH_ENTRA_CLIENT_ID");
  const entraClientSecret = env("AUTH_ENTRA_CLIENT_SECRET");
  const entraIssuer = env("AUTH_ENTRA_ISSUER");
  if (isNonEmpty(entraClientId) !== isNonEmpty(entraClientSecret)) {
    errors.push("AUTH_ENTRA_CLIENT_ID und AUTH_ENTRA_CLIENT_SECRET muessen gemeinsam gesetzt werden.");
  }
  if (isNonEmpty(entraIssuer) && !isHttpUrl(entraIssuer)) {
    errors.push("AUTH_ENTRA_ISSUER ist gesetzt, aber keine gueltige URL.");
  }

  const openAiEndpoint = env("AZURE_OPENAI_ENDPOINT");
  const openAiApiKey = env("AZURE_OPENAI_API_KEY") || env("AZURE_OPENAI_KEY");
  const openAiDeployment = env("AZURE_OPENAI_DEPLOYMENT") || env("AZURE_OPENAI_MODEL");
  const openAiAny = isNonEmpty(openAiEndpoint) || isNonEmpty(openAiApiKey);
  if (openAiAny) {
    if (!isHttpUrl(openAiEndpoint)) {
      errors.push("OpenAI teilweise konfiguriert: AZURE_OPENAI_ENDPOINT fehlt/ungueltig.");
    }
    if (!isNonEmpty(openAiApiKey)) {
      errors.push("OpenAI teilweise konfiguriert: AZURE_OPENAI_API_KEY/AZURE_OPENAI_KEY fehlt.");
    }
    if (!isNonEmpty(openAiDeployment)) {
      errors.push("OpenAI teilweise konfiguriert: AZURE_OPENAI_DEPLOYMENT oder AZURE_OPENAI_MODEL fehlt.");
    }
  }

  const searchEndpoint = env("SEARCH_ENDPOINT") || env("AZURE_SEARCH_ENDPOINT");
  const searchApiKey = env("SEARCH_API_KEY") || env("AZURE_SEARCH_KEY");
  const searchIndex = env("SEARCH_INDEX") || env("AZURE_SEARCH_INDEX");
  const searchAny = isNonEmpty(searchEndpoint) || isNonEmpty(searchApiKey);
  if (searchAny) {
    if (!isHttpUrl(searchEndpoint)) {
      errors.push("Search teilweise konfiguriert: SEARCH_ENDPOINT fehlt/ungueltig.");
    }
    if (!isNonEmpty(searchApiKey)) {
      errors.push("Search teilweise konfiguriert: SEARCH_API_KEY fehlt.");
    }
    if (!isNonEmpty(searchIndex)) {
      errors.push("Search teilweise konfiguriert: SEARCH_INDEX fehlt.");
    }
  }

  return errors;
}

const errors = validate();
if (errors.length > 0) {
  console.error("[prebuild-check] Fehlende/ungueltige Umgebungsvariablen:");
  for (const error of errors) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

console.log("[prebuild-check] OK");
