const categories = {
  affirmation: {
    label: "Words of Affirmation",
    color: "#5bc46a",
    description: "Encouraging words, praise, and verbal reassurance matter most to you.",
    high: "A high score here suggests that spoken appreciation has a powerful effect on you. When someone notices your effort, names what they value about you, or offers reassuring words during a hard moment, it tends to stay with you and deepen your sense of connection.",
    medium: "This score suggests verbal encouragement matters to you, even if it is not the only thing you look for. Thoughtful compliments, gratitude, and emotionally honest conversations can still go a long way in helping you feel secure and seen.",
    low: "This score suggests kind words may still feel nice, but they are probably not your strongest signal of love. You may appreciate affirmation most when it is backed up by consistent action, presence, or another form of care that feels more tangible."
  },
  time: {
    label: "Quality Time",
    color: "#f4c454",
    description: "Focused attention, meaningful conversation, and shared experiences make you feel connected.",
    high: "A high score here suggests presence matters more than just proximity. You likely feel especially loved when someone slows down, gives you their full attention, and chooses shared time that feels intentional rather than distracted or rushed.",
    medium: "This score suggests meaningful time together is important, though probably alongside another strong love language. Shared experiences, long talks, and undivided attention likely help you feel close, especially when life starts feeling busy or fragmented.",
    low: "This score suggests time together may matter most when it comes with something else, like emotional reassurance, affection, or helpful action. Simply being around someone may not feel especially meaningful unless the interaction also meets another emotional need."
  },
  gifts: {
    label: "Receiving Gifts",
    color: "#e45853",
    description: "Thoughtful tokens and surprises feel meaningful because they show care and intention.",
    high: "A high score here suggests that thoughtful gifts feel deeply personal to you. It is often less about cost and more about the meaning behind the gesture: someone remembered you, paid attention, and chose something that reflects care and intention.",
    medium: "This score suggests gifts can definitely make you feel appreciated, especially when they are thoughtful and personal. You may not need grand surprises, but meaningful tokens can still leave a lasting emotional impression.",
    low: "This score suggests gifts may be pleasant, but they are probably not your primary way of receiving love. You may care much more about what a person says, does, or how they show up with you than about a physical token itself."
  },
  service: {
    label: "Acts of Service",
    color: "#5795d9",
    description: "Practical help, reliability, and follow-through communicate love clearly to you.",
    high: "A high score here suggests action speaks loudly to you. When someone eases your load, follows through, or notices what would help before you ask, it often feels like one of the clearest and most trustworthy expressions of love.",
    medium: "This score suggests practical support matters to you, especially when life feels demanding. Reliable help and follow-through likely stand out as meaningful, even if you also need affection, time, or encouragement to feel fully connected.",
    low: "This score suggests helpful actions may be appreciated, but they probably do not carry the deepest emotional meaning for you on their own. You may see them as nice bonuses rather than your core measure of feeling loved."
  },
  touch: {
    label: "Physical Touch",
    color: "#ef9140",
    description: "Affectionate touch and physical closeness help you feel safe, calm, and cared for.",
    high: "A high score here suggests affectionate touch is a central part of how you experience closeness. Hugs, hand-holding, leaning into each other, or simple everyday contact may help you feel grounded, connected, and emotionally reassured.",
    medium: "This score suggests physical affection matters to you, even if it is not the very top of your list. You may especially value touch when it accompanies emotional connection, quality time, or moments of comfort and reassurance.",
    low: "This score suggests physical affection may still feel warm and welcome, but it is probably not the main way you interpret love. Other signals, like attention, words, gifts, or practical support, are likely more emotionally convincing for you."
  }
};

