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
loadIconoirMap("./fonts/iconoir/iconoir-font.css");
function updatePreview() {
  // 1. CHANGE THIS LINE to use the new parser
  const letter = getCharacterFromInput(letterInput.value);

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

  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, "+")}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
  if (googleFontLink.href !== fontUrl) {
    googleFontLink.href = fontUrl;
  }

  letterDisplay.style.fontFamily = `'${fontName}', sans-serif`;
  customCssStyle.textContent = customCss;
}

function getCharacterFromInput(value) {
  if (!value) return "";

  // Check for the :icon-name: format first.
  const iconNameMatch = value.match(/^:([a-zA-Z0-9_-]+):$/);
  if (iconNameMatch) {
    const iconName = iconNameMatch[1];
    if (iconoirMap.has(iconName)) {
      const hexCode = iconoirMap.get(iconName);
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

updatePreview();
