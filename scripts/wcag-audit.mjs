// WCAG 2.1 contrast audit — Arthafiloka V2 task 9.6
// Reference: https://www.w3.org/WAI/WCAG21/Techniques/general/G18

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function hslToRgb(h, s, l) {
  // h in degrees [0,360), s,l in [0,1]
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (n) => n.toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function relativeLuminance({ r, g, b }) {
  const channel = (c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(rgb1, rgb2) {
  const L1 = relativeLuminance(rgb1);
  const L2 = relativeLuminance(rgb2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function classify(ratio) {
  if (ratio >= 7) return "AAA pass (normal & large)";
  if (ratio >= 4.5) return "AA pass (normal & large)";
  if (ratio >= 3) return "AA pass (large only)";
  return "FAIL (below 3:1)";
}

// Resolve bg-card colors from globals.css
const bgCardLight = hslToRgb(0, 0, 1.0);          // hsl(0 0% 100%)
const bgCardDark = hslToRgb(240, 0.10, 0.039);    // hsl(240 10% 3.9%)

console.log("=== Resolved bg-card values ===");
console.log("Light bg-card:", rgbToHex(bgCardLight), bgCardLight);
console.log("Dark bg-card: ", rgbToHex(bgCardDark), bgCardDark);
console.log();

const foregrounds = {
  "income (#0F9B58)":        "#0F9B58",
  "expense (#E03E3E)":       "#E03E3E",
  "owner.arul (#2383E2)":    "#2383E2",
  "owner.fifi (#E255A1)":    "#E255A1",
  "owner.shared (#9B59B6)":  "#9B59B6",
};

const backgrounds = {
  "Light bg-card (#FFFFFF)": bgCardLight,
  "Dark bg-card  ":          bgCardDark,
};

console.log("=== Contrast Ratios ===");
console.log();
console.log("| Foreground               | Background          | Ratio  | Verdict                              |");
console.log("|--------------------------|---------------------|--------|--------------------------------------|");

const results = [];
for (const [fgLabel, fgHex] of Object.entries(foregrounds)) {
  for (const [bgLabel, bgRgb] of Object.entries(backgrounds)) {
    const ratio = contrastRatio(hexToRgb(fgHex), bgRgb);
    const verdict = classify(ratio);
    results.push({ fg: fgLabel, bg: bgLabel, ratio, verdict });
    console.log(`| ${fgLabel.padEnd(24)} | ${bgLabel.padEnd(19)} | ${ratio.toFixed(2).padStart(6)} | ${verdict.padEnd(36)} |`);
  }
}

console.log();
console.log("=== Suggested adjustments for failing pairs ===");

const checkOn = (label, candidates, bgRgb, bgLabel) => {
  console.log();
  console.log(`Candidates for "${label}" on ${bgLabel}:`);
  for (const c of candidates) {
    const r = contrastRatio(hexToRgb(c), bgRgb);
    console.log(`  ${c}: ${r.toFixed(2)} → ${classify(r)}`);
  }
};

checkOn("income (dark mode lift)",
  ["#10B981", "#14B881", "#22C55E", "#34D399", "#5EE5A8"],
  bgCardDark, "Dark bg-card");

checkOn("expense (dark mode lift)",
  ["#EF4444", "#F87171", "#FB7185", "#FCA5A5"],
  bgCardDark, "Dark bg-card");

checkOn("owner.arul (dark mode lift)",
  ["#3B82F6", "#60A5FA", "#7AAEEA", "#93C5FD"],
  bgCardDark, "Dark bg-card");

checkOn("owner.fifi (dark mode lift)",
  ["#E255A1", "#F472B6", "#F9A8D4", "#FBCFE8"],
  bgCardDark, "Dark bg-card");

checkOn("owner.shared (dark mode lift)",
  ["#A78BFA", "#B794E6", "#C4A1F0", "#C084FC", "#D8B4FE"],
  bgCardDark, "Dark bg-card");

checkOn("owner.fifi (light mode darken)",
  ["#E255A1", "#DB2777", "#BE185D", "#9D174D"],
  bgCardLight, "Light bg-card");

checkOn("owner.arul (light mode darken)",
  ["#2383E2", "#1D4ED8", "#1E40AF"],
  bgCardLight, "Light bg-card");

checkOn("owner.shared (light mode darken)",
  ["#9B59B6", "#7E22CE", "#6B21A8", "#581C87"],
  bgCardLight, "Light bg-card");


// Additional tests: darken income/expense for light mode, plus the actual Tailwind palette
// used in SummaryCards for owner accents.

console.log();
console.log("=== Light mode darken candidates ===");

checkOn("income (light mode darken)",
  ["#0F9B58", "#0E8C50", "#067D43", "#0A6B40", "#047857", "#065F46", "#15803D"],
  bgCardLight, "Light bg-card");

checkOn("expense (light mode darken)",
  ["#E03E3E", "#D11A1A", "#C92A2A", "#B91C1C", "#991B1B", "#DC2626"],
  bgCardLight, "Light bg-card");

console.log();
console.log("=== SummaryCards owner accents (actual Tailwind palette in code) ===");
console.log("SummaryCards uses: dot blue-500/pink-500/purple-500 + text blue-600/pink-600/purple-600 (light) and blue-400/pink-400/purple-400 (dark).");
console.log();

const summaryDots = {
  "arul dot blue-500 (#3b82f6)":   "#3b82f6",
  "fifi dot pink-500 (#ec4899)":   "#ec4899",
  "shared dot purple-500 (#a855f7)": "#a855f7",
};
console.log("Dots are graphic (WCAG 1.4.11 non-text 3:1 minimum):");
for (const [label, hex] of Object.entries(summaryDots)) {
  const lr = contrastRatio(hexToRgb(hex), bgCardLight);
  const dr = contrastRatio(hexToRgb(hex), bgCardDark);
  console.log(`  ${label}: light=${lr.toFixed(2)} ${classify(lr)}, dark=${dr.toFixed(2)} ${classify(dr)}`);
}

console.log();
console.log("Owner labels (normal text — 4.5:1 minimum):");
const summaryLabelLight = {
  "arul text-blue-600 (#2563EB)":   "#2563EB",
  "fifi text-pink-600 (#DB2777)":   "#DB2777",
  "shared text-purple-600 (#9333EA)": "#9333EA",
};
for (const [label, hex] of Object.entries(summaryLabelLight)) {
  const r = contrastRatio(hexToRgb(hex), bgCardLight);
  console.log(`  ${label} on light: ${r.toFixed(2)} → ${classify(r)}`);
}

const summaryLabelDark = {
  "arul text-blue-400 (#60A5FA)":   "#60A5FA",
  "fifi text-pink-400 (#F472B6)":   "#F472B6",
  "shared text-purple-400 (#C084FC)": "#C084FC",
};
for (const [label, hex] of Object.entries(summaryLabelDark)) {
  const r = contrastRatio(hexToRgb(hex), bgCardDark);
  console.log(`  ${label} on dark:  ${r.toFixed(2)} → ${classify(r)}`);
}