const questions = [
  {
    prompt: "I feel most cherished when someone...",
    options: [
      { text: "sets aside uninterrupted one-on-one time just for us.", language: "time" },
      { text: "tells me specifically what they admire about me.", language: "affirmation" }
    ]
  },
  {
    prompt: "A gesture means the most to me when someone...",
    options: [
      { text: "surprises me with a thoughtful item that reminded them of me.", language: "gifts" },
      { text: "says something sincere that boosts my confidence.", language: "affirmation" }
    ]
  },
  {
    prompt: "I feel especially cared for when someone...",
    options: [
      { text: "takes something off my plate without being asked.", language: "service" },
      { text: "puts their appreciation for me into words.", language: "affirmation" }
    ]
  },
  {
    prompt: "When we reconnect, I light up most if someone...",
    options: [
      { text: "reaches for my hand or hugs me right away.", language: "touch" },
      { text: "says something reassuring when I need it most.", language: "affirmation" }
    ]
  },
  {
    prompt: "A romantic gesture feels strongest when someone...",
    options: [
      { text: "plans a date where we can really connect.", language: "time" },
      { text: "surprises me with a small gift that shows they were thinking of me.", language: "gifts" }
    ]
  },
  {
    prompt: "Love feels clearest to me when someone...",
    options: [
      { text: "helps with a task so we can relax together later.", language: "service" },
      { text: "gives me their full, undivided attention.", language: "time" }
    ]
  },
  {
    prompt: "I feel closest when we...",
    options: [
      { text: "spend unhurried time talking and being together.", language: "time" },
      { text: "sit close, cuddle, or hold each other near.", language: "touch" }
    ]
  },
  {
    prompt: "I notice love most when someone...",
    options: [
      { text: "notices a need and handles it for me.", language: "service" },
      { text: "gives me a meaningful keepsake.", language: "gifts" }
    ]
  },
  {
    prompt: "A small everyday moment means the most when someone...",
    options: [
      { text: "brings me a little something just because.", language: "gifts" },
      { text: "pulls me into a warm hug.", language: "touch" }
    ]
  },
  {
    prompt: "On a hard day, I feel best supported when someone...",
    options: [
      { text: "does a practical favor that makes my day easier.", language: "service" },
      { text: "shows affection through comforting touch.", language: "touch" }
    ]
  },
  {
    prompt: "During a stressful week, I would rather someone...",
    options: [
      { text: "listens deeply and stays present with me.", language: "time" },
      { text: "reminds me out loud of my strengths.", language: "affirmation" }
    ]
  },
  {
    prompt: "I feel especially seen when someone...",
    options: [
      { text: "writes or says a heartfelt note to me.", language: "affirmation" },
      { text: "picks out something small that fits me perfectly.", language: "gifts" }
    ]
  },
  {
    prompt: "The sweeter gesture is when someone...",
    options: [
      { text: "handles an errand so I can breathe easier.", language: "service" },
      { text: "tells me how much they value what I bring to their life.", language: "affirmation" }
    ]
  },
  {
    prompt: "I feel most comforted when a partner...",
    options: [
      { text: "greets me with physical affection.", language: "touch" },
      { text: "speaks tenderly and makes me feel reassured.", language: "affirmation" }
    ]
  },
  {
    prompt: "On a special day, I would rather receive...",
    options: [
      { text: "a memorable experience together.", language: "time" },
      { text: "a wrapped surprise chosen with care.", language: "gifts" }
    ]
  },
  {
    prompt: "Love feels strongest when someone...",
    options: [
      { text: "makes space for a long, meaningful conversation.", language: "time" },
      { text: "jumps in to help before I have to ask.", language: "service" }
    ]
  },
  {
    prompt: "I feel most connected when we...",
    options: [
      { text: "put our phones away and focus only on each other.", language: "time" },
      { text: "stay physically close while we talk or rest.", language: "touch" }
    ]
  },
  {
    prompt: "I feel appreciated when someone...",
    options: [
      { text: "shows up with something thoughtful that fits my taste.", language: "gifts" },
      { text: "does a helpful chore that eases my load.", language: "service" }
    ]
  },
  {
    prompt: "A gesture lands best for me when it is...",
    options: [
      { text: "a tangible reminder I can keep.", language: "gifts" },
      { text: "a hug, kiss, or affectionate touch in the moment.", language: "touch" }
    ]
  },
  {
    prompt: "After a draining day, I want someone to...",
    options: [
      { text: "take care of something practical for me.", language: "service" },
      { text: "hold me close and help me feel grounded.", language: "touch" }
    ]
  },
  {
    prompt: "I feel most valued when someone...",
    options: [
      { text: "gives me their full evening with no distractions.", language: "time" },
      { text: "says clearly that they are proud of me.", language: "affirmation" }
    ]
  },
  {
    prompt: "If someone wants to make me smile, I would rather they...",
    options: [
      { text: "plan a simple outing for us to enjoy together.", language: "time" },
      { text: "show up with a little treat they picked just for me.", language: "gifts" }
    ]
  },
  {
    prompt: "I notice effort most when a person...",
    options: [
      { text: "follows through on a helpful promise.", language: "service" },
      { text: "gives me something small but meaningful.", language: "gifts" }
    ]
  },
  {
    prompt: "Comfort feels strongest when someone...",
    options: [
      { text: "helps me with a task I have been dreading.", language: "service" },
      { text: "squeezes my shoulder or wraps me in a hug.", language: "touch" }
    ]
  },
  {
    prompt: "I feel safest in love when someone...",
    options: [
      { text: "reaches for me and stays physically close.", language: "touch" },
      { text: "uses warm, encouraging words that calm me down.", language: "affirmation" }
    ]
  },
  {
    prompt: "When I think of feeling deeply cared for, I picture someone who...",
    options: [
      { text: "makes room for meaningful time together, even when life is busy.", language: "time" },
      { text: "quietly handles something helpful so I can relax.", language: "service" }
    ]
  },
  {
    prompt: "A sweet reminder of love feels strongest when someone...",
    options: [
      { text: "leaves me a note or says something heartfelt out loud.", language: "affirmation" },
      { text: "gives me a small item that carries a memory or inside meaning.", language: "gifts" }
    ]
  },
  {
    prompt: "I feel most connected after time apart when someone...",
    options: [
      { text: "wants to sit close, hug, or hold me for a while.", language: "touch" },
      { text: "wants to spend real time catching up without distractions.", language: "time" }
    ]
  },
  {
    prompt: "When I am overwhelmed, the most loving response is when someone...",
    options: [
      { text: "steps in and helps me tackle what is stressing me out.", language: "service" },
      { text: "reminds me gently that I am doing better than I think.", language: "affirmation" }
    ]
  },
  {
    prompt: "The kind of surprise that means the most to me is...",
    options: [
      { text: "coming home to something thoughtful chosen just for me.", language: "gifts" },
      { text: "having someone plan intentional time together around what I enjoy.", language: "time" }
    ]
  },
  {
    prompt: "I feel cared for in quiet moments when someone...",
    options: [
      { text: "rests beside me and keeps affectionate physical contact.", language: "touch" },
      { text: "takes care of a practical need before I even mention it.", language: "service" }
    ]
  },
  {
    prompt: "If someone wanted to make me feel truly appreciated, I would rather they...",
    options: [
      { text: "say exactly what they admire and appreciate about me.", language: "affirmation" },
      { text: "spend intentional time with me doing something meaningful together.", language: "time" }
    ]
  },
  {
    prompt: "I feel most remembered when someone...",
    options: [
      { text: "brings me back something small that made them think of me.", language: "gifts" },
      { text: "shows love through a warm embrace or affectionate closeness.", language: "touch" }
    ]
  },
  {
    prompt: "A loving partner stands out to me most when they...",
    options: [
      { text: "consistently follow through in helpful, practical ways.", language: "service" },
      { text: "give me sincere verbal reassurance when I need it.", language: "affirmation" }
    ]
  },
  {
    prompt: "In an ordinary week, I feel most loved when someone...",
    options: [
      { text: "protects time for us and is fully present when we are together.", language: "time" },
      { text: "shows affection with touch throughout the day.", language: "touch" }
    ]
  }
];

