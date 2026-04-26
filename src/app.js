const state = {
  siteData: null
};

const dashboardRoot = document.querySelector("#dashboard-root");
const pageType = document.body.dataset.page;
const workbookSlug = document.body.dataset.workbook;
const navItems = [
  { slug: "home", label: "Home", href: "./index.html" },
  { slug: "health", label: "Health", href: "./health.html" },
  { slug: "career", label: "Career", href: "./career.html" },
  { slug: "rankings", label: "Rankings", href: "./rankings.html" },
  { slug: "golf", label: "Golf", href: "./golf.html" },
  { slug: "me-and-her", label: "Me and Her", href: "./me-and-her.html" }
];

function getWorkbook(slug) {
  return state.siteData.workbooks.find((workbook) => workbook.slug === slug);
}

function getCell(row, key) {
  return row?.[key]?.formatted ?? row?.[key]?.raw ?? "";
}

function getRaw(row, key) {
  return row?.[key]?.raw ?? null;
}

function trimRows(rows, count = 6) {
  return rows.filter(Boolean).slice(0, count);
}

function formatDateValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (isoMatch) {
      return `${Number(isoMatch[2])}/${Number(isoMatch[3])}/${isoMatch[1]}`;
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

function dateKey(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currencyToNumber(value) {
  if (!value) {
    return 0;
  }

  return Number.parseFloat(String(value).replace(/[^0-9.-]/g, "")) || 0;
}

function parseComparableNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function parseHealthNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveTabColumnKey(tab, preferredKey, preferredType = null) {
  if (!tab) {
    return preferredKey;
  }

  const preferredColumn = tab.columns?.find((column) => column.label === preferredKey || column.id === preferredKey);
  if (preferredColumn) {
    return preferredColumn.label;
  }

  if (preferredType) {
    const typedColumn = tab.columns?.find((column) => column.type === preferredType);
    if (typedColumn) {
      return typedColumn.label;
    }
  }

  return preferredKey;
}

function parseWorkoutWeight(cell) {
  const raw = cell?.raw ?? null;
  const formatted = cell?.formatted ?? raw ?? null;

  if (typeof raw === "number") {
    return {
      kind: "numeric",
      display: String(formatted ?? raw),
      rank: 1000 + raw
    };
  }

  const text = String(formatted ?? raw ?? "").trim();
  if (!text) {
    return null;
  }

  if (/^BW$/i.test(text)) {
    return {
      kind: "bodyweight",
      display: "BW",
      rank: 1_000_000
    };
  }

  const bandMatch = text.match(/^BW\s*\((\d+)\s*-\s*(\d+)\s*RB\)$/i);
  if (bandMatch) {
    const low = Number(bandMatch[1]);
    const high = Number(bandMatch[2]);
    const avgAssistance = (low + high) / 2;
    return {
      kind: "bodyweight-band",
      display: text,
      rank: 500_000 - avgAssistance
    };
  }

  return {
    kind: "text",
    display: text,
    rank: -1
  };
}

function commonChartOptions(label, displayLegend = true) {
  const tickFontSize = window.innerWidth <= 520 ? 10 : 12;

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: displayLegend
      }
    },
    scales: {
      x: {
        ticks: {
          color: "#a5b5c6",
          font: { size: tickFontSize }
        },
        grid: { color: "rgba(255,255,255,0.06)" }
      },
      y: {
        title: {
          display: true,
          text: label,
          color: "#a5b5c6"
        },
        ticks: {
          color: "#a5b5c6",
          font: { size: tickFontSize }
        },
        grid: { color: "rgba(255,255,255,0.06)" }
      }
    }
  };
}

function createWeightChartOptions(values, label = "Weight (lbs)", displayLegend = true) {
  const numericValues = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  const minValue = numericValues.length ? Math.floor(Math.min(...numericValues) - 1) : undefined;
  const tickSize = 1;
  const maxValue = numericValues.length
    ? Math.ceil(Math.max(...numericValues) / tickSize) * tickSize + tickSize
    : undefined;

  return {
    ...commonChartOptions(label, displayLegend),
    scales: {
      ...commonChartOptions(label, displayLegend).scales,
      y: {
        ...commonChartOptions(label, displayLegend).scales.y,
        ...(minValue !== undefined ? { min: minValue } : {}),
        ...(maxValue !== undefined ? { max: maxValue } : {}),
        ticks: {
          ...commonChartOptions(label, displayLegend).scales.y.ticks,
          stepSize: tickSize
        }
      }
    }
  };
}

function createStepChartOptions(maxValue, label = "Steps", displayLegend = true) {
  const tickSize = 2000;
  const axisMax = Math.max(16000, Math.ceil(maxValue / tickSize) * tickSize + tickSize);

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: displayLegend
      }
    },
    scales: {
      x: {
        ticks: {
          color: "#a5b5c6",
          font: { size: window.innerWidth <= 520 ? 10 : 12 }
        },
        grid: { color: "rgba(255,255,255,0.06)" }
      },
      y: {
        min: 0,
        max: axisMax,
        title: {
          display: true,
          text: label,
          color: "#a5b5c6"
        },
        ticks: {
          color: "#a5b5c6",
          stepSize: tickSize
        },
        grid: { color: "rgba(255,255,255,0.06)" }
      }
    }
  };
}

function createHorizontalGoalLinePlugin(goalValue, color = "#facc15", dash = [6, 6], width = 2) {
  return {
    id: `goal-line-${String(goalValue).replace(/[^a-z0-9-]/gi, "")}`,
    afterDatasetsDraw(chart) {
      const yScale = chart.scales?.y;
      if (!yScale) {
        return;
      }

      const y = yScale.getPixelForValue(goalValue);
      const { left, right } = chart.chartArea;
      const context = chart.ctx;

      context.save();
      context.beginPath();
      context.setLineDash(dash);
      context.lineWidth = width;
      context.strokeStyle = color;
      context.moveTo(left, y);
      context.lineTo(right, y);
      context.stroke();
      context.restore();
    }
  };
}

function createStatsGrid(items) {
  const wrapper = document.createElement("div");
  wrapper.className = "stats-grid";
  for (const item of items) {
    const stat = document.createElement("article");
    stat.className = "stat-card";
    stat.innerHTML = `
      <div class="stat-label">${item.label}</div>
      <div class="stat-value">${item.value}</div>
    `;
    wrapper.appendChild(stat);
  }
  return wrapper;
}

function createGlanceCard(title, subtitle, stats, className = "") {
  const card = document.createElement("article");
  card.className = `glance-card ${className}`.trim();
  card.innerHTML = `
    <div class="card-head">
      <div>
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>
      <span class="pill">At a glance</span>
    </div>
  `;
  card.appendChild(createStatsGrid(stats));
  return card;
}

function createChartCard(title, subtitle, chartConfig, className = "") {
  const card = document.createElement("article");
  card.className = `chart-card ${className}`.trim();
  const canvasId = `chart-${Math.random().toString(36).slice(2, 9)}`;
  card.innerHTML = `
    <div class="card-head">
      <div>
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>
      <span class="pill">Trend</span>
    </div>
    <canvas id="${canvasId}"></canvas>
  `;

  queueMicrotask(() => {
    const canvas = card.querySelector(`#${canvasId}`);
    if (canvas && typeof Chart !== "undefined") {
      new Chart(canvas, chartConfig);
    }
  });

  return card;
}

function createTableCard(title, subtitle, columns, rows, className = "") {
  const card = document.createElement("article");
  card.className = `table-card ${className}`.trim();
  const table = document.createElement("table");
  const headRow = document.createElement("tr");
  columns.forEach((column) => {
    const th = document.createElement("th");
    th.textContent = column;
    headRow.appendChild(th);
  });

  const thead = document.createElement("thead");
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = columns.length;
    td.className = "empty-state";
    td.textContent = "No rows available yet.";
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      row.forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  table.appendChild(tbody);

  card.innerHTML = `
    <div class="card-head">
      <div>
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>
      <span class="pill">Table</span>
    </div>
  `;
  card.appendChild(table);
  return card;
}

function createWorkoutRecordsCard(title, subtitle, streakRow, columns, rows, notes = []) {
  const card = document.createElement("article");
  card.className = "table-card";
  card.innerHTML = `
    <div class="card-head">
      <div>
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>
      <span class="pill">Table</span>
    </div>
  `;

  if (streakRow) {
    const streakTable = document.createElement("table");
    const streakHead = document.createElement("thead");
    streakHead.innerHTML = `
      <tr>
        <th>Record</th>
        <th>Value</th>
        <th>Start</th>
        <th>End</th>
      </tr>
    `;
    streakTable.appendChild(streakHead);

    const streakBody = document.createElement("tbody");
    const streakTr = document.createElement("tr");
    streakRow.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      streakTr.appendChild(td);
    });
    streakBody.appendChild(streakTr);
    streakTable.appendChild(streakBody);
    card.appendChild(streakTable);
  }

  const spacer = document.createElement("div");
  spacer.style.height = "16px";
  card.appendChild(spacer);

  const mainTable = document.createElement("table");
  const mainHeadRow = document.createElement("tr");
  columns.forEach((column) => {
    const th = document.createElement("th");
    th.textContent = column;
    mainHeadRow.appendChild(th);
  });

  const mainThead = document.createElement("thead");
  mainThead.appendChild(mainHeadRow);
  mainTable.appendChild(mainThead);

  const mainTbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    mainTbody.appendChild(tr);
  });
  mainTable.appendChild(mainTbody);
  card.appendChild(mainTable);

  if (notes.length) {
    const notesBlock = document.createElement("div");
    notesBlock.style.marginTop = "16px";
    notesBlock.style.color = "var(--muted)";
    notesBlock.style.fontSize = "0.95rem";
    notesBlock.style.lineHeight = "1.6";

    notes.forEach((note) => {
      const line = document.createElement("p");
      line.textContent = note;
      line.style.margin = "0";
      notesBlock.appendChild(line);
    });

    card.appendChild(notesBlock);
  }

  return card;
}

function createWorkbookFrame(workbook) {
  const wrapper = document.createElement("section");
  const activeNavSlug = workbook.slug === "bowling" ? "me-and-her" : workbook.slug;
  wrapper.className = "workbook-shell";
  wrapper.innerHTML = `
    <div class="page-topbar">
      <span class="brand">Personal Dashboards</span>
      <div class="nav-links">${buildNavLinks(activeNavSlug)}</div>
    </div>
    <header class="page-hero">
      <div class="page-hero-head">
        <span class="section-kicker">Workbook</span>
        <a class="sheet-link" href="${workbook.sourceUrl}" target="_blank" rel="noreferrer">Open source sheet</a>
      </div>
      <h1>${workbook.title}</h1>
      <p>${workbook.subtitle}</p>
    </header>
    <section class="section-card">
      <div class="section-grid"></div>
    </section>
  `;
  return wrapper;
}

