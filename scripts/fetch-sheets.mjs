import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { workbooks } from "../config/sheets.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");

function parseGvizPayload(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Unexpected Google Visualization response.");
  }

  return JSON.parse(text.slice(start, end + 1));
}

function normalizeCell(cell) {
  if (!cell) {
    return null;
  }

  const rawValue = cell.v ?? null;
  const formatted = cell.f ?? null;

  if (typeof rawValue === "string" && rawValue.startsWith("Date(")) {
    const parts = rawValue
      .slice(5, -1)
      .split(",")
      .map((value) => Number.parseInt(value.trim(), 10));
    const [year, month, day = 1, hour = 0, minute = 0, second = 0] = parts;
    const iso = new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString();

    return {
      raw: iso,
      formatted: formatted ?? iso,
      type: "date"
    };
  }

  const valueType = rawValue === null ? "null" : typeof rawValue;
  return {
    raw: rawValue,
    formatted: formatted ?? rawValue,
    type: valueType
  };
}

function normalizeTable(table) {
  const seenLabels = new Map();
  const columns = table.cols.map((column, index) => {
    const baseLabel = column.label?.trim() || column.id || `Column ${index + 1}`;
    const count = (seenLabels.get(baseLabel) ?? 0) + 1;
    seenLabels.set(baseLabel, count);

    return {
      id: column.id || `col_${index}`,
      label: count === 1 ? baseLabel : `${baseLabel} (${count})`,
      type: column.type || "string"
    };
  });

  const rows = table.rows.map((row) => {
    const values = row.c ?? [];
    return columns.reduce((record, column, index) => {
      record[column.label] = normalizeCell(values[index]);
      return record;
    }, {});
  });

  return { columns, rows };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(value);
      value = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      value = "";
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    value += char;
  }

  if (value.length || row.length) {
    row.push(value);
    if (row.some((cell) => cell !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeCsvCell(columnLabel, rawValue) {
  const value = String(rawValue ?? "").trim();
  if (!value) {
    return null;
  }

  if (columnLabel === "Date") {
    const [month, day, year] = value.split("/");
    if (month && day && year) {
      return {
        raw: `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000Z`,
        formatted: value,
        type: "date"
      };
    }
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return {
      raw: Number(value),
      formatted: value,
      type: "number"
    };
  }

  return {
    raw: value,
    formatted: value,
    type: "string"
  };
}

function normalizeCsvTable(csvText) {
  const matrix = parseCsv(csvText);
  const headerRow = matrix[0] ?? [];
  const activeHeaders = headerRow
    .map((header, index) => ({ header: header.trim(), index }))
    .filter((item) => item.header);

  const columns = activeHeaders.map((item) => ({
    id: item.header,
    label: item.header,
    type: item.header === "Date" ? "date" : "string"
  }));

  const rows = matrix.slice(1).map((line) => {
    const record = {};
    for (const column of activeHeaders) {
      record[column.header] = normalizeCsvCell(column.header, line[column.index] ?? "");
    }
    return record;
  });

  return { columns, rows };
}

async function fetchTab(workbook, tab) {
  const tabName = typeof tab === "string" ? tab : tab.name;

  if (typeof tab === "object" && tab.csvGid) {
    const url =
      `https://docs.google.com/spreadsheets/d/${workbook.sheetId}/export` +
      `?format=csv&gid=${encodeURIComponent(tab.csvGid)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${workbook.slug}/${tabName}: ${response.status}`);
    }

    return normalizeCsvTable(await response.text());
  }

  const url =
    `https://docs.google.com/spreadsheets/d/${workbook.sheetId}/gviz/tq` +
    `?sheet=${encodeURIComponent(tabName)}&tqx=out:json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${workbook.slug}/${tabName}: ${response.status}`);
  }

  const payload = parseGvizPayload(await response.text());
  return normalizeTable(payload.table);
}

async function main() {
  await mkdir(dataDir, { recursive: true });

  const siteData = {
    generatedAt: new Date().toISOString(),
    workbooks: []
  };

  for (const workbook of workbooks) {
    const tabs = {};
    for (const tab of workbook.tabs) {
      const tabName = typeof tab === "string" ? tab : tab.name;
      tabs[tabName] = await fetchTab(workbook, tab);
    }

    const workbookData = {
      slug: workbook.slug,
      title: workbook.title,
      subtitle: workbook.subtitle,
      accent: workbook.accent,
      sheetId: workbook.sheetId,
      sourceUrl: `https://docs.google.com/spreadsheets/d/${workbook.sheetId}/edit?usp=sharing`,
      tabs
    };

    siteData.workbooks.push(workbookData);
    await writeFile(
      path.join(dataDir, `${workbook.slug}.json`),
      JSON.stringify(workbookData, null, 2),
      "utf8"
    );
  }

  await writeFile(path.join(dataDir, "site-data.json"), JSON.stringify(siteData, null, 2), "utf8");
  console.log(`Synced ${siteData.workbooks.length} workbooks to ${dataDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