const state = {
  currentIndex: 0,
  answers: new Array(questions.length).fill(null)
};

const introScreen = document.getElementById("intro-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultsScreen = document.getElementById("results-screen");
const startButton = document.getElementById("start-btn");
const backButton = document.getElementById("back-btn");
const restartButton = document.getElementById("restart-btn");
const questionNumber = document.getElementById("question-number");
const questionTotal = document.getElementById("question-total");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const progressFill = document.getElementById("progress-fill");
const resultsSummary = document.getElementById("results-summary");
const rankingList = document.getElementById("ranking-list");
const explanations = document.getElementById("explanations");
const resultsRing = document.getElementById("results-ring");
const topLanguageDetail = document.getElementById("top-language-detail");
const exportButton = document.getElementById("export-btn");

let latestRankedResults = [];

function isMobileDevice() {
  return window.matchMedia("(max-width: 768px)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function updateExportButtonLabel() {
  exportButton.textContent = isMobileDevice() ? "Save results to Photos" : "Download results as PNG";
}

questionTotal.textContent = String(questions.length);

function showScreen(screenName) {
  introScreen.classList.toggle("active", screenName === "intro");
  quizScreen.classList.toggle("active", screenName === "quiz");
  resultsScreen.classList.toggle("active", screenName === "results");
}

function startQuiz() {
  state.currentIndex = 0;
  state.answers = new Array(questions.length).fill(null);
  showScreen("quiz");
  renderQuestion();
}

function renderQuestion() {
  const currentQuestion = questions[state.currentIndex];
  const selectedLanguage = state.answers[state.currentIndex];
  const progress = ((state.currentIndex + 1) / questions.length) * 100;

  questionNumber.textContent = String(state.currentIndex + 1);
  questionText.textContent = currentQuestion.prompt;
  progressFill.style.width = `${progress}%`;
  backButton.disabled = state.currentIndex === 0;
  optionsContainer.innerHTML = "";

  currentQuestion.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    button.textContent = option.text;

    if (selectedLanguage === option.language) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      state.answers[state.currentIndex] = option.language;
      button.classList.add("selected");

      window.setTimeout(() => {
        if (state.currentIndex === questions.length - 1) {
          renderResults();
        } else {
          state.currentIndex += 1;
          renderQuestion();
        }
      }, 120);
    });

    optionsContainer.appendChild(button);
  });
}