function createMeAndHerFrame() {
  const wrapper = document.createElement("section");
  wrapper.className = "workbook-shell";
  wrapper.innerHTML = `
    <div class="page-topbar">
      <span class="brand">Personal Dashboards</span>
      <div class="nav-links">${buildNavLinks("me-and-her")}</div>
    </div>
    <header class="page-hero">
      <div class="page-hero-head">
        <span class="section-kicker">Together</span>
      </div>
      <h1>Me and Her</h1>
      <p>Shared games, quizzes, and little dashboards for the two of you.</p>
    </header>
  `;
  return wrapper;
}

function splitNumberedText(value) {
  const text = String(value || "").trim();
  if (!text) {
    return [];
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const match = line.match(/^(\d+):\s*(.*)$/);
    return {
      index: match ? Number(match[1]) : index + 1,
      value: match ? match[2] : line
    };
  });
}

function buildCareerItems(row) {
  const titles = splitNumberedText(getCell(row, "Job Title(s)"));
  const lengths = new Map(splitNumberedText(getCell(row, "Length")).map((item) => [item.index, item.value]));
  const times = new Map(splitNumberedText(getCell(row, "Time")).map((item) => [item.index, item.value]));
  const payDetails = new Map(splitNumberedText(getCell(row, "Pay Details")).map((item) => [item.index, item.value]));
  const grossDivided = new Map(splitNumberedText(getCell(row, "Gross Divided")).map((item) => [item.index, item.value]));
  const netDivided = new Map(splitNumberedText(getCell(row, "Net Divided")).map((item) => [item.index, item.value]));

  return titles.map((item) => ({
    title: item.value,
    length: lengths.get(item.index) || "",
    time: times.get(item.index) || "",
    payDetails: payDetails.get(item.index) || "",
    gross: grossDivided.get(item.index) || "",
    net: netDivided.get(item.index) || ""
  }));
}

function formatCareerRangeLabel(start, end) {
  return `${formatDateValue(start)} - ${formatDateValue(end)}`;
}

function inferSeasonRange(title, year) {
  const text = String(title || "").toLowerCase();
  if (text.includes("spring")) {
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 4, 31)
    };
  }

  if (text.includes("summer")) {
    return {
      start: new Date(year, 4, 15),
      end: new Date(year, 7, 31)
    };
  }

  if (text.includes("fall")) {
    return {
      start: new Date(year, 8, 1),
      end: new Date(year, 11, 31)
    };
  }

  return null;
}

function parseCareerDate(value, fallbackYear, fallbackToEnd = false) {
  const text = String(value || "").trim();
  if (!text) {
    return fallbackToEnd
      ? new Date(fallbackYear, 11, 31)
      : new Date(fallbackYear, 0, 1);
  }

  const match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) {
    return fallbackToEnd
      ? new Date(fallbackYear, 11, 31)
      : new Date(fallbackYear, 0, 1);
  }

  return new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
}

function parseCareerRange(rangeText, fallbackYear, title = "") {
  const text = String(rangeText || "").trim();
  const inferredSeason = inferSeasonRange(title, fallbackYear);
  if (!text) {
    if (inferredSeason) {
      return inferredSeason;
    }
    return {
      start: new Date(fallbackYear, 0, 1),
      end: new Date(fallbackYear, 11, 31)
    };
  }

  const pieces = text.split("-").map((piece) => piece.trim());
  if (pieces.length < 2) {
    return {
      start: parseCareerDate(text, fallbackYear, false),
      end: parseCareerDate(text, fallbackYear, true)
    };
  }

  const startText = pieces[0];
  const endText = pieces.slice(1).join("-").trim();

  return {
    start: startText
      ? parseCareerDate(startText, fallbackYear, false)
      : (inferredSeason?.start ?? new Date(fallbackYear, 0, 1)),
    end: endText
      ? parseCareerDate(endText, fallbackYear, true)
      : (inferredSeason?.end ?? new Date(fallbackYear, 11, 31))
  };
}

function extractCompany(title) {
  const text = String(title || "").trim();
  const matches = [...text.matchAll(/\(([^)]+)\)|\[([^\]]+)\]/g)];
  if (!matches.length) {
    return "";
  }

  const last = matches.at(-1);
  return String(last?.[1] || last?.[2] || "").trim();
}

function stripCompany(title) {
  return String(title || "")
    .replace(/\s*\(([^)]+)\)\s*$/, "")
    .replace(/\s*\[([^\]]+)\]\s*$/, "")
    .trim();
}

function normalizeCareerRoleKey(title, company) {
  const normalizedTitle = String(title || "")
    .toLowerCase()
    .replace(/\b(spring|summer|fall)\b/g, "")
    .replace(/\bintern(ship)?\b/g, "intern")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedCompany = String(company || "").toLowerCase().trim();
  return `${normalizedCompany}::${normalizedTitle}`;
}

function normalizeHoursText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function formatCareerHours(value) {
  const normalized = normalizeHoursText(value);
  if (!normalized) {
    return "";
  }

  return String(value || "").trim();
}

function consolidateCareerSegments(segments) {
  const normalizedSegments = Array.isArray(segments)
    ? segments.filter(Boolean).sort((left, right) => left.start - right.start || left.end - right.end)
    : [];

  return normalizedSegments.reduce((merged, segment) => {
    const previous = merged.at(-1);
    const gapInDays = previous
      ? Math.round((segment.start - previous.end) / (1000 * 60 * 60 * 24))
      : Number.POSITIVE_INFINITY;
    const sameHours = previous && normalizeHoursText(previous.hours) === normalizeHoursText(segment.hours);

    if (previous && sameHours && gapInDays >= 0 && gapInDays <= 1) {
      previous.end = segment.end > previous.end ? segment.end : previous.end;
      previous.range = formatCareerRangeLabel(previous.start, previous.end);
      return merged;
    }

    merged.push({ ...segment });
    return merged;
  }, []);
}

function createCareerScheduleMarkup(segments, overallRange = "") {
  const normalizedSegments = consolidateCareerSegments(segments);
  if (!normalizedSegments.length) {
    return '<div class="career-role-schedule-group"><p class="career-role-date-line">-</p></div>';
  }

  const groupsMarkup = normalizedSegments
    .map((segment) => {
      const hoursMarkup = segment.hours ? `<p>${segment.hours}</p>` : "";
      return `<div class="career-role-schedule-group"><p class="career-role-date-line">${segment.range}</p>${hoursMarkup}</div>`;
    })
    .join("");

  if (normalizedSegments.length <= 1) {
    return groupsMarkup;
  }

  return `<p class="career-role-overall-range career-role-date-line">${overallRange}</p>${groupsMarkup}`;
}

function timelineOffsetPercent(value, rangeStart, totalDuration, insetPercent = 1.5) {
  const rawPercent = ((value - rangeStart) / totalDuration) * 100;
  const usableRange = 100 - insetPercent * 2;
  return insetPercent + (rawPercent / 100) * usableRange;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && startB <= endA;
}

function assignTimelineLanes(items, bufferDays = 0, seedLaneEnds = []) {
  const laneEnds = [...seedLaneEnds];
  items.forEach((item) => {
    const resolvedBuffer = typeof bufferDays === "function"
      ? Number(bufferDays(item) ?? 0)
      : bufferDays;
    const bufferedStart = addDays(item.start, -resolvedBuffer);
    let lane = laneEnds.findIndex((end) => end < bufferedStart);
    if (lane === -1) {
      lane = laneEnds.length;
    }
    laneEnds[lane] = addDays(item.end, resolvedBuffer);
    item.lane = lane;
  });
  return laneEnds;
}

function layoutTimelineItems(items, geometryFn, priorityFn = () => 0, gapPercent = 0.3) {
  const laneEnds = [];
  const ordered = [...items].sort((left, right) => {
    const leftGeometry = geometryFn(left);
    const rightGeometry = geometryFn(right);
    return leftGeometry.top - rightGeometry.top ||
      priorityFn(left) - priorityFn(right) ||
      leftGeometry.height - rightGeometry.height;
  });

  ordered.forEach((item) => {
    const geometry = geometryFn(item);
    let lane = laneEnds.findIndex((end) => end + gapPercent <= geometry.top);
    if (lane === -1) {
      lane = laneEnds.length;
    }
    laneEnds[lane] = geometry.top + geometry.height;
    item.displayLane = lane;
    item.displayTop = geometry.top;
    item.displayHeight = geometry.height;
    item.displayCompact = Boolean(geometry.compact);
  });

  return laneEnds.length;
}

function layoutCareerTimelineItems(items, geometryFn, gapPercent = 0.3) {
  const roleCounts = new Map();
  items.forEach((item) => {
    roleCounts.set(item.roleKey, (roleCounts.get(item.roleKey) || 0) + 1);
  });

  const ordered = [...items].sort((left, right) => {
    const leftGeometry = geometryFn(left);
    const rightGeometry = geometryFn(right);
    const leftRecurring = (roleCounts.get(left.roleKey) || 0) > 1 ? 0 : 1;
    const rightRecurring = (roleCounts.get(right.roleKey) || 0) > 1 ? 0 : 1;
    return leftGeometry.top - rightGeometry.top ||
      leftRecurring - rightRecurring ||
      leftGeometry.height - rightGeometry.height;
  });

  const laneEnds = [];
  const preferredLanes = new Map();

  ordered.forEach((item) => {
    const geometry = geometryFn(item);
    const preferredLane = preferredLanes.get(item.roleKey);
    let lane = -1;

    if (
      typeof preferredLane === "number" &&
      (laneEnds[preferredLane] === undefined || laneEnds[preferredLane] + gapPercent <= geometry.top)
    ) {
      lane = preferredLane;
    } else {
      lane = laneEnds.findIndex((end) => end + gapPercent <= geometry.top);
      if (lane === -1) {
        lane = laneEnds.length;
      }
    }

    laneEnds[lane] = geometry.top + geometry.height;
    item.displayLane = lane;
    item.displayTop = geometry.top;
    item.displayHeight = geometry.height;

    if (!preferredLanes.has(item.roleKey)) {
      preferredLanes.set(item.roleKey, lane);
    }
  });

  return laneEnds.length;
}

