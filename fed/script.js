document.addEventListener("DOMContentLoaded", () => {
  const outputElem = document.getElementById("output");
  const commandInput = document.getElementById("command-input");
  const promptElem = document.querySelector(".prompt");
  const exerciseGoalElem = document.getElementById("exercise-goal");
  const nextExerciseBtn = document.getElementById("next-exercise-btn");
  const exerciseFeedbackElem = document.getElementById("exercise-feedback");
  const terminalElem = document.querySelector(".terminal");
  let buffer = [];
  let currentLine = 0; // 0-indexed for JS array, will map to 1-indexed for ed commands
  let inputMode = false;
  let inputBuffer = [];
  let showPrompt = true; // For the 'P' command
  let verboseErrors = false; // For the 'H' command

  // --- ed Simulator Core Functions ---

  function print(start, end) {
    let output = "";
    if (buffer.length === 0) {
      outputMessage("?", "error");
      return;
    }

    start = start === undefined ? currentLine + 1 : start;
    end = end === undefined ? start : end;

    if (start < 1 || end > buffer.length || start > end) {
      outputMessage("?", "error");
      return;
    }

    for (let i = start - 1; i < end; i++) {
      output += buffer[i] + "\n";
    }
    outputMessage(output);
    currentLine = end - 1; // Set current line to the last printed line
  }

  function numberPrint(start, end) {
    let output = "";
    if (buffer.length === 0) {
      outputMessage("?", "error");
      return;
    }

    start = start === undefined ? currentLine + 1 : start;
    end = end === undefined ? start : end;

    if (start < 1 || end > buffer.length || start > end) {
      outputMessage("?", "error");
      return;
    }

    for (let i = start - 1; i < end; i++) {
      output += `${i + 1}\t${buffer[i]}\n`;
    }
    outputMessage(output);
    currentLine = end - 1; // Set current line to the last printed line
  }

  function append(text) {
    if (buffer.length === 0) {
      buffer.push(...text);
      currentLine = buffer.length > 0 ? buffer.length - 1 : 0;
    } else {
      buffer.splice(currentLine + 1, 0, ...text);
      currentLine += text.length;
    }
  }

  function insert(text) {
    buffer.splice(currentLine, 0, ...text);
    // currentLine does not change in ed insert usually, but here we keep it simple
    // If buffer was empty, currentLine would still be 0. If inserted at 0, currentLine is still 0.
  }

  function change(start, end, text) {
    if (start < 1 || end > buffer.length || start > end) {
      outputMessage("?", "error");
      return;
    }
    buffer.splice(start - 1, end - start + 1, ...text);
    currentLine = start - 1 + text.length - 1; // Set current line to the last new line
    if (currentLine < 0) currentLine = 0; // Prevent negative currentLine if buffer becomes empty
  }

  function deleteLines(start, end) {
    start = start === undefined ? currentLine + 1 : start;
    end = end === undefined ? start : end;

    if (start < 1 || end > buffer.length || start > end) {
      outputMessage("?", "error");
      return;
    }
    buffer.splice(start - 1, end - start + 1);
    if (buffer.length === 0) {
      currentLine = 0;
    } else if (currentLine >= buffer.length) {
      currentLine = buffer.length - 1;
    } else {
      currentLine = start - 1; // Set current line to the line after deleted block, or end of buffer
    }
  }

  function substitute(command) {
    const parts = command.match(/s\/(.+?)\/(.*?)\/(g?)/);
    if (!parts) {
      outputMessage("?", "error");
      return;
    }
    const regexStr = parts[1];
    const replacement = parts[2];
    const global = parts[3] === "g";

    if (buffer.length === 0) {
      outputMessage("?", "error");
      return;
    }

    let regex;
    try {
      regex = new RegExp(regexStr, global ? "g" : "");
    } catch (e) {
      outputMessage("?", "error");
      return;
    }

    const originalLine = buffer[currentLine];
    const newLine = originalLine.replace(regex, replacement);

    if (originalLine !== newLine) {
      buffer[currentLine] = newLine;
      // outputMessage(newLine); // ed usually prints the modified line
      return true; // Indicates a successful substitution
    } else {
      // If no substitution made, ed usually returns '?'
      outputMessage("?", "error");
      return false;
    }
  }

  function parseAddress(addressStr) {
    if (!addressStr) {
      return { start: currentLine + 1, end: currentLine + 1 };
    }

    // --- ADDED SHORTHANDS ---
    if (addressStr === "," || addressStr === "%") {
      return { start: 1, end: buffer.length || 1 };
    }
    // --- END OF ADDED SHORTHANDS ---

    if (addressStr === ".") {
      return { start: currentLine + 1, end: currentLine + 1 };
    }
    if (addressStr === "$") {
      return { start: buffer.length, end: buffer.length };
    }

    if (addressStr.includes(",")) {
      let [s, e] = addressStr.split(",");
      // Handle empty parts of a range, e.g., ",$" becomes "1,$"
      let startAddr = s === "" ? 1 : parseSingleAddress(s);
      let endAddr = e === "" ? buffer.length : parseSingleAddress(e);
      return { start: startAddr, end: endAddr };
    }

    let addr = parseSingleAddress(addressStr);
    return { start: addr, end: addr };
  }

  function parseSingleAddress(addr) {
    if (addr === ".") return currentLine + 1;
    if (addr === "$") return buffer.length;
    if (addr === "") return currentLine + 1; // Default to current if not specified
    const num = parseInt(addr, 10);
    if (!isNaN(num) && num >= 1 && num <= buffer.length) return num;
    // Basic regex search (forward only for simplicity)
    if (addr.startsWith("/") && addr.endsWith("/")) {
      const regexStr = addr.slice(1, -1);
      try {
        const regex = new RegExp(regexStr);
        for (let i = currentLine + 1; i < buffer.length; i++) {
          if (buffer[i].match(regex)) {
            currentLine = i;
            return i + 1;
          }
        }
        for (let i = 0; i <= currentLine; i++) {
          // Wrap around
          if (buffer[i].match(regex)) {
            currentLine = i;
            return i + 1;
          }
        }
      } catch (e) {
        /* Invalid regex */
      }
    }
    return -1; // Invalid address
  }

  function outputMessage(message, type = "info") {
    const lineBreak = outputElem.textContent === "" ? "" : "\n";
    if (type === "error" && verboseErrors) {
      outputElem.textContent += `${lineBreak}? ${message}`;
    } else if (type === "error") {
      outputElem.textContent += `${lineBreak}?`;
    } else {
      // This handles printing the user's command input
      const commandLine = type === "command" ? message : `${message}`;
      outputElem.textContent += `${lineBreak}${commandLine}`;
    }
    // Corrected line: scrolls the container div instead of the text element
    terminalElem.scrollTop = terminalElem.scrollHeight;
  }

  function processCommand(command) {
    command = command.trim();
    if (command === "") {
      // Empty command moves to next line and prints it
      if (buffer.length > 0) {
        currentLine++;
        if (currentLine >= buffer.length) {
          currentLine = 0; // Wrap around to start or stay on last line if already at end
        }
        print(currentLine + 1);
      } else {
        outputMessage("?", "error");
      }
      return;
    }

    const match = command.match(/^([0-9.,$]*)?([a-zPpHqQ])/i);
    let address = null;
    let cmd = command;

    if (match) {
      if (match[1]) address = match[1];
      cmd = match[2]; // The single-character command
      let restOfCommand = command.substring(match[0].length).trim(); // For s command or numbers after
      if (cmd === "s")
        cmd += restOfCommand; // Attach rest for s command
      else if (cmd.match(/\d/)) {
        // If it's just a number for direct line navigation
        address = match[0];
        cmd = ""; // No command, just address
      }
    }

    let range;
    if (address) {
      range = parseAddress(address);
      if (
        range.start === -1 ||
        range.end === -1 ||
        range.start > buffer.length ||
        range.end > buffer.length
      ) {
        outputMessage("?", "error");
        return;
      }
      if (!cmd && range.start === range.end) {
        // Just a number, go to line and print
        currentLine = range.start - 1;
        print(range.start);
        return;
      }
      if (!cmd && range.start !== range.end) {
        // e.g., '1,3' - print range
        print(range.start, range.end);
        return;
      }
    } else {
      range = { start: currentLine + 1, end: currentLine + 1 };
    }

    switch (cmd[0]) {
      case "a":
        inputMode = true;
        break;
      case "i":
        inputMode = true;
        // For 'i' currentLine is target for insertion
        break;
      case "c":
        inputMode = true;
        // For 'c' currentLine needs to be set to the start of the range
        currentLine = range.start - 1;
        break;
      case "d":
        deleteLines(range.start, range.end);
        break;
      case "p":
        print(range.start, range.end);
        break;
      case "n":
        numberPrint(range.start, range.end);
        break;
      case "s":
        // --- FIX IS HERE ---
        let anySuccess = false;
        for (let i = range.start - 1; i < range.end; i++) {
          // Temporarily set currentLine for substitute function to use
          currentLine = i;
          if (substitute(cmd)) {
            anySuccess = true;
          }
        }
        if (anySuccess) {
          // On success, ed prints only the last modified line
          print(currentLine + 1);
        } else {
          outputMessage("?", "error");
        }
        break;
      case "q":
        outputMessage("Type 'w' to save (simulated) and 'q' again to exit.");
        outputMessage("Or 'Q' to quit without saving.");
        break;
      case "Q":
        resetSimulator();
        outputMessage("Simulator reset. Type 'reset' to restart buffer.");
        break;
      case "w":
        outputMessage("File saved (simulated).");
        if (currentExercise && checkExerciseCompletion()) {
          exerciseFeedbackElem.className = "feedback success";
          exerciseFeedbackElem.textContent = "Exercise complete! Well done!";
        } else if (currentExercise) {
          exerciseFeedbackElem.className = "feedback error";
          exerciseFeedbackElem.textContent =
            "Not quite there yet. Keep trying!";
        }
        break;
      case "h":
        outputMessage(getHelpMessage());
        break;
      case "H":
        verboseErrors = !verboseErrors;
        outputMessage(
          `Verbose errors ${verboseErrors ? "enabled" : "disabled"}.`,
        );
        break;
      case "P":
        showPrompt = !showPrompt;
        promptElem.textContent = showPrompt ? "*" : "";
        break;
      default:
        outputMessage("?", "error");
        break;
    }
    if (inputMode) {
      commandInput.classList.add("input-mode");
      promptElem.textContent = "";
    } else {
      commandInput.classList.remove("input-mode");
      promptElem.textContent = showPrompt ? "*" : "";
    }
  }

  function getHelpMessage() {
    return `
ed commands:
a      - Append text after current line
i      - Insert text before current line
c      - Change lines
d      - Delete lines
p      - Print lines
n      - Number and print lines
s/old/new/g - Substitute (g for global)
w      - Write/Save (simulated)
q      - Warn before quitting
Q      - Quit without warning (resets simulator)
.      - Exit input mode / refer to current line
$      - Refer to last line
1,$p   - Print all lines
/regex/ - Search for regex (forward)
H      - Toggle verbose error messages
P      - Toggle prompt
reset  - Reset buffer (custom command)
`;
  }

  function handleInputMode(line) {
    if (line === ".") {
      inputMode = false;
      let targetBuffer;
      const commandChar = bufferHistory[bufferHistory.length - 1][0]; // Get the last command that entered input mode

      if (commandChar === "a") {
        targetBuffer = inputBuffer.slice(); // Copy
        append(targetBuffer);
      } else if (commandChar === "i") {
        targetBuffer = inputBuffer.slice();
        insert(targetBuffer);
      } else if (commandChar === "c") {
        targetBuffer = inputBuffer.slice();
        // 'c' command needs its range resolved from the original command
        const originalCmd = bufferHistory[bufferHistory.length - 1];
        const match = originalCmd.match(/^(\d*(?:,\d*)?)?c/);
        let address = match && match[1] ? match[1] : "";
        const range = parseAddress(address);
        if (range.start === -1) {
          // Fallback if address was invalid
          range.start = currentLine + 1;
          range.end = currentLine + 1;
        }
        change(range.start, range.end, targetBuffer);
      }
      inputBuffer = []; // Clear for next input
      promptElem.textContent = showPrompt ? "*" : "";
      commandInput.classList.remove("input-mode");
    } else {
      inputBuffer.push(line);
    }
  }

  let bufferHistory = []; // To store the command that initiated input mode

  commandInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const command = commandInput.value;
      outputMessage(`${showPrompt ? "*" : ""}${command}`, "command");
      commandInput.value = "";

      if (inputMode) {
        handleInputMode(command);
      } else if (command === "reset") {
        resetSimulator();
        outputMessage("Simulator reset. Buffer cleared.");
      } else {
        bufferHistory.push(command); // Store for input mode context
        processCommand(command);
      }
    }
  });

  // --- Exercise Logic ---

  let currentExercise = null;

  const exercises = [
    {
      goal: "Append a new line saying 'Hello ed!' to the buffer.",
      initial: ["Line 1", "Line 2"],
      validate: (buf) => buf.includes("Hello ed!"),
      hints: [
        "Use the 'a' command to append.",
        "Remember to type '.' on a new line to exit input mode.",
      ],
    },
    {
      goal: "Change the second line to 'This is the new second line.'.",
      initial: ["First line", "Second line", "Third line"],
      validate: (buf) => buf[1] === "This is the new second line.",
      hints: [
        "Use the 'c' command.",
        "Address the second line with '2c'.",
        "Exit input mode with '.'",
      ],
    },
    {
      goal: "Delete the first line of the buffer.",
      initial: ["Line to delete", "Keep this line", "Keep this too"],
      validate: (buf) => buf.length === 2 && !buf.includes("Line to delete"),
      hints: ["Use the 'd' command.", "To delete the first line, use '1d'."],
    },
    {
      goal: "Substitute 'world' with 'universe' on the current line.",
      initial: ["Hello world!", "Another line."],
      setup: (buf) => {
        currentLine = 0;
      }, // Ensure currentLine is set for 's'
      validate: (buf) => buf[0] === "Hello universe!",
      hints: [
        "Use the 's/old/new/' command.",
        "The current line ('.') is used if no address is given.",
      ],
    },
    {
      goal: "Replace all occurrences of 'foo' with 'bar' in the entire buffer.",
      initial: ["foo bar foo", "baz foo qux", "foo foo"],
      validate: (buf) => buf.every((line) => !line.includes("foo")),
      hints: [
        "You'll need a range for the substitution, like '1,$'.",
        "Don't forget the 'g' flag for global replacement on each line.",
        "Example: `1,$s/foo/bar/g`",
      ],
    },
    {
      goal: "Insert a line 'Inserted line.' before the first line.",
      initial: ["Original first line", "Second line"],
      validate: (buf) =>
        buf[0] === "Inserted line." && buf[1] === "Original first line",
      hints: [
        "Use the 'i' command. To insert before the first line, use '1i'.",
        "Type '.' to exit input mode.",
      ],
    },
  ];

  function loadNewExercise() {
    const randomIndex = Math.floor(Math.random() * exercises.length);
    currentExercise = exercises[randomIndex];

    resetSimulator();
    buffer = [...currentExercise.initial]; // Copy initial buffer for modification
    if (currentExercise.setup) {
      currentExercise.setup(buffer); // Run any specific setup for the exercise
    }
    outputMessage(
      `Buffer initialized. Current line: ${currentLine + 1}.`,
      "info",
    );

    exerciseGoalElem.textContent = currentExercise.goal;
    exerciseFeedbackElem.className = "feedback";
    exerciseFeedbackElem.textContent = "";
    commandInput.focus();
  }

  function checkExerciseCompletion() {
    if (!currentExercise) return false;
    return currentExercise.validate(buffer);
  }

  function resetSimulator() {
    buffer = [];
    currentLine = 0;
    inputMode = false;
    inputBuffer = [];
    outputElem.textContent = ""; // Clear terminal output
    promptElem.textContent = showPrompt ? "*" : "";
    commandInput.classList.remove("input-mode");
    bufferHistory = [];
  }

  nextExerciseBtn.addEventListener("click", loadNewExercise);

  // Initial load
  loadNewExercise();
});