function buildRankedResults() {
  const totals = Object.keys(categories).reduce((accumulator, key) => {
    accumulator[key] = 0;
    return accumulator;
  }, {});

  state.answers.forEach((language) => {
    if (language) {
      totals[language] += 1;
    }
  });

  return Object.entries(categories)
    .map(([key, value], index) => ({
      id: key,
      label: value.label,
      color: value.color,
      description: value.description,
      high: value.high,
      medium: value.medium,
      low: value.low,
      score: totals[key],
      percentage: Math.round((totals[key] / questions.length) * 100),
      order: index
    }))
    .sort((first, second) => second.score - first.score || first.order - second.order);
}

function buildRingGradient(rankedResults) {
  let start = 0;
  const stops = [];

  rankedResults.forEach((result) => {
    const end = start + result.percentage;
    stops.push(`${result.color} ${start}% ${end}%`);
    start = end;
  });

  return `conic-gradient(from -90deg, ${stops.join(", ")})`;
}

function getScoreBand(percentage) {
  if (percentage >= 28) {
    return "high";
  }

  if (percentage >= 16) {
    return "medium";
  }

  return "low";
}

function getPercentNarrative(result) {
  const band = getScoreBand(result.percentage);

  if (band === "high") {
    return `${result.label} shows up very strongly in your answers at ${result.percentage}%. This looks like a core emotional preference rather than a small lean, so you likely notice this type of care quickly and remember it deeply.`;
  }

  if (band === "medium") {
    return `${result.label} landed at ${result.percentage}%, which suggests it matters to you in a meaningful way even if it is not the loudest signal. It may become especially important in certain seasons, moods, or relationship contexts.`;
  }

  return `${result.label} came in at ${result.percentage}%, so it seems to play more of a supporting role for you right now. That does not mean you dislike it, only that other expressions of love probably feel more emotionally convincing.`;
}

