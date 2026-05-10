import { searchIcons } from "./icon-tags.js";

const letterInput = document.getElementById("letter-input");
const fontInput = document.getElementById("font-input");
const cssInput = document.getElementById("css-input");
const sizeInput = document.getElementById("size-input");
const fontSizeInput = document.getElementById("font-size-input");
const letterWrapper = document.getElementById("letter-wrapper");
const letterDisplay = document.getElementById("letter-display");
const googleFontLink = document.getElementById("google-font-link");
const customCssStyle = document.getElementById("custom-css-style");
const downloadBtn = document.getElementById("download-btn");
const loader = document.getElementById("loader-container");

function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}
const iconoirMap = new Map();
const phosphorMap = new Map();

async function loadIconoirMap(cssPath) {
  try {
    const response = await fetch(cssPath);
    if (!response.ok) {
      console.error(`Failed to fetch CSS: ${response.statusText}`);
      return;
    }
    const cssText = await response.text();

    // Regex to find all iconoir class definitions and extract the name and content code.
    const iconRegex =
      /\.iconoirfont-([^:]+)::before\s*{\s*content:\s*"\\([^"]+)"/g;

    for (const match of cssText.matchAll(iconRegex)) {
      const name = match[1];
      const hexCode = match[2];
      iconoirMap.set(name, hexCode);
    }
    console.log(
      `Successfully loaded and parsed ${iconoirMap.size} Iconoir icons.`,
    );
  } catch (error) {
    console.error("Could not load or parse the Iconoir CSS file.", error);
  }
}

async function loadPhosphorMap(cssPath) {
  try {
    const response = await fetch(cssPath);
    if (!response.ok) {
      console.error(`Failed to fetch CSS: ${response.statusText}`);
      return;
    }
    const cssText = await response.text();

    // Regex to find all phosphor class definitions and extract the name and content code.
    const iconRegex =
      /\.ph-light\.ph-([^:]+):before\s*{\s*content:\s*"\\([^"]+)"/g;

    for (const match of cssText.matchAll(iconRegex)) {
      const name = match[1];
      const hexCode = match[2];
      phosphorMap.set(name, hexCode);
    }
    console.log(
      `Successfully loaded and parsed ${phosphorMap.size} Phosphor icons.`,
    );
  } catch (error) {
    console.error("Could not load or parse the Phosphor CSS file.", error);
  }
}

loadIconoirMap("./fonts/iconoir/iconoir-font.css");
loadPhosphorMap("./fonts/phosphor/phosphor.css");
function updatePreview() {
  const inputValue = letterInput.value;
  const glyphs = parseGlyphs(inputValue);

  const fontName = fontInput.value.trim();
  const customCss = cssInput.value;
  const containerSize = parseInt(sizeInput.value, 10) || 256;
  const fontSizePercent = parseInt(fontSizeInput.value, 10) || 75;
  const fontSize = `${containerSize * (fontSizePercent / 100)}px`;

  // Load Google Font if any text glyph is present
  const hasTextGlyph = glyphs.some((g) => g.source === "text");
  if (hasTextGlyph && fontName) {
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, "+")}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
    if (googleFontLink.href !== fontUrl) {
      googleFontLink.href = fontUrl;
    }
  }

  letterWrapper.style.width = `${containerSize}px`;
  letterWrapper.style.height = `${containerSize}px`;
  letterWrapper.style.position = "relative";

  letterDisplay.innerHTML = "";
  letterDisplay.removeAttribute("style");

  if (glyphs.length === 0) {
    letterWrapper.style.textAlign = "center";
    letterWrapper.style.lineHeight = `${containerSize}px`;
    letterDisplay.className = "select-none";
    customCssStyle.textContent = customCss;
    return;
  }

  if (glyphs.length === 1) {
    // Backward-compatible single glyph rendering
    letterWrapper.style.textAlign = "center";
    letterWrapper.style.lineHeight = `${containerSize}px`;

    letterDisplay.textContent = glyphs[0].char;
    letterDisplay.style.fontFamily = glyphs[0].fontFamily;
    letterDisplay.style.fontSize = fontSize;
    letterDisplay.style.display = "inline-block";
    letterDisplay.style.verticalAlign = "middle";
    letterDisplay.style.width = "95%";
    letterDisplay.style.lineHeight = "normal";
    letterDisplay.className = "glyph glyph-0 select-none";
  } else {
    // Multiple glyphs: stack as overlays
    letterWrapper.style.textAlign = "";
    letterWrapper.style.lineHeight = "";

    letterDisplay.style.display = "block";
    letterDisplay.style.position = "relative";
    letterDisplay.style.width = "100%";
    letterDisplay.style.height = "100%";
    letterDisplay.className = "select-none";

    glyphs.forEach((glyph, i) => {
      const span = document.createElement("span");
      span.className = `glyph glyph-${i} glyph-overlay select-none`;
      span.textContent = glyph.char;
      span.style.fontFamily = glyph.fontFamily;
      span.style.fontSize = fontSize;
      letterDisplay.appendChild(span);
    });
  }

  customCssStyle.textContent = customCss;
}

