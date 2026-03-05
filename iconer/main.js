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
  const letter = getCharacterFromInput(inputValue);

  const fontName = fontInput.value.trim();
  const customCss = cssInput.value;
  const containerSize = parseInt(sizeInput.value, 10) || 256;
  const fontSizePercent = parseInt(fontSizeInput.value, 10) || 75;

  letterWrapper.style.width = `${containerSize}px`;
  letterWrapper.style.height = `${containerSize}px`;
  letterWrapper.style.textAlign = "center";
  letterWrapper.style.lineHeight = `${containerSize}px`;
  letterDisplay.textAlign = "center";
  letterDisplay.width = "95%";
  letterDisplay.style.display = "inline-block";
  letterDisplay.style.verticalAlign = "middle";
  letterDisplay.style.lineHeight = "normal";

  letterDisplay.style.fontSize = `${containerSize * (fontSizePercent / 100)}px`;
  letterDisplay.textContent = letter;

  // Detect if we're using an icon font
  const isIconoir = /^:([a-zA-Z0-9_-]+):$/.test(inputValue);
  const isPhosphor = /^\{([a-zA-Z0-9_-]+)\}$/.test(inputValue);

  if (isIconoir) {
    // Use Iconoir font
    letterDisplay.style.fontFamily = "iconoir";
  } else if (isPhosphor) {
    // Use Phosphor font
    letterDisplay.style.fontFamily = "Phosphor-Light";
  } else {
    // Use the user-specified font
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, "+")}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
    if (googleFontLink.href !== fontUrl) {
      googleFontLink.href = fontUrl;
    }
    letterDisplay.style.fontFamily = `'${fontName}', sans-serif`;
  }

  customCssStyle.textContent = customCss;
}

function getCharacterFromInput(value) {
  if (!value) return "";

  // Check for the :icon-name: format (Iconoir).
  const iconoirMatch = value.match(/^:([a-zA-Z0-9_-]+):$/);
  if (iconoirMatch) {
    const iconName = iconoirMatch[1];
    if (iconoirMap.has(iconName)) {
      const hexCode = iconoirMap.get(iconName);
      return String.fromCodePoint(parseInt(hexCode, 16));
    } else {
      // Return a question mark if the name isn't found in our map.
      return "?";
    }
  }

  // Check for the {icon-name} format (Phosphor).
  const phosphorMatch = value.match(/^\{([a-zA-Z0-9_-]+)\}$/);
  if (phosphorMatch) {
    const iconName = phosphorMatch[1];
    if (phosphorMap.has(iconName)) {
      const hexCode = phosphorMap.get(iconName);
      return String.fromCodePoint(parseInt(hexCode, 16));
    } else {
      // Return a question mark if the name isn't found in our map.
      return "?";
    }
  }

  // Fallback to previous logic for single characters or raw hex codes.
  if (value.length === 1) return value;
  try {
    const hex = value.replace(/\\|u|0x/g, "");
    const charCode = parseInt(hex, 16);
    if (!isNaN(charCode)) {
      return String.fromCodePoint(charCode);
    }
  } catch (e) {
    console.error("Invalid character code:", value);
  }

  return value.charAt(0);
}

async function downloadImage() {
  downloadBtn.classList.add("hidden");
  loader.classList.remove("hidden");

  try {
    const displayStyles = window.getComputedStyle(letterDisplay);
    const font = `${displayStyles.fontStyle} ${displayStyles.fontWeight} ${displayStyles.fontSize} ${displayStyles.fontFamily}`;

    await document.fonts.load(font);
    await new Promise((resolve) => setTimeout(resolve, 150));

    const containerSize = parseInt(sizeInput.value, 10) || 256;

    const canvas = await html2canvas(letterWrapper, {
      backgroundColor: null,
      useCORS: true,
      scale: 2,
      onclone: (clonedDoc) => {
        const letterDisplayClone = clonedDoc.getElementById("letter-display");
        const letterWrapperClone = clonedDoc.getElementById("letter-wrapper");
        if (letterDisplayClone) {
          // Apply your transform fix ONLY during capture.
          letterDisplayClone.style.transform = "translateY(-0.3em)";
        }
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
  letterInput.value = `${wrapper}${icon.name}${closingWrapper}`;
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

  // Check for iconoir pattern
  const iconoirMatch = value.match(/^:([a-zA-Z0-9_-]*)$/);
  if (iconoirMatch) {
    showAutocomplete(iconoirMatch[1], "iconoir");
    return;
  }

  // Check for phosphor pattern
  const phosphorMatch = value.match(/^\{([a-zA-Z0-9_-]*)$/);
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