function getBandDescription(result) {
  const band = getScoreBand(result.percentage);
  return result[band] || result.description;
}

function buildTopLanguageDetail(topResult, secondResult) {
  const topBand = getScoreBand(topResult.percentage);
  const contrast = topResult.percentage - secondResult.percentage;
  let comparisonLine = "";

  if (contrast >= 10) {
    comparisonLine = `Your top result stands out clearly from the rest of the ranking, which usually means this love language is one of your most reliable ways of feeling connected and reassured.`;
  } else if (contrast >= 4) {
    comparisonLine = `Your top two results are fairly close, so you likely respond well to a blend of ${topResult.label.toLowerCase()} and ${secondResult.label.toLowerCase()} in real relationships.`;
  } else {
    comparisonLine = `Your top scores are very close together, which suggests your preferences are flexible and that you may feel most loved when several forms of care are expressed consistently together.`;
  }

  const intensityLine = topBand === "high"
    ? `Because ${topResult.label.toLowerCase()} scored strongly, it is likely one of the fastest ways for you to register care, safety, and emotional closeness.`
    : `Because your scores are more balanced, ${topResult.label.toLowerCase()} may be your top result without being the only thing that matters.`;

  return `
    <p><strong>${topResult.label}</strong> is your highest result at <strong>${topResult.percentage}%</strong>. ${topResult[topBand]}</p>
    <p>${intensityLine} ${comparisonLine}</p>
    <p>If someone wants to love you well, focusing on ${topResult.label.toLowerCase()} while also paying attention to ${secondResult.label.toLowerCase()} would likely feel especially natural and meaningful to you.</p>
  `;
}