function parseGlyphs(value) {
  if (!value) return [];

  const segments = value.split(/, */);
  const glyphs = [];
  const fontName = fontInput.value.trim();

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    // Check for the :icon-name: format (Iconoir).
    const iconoirMatch = trimmed.match(/^:([a-zA-Z0-9_-]+):$/);
    if (iconoirMatch) {
      const iconName = iconoirMatch[1];
      if (iconoirMap.has(iconName)) {
        const hexCode = iconoirMap.get(iconName);
        glyphs.push({
          char: String.fromCodePoint(parseInt(hexCode, 16)),
          fontFamily: "iconoir",
          source: "iconoir",
        });
      } else {
        glyphs.push({ char: "?", fontFamily: "iconoir", source: "iconoir" });
      }
      continue;
    }

    // Check for the {icon-name} format (Phosphor).
    const phosphorMatch = trimmed.match(/^\{([a-zA-Z0-9_-]+)\}$/);
    if (phosphorMatch) {
      const iconName = phosphorMatch[1];
      if (phosphorMap.has(iconName)) {
        const hexCode = phosphorMap.get(iconName);
        glyphs.push({
          char: String.fromCodePoint(parseInt(hexCode, 16)),
          fontFamily: "Phosphor-Light",
          source: "phosphor",
        });
      } else {
        glyphs.push({
          char: "?",
          fontFamily: "Phosphor-Light",
          source: "phosphor",
        });
      }
      continue;
    }

    // Fallback to previous logic for single characters or raw hex codes.
    if (trimmed.length === 1) {
      glyphs.push({
        char: trimmed,
        fontFamily: `'${fontName}', sans-serif`,
        source: "text",
      });
      continue;
    }
    try {
      const hex = trimmed.replace(/\\|u|0x/g, "");
      const charCode = parseInt(hex, 16);
      if (!isNaN(charCode)) {
        glyphs.push({
          char: String.fromCodePoint(charCode),
          fontFamily: `'${fontName}', sans-serif`,
          source: "text",
        });
        continue;
      }
    } catch (e) {
      console.error("Invalid character code:", trimmed);
    }

    glyphs.push({
      char: trimmed.charAt(0),
      fontFamily: `'${fontName}', sans-serif`,
      source: "text",
    });
  }

  return glyphs;
}

