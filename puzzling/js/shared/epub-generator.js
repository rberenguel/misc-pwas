/**
 * Shared EPUB Generator
 * Wraps JSZip to create simple puzzle books.
 */
class EpubGenerator {
  constructor() {
    if (typeof JSZip === "undefined") {
      console.error("JSZip is not loaded.");
    }
    this.puzzles = [];
  }

  /**
   * Store puzzle data for generation
   * @param {string} pData Base64 PNG data of the puzzle
   * @param {string} sData Base64 PNG data of the solution
   * @param {number} idx Index of the puzzle (1-based)
   * @param {string} titlePrefix Prefix for page titles
   */
  addPuzzlePair(pData, sData, idx, titlePrefix = "Puzzle") {
    this.puzzles.push({
      pData,
      sData,
      idx,
      titlePrefix,
    });
  }

  /**
   * Generate EPUB
   */
  generate(bookTitle, filename) {
    const zip = new JSZip();
    let manifest = "";
    let spine = "";

    // Init Container
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    zip
      .folder("META-INF")
      .file(
        "container.xml",
        `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
      );

    // Add Content
    this.puzzles.forEach((p) => {
      const i = p.idx;
      const titleP = `${p.titlePrefix} ${i}`;
      const titleS = `${p.titlePrefix} ${i} Solution`;

      // Images
      zip
        .folder("OEBPS")
        .folder("images")
        .file(`p${i}.png`, p.pData, { base64: true });
      zip
        .folder("OEBPS")
        .folder("images")
        .file(`s${i}.png`, p.sData, { base64: true });

      // XHTML
      const page = (img, title) =>
        `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title><style>body{margin:0;padding:0;text-align:center;} img{max-width:100%;height:auto;}</style></head><body><img src="images/${img}" alt="${title}"/></body></html>`;

      zip.folder("OEBPS").file(`p${i}a.xhtml`, page(`p${i}.png`, titleP));
      zip.folder("OEBPS").file(`p${i}b.xhtml`, page(`s${i}.png`, titleS));

      // Manifest & Spine
      manifest += `<item id="imgp${i}" href="images/p${i}.png" media-type="image/png"/><item id="imgs${i}" href="images/s${i}.png" media-type="image/png"/>`;
      manifest += `<item id="p${i}a" href="p${i}a.xhtml" media-type="application/xhtml+xml"/><item id="p${i}b" href="p${i}b.xhtml" media-type="application/xhtml+xml"/>`;
      spine += `<itemref idref="p${i}a"/><itemref idref="p${i}b"/>`;
    });

    const uid = `urn:uuid:puzzle-${Date.now()}`;
    const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="2.0">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${bookTitle}</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="uid">${uid}</dc:identifier>
    <dc:creator>Gemini Puzzle Generator</dc:creator>
</metadata>
<manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifest}
</manifest>
<spine toc="ncx">${spine}</spine>
</package>`;

    const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="${uid}"/></head>
<docTitle><text>${bookTitle}</text></docTitle>
<navMap>
    <navPoint id="nav1" playOrder="1">
        <navLabel><text>Start</text></navLabel>
        <content src="p1a.xhtml"/>
    </navPoint>
</navMap>
</ncx>`;

    zip.folder("OEBPS").file("content.opf", opf);
    zip.folder("OEBPS").file("toc.ncx", ncx);

    this._download(zip, filename);
  }

  /**
   * Generate ZIP with raw images
   */
  generateZip(filename) {
    const zip = new JSZip();

    this.puzzles.forEach((p) => {
      zip.file(`${p.idx}-puzzle.png`, p.pData, { base64: true });
      zip.file(`${p.idx}-solution.png`, p.sData, { base64: true });
    });

    this._download(zip, filename);
  }

  _download(zip, filename) {
    zip.generateAsync({ type: "blob" }).then(function (content) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
}
