import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const INPUT_ROOT = "./data_sources";
const OUTPUT_DATASET = "./src/data/vin_training_dataset.json";
const OUTPUT_ENGINE_MASTER = "./src/data/engine_codes_master.json";
const OUTPUT_REPORT = "./src/data/pdf_import_report.json";

const MODEL_NAMES = [
  "Fabia",
  "Scala",
  "Kamiq",
  "Octavia",
  "Superb",
  "Kodiaq",
  "Karoq",
  "Enyaq",
];

const MODEL_ABBR_MAP = {
  Fabia: "FAB",
  Scala: "SCA",
  Kamiq: "KAM",
  Octavia: "OCT",
  Superb: "SUP",
  Kodiaq: "KOD",
  Karoq: "KAR",
  Enyaq: "ENY",
};

const MODEL_FROM_SHORT_MAP = {
  FAB: "Fabia",
  SCA: "Scala",
  KAM: "Kamiq",
  OCT: "Octavia",
  SUP: "Superb",
  KOD: "Kodiaq",
  KAR: "Karoq",
  ENY: "Enyaq",
};

function loadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function normalizeText(value = "") {
  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/[‐-‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function walkPdfFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkPdfFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function extractPageLines(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjsLib.getDocument({
  data,
  standardFontDataUrl: "./node_modules/pdfjs-dist/standard_fonts/"
}).promise;

  const pages = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();

    const buckets = new Map();

    for (const item of content.items) {
      const str = normalizeText(item.str || "");
      if (!str) continue;

      const x = item.transform[4];
      const y = Math.round(item.transform[5] * 10) / 10;
      const key = String(y);

      if (!buckets.has(key)) {
        buckets.set(key, []);
      }

      buckets.get(key).push({ x, y, str });
    }

    const lines = [...buckets.values()]
      .map((items) => {
        const sorted = items.sort((a, b) => a.x - b.x);
        return {
          y: sorted[0].y,
          text: normalizeText(sorted.map((x) => x.str).join(" ")),
        };
      })
      .filter((x) => x.text)
      .sort((a, b) => b.y - a.y);

    pages.push({
      pageNo,
      lines,
      fullText: normalizeText(lines.map((x) => x.text).join(" ")),
    });
  }

  return pages;
}

function uniqueStrings(values) {
  const out = [];
  const seen = new Set();

  for (const value of values) {
    const key = normalizeText(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }

  return out;
}

function findVin(text) {
  const match = text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
  return match ? match[0] : null;
}

function findModelInText(text) {
  for (const model of MODEL_NAMES) {
    const rx = new RegExp(`\\b${model}\\b`, "i");
    if (rx.test(text)) return model;
  }
  return null;
}

function isModelAbbr(value) {
  return /^(FAB|SCA|KAM|OCT|SUP|KOD|KAR|ENY)$/i.test(value);
}

function findHeaderWindow(firstPageLines, vin) {
  const texts = firstPageLines.map((x) => x.text);
  const vinIndex = texts.findIndex((line) => line.includes(vin));

  if (vinIndex === -1) {
    return {
      start: 0,
      end: Math.min(texts.length - 1, 60),
      texts,
    };
  }

  return {
    start: Math.max(0, vinIndex - 5),
    end: Math.min(texts.length - 1, vinIndex + 60),
    texts,
  };
}

function parseInlineValue(line, label) {
  const rx = new RegExp(`${label}\\s+(.+)$`, "i");
  const match = line.match(rx);
  return match ? normalizeText(match[1]) : null;
}

function extractCodeAfterLabel(line, label, minLen = 2, maxLen = 8) {
  const rx = new RegExp(`${label}\\s+([A-Z0-9]{${minLen},${maxLen}})\\b`, "i");
  const match = line.match(rx);
  return match ? match[1].toUpperCase() : null;
}

function findModelYearFromHeader(headerLines, fullText) {
  for (const line of headerLines) {
    const match = line.match(/Model Year\s+(20\d{2})/i);
    if (match) return Number(match[1]);

    const match2 = line.match(/Modelska godina[:\s]+(20\d{2})/i);
    if (match2) return Number(match2[1]);
  }

  const fallback = fullText.match(/\b20\d{2}\b/);
  return fallback ? Number(fallback[0]) : null;
}

function findSalesType(headerLines) {
  for (const line of headerLines) {
    const direct = extractCodeAfterLabel(line, "Sales Type", 6, 8);
    if (direct) return direct;

    const local = extractCodeAfterLabel(line, "Prodajni kod", 6, 8);
    if (local) return local;
  }
  return null;
}

function findModelAbbrFromHeader(headerLines) {
  for (const line of headerLines) {
    const match = line.match(/\bModel\s+([A-Z]{3})\b/i);
    if (match && isModelAbbr(match[1])) return match[1].toUpperCase();
  }

  for (const line of headerLines) {
    const upper = normalizeText(line).toUpperCase();
    if (isModelAbbr(upper)) return upper;
  }

  return null;
}

function findModelFromHeader(headerLines) {
  for (const line of headerLines) {
    const explicit = parseInlineValue(line, "Model Designation");
    if (explicit) {
      const found = findModelInText(explicit);
      if (found) return found;
    }

    const explicit2 = parseInlineValue(line, "Opis modela");
    if (explicit2) {
      const found = findModelInText(explicit2);
      if (found) return found;
    }
  }

  for (const line of headerLines) {
    const found = findModelInText(line);
    if (found) return found;
  }

  return null;
}

function findEngineCodeFromHeader(headerLines) {
  for (const line of headerLines) {
    const ec = extractCodeAfterLabel(line, "EC", 4, 4);
    if (ec) return ec;

    const engineCode = extractCodeAfterLabel(line, "Engine Code", 4, 4);
    if (engineCode) return engineCode;

    const local = extractCodeAfterLabel(line, "Šifra motora:", 4, 4);
    if (local) return local;
  }

  // FALLBACK: traži prvi realan 4-char engine code u header bloku
  for (const line of headerLines) {
    const matches = [...line.matchAll(/\b[A-Z0-9]{4}\b/g)].map((m) => m[0].toUpperCase());

    for (const candidate of matches) {
      if (
        ![
          "FINI", "PAGE", "QI16", "QG10", "2026", "2025", "2024",
          "OCTA", "KAMI", "SCAL", "SUPE"
        ].includes(candidate)
      ) {
        return candidate;
      }
    }
  }

  return null;
}

function findTransmissionCodeFromHeader(headerLines) {
  for (const line of headerLines) {
    const tc = extractCodeAfterLabel(line, "TC", 3, 4);
    if (tc) return tc;

    const trans = extractCodeAfterLabel(line, "Transmission Code", 3, 4);
    if (trans) return trans;

    const local = extractCodeAfterLabel(line, "Slovna oznaka mjenjača:", 3, 4);
    if (local) return local;
  }

  // FALLBACK: traži realan 3-char transmission code u header bloku
  for (const line of headerLines) {
    const matches = [...line.matchAll(/\b[A-Z0-9]{3}\b/g)].map((m) => m[0].toUpperCase());

    for (const candidate of matches) {
      if (
        ![
          "VIN", "FIN", "EC", "TC", "QI6", "QG1", "OCT", "KAM", "SCA", "SUP"
        ].includes(candidate)
      ) {
        return candidate;
      }
    }
  }

  return null;
}

function parseHeaderBlock(firstPage) {
  const vin = findVin(firstPage.fullText);

  if (!vin) {
    return {
      vin: null,
      salesType: null,
      modelCode: null,
      modelYear: null,
      modelAbbr: null,
      model: null,
      engineCode: null,
      transmissionCode: null,
      headerSlice: [],
    };
  }

  const { start, end, texts } = findHeaderWindow(firstPage.lines, vin);
  const rawSlice = texts.slice(start, end + 1);
  const headerSlice = uniqueStrings(rawSlice);

  let modelAbbr = findModelAbbrFromHeader(headerSlice);
  let model = findModelFromHeader(headerSlice);

  if (!model && modelAbbr && MODEL_FROM_SHORT_MAP[modelAbbr]) {
    model = MODEL_FROM_SHORT_MAP[modelAbbr];
  }

  if (!modelAbbr && model && MODEL_ABBR_MAP[model]) {
    modelAbbr = MODEL_ABBR_MAP[model];
  }

  const salesType = findSalesType(headerSlice);
  const modelYear = findModelYearFromHeader(headerSlice, firstPage.fullText);
  const engineCode = findEngineCodeFromHeader(headerSlice);
  const transmissionCode = findTransmissionCodeFromHeader(headerSlice);
  const modelCode =
    vin && vin.length >= 8 ? vin.slice(6, 8).toUpperCase() : null;

  return {
    vin,
    salesType,
    modelCode,
    modelYear,
    modelAbbr,
    model,
    engineCode,
    transmissionCode,
    headerSlice,
  };
}

function findProductionDate(fullText) {
  const direct = fullText.match(
    /Date of Production\s+([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})/i
  );
  if (direct) return normalizeText(direct[1]);

  const local = fullText.match(/\b\d{2}\.\d{2}\.\d{4}\b/);
  return local ? local[0] : null;
}

function findServiceRegime(fullText) {
  if (/\bQG1\b/i.test(fullText) || /LongLife Service Regime/i.test(fullText)) {
    return "LongLife";
  }

  if (/\bQG0\b/i.test(fullText) || /fixed service regime/i.test(fullText)) {
    return "Fixed";
  }

  return null;
}

function findServiceIndicator(fullText) {
  const match = fullText.match(/\bQI\d\b/i);
  return match ? match[0].toUpperCase() : null;
}

function findDrivetrain(fullText) {
  if (
    /\b1X1\b/i.test(fullText) ||
    /\b1X2\b/i.test(fullText) ||
    /\b1X4\b/i.test(fullText) ||
    /four-wheel drive/i.test(fullText) ||
    /all-wheel drive/i.test(fullText) ||
    /\b4x4\b/i.test(fullText)
  ) {
    return "AWD";
  }

  if (/\b1X0\b/i.test(fullText) || /front-wheel drive/i.test(fullText)) {
    return "FWD";
  }

  if (/rear-wheel drive/i.test(fullText)) {
    return "RWD";
  }

  return null;
}

function findEngineUnitCode(fullText) {
  const match = fullText.match(/\b[NT][A-Z0-9]{2}\b/);
  return match ? match[0].toUpperCase() : null;
}

function findGearboxPrCode(fullText) {
  const text = normalizeText(fullText);

  // 1. Traži linije koje imaju veze sa transmission
  const transmissionContextMatches = [
    ...text.matchAll(/([A-Z0-9]{3,10}\s+)?G[0-9A-Z]{2}.*(transmission|gearbox|mjenjač)/gi),
  ];

  if (transmissionContextMatches.length > 0) {
    for (const match of transmissionContextMatches) {
      const gMatch = match[0].match(/\bG[0-9A-Z]{2}\b/);
      if (gMatch) {
        return gMatch[0].toUpperCase();
      }
    }
  }

  // 2. Ako nema, traži poznate gearbox PR kodove (white-list)
  const knownGearboxPR = [
    "G0K","G0L","G0M","G0C","G0E",
    "G1C","G1D","G1F","G1G","G1L"
  ];

  for (const code of knownGearboxPR) {
    const rx = new RegExp(`\\b${code}\\b`, "i");
    if (rx.test(text)) {
      return code;
    }
  }

  // 3. fallback: uzmi poslednji G kod (ne prvi)
  const allMatches = [...text.matchAll(/\bG[0-9A-Z]{2}\b/g)].map(m => m[0].toUpperCase());

  if (allMatches.length > 0) {
    return allMatches[allMatches.length - 1];
  }

  return null;
}

function findInstallationDifferentiation(fullText) {
  const patterns = [
    /installation differentiation for transmission\s+([A-Z]{2,4}\s*\d{2,3})/i,
    /installation differentiation for transmission\s+([A-Z]{2,4})\s+(\d{2,3})/i,
    /installation differentiation transmission\s+([A-Z]{2,4}\s*\d{2,3})/i,
  ];

  for (const rx of patterns) {
    const match = fullText.match(rx);
    if (match) {
      const raw = normalizeText(match.slice(1).join(" "));
      return raw.replace(/\s+/g, "");
    }
  }

  return null;
}

function inferTransmissionType(transmissionCode, gearboxPrCode, installationDiff) {
  const gpr = normalizeText(gearboxPrCode || "").toUpperCase();
  const inst = normalizeText(installationDiff || "").toUpperCase();
  const tc = normalizeText(transmissionCode || "").toUpperCase();

  if (/^DQ\d{2,3}/.test(inst)) return "DSG";
  if (/^MQ\d{2,3}/.test(inst)) return "Manual";

  if (["G0K", "G0L", "G0M", "G0C", "G0E"].includes(gpr)) return "Manual";
  if (["G1C", "G1D", "G1F", "G1G", "G1L"].includes(gpr)) return "DSG";
  if (["G01","G02","G03"].includes(gpr)) return null;

  if (tc && /^[A-Z0-9]{3,4}$/.test(tc)) {
    return null;
  }

  return null;
}

function inferFuelTypeFromText(text) {
  const t = normalizeText(text).toLowerCase();

  if (
    t.includes("tdi") ||
    t.includes("diesel") ||
    t.includes("dizelski") ||
    t.includes("common rail") ||
    t.includes("adblue")
  ) {
    return "Diesel";
  }

  if (
    t.includes("tsi") ||
    t.includes("tfsi") ||
    t.includes("benzinski") ||
    t.includes("petrol") ||
    t.includes("si engine")
  ) {
    return "Petrol";
  }

  if (t.includes("cng") || t.includes("zemni plin")) {
    return "CNG";
  }

  if (t.includes("hybrid") || t.includes("hibrid")) {
    return "Hybrid";
  }

  return null;
}

function inferEngineFamily(engineCode, text) {
  const t = normalizeText(text).toLowerCase();
  const code = normalizeText(engineCode || "").toUpperCase();

  if (!code) return null;

  if (["DXDB", "DXDE", "DADA", "DPCA", "DXUA", "DUSA", "DUSB", "DKRF", "DKLA", "DLAA", "DLAC", "DUCB"].includes(code)) {
    return code === "DXDB" || code === "DXDE" || code === "DUCB" ? "EA211 evo" : "EA211";
  }

  if (["DXPA", "DXNB", "DXRB", "DXRC", "DGTA", "DGTD", "DFGA"].includes(code)) {
    return "EA288";
  }

  if (["DNPB", "DNNE", "DLBC"].includes(code)) {
    return "EA888 evo4";
  }

  if (t.includes("ea211 evo")) return "EA211 evo";
  if (t.includes("ea211")) return "EA211";
  if (t.includes("ea288")) return "EA288";
  if (t.includes("ea888")) return "EA888 evo4";

  return null;
}

function extractEngineOverviewEntries(fullText) {
  const normalized = normalizeText(fullText);
  const entries = [];

  const patterns = [
    /([0-9],[0-9])\s*l\/(\d{2,3})\s*kW\s+(TSI|TFSI|TDI|MPI|SRE|CNG)\s+([A-Z0-9]{4})/gi,
    /([0-9],[0-9])l\/(\d{2,3})\s*kW\s+(TSI|TFSI|TDI|MPI|SRE|CNG)\s+([A-Z0-9]{4})/gi,
  ];

  for (const rx of patterns) {
    let match;
    while ((match = rx.exec(normalized)) !== null) {
      const displacement = Number(match[1].replace(",", "."));
      const powerKW = Number(match[2]);
      const engineType = match[3].toUpperCase();
      const engineCode = match[4].toUpperCase();

      entries.push({
        engineCode,
        displacementLiters: displacement,
        powerKW,
        engineType,
        fuelType:
          engineType === "TDI"
            ? "Diesel"
            : engineType === "CNG"
            ? "CNG"
            : "Petrol",
      });
    }
  }

  return dedupeBy(entries, (x) => x.engineCode);
}

function extractOilSpecEntries(fullText) {
  const normalized = normalizeText(fullText);
  const entries = [];

  const patterns = [
    /([A-Z0-9]{4})\s+([0-9],[0-9])\s+([0-9],[0-9])\s+(508 00|509 00|507 00|504 00|502 00)\s+(0W-20|0W-30|5W-40)/gi,
    /([A-Z0-9]{4})\s+([0-9],[0-9])\s*l?\s+([0-9],[0-9])\s*l?\s+(VW\s+508\s+00|VW\s+509\s+00|VW\s+507\s+00|VW\s+504\s+00|VW\s+502\s+00)\s+(0W-20|0W-30|5W-40)/gi,
  ];

  for (const rx of patterns) {
    let match;
    while ((match = rx.exec(normalized)) !== null) {
      const engineCode = match[1].toUpperCase();
      const oilLiters = Number(match[2].replace(",", "."));
      const maxOilLiters = Number(match[3].replace(",", "."));
      const oilSpec = normalizeOilSpec(match[4]);
      const viscosity = match[5].toUpperCase();

      entries.push({
        engineCode,
        oilLiters,
        maxOilLiters,
        oilSpec,
        oilViscosity: viscosity,
      });
    }
  }

  return dedupeBy(entries, (x) => `${x.engineCode}|${x.oilSpec}|${x.oilViscosity}|${x.oilLiters}|${x.maxOilLiters}`);
}

function normalizeOilSpec(value) {
  const v = normalizeText(value).toUpperCase().replace(/^VW\s+/, "");
  return `VW ${v}`;
}

function dedupeBy(values, keyFn) {
  const out = [];
  const seen = new Set();

  for (const value of values) {
    const key = keyFn(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }

  return out;
}

function parseEngineMasterExistingShape(obj) {
  if (Array.isArray(obj)) return { mode: "array", rows: obj };
  if (obj && typeof obj === "object") return { mode: "object", rows: obj };
  return { mode: "object", rows: {} };
}

function buildRecordFromPages(pages, sourceFile) {
  const firstPage = pages[0];
  const allText = normalizeText(pages.map((x) => x.fullText).join(" "));

  const header = parseHeaderBlock(firstPage);
  const installationDiff = findInstallationDifferentiation(allText);
  const gearboxPrCode = findGearboxPrCode(allText);
  const inferredTransmissionType = inferTransmissionType(
    header.transmissionCode,
    gearboxPrCode,
    installationDiff
  );

  const record = {
    sourceFile,
    vin: header.vin,
    salesType: header.salesType,
    modelCode:
      header.modelCode ||
      (header.vin && header.vin.length >= 8
        ? header.vin.slice(6, 8).toUpperCase()
        : null),
    modelYear: header.modelYear,
    modelAbbr: header.modelAbbr,
    model: header.model,
    engineCode: header.engineCode,
    transmissionCode: header.transmissionCode,
    transmissionType: inferredTransmissionType,
    drivetrain: findDrivetrain(allText),
    serviceRegime: findServiceRegime(allText),
    serviceIndicator: findServiceIndicator(allText),
    productionDate: findProductionDate(allText),
    engineUnitCode: findEngineUnitCode(allText),
    gearboxPrCode,
    installationDifferentiation: installationDiff,
  };

  const required = ["vin", "model", "modelYear", "engineCode", "transmissionCode"];

  const missing = required.filter((field) => {
    const value = record[field];
    return value === null || value === undefined || value === "";
  });

  return {
    ok: missing.length === 0,
    record,
    missing,
    oilSpecEntries: extractOilSpecEntries(allText),
    engineOverviewEntries: extractEngineOverviewEntries(allText),
    debug: {
      headerSlice: header.headerSlice,
      firstPagePreview: firstPage.lines.slice(0, 80).map((x) => x.text),
    },
  };
}

function sortDataset(rows) {
  return [...rows].sort((a, b) => a.vin.localeCompare(b.vin));
}

function createBackupIfNeeded(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const now = new Date();
  const stamp =
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}` +
    `-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

  const backupPath = filePath.replace(/\.json$/i, `.backup-${stamp}.json`);
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function mergeEngineMaster(existingMaster, engineEntries, oilEntries, report) {
  const parsed = parseEngineMasterExistingShape(existingMaster);

  if (parsed.mode === "array") {
    const map = new Map();
    for (const row of parsed.rows) {
      if (row?.engineCode) {
        map.set(String(row.engineCode).toUpperCase(), { ...row });
      }
    }

    for (const entry of engineEntries) {
      const key = entry.engineCode.toUpperCase();
      const prev = map.get(key) || { engineCode: key };

      map.set(key, {
        ...prev,
        engineCode: key,
        fuelType: prev.fuelType || entry.fuelType || null,
        displacementLiters: prev.displacementLiters ?? entry.displacementLiters ?? null,
        powerKW: prev.powerKW ?? entry.powerKW ?? null,
        engineType: prev.engineType || entry.engineType || null,
        engineFamily: prev.engineFamily || null,
      });

      report.engineMasterUpdatedCodes.add(key);
    }

    for (const oil of oilEntries) {
      const key = oil.engineCode.toUpperCase();
      const prev = map.get(key) || { engineCode: key };

      map.set(key, {
        ...prev,
        engineCode: key,
        oilLiters: prev.oilLiters ?? oil.oilLiters ?? null,
        maxOilLiters: prev.maxOilLiters ?? oil.maxOilLiters ?? null,
        oilSpec: prev.oilSpec || oil.oilSpec || null,
        oilViscosity: prev.oilViscosity || oil.oilViscosity || null,
      });

      report.engineMasterUpdatedCodes.add(key);
    }

    return [...map.values()].sort((a, b) => a.engineCode.localeCompare(b.engineCode));
  }

  const out = { ...parsed.rows };

  for (const entry of engineEntries) {
    const key = entry.engineCode.toUpperCase();
    const prev = out[key] || {};

    out[key] = {
      ...prev,
      fuelType: prev.fuelType || entry.fuelType || null,
      displacementLiters: prev.displacementLiters ?? entry.displacementLiters ?? null,
      powerKW: prev.powerKW ?? entry.powerKW ?? null,
      engineType: prev.engineType || entry.engineType || null,
      engineFamily: prev.engineFamily || null,
    };

    report.engineMasterUpdatedCodes.add(key);
  }

  for (const oil of oilEntries) {
    const key = oil.engineCode.toUpperCase();
    const prev = out[key] || {};

    out[key] = {
      ...prev,
      oilLiters: prev.oilLiters ?? oil.oilLiters ?? null,
      maxOilLiters: prev.maxOilLiters ?? oil.maxOilLiters ?? null,
      oilSpec: prev.oilSpec || oil.oilSpec || null,
      oilViscosity: prev.oilViscosity || oil.oilViscosity || null,
    };

    report.engineMasterUpdatedCodes.add(key);
  }

  return Object.keys(out)
    .sort()
    .reduce((acc, key) => {
      acc[key] = out[key];
      return acc;
    }, {});
}

async function run() {
  const pdfFiles = walkPdfFiles(INPUT_ROOT);
  const existingDataset = loadJson(OUTPUT_DATASET, []);
  const existingEngineMaster = loadJson(OUTPUT_ENGINE_MASTER, {});

  if (pdfFiles.length === 0) {
    console.log(`No PDF files found under ${INPUT_ROOT}`);
    return;
  }

  const datasetMap = new Map();
  for (const row of existingDataset) {
    if (row?.vin) {
      datasetMap.set(row.vin, row);
    }
  }

  const report = {
    scannedAt: new Date().toISOString(),
    inputRoot: INPUT_ROOT,
    totalPdfFiles: pdfFiles.length,
    created: [],
    updated: [],
    failed: [],
    engineMasterUpdatedCodes: new Set(),
    engineOverviewExtracted: [],
    oilSpecExtracted: [],
  };

  let createdCount = 0;
  let updatedCount = 0;
  const engineEntries = [];
  const oilEntries = [];

  for (const filePath of pdfFiles) {
    const sourceFile = path.basename(filePath);

    try {
      const pages = await extractPageLines(filePath);
      const parsed = buildRecordFromPages(pages, sourceFile);

      if (parsed.engineOverviewEntries.length > 0) {
        engineEntries.push(...parsed.engineOverviewEntries);
        report.engineOverviewExtracted.push({
          sourceFile,
          count: parsed.engineOverviewEntries.length,
          engineCodes: parsed.engineOverviewEntries.map((x) => x.engineCode),
        });
      }

      if (parsed.oilSpecEntries.length > 0) {
        oilEntries.push(...parsed.oilSpecEntries);
        report.oilSpecExtracted.push({
          sourceFile,
          count: parsed.oilSpecEntries.length,
          engineCodes: parsed.oilSpecEntries.map((x) => x.engineCode),
        });
      }

      if (!parsed.ok) {
        report.failed.push({
          sourceFile,
          missing: parsed.missing,
          parsedRecord: parsed.record,
          debug: parsed.debug,
        });
        console.log(`FAILED  ${sourceFile} -> missing: ${parsed.missing.join(", ")}`);
        continue;
      }

      const existed = datasetMap.has(parsed.record.vin);
      const previous = datasetMap.get(parsed.record.vin) || {};

      const merged = {
        ...previous,
        ...parsed.record,
      };

      datasetMap.set(parsed.record.vin, merged);

      if (existed) {
        updatedCount += 1;
        report.updated.push({
          sourceFile,
          vin: parsed.record.vin,
        });
        console.log(`UPDATED ${sourceFile} -> ${parsed.record.vin}`);
      } else {
        createdCount += 1;
        report.created.push({
          sourceFile,
          vin: parsed.record.vin,
        });
        console.log(`CREATED ${sourceFile} -> ${parsed.record.vin}`);
      }
    } catch (error) {
      report.failed.push({
        sourceFile,
        error: error.message,
      });
      console.log(`ERROR   ${sourceFile} -> ${error.message}`);
    }
  }

  const dedupedEngineEntries = dedupeBy(engineEntries, (x) => x.engineCode);
  const dedupedOilEntries = dedupeBy(
    oilEntries,
    (x) => `${x.engineCode}|${x.oilLiters}|${x.maxOilLiters}|${x.oilSpec}|${x.oilViscosity}`
  );

  const finalDataset = sortDataset([...datasetMap.values()]);
  const finalEngineMaster = mergeEngineMaster(
    existingEngineMaster,
    dedupedEngineEntries,
    dedupedOilEntries,
    report
  );

  const datasetBackupPath = createBackupIfNeeded(OUTPUT_DATASET);
  const engineMasterBackupPath = createBackupIfNeeded(OUTPUT_ENGINE_MASTER);

  fs.writeFileSync(OUTPUT_DATASET, JSON.stringify(finalDataset, null, 2), "utf8");
  fs.writeFileSync(OUTPUT_ENGINE_MASTER, JSON.stringify(finalEngineMaster, null, 2), "utf8");

  const finalReport = {
    scannedAt: report.scannedAt,
    inputRoot: report.inputRoot,
    totalPdfFiles: report.totalPdfFiles,
    created: report.created,
    updated: report.updated,
    failed: report.failed,
    engineOverviewExtracted: report.engineOverviewExtracted,
    oilSpecExtracted: report.oilSpecExtracted,
    summary: {
      dataset: {
        beforeRows: existingDataset.length,
        afterRows: finalDataset.length,
        createdCount,
        updatedCount,
        failedCount: report.failed.length,
        backupPath: datasetBackupPath,
      },
      engineMaster: {
        updatedCodes: [...report.engineMasterUpdatedCodes].sort(),
        updatedCount: report.engineMasterUpdatedCodes.size,
        backupPath: engineMasterBackupPath,
      },
    },
  };

  fs.writeFileSync(OUTPUT_REPORT, JSON.stringify(finalReport, null, 2), "utf8");

  console.log("");
  console.log("Import finished.");
  console.log(`PDF files scanned: ${pdfFiles.length}`);
  console.log(`Dataset created rows: ${createdCount}`);
  console.log(`Dataset updated rows: ${updatedCount}`);
  console.log(`Engine master updated codes: ${report.engineMasterUpdatedCodes.size}`);
  console.log(`Failed files: ${report.failed.length}`);
  console.log(`Dataset saved to: ${OUTPUT_DATASET}`);
  console.log(`Engine master saved to: ${OUTPUT_ENGINE_MASTER}`);
  console.log(`Report saved to: ${OUTPUT_REPORT}`);
  if (datasetBackupPath) {
    console.log(`Dataset backup created: ${datasetBackupPath}`);
  }
  if (engineMasterBackupPath) {
    console.log(`Engine master backup created: ${engineMasterBackupPath}`);
  }
}

run();