async function downloadImage() {
  downloadBtn.classList.add("hidden");
  loader.classList.remove("hidden");

  try {
    const glyphs = parseGlyphs(letterInput.value);
    const containerSize = parseInt(sizeInput.value, 10) || 256;
    const fontSizePercent = parseInt(fontSizeInput.value, 10) || 75;
    const fontSize = `${containerSize * (fontSizePercent / 100)}px`;

    // Load all fonts used by the glyphs
    const fontsToLoad = new Set();
    for (const glyph of glyphs) {
      const font = `normal 400 ${fontSize} ${glyph.fontFamily}`;
      fontsToLoad.add(font);
    }
    await Promise.all([...fontsToLoad].map((f) => document.fonts.load(f)));
    await new Promise((resolve) => setTimeout(resolve, 150));

    const canvas = await html2canvas(letterWrapper, {
      backgroundColor: null,
      useCORS: true,
      scale: 2,
      onclone: (clonedDoc) => {
        const letterWrapperClone = clonedDoc.getElementById("letter-wrapper");
        const glyphClones = clonedDoc.querySelectorAll(".glyph");
        glyphClones.forEach((g) => {
          // Apply your transform fix ONLY during capture.
          g.style.transform = "translateY(-0.3em)";
        });
        if (letterWrapperClone) {
          letterWrapperClone.style.lineHeight = containerSize + "px";
        }
      },
    });

    const link = document.createElement("a");
    link.download = `letter-icon-${letterInput.value || "A"}-${containerSize}px.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error("Font loading or canvas rendering failed!", error);
    alert(
      "Could not generate image. The font might be invalid or there was a network error.",
    );
  } finally {
    downloadBtn.classList.remove("hidden");
    loader.classList.add("hidden");
  }
}

const debouncedUpdate = debounce(updatePreview, 250);
letterInput.addEventListener("input", updatePreview);
fontInput.addEventListener("input", debouncedUpdate);
cssInput.addEventListener("input", debouncedUpdate);
sizeInput.addEventListener("input", debouncedUpdate);
fontSizeInput.addEventListener("input", debouncedUpdate);
downloadBtn.addEventListener("click", downloadImage);

// Autocomplete functionality
const autocompleteDropdown = document.getElementById("autocomplete-dropdown");
const autocompleteList = document.getElementById("autocomplete-list");
let selectedIndex = -1;
let filteredIcons = [];

function showAutocomplete(searchTerm, iconType) {
  const icons = [];
  const seen = new Set();

  if (iconType === "iconoir") {
    for (const [name] of iconoirMap) {
      if (name.toLowerCase().includes(searchTerm.toLowerCase())) {
        icons.push({ name, type: "iconoir", hexCode: iconoirMap.get(name) });
      }
    }
  } else if (iconType === "phosphor") {
    // First, try semantic search
    const semanticResults = searchIcons(searchTerm.toLowerCase());
    for (const name of semanticResults) {
      if (phosphorMap.has(name)) {
        icons.push({ name, type: "phosphor", hexCode: phosphorMap.get(name) });
        seen.add(name);
      }
    }

    // Then add direct name matches that weren't found via semantic search
    for (const [name] of phosphorMap) {
      if (
        !seen.has(name) &&
        name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        icons.push({ name, type: "phosphor", hexCode: phosphorMap.get(name) });
      }
    }
  }

  filteredIcons = icons.slice(0, 50); // Limit to 50 results
  selectedIndex = -1;

  if (filteredIcons.length === 0) {
    hideAutocomplete();
    return;
  }

  autocompleteList.innerHTML = "";
  filteredIcons.forEach((icon, index) => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.dataset.index = index;

    const iconSpan = document.createElement("span");
    iconSpan.className = `autocomplete-icon ${icon.type}-icon`;
    iconSpan.textContent = String.fromCodePoint(parseInt(icon.hexCode, 16));

    const nameSpan = document.createElement("span");
    nameSpan.className = "autocomplete-name";
    nameSpan.textContent = icon.name;

    const sourceSpan = document.createElement("span");
    sourceSpan.className = "autocomplete-source";
    sourceSpan.textContent = icon.type === "iconoir" ? "Iconoir" : "Phosphor";

    div.appendChild(iconSpan);
    div.appendChild(nameSpan);
    div.appendChild(sourceSpan);

    div.addEventListener("click", () => selectIcon(icon));
    div.addEventListener("mouseenter", () => {
      selectedIndex = index;
      updateSelection();
    });

    autocompleteList.appendChild(div);
  });

  autocompleteDropdown.classList.remove("hidden");
}

function hideAutocomplete() {
  autocompleteDropdown.classList.add("hidden");
  selectedIndex = -1;
  filteredIcons = [];
}

function selectIcon(icon) {
  const wrapper = icon.type === "iconoir" ? ":" : "{";
  const closingWrapper = icon.type === "iconoir" ? ":" : "}";
  const value = letterInput.value;
  const segments = value.split(/, */);
  segments[segments.length - 1] = `${wrapper}${icon.name}${closingWrapper}`;
  letterInput.value = segments.join(", ");
  hideAutocomplete();
  updatePreview();
}

function updateSelection() {
  const items = autocompleteList.querySelectorAll(".autocomplete-item");
  items.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add("selected");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("selected");
    }
  });
}

letterInput.addEventListener("input", (e) => {
  const value = e.target.value;
  const segments = value.split(/, */);
  const lastSegment = segments[segments.length - 1].trim();

  // Check for iconoir pattern
  const iconoirMatch = lastSegment.match(/^:([a-zA-Z0-9_-]*)$/);
  if (iconoirMatch) {
    showAutocomplete(iconoirMatch[1], "iconoir");
    return;
  }

  // Check for phosphor pattern
  const phosphorMatch = lastSegment.match(/^\{([a-zA-Z0-9_-]*)$/);
  if (phosphorMatch) {
    showAutocomplete(phosphorMatch[1], "phosphor");
    return;
  }

  hideAutocomplete();
});

letterInput.addEventListener("keydown", (e) => {
  if (autocompleteDropdown.classList.contains("hidden")) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, filteredIcons.length - 1);
    updateSelection();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    updateSelection();
  } else if (e.key === "Enter" && selectedIndex >= 0) {
    e.preventDefault();
    selectIcon(filteredIcons[selectedIndex]);
  } else if (e.key === "Escape") {
    e.preventDefault();
    hideAutocomplete();
  }
});

// Hide autocomplete when clicking outside
document.addEventListener("click", (e) => {
  if (
    !letterInput.contains(e.target) &&
    !autocompleteDropdown.contains(e.target)
  ) {
    hideAutocomplete();
  }
});

updatePreview();