function laneHasConflict(items, targetItem, lane, gapPercent = 0.3) {
  const itemTop = targetItem.displayTop;
  const itemBottom = targetItem.displayTop + targetItem.displayHeight;
  return items.some((other) => {
    if (other === targetItem || other.displayLane !== lane) {
      return false;
    }
    const otherTop = other.displayTop;
    const otherBottom = other.displayTop + other.displayHeight;
    return itemTop < otherBottom + gapPercent && otherTop < itemBottom + gapPercent;
  });
}

function buildCareerTimelineItems(rows) {
  const rawItems = rows.flatMap((row) => {
    const year = Number(getCell(row, "Year")) || new Date().getFullYear();
    return buildCareerItems(row).flatMap((job) => {
      const formattedHours = formatCareerHours(job.time);
      if (normalizeHoursText(formattedHours) === "0 hrs/week" || normalizeHoursText(formattedHours) === "0 hours/week") {
        return [];
      }

      const range = parseCareerRange(job.length, year, job.title);
      const company = extractCompany(job.title);
      return {
        year,
        title: stripCompany(job.title),
        company: company || job.title,
        fullTitle: job.title,
        roleKey: normalizeCareerRoleKey(stripCompany(job.title), company || job.title),
        time: job.time || "",
        displayTime: formattedHours,
        payDetails: job.payDetails || "",
        gross: job.gross || "",
        net: job.net || "",
        start: range.start,
        end: range.end,
        displayRange: job.length || formatCareerRangeLabel(range.start, range.end),
        segments: [
          {
            start: range.start,
            end: range.end,
            range: job.length || formatCareerRangeLabel(range.start, range.end),
            hours: formattedHours
          }
        ]
      };
    });
  }).sort((left, right) => left.start - right.start || left.end - right.end);

  const items = rawItems.reduce((merged, item) => {
    const previous = [...merged]
      .reverse()
      .find((candidate) => candidate.roleKey === item.roleKey);
    const gapInDays = previous
      ? Math.round((item.start - previous.end) / (1000 * 60 * 60 * 24))
      : Number.POSITIVE_INFINITY;
    const shortGap = gapInDays >= 0 && gapInDays <= 14;

    if (previous && shortGap) {
      previous.end = item.end > previous.end ? item.end : previous.end;
      previous.time = previous.time || item.time;
      previous.payDetails = previous.payDetails || item.payDetails;
      previous.gross = previous.gross || item.gross;
      previous.net = previous.net || item.net;
      previous.segments = [...(previous.segments || []), ...(item.segments || [])]
        .sort((left, right) => left.start - right.start || left.end - right.end);
      previous.displayRange = formatCareerRangeLabel(previous.start, previous.end);
      previous.displayTime = createCareerScheduleMarkup(previous.segments, previous.displayRange);
      return merged;
    }

    merged.push({
      ...item,
      displayTime: createCareerScheduleMarkup(item.segments, item.displayRange)
    });
    return merged;
  }, []);

  assignTimelineLanes(items, 6);

  return items;
}

function buildCareerSidebarData(rows) {
  return {
    academics: [],
    certifications: []
  };
}

function buildAcademicItems(rows) {
  const items = rows.flatMap((row) => {
    const year = Number(getCell(row, "Year")) || new Date().getFullYear();
    const titles = splitNumberedText(getCell(row, "Academic Title(s)"));
    const lengths = new Map(splitNumberedText(getCell(row, "Length")).map((item) => [item.index, item.value]));
    const timeCredits = new Map(splitNumberedText(getCell(row, "Time / Credits")).map((item) => [item.index, item.value]));
    const categories = new Map(splitNumberedText(getCell(row, "Category")).map((item) => [item.index, item.value]));

    return titles.map((item) => {
      const title = item.value;
      const rangeText = lengths.get(item.index) || "";
      const detail = timeCredits.get(item.index) || "";
      const range = parseCareerRange(rangeText, year, title);
      const categoryText = categories.get(item.index) || "";
      const type = /certification|test/i.test(categoryText)
        ? "certification"
        : /academic/i.test(categoryText)
          ? "academic"
          : /license|exam|osha|test/i.test(title)
            ? "certification"
            : "academic";

      return {
        type,
        year,
        title,
        category: type === "academic" ? "Academics" : "Certifications / Tests",
        displayRange: rangeText || formatCareerRangeLabel(range.start, range.end),
        detail,
        sortDate: range.start,
        start: range.start,
        end: range.end
      };
    });
  }).sort((left, right) => left.sortDate - right.sortDate);
  return items;
}

