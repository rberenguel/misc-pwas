# Ullada

A minimalist, Progressive Web App (PWA) designed for Rapid Serial Visual Presentation (RSVP) reading of EPUB files. It uses a pure black background and the Solarized color palette to minimize eye strain on OLED displays.

Based on essentially the same thing, but on hardware by John Decebal, published on Instagram [here](https://www.instagram.com/p/DXZtfjNDU4b/?hl=en).

## Features

* **Optimal Recognition Point (ORP):** Words are aligned dynamically based on their length, highlighting the pivot letter in Solarized Orange to keep your eye perfectly anchored.
* **Peripheral Context Window:** Smoothly faded previous and upcoming words provide a lookbehind/lookahead buffer, mitigating the "tunnel vision" effect of traditional RSVP.
* **Pacing Engine:** Automatically adds slight delays for punctuation (commas, periods) and exceptionally long words, mirroring natural reading cadence.
* **Smart Chapter Navigation:** Parses the EPUB spine to automatically detect chapter boundaries and titles, allowing you to easily skip front matter or jump between sections.
* **100% Client-Side:** Uses JSZip to parse EPUB archives entirely within the browser. No server required.
* **Distraction-Free:** Invisible UI with pure gesture-based controls. 

## Controls & Gestures

The reader view hides all UI elements. Interact anywhere on the screen:

* **Tap / Click:** Play or Pause reading.
* **Double-Tap Edges:** Double tap the left 20% or right 20% of the screen to jump to the previous or next chapter.
* **Hold & Drag Vertically:** Adjust reading speed (WPM) on the fly. Drag up to read faster, drag down to slow down.
* **Swipe Horizontally:** Scrub the timeline. Swipe left to rewind 50 words (if you missed a sentence), swipe right to fast-forward.
* **Keyboard Support:** Spacebar (Play/Pause), Up/Down Arrows (Adjust WPM), Left/Right Arrows (Jump 20 words).

## Technical Stack

* HTML5 / Canvas API
* Tailwind CSS (via CDN)
* [JSZip](https://stuk.github.io/jszip/) for EPUB parsing