function wrapCanvasText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    const { width } = context.measureText(testLine);

    if (width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line) {
    context.fillText(line, x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

function drawRoundedRect(context, x, y, width, height, radius, fillStyle, strokeStyle = null) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fillStyle = fillStyle;
  context.fill();

  if (strokeStyle) {
    context.strokeStyle = strokeStyle;
    context.stroke();
  }
}

function drawResultsRing(context, centerX, centerY, radius, rankedResults) {
  const total = rankedResults.reduce((sum, result) => sum + result.score, 0) || 1;
  let startAngle = -Math.PI / 2;

  rankedResults.forEach((result) => {
    const sliceAngle = (result.score / total) * Math.PI * 2;
    context.beginPath();
    context.lineWidth = 28;
    context.strokeStyle = result.color;
    context.lineCap = "round";
    context.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    context.stroke();
    startAngle += sliceAngle;
  });

  context.beginPath();
  context.fillStyle = "#f1ece8";
  context.arc(centerX, centerY, radius - 30, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.strokeStyle = "rgba(255,255,255,0.9)";
  context.lineWidth = 10;
  context.arc(centerX, centerY, radius - 26, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = "rgba(44, 49, 73, 0.92)";
  context.lineWidth = 8;
  context.lineCap = "round";
  context.lineJoin = "round";

  context.beginPath();
  context.arc(centerX, centerY - 18, 20, 0, Math.PI * 2);
  context.stroke();

  context.beginPath();
  context.moveTo(centerX - 34, centerY + 56);
  context.quadraticCurveTo(centerX - 34, centerY + 15, centerX, centerY + 15);
  context.quadraticCurveTo(centerX + 34, centerY + 15, centerX + 34, centerY + 56);
  context.stroke();
}

function measureWrappedTextHeight(context, text, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    const { width } = context.measureText(testLine);

    if (width > maxWidth && line) {
      lines += 1;
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) {
    lines += 1;
  }

  return lines * lineHeight;
}

async function exportResultsAsPng() {
  if (!latestRankedResults.length) {
    return;
  }

  const exportWidth = 1400;
  const horizontalPadding = 150;
  const summaryWidth = exportWidth - (horizontalPadding * 2);
  const explanationWidth = exportWidth - 340;
  const summaryLineHeight = 42;
  const explanationLineHeight = 34;
  const topSectionHeight = 540;
  const rankingCardHeight = 112;
  const rankingCardGap = 18;
  const rankingColumnHeight = (latestRankedResults.length * rankingCardHeight) + ((latestRankedResults.length - 1) * rankingCardGap);

  const measureCanvas = document.createElement("canvas");
  measureCanvas.width = exportWidth;
  measureCanvas.height = 200;
  const measureContext = measureCanvas.getContext("2d");

  measureContext.font = "400 30px 'Avenir Next', 'Segoe UI', sans-serif";
  const summaryHeight = measureWrappedTextHeight(measureContext, resultsSummary.textContent, summaryWidth, summaryLineHeight);

  measureContext.font = "400 24px 'Avenir Next', 'Segoe UI', sans-serif";
  const explanationHeights = latestRankedResults.map((result) => (
    measureWrappedTextHeight(
      measureContext,
      `${getPercentNarrative(result)} ${getBandDescription(result)}`,
      explanationWidth,
      explanationLineHeight
    )
  ));

  const explanationsHeight = explanationHeights.reduce((sum, height) => sum + height, 0)
    + (latestRankedResults.length * 60)
    + ((latestRankedResults.length - 1) * 26);

  const contentHeight = 250 + summaryHeight + topSectionHeight + 90 + explanationsHeight + 320;
  const exportHeight = Math.max(2100, contentHeight);

  const canvas = document.createElement("canvas");
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  const context = canvas.getContext("2d");

  context.fillStyle = "#f8f3ef";
  context.fillRect(0, 0, exportWidth, exportHeight);

  const glowLeft = context.createRadialGradient(180, 180, 40, 180, 180, 320);
  glowLeft.addColorStop(0, "rgba(239, 197, 187, 0.72)");
  glowLeft.addColorStop(1, "rgba(239, 197, 187, 0)");
  context.fillStyle = glowLeft;
  context.fillRect(0, 0, exportWidth, exportHeight);

  const glowRight = context.createRadialGradient(1230, 260, 40, 1230, 260, 360);
  glowRight.addColorStop(0, "rgba(213, 235, 228, 0.78)");
  glowRight.addColorStop(1, "rgba(213, 235, 228, 0)");
  context.fillStyle = glowRight;
  context.fillRect(0, 0, exportWidth, exportHeight);

  drawRoundedRect(context, 90, 90, exportWidth - 180, exportHeight - 180, 44, "rgba(255,255,255,0.9)");

  context.fillStyle = "#198667";
  context.font = "700 26px 'Avenir Next', 'Segoe UI', sans-serif";
  context.fillText("LOVE LANGUAGE QUIZ", 150, 170);

  context.fillStyle = "#28413a";
  context.font = "700 62px 'Avenir Next', 'Segoe UI', sans-serif";
  context.fillText("Your love language order", 150, 245);

  context.fillStyle = "#586760";
  context.font = "400 30px 'Avenir Next', 'Segoe UI', sans-serif";
  const summaryBottom = wrapCanvasText(context, resultsSummary.textContent, 150, 305, summaryWidth, summaryLineHeight);

  const topSectionY = summaryBottom + 95;
  drawResultsRing(context, 430, topSectionY + 170, 170, latestRankedResults);

  let cardY = topSectionY - 20;
  latestRankedResults.forEach((result, index) => {
    drawRoundedRect(context, 700, cardY, 510, 112, 26, "rgba(255,255,255,0.96)", "rgba(40,65,58,0.08)");

    context.fillStyle = "rgba(40,65,58,0.08)";
    context.beginPath();
    context.arc(752, cardY + 38, 18, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#28413a";
    context.font = "700 22px 'Avenir Next', 'Segoe UI', sans-serif";
    context.textAlign = "center";
    context.fillText(String(index + 1), 752, cardY + 46);
    context.textAlign = "left";

    context.fillStyle = result.color;
    context.beginPath();
    context.arc(805, cardY + 38, 8, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#28413a";
    context.font = "700 28px 'Avenir Next', 'Segoe UI', sans-serif";
    context.fillText(result.label, 825, cardY + 46);

    context.font = "700 28px 'Avenir Next', 'Segoe UI', sans-serif";
    context.fillText(`${result.percentage}%`, 1120, cardY + 46);

    drawRoundedRect(context, 740, cardY + 64, 410, 16, 8, "rgba(88,103,96,0.12)");
    drawRoundedRect(context, 740, cardY + 64, 410 * (result.percentage / 100), 16, 8, result.color);

    cardY += 130;
  });

  const sectionBottom = Math.max(topSectionY + 340, topSectionY - 20 + rankingColumnHeight);
  const explanationStartY = sectionBottom + 120;

  context.fillStyle = "#28413a";
  context.font = "700 40px 'Avenir Next', 'Segoe UI', sans-serif";
  context.fillText("What each score suggests", 150, explanationStartY);

  let textY = explanationStartY + 55;
  latestRankedResults.forEach((result, index) => {
    context.fillStyle = result.color;
    context.beginPath();
    context.arc(165, textY - 10, 9, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#28413a";
    context.font = "700 28px 'Avenir Next', 'Segoe UI', sans-serif";
    context.fillText(`${index + 1}. ${result.label}`, 188, textY);

    context.fillStyle = "#586760";
    context.font = "400 24px 'Avenir Next', 'Segoe UI', sans-serif";
    textY = wrapCanvasText(
      context,
      `${getPercentNarrative(result)} ${getBandDescription(result)}`,
      188,
      textY + 34,
      exportWidth - 340,
      34
    ) + 26;
  });

  const filename = "love-language-results.png";
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

  if (isMobileDevice() && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: "image/png" });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Love Language Quiz Results"
        });
        return;
      }
    } catch (error) {
      // Fall back to direct download if share is unavailable or cancelled.
    }
  }

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

function renderResults() {
  const rankedResults = buildRankedResults();
  const [topResult, secondResult] = rankedResults;
  latestRankedResults = rankedResults;

  resultsSummary.textContent = `${topResult.label} came out on top for you, followed by ${secondResult.label}. Here is your full ranking based on the choices you made across all ${questions.length} questions.`;
  rankingList.innerHTML = "";
  explanations.innerHTML = "";
  resultsRing.style.background = buildRingGradient(rankedResults);
  topLanguageDetail.innerHTML = buildTopLanguageDetail(topResult, secondResult);

  rankedResults.forEach((result, index) => {
    const row = document.createElement("article");
    row.className = "ranking-item";
    row.innerHTML = `
      <div class="ranking-head">
        <div class="ranking-name">
          <span class="ranking-order">${index + 1}</span>
          <span class="ranking-dot" style="background:${result.color}"></span>
          <span>${result.label}</span>
        </div>
        <span class="ranking-meta">${result.percentage}%</span>
      </div>
      <div class="ranking-bar">
        <div class="ranking-fill" style="width:${result.percentage}%; background:${result.color}"></div>
      </div>
      <p class="ranking-note">${result.description}</p>
    `;
    rankingList.appendChild(row);

    const explanation = document.createElement("article");
    explanation.className = "explanation-card";
    explanation.innerHTML = `
      <h4>
        <span class="swatch" style="background:${result.color}"></span>
        <span>${index + 1}. ${result.label}</span>
      </h4>
      <p>${getPercentNarrative(result)} ${getBandDescription(result)}</p>
    `;
    explanations.appendChild(explanation);
  });

  showScreen("results");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

startButton.addEventListener("click", startQuiz);

backButton.addEventListener("click", () => {
  if (state.currentIndex > 0) {
    state.currentIndex -= 1;
    renderQuestion();
  }
});

restartButton.addEventListener("click", startQuiz);
exportButton.addEventListener("click", exportResultsAsPng);
updateExportButtonLabel();
window.addEventListener("resize", updateExportButtonLabel);