function getFirstPopulatedCell(row) {
  if (!row) {
    return "";
  }

  for (const cell of Object.values(row)) {
    const value = cell?.formatted ?? cell?.raw ?? "";
    if (String(value || "").trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function buildCareerNotes(rows, fallbackYears = []) {
  const structuredNotes = rows
    .map((row) => ({
      year: String(getCell(row, "Year") || "").trim(),
      note: String(getCell(row, "Notes") || "").trim()
    }))
    .filter((entry) => entry.year || entry.note);

  if (structuredNotes.length) {
    return structuredNotes.map((entry, index) => ({
      year: entry.year || fallbackYears[index] || `Note ${index + 1}`,
      note: entry.note || "-"
    }));
  }

  const noteTexts = rows
    .map((row) => getFirstPopulatedCell(row))
    .filter((text) => text && text.toLowerCase() !== "notes");

  return noteTexts.map((note, index) => ({
    year: fallbackYears[index] || `Note ${index + 1}`,
    note
  }));
}

function getNumberCell(row, key) {
  return parseHealthNumber(getRaw(row, key) ?? getCell(row, key)) ?? 0;
}

function parseSheetDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string") {
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (isoMatch) {
      return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    }

    const dateMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dateMatch) {
      return new Date(Number(dateMatch[3]), Number(dateMatch[1]) - 1, Number(dateMatch[2]));
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getRankingMediaDate(row, tabName) {
  const dateKeysByTab = {
    Movies: ["First Date Watched"],
    Books: ["Day Finished", "Day Started"],
    "TV Shows": ["Date Started"],
    Animes: ["Date Started"],
    Cartoons: ["Date Started"],
    Mangas: ["Date Started"],
    Manwhas: ["Date Started"],
    "Light Novels": ["Date Started"],
    Comics: ["Date Started"]
  };

  const keys = dateKeysByTab[tabName] || ["Date Started", "First Date Watched", "Day Finished", "Day Started"];
  for (const key of keys) {
    const date = parseSheetDate(getRaw(row, key) ?? getCell(row, key));
    if (date) {
      return date;
    }
  }

  return null;
}

function createRankingCountOptions(label, values, displayLegend = false) {
  const maxValue = Math.max(...values, 0);
  const tickSize = maxValue <= 12 ? 1 : maxValue <= 50 ? 5 : maxValue <= 150 ? 25 : 50;
  const axisMax = Math.ceil(maxValue / tickSize) * tickSize + tickSize;
  const options = commonChartOptions(label, displayLegend);

  return {
    ...options,
    scales: {
      ...options.scales,
      x: {
        ...options.scales.x,
        ticks: {
          ...options.scales.x.ticks,
          maxRotation: 55,
          minRotation: values.length > 12 ? 45 : 0
        }
      },
      y: {
        ...options.scales.y,
        min: 0,
        max: axisMax,
        ticks: {
          ...options.scales.y.ticks,
          stepSize: tickSize
        }
      }
    }
  };
}

function createRankingScoreOptions(label, displayLegend = false) {
  const options = commonChartOptions(label, displayLegend);

  return {
    ...options,
    scales: {
      ...options.scales,
      x: {
        ...options.scales.x,
        ticks: {
          ...options.scales.x.ticks,
          maxRotation: 55,
          minRotation: 0
        }
      },
      y: {
        ...options.scales.y,
        min: 0,
        max: 10,
        ticks: {
          ...options.scales.y.ticks,
          stepSize: 1
        }
      }
    }
  };
}

function createHorizontalLabelCountOptions(label, values, displayLegend = false) {
  const options = createRankingCountOptions(label, values, displayLegend);

  return {
    ...options,
    scales: {
      ...options.scales,
      x: {
        ...options.scales.x,
        ticks: {
          ...options.scales.x.ticks,
          maxRotation: 0,
          minRotation: 0
        }
      }
    }
  };
}

function buildNavLinks(activeSlug) {
  return navItems
    .map((item) => {
      const activeClass = item.slug === activeSlug ? "active" : "";
      return `<a class="${activeClass}" href="${item.href}">${item.label}</a>`;
    })
    .join("");
}

function renderHome() {
  const navLinks = document.querySelector("#nav-links");
  const generatedAt = document.querySelector("#generated-at");
  const workbookCount = document.querySelector("#workbook-count");

  navLinks.innerHTML = buildNavLinks("home");

  generatedAt.textContent = new Date(state.siteData.generatedAt).toLocaleString();
  workbookCount.textContent = "Workbook pages synced automatically";
}

function renderMeAndHerPage() {
  const shell = createMeAndHerFrame();
  const list = document.createElement("section");
  list.className = "misc-list";
  list.innerHTML = `
    <a class="misc-link" href="./bowling.html">
      <strong>Bowling</strong>
      <p>Scores, wins, recent outings, and head-to-head results.</p>
    </a>
    <a class="misc-link" href="./love-language-quiz/index.html">
      <strong>Love Language Quiz</strong>
    </a>
  `;
  shell.appendChild(list);
  dashboardRoot.appendChild(shell);
}

function renderHealth(sectionGrid) {
  const workbook = getWorkbook("health");
  const dashboardTab = workbook.tabs["Dashboard"];
  const overallTab = workbook.tabs["Overall"];
  const workoutsTab = workbook.tabs["Workouts"];
  const dashboard = dashboardTab.rows;
  const overall = overallTab.rows;
  const workouts = workoutsTab.rows;
  const overallDateKeyName = resolveTabColumnKey(overallTab, "Date", "date");
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);
  const eligibleOverallRows = overall.filter((row) => {
    const rowKey = dateKey(getRaw(row, overallDateKeyName));
    return rowKey && rowKey <= yesterdayKey;
  });
  const weightEligibleRows = overall.filter((row) => {
    const rowKey = dateKey(getRaw(row, overallDateKeyName));
    const weight = parseHealthNumber(getRaw(row, "Weight (lbs)") ?? getCell(row, "Weight (lbs)"));
    return rowKey && weight !== null && weight > 0;
  });

  const latestOverall = [...eligibleOverallRows]
    .reverse()
    .find((row) => getCell(row, overallDateKeyName) && (getCell(row, "Steps") || getCell(row, "Weight (lbs)")));
  const latestWeightRow = [...weightEligibleRows]
    .reverse()
    .find((row) => {
      const weight = parseHealthNumber(getRaw(row, "Weight (lbs)") ?? getCell(row, "Weight (lbs)"));
      return weight !== null && weight > 0;
    });
  const latestStepsRow = [...eligibleOverallRows]
    .reverse()
    .find((row) => {
      const steps = parseHealthNumber(getRaw(row, "Steps") ?? getCell(row, "Steps"));
      return steps !== null && steps > 0;
    });
  const latestWorkoutRow = [...workouts]
    .reverse()
    .find((row) => {
      const date = getRaw(row, "Date");
      const split = String(getCell(row, "Split") || "").trim().toLowerCase();
      return date && split && split !== "rest";
    });
  const latestWorkoutDate = latestWorkoutRow?.["Date"]?.raw;
  const summaryStats = dashboard
    .filter((row) => getCell(row, "A") && getCell(row, "B"))
    .slice(0, 8)
    .map((row) => ({
      label: getCell(row, "A"),
      value: getCell(row, "B")
    }));
  const findSummaryValue = (label) =>
    summaryStats.find((item) => item.label === label)?.value || "-";
  const recordStats = dashboard
    .filter((row) => getCell(row, "G") && getCell(row, "H"))
    .map((row) => [
      getCell(row, "G"),
      getCell(row, "H"),
      getCell(row, "Start Date") || "-",
      getCell(row, "End Date") || getCell(row, "Start Date") || "-"
    ]);
  const excludedWorkoutExercises = new Set([
    "chest w/ gang",
    "deep squat",
    "inverted rows",
    "squat stretch",
    "squats",
    "single leg calf raises",
    "weighted calf raises",
    "weighted squat"
  ]);
  const workoutStreakRecord = recordStats.find((row) => row[0] === "Record Workout Streak");
  const stepRecords = recordStats.filter((row) => row[0] !== "Record Workout Streak");
  const workoutRecords = Array.from(
    workouts.reduce((accumulator, row) => {
      const exercise = String(getCell(row, "Exercise") || "").trim();
      if (!exercise || excludedWorkoutExercises.has(exercise.trim().toLowerCase())) {
        return accumulator;
      }

      const weightInfo = parseWorkoutWeight(row["Weight (lbs)"]);
      const weightRaw = getRaw(row, "Weight (lbs)");
      const repsRaw = getRaw(row, "Reps/Secs");
      const existing = accumulator.get(exercise) ?? {
        maxWeightRank: Number.NEGATIVE_INFINITY,
        maxWeightFormatted: "-",
        maxWeightReps: "-",
        maxWeightDate: "-",
        maxWeightSplit: "",
        bestBodyweightReps: null,
        bestBodyweightDate: "-"
      };

      const displayedReps = getCell(row, "Reps/Secs") || "-";
      const numericReps = parseComparableNumber(repsRaw ?? displayedReps);
      const comparableExistingReps = parseComparableNumber(existing.maxWeightReps);

      if (
        weightInfo &&
        (
          weightInfo.rank > existing.maxWeightRank ||
          (weightInfo.rank === existing.maxWeightRank && numericReps > comparableExistingReps)
        )
      ) {
        existing.maxWeightRank = weightInfo.rank;
        existing.maxWeightFormatted = weightInfo.display;
        existing.maxWeightReps = displayedReps;
        existing.maxWeightDate = formatDateValue(getRaw(row, "Date")) || getCell(row, "Date") || "-";
        existing.maxWeightSplit = String(getCell(row, "Split") || "").trim();
      }

      if (!weightInfo || weightInfo.kind === "bodyweight" || weightInfo.kind === "bodyweight-band") {
        const comparableBodyweightReps = parseComparableNumber(repsRaw ?? displayedReps);
        if (
          comparableBodyweightReps > Number.NEGATIVE_INFINITY &&
          (existing.bestBodyweightReps === null || comparableBodyweightReps > existing.bestBodyweightReps)
        ) {
          existing.bestBodyweightReps = comparableBodyweightReps;
          existing.bestBodyweightDate = formatDateValue(getRaw(row, "Date")) || getCell(row, "Date") || "-";
        }
      }

      accumulator.set(exercise, existing);
      return accumulator;
    }, new Map())
  )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([exercise, record]) => {
      const repsDisplay = exercise === "Push Ups" && /^survive$/i.test(record.maxWeightSplit)
        ? `${record.maxWeightReps}*`
        : record.maxWeightReps;
      if (record.maxWeightRank > Number.NEGATIVE_INFINITY) {
        return [exercise, record.maxWeightFormatted, repsDisplay, record.maxWeightDate];
      }

      return [
        exercise,
        "BW",
        record.bestBodyweightReps === null ? "-" : String(record.bestBodyweightReps),
        record.bestBodyweightDate
      ];
    });
  const pushUpDailyTotals = Array.from(
    workouts.reduce((accumulator, row) => {
      const exercise = String(getCell(row, "Exercise") || "").trim().toLowerCase();
      if (exercise !== "push ups") {
        return accumulator;
      }

      const reps = parseComparableNumber(getRaw(row, "Reps/Secs") ?? getCell(row, "Reps/Secs"));
      const rawDate = getRaw(row, "Date");
      const key = dateKey(rawDate);
      if (!key || reps <= Number.NEGATIVE_INFINITY) {
        return accumulator;
      }

      const current = accumulator.get(key) ?? {
        total: 0,
        label: formatDateValue(rawDate) || getCell(row, "Date") || key
      };
      current.total += reps;
      accumulator.set(key, current);
      return accumulator;
    }, new Map())
  ).sort((left, right) => right[1].total - left[1].total);
  const pushUpDailyRecord = pushUpDailyTotals[0]?.[1] ?? null;
  const workoutRecordNotes = [];
  if (pushUpDailyRecord) {
    workoutRecordNotes.push(`*Push up reps include total for one day, not one set.`);
  }
  const datedOverall = weightEligibleRows
    .filter((row) => getCell(row, overallDateKeyName) && getCell(row, "Weight (lbs)"))
    .map((row) => ({
      row,
      date: new Date(getRaw(row, overallDateKeyName))
    }));
  const weightSeries = datedOverall
    .slice(-40)
    .map((row) => ({
      label: formatDateValue(getRaw(row.row, overallDateKeyName)) || getCell(row.row, overallDateKeyName),
      value: parseHealthNumber(getRaw(row.row, "Weight (lbs)") ?? getCell(row.row, "Weight (lbs)")) ?? 0
    }));
  const last30Rows = eligibleOverallRows.slice(-30);
  const recentLoggedStepRows = eligibleOverallRows
    .filter((row) => {
      const steps = parseHealthNumber(getRaw(row, "Steps") ?? getCell(row, "Steps"));
      const rowKey = dateKey(getRaw(row, overallDateKeyName));
      return steps !== null && steps > 0 && rowKey <= yesterdayKey;
    })
    .slice(-7);
  const stepsCompletedCount = last30Rows.filter((row) => Boolean(getRaw(row, "Steps (2)"))).length;
  const stepsMissedCount = Math.max(last30Rows.length - stepsCompletedCount, 0);
  const workoutsCompletedCount = last30Rows.filter((row) => Boolean(getRaw(row, "Workout"))).length;
  const workoutsMissedCount = Math.max(last30Rows.length - workoutsCompletedCount, 0);
  const overallRowsByDate = new Map(
    eligibleOverallRows
      .map((row) => [dateKey(getRaw(row, overallDateKeyName)), row])
      .filter(([key]) => key)
  );
  const sevenDaySteps = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(yesterday, index - 6);
    const key = dateKey(date);
    const row = overallRowsByDate.get(key);
    return {
      label: formatDateValue(date),
      value: parseHealthNumber(getRaw(row, "Steps") ?? getCell(row, "Steps")) ?? 0
    };
  });
  const last7WeightRows = weightEligibleRows.slice(-7);
  const averageWeightLast7Days = last7WeightRows.length
    ? (last7WeightRows.reduce((sum, row) => sum + (parseHealthNumber(getRaw(row, "Weight (lbs)") ?? getCell(row, "Weight (lbs)")) ?? 0), 0) / last7WeightRows.length).toFixed(1)
    : "-";
  const averageLast7Days = recentLoggedStepRows.length
    ? Math.round(recentLoggedStepRows.reduce((sum, row) => {
      return sum + (parseHealthNumber(getRaw(row, "Steps") ?? getCell(row, "Steps")) ?? 0);
    }, 0) / recentLoggedStepRows.length).toLocaleString()
    : "-";
  const yesterdayStepsValue = (() => {
    const exactYesterdayRow = eligibleOverallRows.find((row) => dateKey(getRaw(row, overallDateKeyName)) === yesterdayKey);
    const exactYesterdaySteps = exactYesterdayRow
      ? parseHealthNumber(getRaw(exactYesterdayRow, "Steps") ?? getCell(exactYesterdayRow, "Steps"))
      : null;
    if (exactYesterdaySteps !== null && exactYesterdaySteps > 0) {
      return Number(exactYesterdaySteps).toLocaleString();
    }

    const fallbackSteps = parseHealthNumber(getRaw(latestStepsRow, "Steps") ?? getCell(latestStepsRow, "Steps"));
    return fallbackSteps !== null && fallbackSteps > 0
      ? Number(fallbackSteps).toLocaleString()
      : "-";
  })();
  const currentWeightValue = (() => {
    const weight = parseHealthNumber(getRaw(latestWeightRow, "Weight (lbs)") ?? getCell(latestWeightRow, "Weight (lbs)"));
    return weight !== null && weight > 0
      ? Number(weight).toFixed(1)
      : "-";
  })();
  const monthlyStepAverages = Object.values(
    overall
      .filter((row) => getCell(row, overallDateKeyName) && getCell(row, "Steps"))
      .reduce((accumulator, row) => {
        const date = new Date(getRaw(row, overallDateKeyName));
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!accumulator[key]) {
          accumulator[key] = {
            label: date.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
            total: 0,
            count: 0
          };
        }

        accumulator[key].total += parseHealthNumber(getRaw(row, "Steps") ?? getCell(row, "Steps")) ?? 0;
        accumulator[key].count += 1;
        return accumulator;
      }, {})
  ).map((entry) => ({
    label: entry.label,
    value: entry.count ? Math.round(entry.total / entry.count) : 0
  }));
  const monthlyWeightAverages = Object.values(
    overall
      .filter((row) => getCell(row, overallDateKeyName) && getCell(row, "Weight (lbs)"))
      .reduce((accumulator, row) => {
        const date = new Date(getRaw(row, overallDateKeyName));
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!accumulator[key]) {
          accumulator[key] = {
            label: date.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
            total: 0,
            count: 0
          };
        }

        accumulator[key].total += parseHealthNumber(getRaw(row, "Weight (lbs)") ?? getCell(row, "Weight (lbs)")) ?? 0;
        accumulator[key].count += 1;
        return accumulator;
      }, {})
  ).map((entry) => ({
    label: entry.label,
    value: entry.count ? Number((entry.total / entry.count).toFixed(1)) : 0
  }));

  sectionGrid.appendChild(
    createGlanceCard(
      "Daily shape",
      latestOverall ? "Latest health log" : "Latest health snapshot.",
      [
        { label: "Current weight", value: currentWeightValue },
        {
          label: "Average weight (Last 7 Days)",
          value: averageWeightLast7Days
        },
        {
          label: "Yesterday's steps",
          value: yesterdayStepsValue
        },
        {
          label: "Average Steps (Last 7 Days)",
          value: averageLast7Days
        },
        { label: "Step streak", value: getCell(latestOverall, "Steps Streak") || "-" },
        { label: "Workout streak", value: getCell(latestOverall, "Workout Streak") || "-" }
      ]
    )
  );

  sectionGrid.appendChild(
    createChartCard("Weight over time", "Recent logged weight from the overall tab.", {
      type: "line",
      data: {
        labels: weightSeries.map((item) => item.label),
        datasets: [
          {
            label: "Weight",
            data: weightSeries.map((item) => item.value),
            borderColor: "#7dd3a7",
            backgroundColor: "rgba(125, 211, 167, 0.14)",
            fill: true,
            tension: 0.35
          }
        ]
      },
      options: createWeightChartOptions(weightSeries.map((item) => item.value), "Weight (lbs)")
    }, "chart-match")
  );

  sectionGrid.appendChild(
    createChartCard("Steps completed (past 30 days)", "Goal hit vs missed over the last 30 logged days.", {
      type: "pie",
      data: {
        labels: ["Missed", "Completed"],
        datasets: [
          {
            data: [stepsMissedCount, stepsCompletedCount],
            backgroundColor: ["#ef4444", "#4ade80"]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#a5b5c6" } } }
      }
    }, "chart-half")
  );

  sectionGrid.appendChild(
    createChartCard("Workouts completed (past 30 days)", "Workout log completion over the last 30 days.", {
      type: "pie",
      data: {
        labels: ["Missed", "Completed"],
        datasets: [
          {
            data: [workoutsMissedCount, workoutsCompletedCount],
            backgroundColor: ["#ef4444", "#4ade80"]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#a5b5c6" } } }
      }
    }, "chart-half")
  );

  sectionGrid.appendChild(
    createChartCard("Steps over the past 7 days", "Recent daily step counts.", {
      type: "bar",
      plugins: [createHorizontalGoalLinePlugin(10000)],
      data: {
        labels: sevenDaySteps.map((item) => item.label),
        datasets: [
          {
            label: "Steps",
            data: sevenDaySteps.map((item) => item.value),
            backgroundColor: "#4f8cf0"
          }
        ]
      },
      options: createStepChartOptions(Math.max(...sevenDaySteps.map((item) => item.value), 0), "Steps", false)
    }, "chart-half")
  );

  sectionGrid.appendChild(
    createChartCard("Avg daily steps over time", "Average daily steps grouped by month.", {
      type: "line",
      plugins: [createHorizontalGoalLinePlugin(10000)],
      data: {
        labels: monthlyStepAverages.map((item) => item.label),
        datasets: [
          {
            label: "Average daily steps",
            data: monthlyStepAverages.map((item) => item.value),
            borderColor: "#6ea8ff",
            backgroundColor: "rgba(110, 168, 255, 0.14)",
            fill: false,
            tension: 0.28
          }
        ]
      },
      options: createStepChartOptions(
        Math.max(...monthlyStepAverages.map((item) => item.value), 0),
        "Avg daily steps",
        false
      )
    }, "chart-half")
  );

  sectionGrid.appendChild(
    createChartCard("Avg weight over time", "Average logged weight grouped by month across all available data.", {
      type: "line",
      data: {
        labels: monthlyWeightAverages.map((item) => item.label),
        datasets: [
          {
            label: "Average weight",
            data: monthlyWeightAverages.map((item) => item.value),
            borderColor: "#7dd3a7",
            backgroundColor: "rgba(125, 211, 167, 0.14)",
            fill: false,
            tension: 0.28
          }
        ]
      },
      options: createWeightChartOptions(monthlyWeightAverages.map((item) => item.value), "Avg weight (lbs)", false)
    }, "chart-wide")
  );

  sectionGrid.appendChild(
    createTableCard(
      "Steps records",
      "Record streaks and best step totals from the dashboard sheet.",
      ["Record", "Value", "Start", "End"],
      stepRecords
    )
  );

    sectionGrid.appendChild(
      createWorkoutRecordsCard(
        "Workout records",
        "Max recorded weight and max reps for every exercise in the workout sheet.",
        workoutStreakRecord,
        ["Exercise", "Max Weight", "Reps", "Date"],
        workoutRecords,
        workoutRecordNotes
      )
    );

  sectionGrid.appendChild(
    createTableCard(
      "Recent workout",
      "Everything logged on the most recent workout date.",
      ["Date", "Split", "Exercise", "Weight", "Reps/Secs"],
      workouts
        .filter((row) => getRaw(row, "Date") === latestWorkoutDate)
        .map((row) => [
        formatDateValue(getRaw(row, "Date")) || getCell(row, "Date"),
        getCell(row, "Split"),
        getCell(row, "Exercise"),
        getCell(row, "Weight (lbs)"),
        getCell(row, "Reps/Secs")
        ])
    )
  );
}

function renderRankings(sectionGrid) {
  const workbook = getWorkbook("rankings");
  const mediaTabNames = [
    "Movies",
    "TV Shows",
    "Animes",
    "Cartoons",
    "Books",
    "Mangas",
    "Manwhas",
    "Light Novels",
    "Comics"
  ];
  const mediaTabs = mediaTabNames.map((name) => ({
    name,
    rows: workbook.tabs[name].rows.filter((row) => getCell(row, "Name"))
  }));
  const allMediaRows = mediaTabs.flatMap((tab) => tab.rows.map((row) => ({ ...row, __tabName: tab.name })));
  const totalData = workbook.tabs["Total Data"].rows;
  const currentYear = new Date().getFullYear();
  const mediaTypeMetrics = totalData
    .filter((row) => getCell(row, "All Categories Media Type"))
    .map((row) => ({
      label: getCell(row, "All Categories Media Type"),
      score: getNumberCell(row, "Weighted Score (2)"),
      frequency: getNumberCell(row, "Title Count"),
      reconsumed: getNumberCell(row, "Reconsumed (2)"),
      lifeChanging: getNumberCell(row, "Life-Changing (2)")
    }));
  const genreMetrics = totalData
    .filter((row) => getCell(row, "All Media Types Category"))
    .map((row) => ({
      label: getCell(row, "All Media Types Category"),
      score: getNumberCell(row, "Weighted Score"),
      frequency: getNumberCell(row, "Genre Count"),
      reconsumed: getNumberCell(row, "Reconsumed"),
      lifeChanging: getNumberCell(row, "Life-Changing")
    }));
  const currentYearCounts = mediaTabs.map((tab) => ({
    label: tab.name,
    value: tab.rows.filter((row) => {
      const date = getRankingMediaDate(row, tab.name);
      return date?.getFullYear() === currentYear;
    }).length
  }));
  const ratingOrder = ["Fantastic", "Great", "Good", "Mid", "Bad", "Trash"];
  const ratingCounts = ratingOrder.map((rating) => ({
    label: rating,
    value: allMediaRows.filter((row) => getCell(row, "Rating") === rating).length
  }));
  const displayedRatingCounts = [...ratingCounts].reverse();
  const mediaStatusCounts = [
    {
      label: "Abandoned",
      value: allMediaRows.filter((row) => getCell(row, "Rating") === "Abandoned").length
    },
    {
      label: "Consuming",
      value: allMediaRows.filter((row) => getCell(row, "Rating") === "Consuming").length
    },
    {
      label: "Want to Consume",
      value: allMediaRows.filter((row) => getCell(row, "Rating") === "Want to Consume").length
    },
    {
      label: "Ranked",
      value: ratingCounts.reduce((sum, item) => sum + item.value, 0)
    }
  ];
  const totalRankedMedia = ratingCounts.reduce((sum, item) => sum + item.value, 0);
  const totalCurrentYear = currentYearCounts.reduce((sum, item) => sum + item.value, 0);
  const totalLifeChanging = mediaTypeMetrics.reduce((sum, item) => sum + item.lifeChanging, 0);
  const bestScoredGenre = [...genreMetrics].sort((left, right) => right.score - left.score)[0];
  const mostConsumedGenre = [...genreMetrics].sort((left, right) => right.frequency - left.frequency)[0];
  const mostReconsumedGenre = [...genreMetrics].sort((left, right) => right.reconsumed - left.reconsumed)[0];
  const mostLifeChangingGenre = [...genreMetrics].sort((left, right) => right.lifeChanging - left.lifeChanging)[0];
  const backlogCounts = mediaTabs.map((tab) => ({
    label: tab.name,
    value: tab.rows.filter((row) => getCell(row, "Rating") === "Want to Consume").length
  }));
  const biggestBacklog = [...backlogCounts].sort((left, right) => right.value - left.value)[0];
  const backlogTotal = backlogCounts.reduce((sum, item) => sum + item.value, 0);
  const formatPercent = (value, total) => total ? `${Math.round((value / total) * 100)}%` : "0%";
  const greatOrBetterCount = ratingCounts
    .filter((item) => item.label === "Fantastic" || item.label === "Great")
    .reduce((sum, item) => sum + item.value, 0);
  const midOrBelowCount = ratingCounts
    .filter((item) => item.label === "Mid" || item.label === "Bad" || item.label === "Trash")
    .reduce((sum, item) => sum + item.value, 0);
  const mostCommonRating = [...ratingCounts].sort((left, right) => right.value - left.value)[0];
  const chartBlue = "#4f8cf0";

  sectionGrid.appendChild(
    createGlanceCard("Taste profile", "A live snapshot of your media universe.", [
      { label: "Ranked media", value: totalRankedMedia.toLocaleString() },
      { label: `Consumed in ${currentYear}`, value: totalCurrentYear.toLocaleString() },
      { label: "Media types", value: mediaTypeMetrics.length },
      { label: "Genres tracked", value: genreMetrics.length },
      { label: "Life-changing", value: totalLifeChanging.toLocaleString() },
      { label: "Reconsumptions", value: mediaTypeMetrics.reduce((sum, item) => sum + item.reconsumed, 0).toLocaleString() }
    ])
  );

  const currentYearCard = createGlanceCard(
    `Consumed in ${currentYear}`,
    "Media started or finished this year so far.",
    currentYearCounts
  );
  currentYearCard.classList.add("glance-wide");
  sectionGrid.appendChild(currentYearCard);

  sectionGrid.appendChild(
    createChartCard("Media Rating Levels", "How many titles sit at each actual rating label.", {
      type: "bar",
      data: {
        labels: displayedRatingCounts.map((item) => item.label),
        datasets: [
          {
            label: "Titles",
            data: displayedRatingCounts.map((item) => item.value),
            backgroundColor: ["#ef4444", "#fb7185", "#facc15", "#60a5fa", "#86efac", "#22c55e"]
          }
        ]
      },
      options: createRankingCountOptions("# of titles", displayedRatingCounts.map((item) => item.value), false)
    }, "chart-half")
  );

  sectionGrid.appendChild(
    createChartCard("Media Status", "Ranked titles, backlog, current reads/watches, and abandoned media.", {
      type: "bar",
      data: {
        labels: mediaStatusCounts.map((item) => item.label),
        datasets: [
          {
            label: "Titles",
            data: mediaStatusCounts.map((item) => item.value),
            backgroundColor: ["#fb7185", "#a78bfa", "#facc15", "#60a5fa"]
          }
        ]
      },
      options: createRankingCountOptions("# of titles", mediaStatusCounts.map((item) => item.value), false)
    }, "chart-half")
  );

  sectionGrid.appendChild(
    createGlanceCard("Genre standouts", "Where your taste is strongest and most concentrated.", [
      { label: "Highest score", value: `${bestScoredGenre.label} (${bestScoredGenre.score.toFixed(1)})` },
      { label: "Most consumed", value: `${mostConsumedGenre.label} (${mostConsumedGenre.frequency.toLocaleString()})` },
      { label: "Most reconsumed", value: `${mostReconsumedGenre.label} (${mostReconsumedGenre.reconsumed.toLocaleString()})` },
      { label: "Most life-changing", value: `${mostLifeChangingGenre.label} (${mostLifeChangingGenre.lifeChanging.toLocaleString()})` }
    ])
  );

  sectionGrid.appendChild(
    createGlanceCard("Backlog pressure", "A quick read on what is waiting next.", [
      { label: "Backlog", value: backlogTotal.toLocaleString() },
      { label: "Biggest backlog", value: `${biggestBacklog.label} (${biggestBacklog.value.toLocaleString()})` },
      { label: "Backlog vs ranked", value: formatPercent(backlogTotal, backlogTotal + totalRankedMedia) },
      { label: "Currently consuming", value: mediaStatusCounts.find((item) => item.label === "Consuming").value.toLocaleString() }
    ])
  );

  sectionGrid.appendChild(
    createGlanceCard("Rating personality", "How generous or selective the rankings are.", [
      { label: "Great or better", value: formatPercent(greatOrBetterCount, totalRankedMedia) },
      { label: "Good", value: formatPercent(ratingCounts.find((item) => item.label === "Good").value, totalRankedMedia) },
      { label: "Mid or below", value: formatPercent(midOrBelowCount, totalRankedMedia) },
      { label: "Most common", value: `${mostCommonRating.label} (${mostCommonRating.value.toLocaleString()})` }
    ])
  );

  sectionGrid.appendChild(
    createChartCard("Media Ranking", "Weighted score by media type.", {
      type: "bar",
      data: {
        labels: mediaTypeMetrics.map((item) => item.label),
        datasets: [
          {
            label: "Weighted score",
            data: mediaTypeMetrics.map((item) => item.score),
            backgroundColor: chartBlue
          }
        ]
      },
      options: createRankingScoreOptions("Weighted score", false)
    }, "chart-half")
  );

  sectionGrid.appendChild(
    createChartCard("Media Frequency", "Number of ranked appearances by media type.", {
      type: "bar",
      data: {
        labels: mediaTypeMetrics.map((item) => item.label),
        datasets: [
          {
            label: "Appearances",
            data: mediaTypeMetrics.map((item) => item.frequency),
            backgroundColor: chartBlue
          }
        ]
      },
      options: createRankingCountOptions("# of appearances", mediaTypeMetrics.map((item) => item.frequency), false)
    }, "chart-half")
  );

  sectionGrid.appendChild(
    createChartCard("Life Changing Media in each Media Type", "Life-changing picks by media type.", {
      type: "bar",
      data: {
        labels: mediaTypeMetrics.map((item) => item.label),
        datasets: [
          {
            label: "Life changing",
            data: mediaTypeMetrics.map((item) => item.lifeChanging),
            backgroundColor: chartBlue
          }
        ]
      },
      options: createRankingCountOptions("# of life-changing media", mediaTypeMetrics.map((item) => item.lifeChanging), false)
    }, "chart-half")
  );

  sectionGrid.appendChild(
    createChartCard("Reconsumed Media in each Media Type", "Rewatches and rereads by media type.", {
      type: "bar",
      data: {
        labels: mediaTypeMetrics.map((item) => item.label),
        datasets: [
          {
            label: "Reconsumptions",
            data: mediaTypeMetrics.map((item) => item.reconsumed),
            backgroundColor: chartBlue
          }
        ]
      },
      options: createRankingCountOptions("# of reconsumptions", mediaTypeMetrics.map((item) => item.reconsumed), false)
    }, "chart-half")
  );

  sectionGrid.appendChild(
    createChartCard("Genre Ranking (Overall)", "Weighted score by genre across media types.", {
      type: "bar",
      data: {
        labels: genreMetrics.map((item) => item.label),
        datasets: [
          {
            label: "Weighted score",
            data: genreMetrics.map((item) => item.score),
            backgroundColor: chartBlue
          }
        ]
      },
      options: createRankingScoreOptions("Weighted score", false)
    }, "chart-wide")
  );

  sectionGrid.appendChild(
    createChartCard("Genre Frequency (Overall)", "Number of appearances by genre.", {
      type: "bar",
      data: {
        labels: genreMetrics.map((item) => item.label),
        datasets: [
          {
            label: "Appearances",
            data: genreMetrics.map((item) => item.frequency),
            backgroundColor: chartBlue
          }
        ]
      },
      options: createRankingCountOptions("# of appearances in media", genreMetrics.map((item) => item.frequency), false)
    }, "chart-wide")
  );

  sectionGrid.appendChild(
    createChartCard("Life Changing Media per Genre (Overall)", "Life-changing picks grouped by genre.", {
      type: "bar",
      data: {
        labels: genreMetrics.map((item) => item.label),
        datasets: [
          {
            label: "Life changing",
            data: genreMetrics.map((item) => item.lifeChanging),
            backgroundColor: chartBlue
          }
        ]
      },
      options: createRankingCountOptions("# of life-changing media", genreMetrics.map((item) => item.lifeChanging), false)
    }, "chart-wide")
  );

  sectionGrid.appendChild(
    createChartCard("Reconsumed Media per Genre (Overall)", "Rewatches and rereads grouped by genre.", {
      type: "bar",
      data: {
        labels: genreMetrics.map((item) => item.label),
        datasets: [
          {
            label: "Reconsumptions",
            data: genreMetrics.map((item) => item.reconsumed),
            backgroundColor: chartBlue
          }
        ]
      },
      options: createRankingCountOptions("# of reconsumptions", genreMetrics.map((item) => item.reconsumed), false)
    }, "chart-wide")
  );
}

function renderBowling(sectionGrid) {
  const workbook = getWorkbook("bowling");
  const visualized = workbook.tabs["Visualized"].rows[0];
  const processed = workbook.tabs["Processed Data"].rows;
  const latestMatch = processed.filter((row) => getCell(row, "Date")).at(-1);
  const recentScores = processed.slice(-8);

  sectionGrid.appendChild(
    createGlanceCard("Head-to-head", "Totals from the visualized and processed tabs.", [
      { label: "Kamyia wins", value: getCell(visualized, "Score Kamyia") || "-" },
      { label: "Abdul wins", value: getCell(visualized, "Abdul") || "-" },
      { label: "Last winner", value: getCell(latestMatch, "Daily Winner") || "-" },
      { label: "Best latest score", value: getCell(latestMatch, "Highest Score") || "-" }
    ])
  );

  sectionGrid.appendChild(
    createChartCard("Average score by outing", "Daily averages from the processed bowling sheet.", {
      type: "line",
      data: {
        labels: recentScores.map((row) => formatDateValue(getRaw(row, "Date")) || getCell(row, "Date")),
        datasets: [
          {
            label: "Kamyia avg",
            data: recentScores.map((row) => Number(getRaw(row, "Kamyia Avg Points") ?? 0)),
            borderColor: "#9ed7ff",
            fill: false,
            tension: 0.35
          },
          {
            label: "Abdul avg",
            data: recentScores.map((row) => Number(getRaw(row, "Abdul Avg Points") ?? 0)),
            borderColor: "#ff6b6b",
            fill: false,
            tension: 0.35
          }
        ]
      },
      options: commonChartOptions("Average points")
    })
  );

  sectionGrid.appendChild(
    createTableCard(
      "Recent outings",
      "Processed results for the latest bowling dates.",
      ["Date", "Kamyia Wins", "Abdul Wins", "Daily Winner", "Highest Score", "Score Holder"],
      trimRows(processed.slice(-8).reverse(), 8).map((row) => [
        formatDateValue(getRaw(row, "Date")) || getCell(row, "Date"),
        getCell(row, "Kamyia Wins"),
        getCell(row, "Abdul Wins"),
        getCell(row, "Daily Winner"),
        getCell(row, "Highest Score"),
        getCell(row, "Highest Score Holder")
      ])
    )
  );
}

function buildGolfDashboardMap(rows) {
  const map = new Map();
  rows.forEach((row) => {
    [["B", "C"], ["E", "F"], ["H", "I"]].forEach(([labelKey, valueKey]) => {
      const label = String(getCell(row, labelKey) || "").trim();
      const value = getCell(row, valueKey);
      if (label && value !== "" && value !== null) {
        map.set(label, value);
      }
    });
  });
  return map;
}

function renderGolf(sectionGrid) {
  const workbook = getWorkbook("golf");
  const dashboardRows = workbook.tabs["Dashboard"]?.rows || [];
  const calcRows = (workbook.tabs["Calc"]?.rows || []).filter((row) => getCell(row, "HasData") === "1" || getRaw(row, "HasData") === 1);
  const rounds = [...calcRows].sort((left, right) => {
    const leftDate = parseSheetDate(getRaw(left, "Date") ?? getCell(left, "Date"))?.getTime() ?? 0;
    const rightDate = parseSheetDate(getRaw(right, "Date") ?? getCell(right, "Date"))?.getTime() ?? 0;
    const leftSeq = Number(getRaw(left, "SeqNum") ?? getCell(left, "SeqNum") ?? 0);
    const rightSeq = Number(getRaw(right, "SeqNum") ?? getCell(right, "SeqNum") ?? 0);
    return leftDate - rightDate || leftSeq - rightSeq;
  });
  const latestRound = rounds.at(-1);
  const latestRounds = rounds.slice(-3).reverse();
  const dashboardMap = buildGolfDashboardMap(dashboardRows);
  const averageHandicap =
    getCell(dashboardRows[5], "C") ||
    getCell(dashboardRows[0], "L") ||
    dashboardMap.get("Average Handicap") ||
    dashboardMap.get("Handicap Index") ||
    "-";
  const shotsTaken = rounds.reduce((sum, row) => {
    return sum + (parseHealthNumber(getRaw(row, "Gross") ?? getCell(row, "Gross")) ?? 0);
  }, 0);
  const bestRoundScore = rounds.reduce((best, row) => {
    const gross = parseHealthNumber(getRaw(row, "Gross") ?? getCell(row, "Gross"));
    if (gross === null) {
      return best;
    }
    return best === null ? gross : Math.min(best, gross);
  }, null);
  const holeAverageData = Array.from({ length: 18 }, (_, index) => {
    const label = `Hole ${index + 1} Avg +/-`;
    return {
      label: String(index + 1),
      value: parseHealthNumber(dashboardMap.get(label)) ?? 0
    };
  }).filter((item) => item.value !== 0);
  const scoringDistribution = [
    "Eagles or Better",
    "Birdies",
    "Pars",
    "Bogeys",
    "Double Bogeys",
    "Triple Bogey+"
  ].map((label) => ({
    label,
    value: parseHealthNumber(dashboardMap.get(label)) ?? 0
  }));
  const grossSeries = rounds.map((row) => ({
    label: formatDateValue(getRaw(row, "Date")) || getCell(row, "Date") || `Round ${getCell(row, "Rnd")}`,
    value: parseHealthNumber(getRaw(row, "Gross") ?? getCell(row, "Gross")) ?? 0
  }));
  const parSeries = rounds.map((row) => ({
    label: formatDateValue(getRaw(row, "Date")) || getCell(row, "Date") || `Round ${getCell(row, "Rnd")}`,
    value: parseHealthNumber(getRaw(row, "Par") ?? getCell(row, "Par")) ?? 0
  }));
  const differentialSeries = rounds.map((row) => ({
    label: formatDateValue(getRaw(row, "Date")) || getCell(row, "Date") || `Round ${getCell(row, "Rnd")}`,
    value: parseHealthNumber(getRaw(row, "Differential") ?? getCell(row, "Differential")) ?? 0
  }));
  const plusMinusSeries = rounds.map((row) => ({
    label: formatDateValue(getRaw(row, "Date")) || getCell(row, "Date") || `Round ${getCell(row, "Rnd")}`,
    value: parseHealthNumber(getRaw(row, "PlusMinus") ?? getCell(row, "PlusMinus")) ?? 0
  }));
  const frontBackValues = [
    parseHealthNumber(dashboardMap.get("Avg Front 9 +/-")) ?? 0,
    parseHealthNumber(dashboardMap.get("Avg Back 9 +/-")) ?? 0,
    parseHealthNumber(dashboardMap.get("Best Front 9 +/-")) ?? 0,
    parseHealthNumber(dashboardMap.get("Best Back 9 +/-")) ?? 0
  ];

  sectionGrid.appendChild(
      createGlanceCard("Golf snapshot", "Your latest golf numbers from the workbook.", [
        { label: "Average handicap", value: averageHandicap },
        { label: "Rounds played", value: dashboardMap.get("Rounds Played") || "0" },
        { label: "Total holes played", value: dashboardMap.get("Total Holes Played") || "0" },
        { label: "Shots taken", value: Number(shotsTaken || 0).toLocaleString() },
        { label: "Pars or better", value: Number((parseHealthNumber(dashboardMap.get("Pars")) ?? 0) + (parseHealthNumber(dashboardMap.get("Birdies")) ?? 0) + (parseHealthNumber(dashboardMap.get("Eagles or Better")) ?? 0)).toLocaleString() },
        { label: "Best handicap", value: dashboardMap.get("Lowest Differential") || "-" }
      ], "glance-half")
    );

    sectionGrid.appendChild(
      createTableCard(
        "Latest rounds",
        latestRounds.length ? "Three most recently logged rounds." : "No rounds logged yet.",
        ["Date", "Course", "Gross", "+/-", "Holes", "Differential"],
        latestRounds.map((round) => [
        formatDateValue(getRaw(round, "Date")) || getCell(round, "Date") || "-",
        getCell(round, "Course") || "-",
        getCell(round, "Gross") || "-",
        getCell(round, "PlusMinus") || "-",
        getCell(round, "Holes") || "-",
        getCell(round, "Differential") || "-"
      ]),
      "table-half"
    )
  );

    sectionGrid.appendChild(
      createChartCard("Plus/minus per round", "Round-by-round score relative to par.", {
        type: "line",
        data: {
          labels: plusMinusSeries.map((item) => item.label),
          datasets: [
            {
              label: "+/-",
              data: plusMinusSeries.map((item) => item.value),
              borderColor: "#f59a9a",
              backgroundColor: "rgba(245, 154, 154, 0.14)",
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: createRankingCountOptions("+/-", plusMinusSeries.map((item) => item.value), false)
      }, "chart-half")
    );

    sectionGrid.appendChild(
      createChartCard("Scoring distribution", "How your holes have broken down so far.", {
        type: "bar",
        data: {
          labels: scoringDistribution.map((item) => item.label),
          datasets: [
            {
              label: "Count",
              data: scoringDistribution.map((item) => item.value),
              backgroundColor: ["#22c55e", "#60a5fa", "#86efac", "#facc15", "#fb923c", "#ef4444"]
            }
          ]
        },
        options: createRankingCountOptions("Holes", scoringDistribution.map((item) => item.value), false)
      }, "chart-half")
    );

    sectionGrid.appendChild(
      createChartCard("Overall round par vs score over time (+/-)", "Round-by-round score compared with par.", {
        type: "line",
        data: {
          labels: grossSeries.map((item) => item.label),
          datasets: [
            {
              label: "Score",
              data: grossSeries.map((item) => item.value),
              borderColor: "#8fd08b",
              backgroundColor: "rgba(143, 208, 139, 0.14)",
              fill: false,
              tension: 0.3
            },
            {
              label: "Par",
              data: parSeries.map((item) => item.value),
              borderColor: "#facc15",
              backgroundColor: "rgba(250, 204, 21, 0.14)",
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: createRankingCountOptions(
          "Score",
          [...grossSeries.map((item) => item.value), ...parSeries.map((item) => item.value)],
          false
        )
      }, "chart-half")
    );

    sectionGrid.appendChild(
      createChartCard("Hole average vs par", "Average performance against par by hole.", {
        type: "bar",
        data: {
          labels: holeAverageData.map((item) => item.label),
          datasets: [
            {
              label: "Avg +/-",
              data: holeAverageData.map((item) => item.value),
              backgroundColor: "#77c7ff"
            }
          ]
        },
        options: createHorizontalLabelCountOptions("Avg +/-", holeAverageData.map((item) => item.value), false)
      }, "chart-half")
    );

    sectionGrid.appendChild(
      createChartCard("Front 9 vs back 9", "Average and best splits against par.", {
        type: "bar",
        data: {
          labels: ["Avg Front 9", "Avg Back 9", "Best Front 9", "Best Back 9"],
          datasets: [
            {
              label: "+/-",
              data: frontBackValues,
              backgroundColor: "#8fd08b"
            }
          ]
        },
        options: createRankingCountOptions("+/-", frontBackValues, false)
      }, "chart-half")
    );

    sectionGrid.appendChild(
      createChartCard("Differential over time", "Scoring differential by round.", {
        type: "line",
        data: {
          labels: differentialSeries.map((item) => item.label),
          datasets: [
            {
              label: "Differential",
              data: differentialSeries.map((item) => item.value),
              borderColor: "#6ea8ff",
              backgroundColor: "rgba(110, 168, 255, 0.14)",
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: createRankingCountOptions("Differential", differentialSeries.map((item) => item.value), false)
      }, "chart-half")
    );

  sectionGrid.appendChild(
    createTableCard(
      "Recent rounds",
      "Round history pulled from the golf calc sheet.",
      ["Date", "Course", "Gross", "+/-", "Holes", "Differential", "Front 9", "Back 9"],
      rounds
        .slice(-8)
        .reverse()
        .map((row) => [
          formatDateValue(getRaw(row, "Date")) || getCell(row, "Date"),
          getCell(row, "Course"),
          getCell(row, "Gross"),
          getCell(row, "PlusMinus"),
          getCell(row, "Holes"),
          getCell(row, "Differential"),
          getCell(row, "Front9PM"),
          getCell(row, "Back9PM")
        ])
    )
  );
}

function renderCareer(sectionGrid) {
  const workbook = getWorkbook("career");
  const rows = workbook.tabs["Career Progression"].rows.filter((row) => getCell(row, "Year"));
  const timelineItems = buildCareerTimelineItems(rows);
  const academicRows = workbook.tabs["Academic Progression"]?.rows?.filter((row) => getCell(row, "Year")) || [];
  const academicItems = buildAcademicItems(academicRows);
  const noteRows = workbook.tabs["Career / Academic Notes"]?.rows || [];
  const noteYears = [...new Set(rows.map((row) => String(getCell(row, "Year")).trim()).filter(Boolean))]
    .sort((left, right) => Number(left) - Number(right));
  const careerNotes = buildCareerNotes(noteRows, noteYears);
  const allTimelineItems = [...academicItems, ...timelineItems];

      const timelineCard = document.createElement("article");
      timelineCard.className = "table-card career-timeline-card";
    timelineCard.innerHTML = `
      <div class="card-head">
        <div>
          <h3>Career timeline</h3>
          <p>Every listed role positioned by date range across the full timeline.</p>
        </div>
        <span class="pill">Timeline</span>
      </div>
    `;

      const timeline = document.createElement("section");
    timeline.className = "career-timeline";

      const earliestStart = allTimelineItems.reduce((min, item) => item.start < min ? item.start : min, allTimelineItems[0]?.start || new Date());
      const latestEnd = allTimelineItems.reduce((max, item) => item.end > max ? item.end : max, allTimelineItems[0]?.end || new Date());
    const timelineStart = new Date(earliestStart.getFullYear(), earliestStart.getMonth(), 1);
    const timelineEnd = new Date(latestEnd.getFullYear(), latestEnd.getMonth() + 1, 1);
      const totalDuration = Math.max(timelineEnd - timelineStart, 1);
      const leftLaneCount = layoutTimelineItems(
        academicItems,
        (item) => {
          const top = timelineOffsetPercent(item.start, timelineStart, totalDuration);
          const bottom = timelineOffsetPercent(item.end, timelineStart, totalDuration);
          const isCompact = item.type === "certification" && (item.end - item.start) <= 1000 * 60 * 60 * 24 * 2;
          return {
            top,
            height: Math.max(bottom - top, isCompact ? 2.6 : 4),
            compact: isCompact
          };
        },
        (item) => item.type === "academic" ? 0 : 1,
        0.35
      );
      const academicDisplayItems = academicItems.filter((item) => item.type === "academic");
      const certificationDisplayItems = academicItems.filter((item) => item.type === "certification");
      certificationDisplayItems.forEach((certItem) => {
        const conflictingAcademic = academicDisplayItems.find((academicItem) => {
          const certTop = certItem.displayTop;
          const certBottom = certItem.displayTop + certItem.displayHeight;
          const academicTop = academicItem.displayTop;
          const academicBottom = academicItem.displayTop + academicItem.displayHeight;
          const verticallyOverlaps = certTop < academicBottom && academicTop < certBottom;
          const nearbyInTime = Math.abs(certItem.start - academicItem.start) <= 1000 * 60 * 60 * 24 * 120 ||
            Math.abs(certItem.end - academicItem.start) <= 1000 * 60 * 60 * 24 * 120;
          return (verticallyOverlaps || nearbyInTime) && certItem.displayLane <= academicItem.displayLane;
        });

        if (conflictingAcademic) {
          certItem.displayLane = conflictingAcademic.displayLane + 1;
        }

        const nextAcademic = academicDisplayItems.find((academicItem) => academicItem.start >= certItem.start);
        if (nextAcademic) {
          const daysUntilNextAcademic = Math.round((nextAcademic.start - certItem.end) / (1000 * 60 * 60 * 24));
          if (daysUntilNextAcademic >= 0 && daysUntilNextAcademic <= 140) {
            certItem.displayLane = Math.max(certItem.displayLane, nextAcademic.displayLane + 2);
          }
        }
      });

      const targetedAcademic = academicDisplayItems.find((item) =>
        item.title === "Junior Civil Major (Howard University)" &&
        String(item.displayRange).includes("8/21/2023")
      );
      if (targetedAcademic) {
        targetedAcademic.displayLane = 0;
      }

      certificationDisplayItems.forEach((item) => {
        if (
          item.title === "OSHA 30-Hour Construction" ||
          item.title === "DC RE Salesperson License"
        ) {
          item.displayLane = 1;
        }
      });

      const leftDisplayItems = [...academicItems];
      let shifted = true;
      while (shifted) {
        shifted = false;
        leftDisplayItems.forEach((item) => {
          if (item.displayLane <= 0) {
            return;
          }
          const itemTop = item.displayTop;
          const itemBottom = item.displayTop + item.displayHeight;
          const blocksInnerLane = leftDisplayItems.some((other) => {
            if (other === item || other.displayLane !== item.displayLane - 1) {
              return false;
            }
            const otherTop = other.displayTop;
            const otherBottom = other.displayTop + other.displayHeight;
            return itemTop < otherBottom && otherTop < itemBottom;
          });

          if (!blocksInnerLane) {
            item.displayLane -= 1;
            shifted = true;
          }
        });
      }
      const adjustedLeftLaneCount = Math.max(...academicItems.map((item) => item.displayLane), 0) + 1;
      const laneCount = layoutCareerTimelineItems(
        timelineItems,
        (item) => {
          const top = timelineOffsetPercent(item.start, timelineStart, totalDuration);
          const bottom = timelineOffsetPercent(item.end, timelineStart, totalDuration);
          return {
            top,
            height: Math.max(bottom - top, 4)
          };
        },
        0.35
      );
      let shiftedCareer = true;
      while (shiftedCareer) {
        shiftedCareer = false;
        timelineItems.forEach((item) => {
          if (item.displayLane <= 0) {
            return;
          }
          const itemTop = item.displayTop;
          const itemBottom = item.displayTop + item.displayHeight;
          const blocksInnerLane = timelineItems.some((other) => {
            if (other === item || other.displayLane !== item.displayLane - 1) {
              return false;
            }
            const otherTop = other.displayTop;
            const otherBottom = other.displayTop + other.displayHeight;
            return itemTop < otherBottom && otherTop < itemBottom;
          });

          if (!blocksInnerLane) {
            item.displayLane -= 1;
            shiftedCareer = true;
          }
        });
      }
      const adjustedCareerLaneCount = Math.max(...timelineItems.map((item) => item.displayLane), 0) + 1;
      const monthMarkers = [];
    const markerDate = new Date(timelineStart);
    while (markerDate <= timelineEnd) {
      monthMarkers.push(new Date(markerDate));
      markerDate.setMonth(markerDate.getMonth() + 1);
    }
      timeline.style.setProperty("--timeline-height", `${Math.max(monthMarkers.length * 82, 2800)}px`);

      const leftTrack = document.createElement("div");
      leftTrack.className = "career-timeline-track career-timeline-track-left";
      leftTrack.style.setProperty("--lane-count", String(Math.max(leftLaneCount, adjustedLeftLaneCount)));

      monthMarkers.forEach((marker) => {
        const guide = document.createElement("div");
        guide.className = "career-timeline-guide";
        const offset = timelineOffsetPercent(marker, timelineStart, totalDuration);
        guide.style.top = `${offset}%`;
        leftTrack.appendChild(guide);
      });

      academicItems.forEach((item) => {
        const block = document.createElement("article");
        block.className = "career-role career-role-academic";
        if (item.displayCompact) {
          block.classList.add("career-role-compact");
        }
        block.style.top = `${item.displayTop}%`;
        block.style.height = `${item.displayHeight}%`;
        block.style.right = `calc(${item.displayLane} * (100% / var(--lane-count)))`;
        block.style.width = `min(300px, calc((100% / var(--lane-count)) - 6px))`;
        block.innerHTML = `
          <strong>${item.title}</strong>
          <span>${item.category}</span>
          <p class="career-role-date-line">${item.displayRange}</p>
          <p>${item.detail || item.year}</p>
        `;
        leftTrack.appendChild(block);
      });

      const monthsColumn = document.createElement("div");
    monthsColumn.className = "career-timeline-axis";
      monthMarkers.forEach((marker) => {
        const label = document.createElement("div");
        label.className = "career-timeline-axis-label";
        const offset = timelineOffsetPercent(marker, timelineStart, totalDuration);
        label.style.top = `${offset}%`;
        label.textContent = `${marker.getMonth() + 1}/${String(marker.getFullYear()).slice(2)}`;
        monthsColumn.appendChild(label);
      });

      const track = document.createElement("div");
      track.className = "career-timeline-track";
      track.style.setProperty("--lane-count", String(Math.max(laneCount, adjustedCareerLaneCount)));

      monthMarkers.forEach((marker) => {
        const guide = document.createElement("div");
        guide.className = "career-timeline-guide";
        const offset = timelineOffsetPercent(marker, timelineStart, totalDuration);
        guide.style.top = `${offset}%`;
        track.appendChild(guide);
      });

      timelineItems.forEach((item) => {
        const block = document.createElement("article");
        block.className = "career-role";
        block.style.top = `${item.displayTop}%`;
        block.style.height = `${item.displayHeight}%`;
      block.style.left = `calc(${item.displayLane} * (100% / var(--lane-count)))`;
      block.style.width = `min(300px, calc((100% / var(--lane-count)) - 6px))`;
      block.innerHTML = `
        <strong>${item.title}</strong>
        <span>${item.company}</span>
        ${item.displayTime}
      `;
      track.appendChild(block);
    });

      timeline.appendChild(leftTrack);
      timeline.appendChild(monthsColumn);
      timeline.appendChild(track);

    timelineCard.appendChild(timeline);
    sectionGrid.appendChild(timelineCard);

    if (careerNotes.length) {
      const notesCard = document.createElement("article");
      notesCard.className = "table-card";
      notesCard.innerHTML = `
        <div class="card-head">
          <div>
            <h3>Career / Academic Notes</h3>
          </div>
          <span class="pill">Notes</span>
        </div>
      `;

      const notesGrid = document.createElement("section");
      notesGrid.className = "career-notes-grid";

      careerNotes.forEach((entry) => {
        const noteCard = document.createElement("article");
        noteCard.className = "career-note-card";
        noteCard.innerHTML = `
          <h4>${entry.year}</h4>
          <p>${entry.note}</p>
        `;
        notesGrid.appendChild(noteCard);
      });

      notesCard.appendChild(notesGrid);
      sectionGrid.appendChild(notesCard);
    }
  }

const renderers = {
  health: renderHealth,
  career: renderCareer,
  rankings: renderRankings,
  golf: renderGolf,
  bowling: renderBowling,
};

function renderWorkbookPage() {
  const workbook = getWorkbook(workbookSlug);
  if (!workbook) {
    throw new Error(`Workbook "${workbookSlug}" is not available in the latest synced data yet.`);
  }
  const shell = createWorkbookFrame(workbook);
  dashboardRoot.appendChild(shell);
  const sectionGrid = shell.querySelector(".section-grid");
  renderers[workbookSlug]?.(sectionGrid);
}

async function init() {
  const response = await fetch("./data/site-data.json");
  state.siteData = await response.json();

  if (pageType === "home") {
    renderHome();
    return;
  }

  if (pageType === "me-and-her" || pageType === "misc") {
    renderMeAndHerPage();
    return;
  }

  renderWorkbookPage();
}

init().catch((error) => {
  dashboardRoot.innerHTML = `<p class="empty-state">${error.message}</p>`;
});
