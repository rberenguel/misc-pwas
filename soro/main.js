import { initHaptic, triggerHaptic } from "./haptic.js";
document.addEventListener("DOMContentLoaded", () => {
  initHaptic();

  const soroban = document.getElementById("soroban");
  const displayValue = document.getElementById("display-value");
  const problemDisplay = document.getElementById("problem-display");
  const clearButton = document.getElementById("clear-button");
  const infoButton = document.getElementById("info-button");
  const lessonButton = document.getElementById("lesson-button");
  const modal = document.getElementById("info-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const closeModalButton = document.getElementById("close-modal-button");

  const RODS = 12;
  let sorobanState = Array(RODS).fill(0);

  const generateRepresentationProblem = () => {
    const num = Math.floor(Math.random() * 999) + 10; // 2 or 3 digit numbers
    return { text: `Set: ${num}`, answer: String(num) };
  };

  const generateSimpleAdditionProblem = () => {
    let num1, num2;
    do {
      num1 = Math.floor(Math.random() * 444) + 111; // 3-digit numbers
      num2 = Math.floor(Math.random() * 444) + 111;
    } while (
      [...String(num1)].some(
        (digit, i) => parseInt(digit) + parseInt(String(num2)[i]) >= 10,
      )
    );
    return { text: `${num1} + ${num2}`, answer: String(num1 + num2) };
  };

  const generateSimpleSubtractionProblem = () => {
    let num1, num2;
    do {
      num1 = Math.floor(Math.random() * 444) + 555;
      num2 = Math.floor(Math.random() * 444) + 111;
    } while (
      num1 < num2 ||
      [...String(num1)].some(
        (digit, i) => parseInt(digit) < parseInt(String(num2)[i]),
      )
    );
    return { text: `${num1} - ${num2}`, answer: String(num1 - num2) };
  };

  const generateAdditionWithCarryingProblem = () => {
    const num1 = Math.floor(Math.random() * 888) + 111;
    const num2 = Math.floor(Math.random() * 888) + 111;
    return { text: `${num1} + ${num2}`, answer: String(num1 + num2) };
  };

  const generateSubtractionWithBorrowingProblem = () => {
    let num1 = Math.floor(Math.random() * 444) + 111;
    let num2 = Math.floor(Math.random() * 444) + 555;
    if (num1 < num2) [num1, num2] = [num2, num1];
    return { text: `${num1} - ${num2}`, answer: String(num1 - num2) };
  };

  const generateSingleDigitMultiplicationProblem = () => {
    const num1 = Math.floor(Math.random() * 88) + 11;
    const num2 = Math.floor(Math.random() * 8) + 2;
    return { text: `${num1} * ${num2}`, answer: String(num1 * num2) };
  };

  const generateMultiDigitMultiplicationProblem = () => {
    const num1 = Math.floor(Math.random() * 88) + 11;
    const num2 = Math.floor(Math.random() * 88) + 11;
    return { text: `${num1} * ${num2}`, answer: String(num1 * num2) };
  };

  const generateSingleDigitDivisionProblem = () => {
    const divisor = Math.floor(Math.random() * 8) + 2;
    const quotient = Math.floor(Math.random() * 88) + 11;
    const dividend = divisor * quotient;
    return { text: `${dividend} / ${divisor}`, answer: String(quotient) };
  };

  const generateMultiDigitDivisionProblem = () => {
    const divisor = Math.floor(Math.random() * 88) + 11;
    const quotient = Math.floor(Math.random() * 88) + 11;
    const dividend = divisor * quotient;
    return { text: `${dividend} / ${divisor}`, answer: String(quotient) };
  };

  const generateCombinedOperationsProblem = () => {
    const num1 = Math.floor(Math.random() * 500) + 100;
    const num2 = Math.floor(Math.random() * 500) + 100;
    const num3 = Math.floor(Math.random() * 500) + 100;
    return {
      text: `${num1} + ${num2} - ${num3}`,
      answer: String(num1 + num2 - num3),
    };
  };

  const generateDecimalsProblem = () => {
    const num1 = (Math.random() * 9 + 1).toFixed(2);
    const num2 = (Math.random() * 9 + 1).toFixed(2);
    return {
      text: `${num1} + ${num2}`,
      answer: String(parseFloat(num1) + parseFloat(num2)),
    };
  };

  const generateAllOperationsProblem = () => {
    // For simplicity, we'll stick to a multi-step addition/subtraction problem
    const num1 = Math.floor(Math.random() * 88) + 11;
    const num2 = Math.floor(Math.random() * 8) + 2;
    const num3 = Math.floor(Math.random() * 88) + 11;
    return {
      text: `${num1} * ${num2} + ${num3}`,
      answer: String(num1 * num2 + num3),
    };
  };

  const LESSONS = [
    {
      title: "1. Number Representation",
      description:
        "To represent a number, move beads towards the center reckoning bar. Each bead in the top 'heaven' deck is worth 5, and each in the bottom 'earth' deck is worth 1. For example, to make the number 7 on a rod, you move down one heaven bead (5) and move up two earth beads (2).",
      generateProblem: generateRepresentationProblem,
    },
    {
      title: "2. Simple Addition",
      description:
        "Set the first number on the soroban, starting from the right. To add the second number, simply move the corresponding beads towards the reckoning bar for each digit. For example, to add 2 to 5, you move two earth beads up on the rod that shows 5.",
      generateProblem: generateSimpleAdditionProblem,
    },
    {
      title: "3. Simple Subtraction",
      description:
        "Set the first number on the soroban. To subtract, move beads away from the reckoning bar. For example, to subtract 3 from 8, you would move three earth beads down.",
      generateProblem: generateSimpleSubtractionProblem,
    },
    {
      title: "4. Addition with Carrying",
      description:
        "When a rod's value exceeds 9, you must 'carry over'. For example, to add 8 to 6: start with 6 on a rod. To add 8, you can use a 10's complement: add 1 to the next rod on the left (add 10) and subtract 2 from the current rod. The result is 14.",
      generateProblem: generateAdditionWithCarryingProblem,
    },
    {
      title: "5. Subtraction with Borrowing",
      description:
        "If you need to subtract a larger digit from a smaller one on a rod, you 'borrow' from the left. For example, to subtract 9 from 14: start with 14. On the units rod (4), you need to subtract 9. Borrow 1 from the tens rod (making it 0), then subtract 9 from 14 on the units rod by using a 10's complement: subtract 10 (by borrowing) and add 1. The result is 5.",
      generateProblem: generateSubtractionWithBorrowingProblem,
    },
    {
      title: "6. Introduction to Multiplication",
      description:
        "Set the multiplicand (e.g., 54) on the right side of the soroban and the multiplier (e.g., 3) on the left. Multiply the first digit of the multiplicand (5) by the multiplier (3) to get 15. Place this result in the rods immediately to the left of the multiplicand. Then, multiply the next digit (4) by the multiplier (3) to get 12 and add it to the previous result, shifted one rod to the right. The final answer is 162.",
      generateProblem: generateSingleDigitMultiplicationProblem,
    },
    {
      title: "7. Multi-Digit Multiplication",
      description:
        "This extends the same principle. Multiply each digit of the multiplicand by each digit of the multiplier, carefully placing the partial products in the correct rods. For example, for 23 * 14, first multiply 23 by 4 to get 92. Then multiply 23 by 10 to get 230. Add these results (92 + 230) on the soroban to get 322.",
      generateProblem: generateMultiDigitMultiplicationProblem,
    },
    {
      title: "8. Basic Division",
      description:
        "Set the dividend on the right and the divisor on the left. For 84 / 4: ask how many times 4 goes into 8. The answer is 2. Place 2 on a rod to the left of the dividend. Subtract 4 * 2 = 8 from the dividend. Now, see how many times 4 goes into the remaining 4. The answer is 1. Place 1 next to the 2. The result is 21.",
      generateProblem: generateSingleDigitDivisionProblem,
    },
    {
      title: "9. Long Division",
      description:
        "Similar to basic division, but involves more steps of estimation, multiplication, and subtraction, especially with multi-digit divisors. For 276 / 12: How many times does 12 go into 27? Two times. Place 2 as the first digit of the quotient. Subtract 12 * 2 = 24 from 27, leaving 3. Bring down the 6 to make 36. How many times does 12 go into 36? Three times. Place 3 as the next digit of the quotient. The result is 23.",
      generateProblem: generateMultiDigitDivisionProblem,
    },
    {
      title: "10. Combined Operations",
      description:
        "Perform operations in sequence. For 15 + 21 - 8: first set 15. Then add 21 to get 36. From this result, subtract 8 to get the final answer, 28. Keep track of the intermediate results on the soroban.",
      generateProblem: generateCombinedOperationsProblem,
    },
    {
      title: "11. Introduction to Decimals",
      description:
        "Designate a specific rod as the units rod (where the decimal point is). Rods to the right represent tenths, hundredths, and so on. Then, perform operations as usual, being mindful of the decimal point's location. For 1.5 + 2.3, set 1 on the units rod and 5 on the tenths rod. Then add 2 to the units and 3 to the tenths to get 3.8.",
      generateProblem: generateDecimalsProblem,
    },
    {
      title: "12. All Operations Challenge",
      description:
        "This is a test of your soroban mastery. Apply all the techniques you've learned—addition, subtraction, multiplication, and division—to solve complex, multi-step problems. Pay close attention to the order of operations.",
      generateProblem: generateAllOperationsProblem,
    },
  ];

  let currentLessonId = null;
  let isLessonActive = false;
  let currentProblem = null;
  let isCurrentProblemSolved = false;

  function createSoroban() {
    soroban.innerHTML = "";
    for (let i = 0; i < RODS; i++) {
      const rod = document.createElement("div");
      rod.classList.add("rod");
      const heavenBeadsContainer = document.createElement("div");
      heavenBeadsContainer.classList.add("heaven-beads");
      const heavenBead = createBead("heaven-bead", i, 0, 5);
      heavenBead.addEventListener("click", () => toggleHeavenBead(heavenBead));
      heavenBeadsContainer.appendChild(heavenBead);
      const bar = document.createElement("div");
      bar.classList.add("reckoning-bar");
      const earthBeadsContainer = document.createElement("div");
      earthBeadsContainer.classList.add("earth-beads");
      for (let j = 0; j < 4; j++) {
        const earthBead = createBead("earth-bead", i, j, 1);
        earthBead.addEventListener("click", () => toggleEarthBeads(earthBead));
        earthBeadsContainer.appendChild(earthBead);
      }
      rod.appendChild(heavenBeadsContainer);
      rod.appendChild(bar);
      rod.appendChild(earthBeadsContainer);
      soroban.appendChild(rod);
    }
  }

  function createBead(className, rodIndex, beadIndex, value) {
    const bead = document.createElement("div");
    bead.classList.add("bead", className);
    bead.dataset.rod = rodIndex;
    bead.dataset.bead = beadIndex;
    bead.dataset.value = value;
    return bead;
  }

  function toggleHeavenBead(bead) {
    triggerHaptic();
    const rodIndex = parseInt(bead.dataset.rod);

    if (isLessonActive) {
      bead.classList.toggle("active");
    } else {
      const lessonId = RODS - 1 - rodIndex;
      const wasSelected = bead.classList.contains("lesson-selected");

      bead.classList.toggle("active");

      if (!wasSelected) {
        document.querySelectorAll(".heaven-bead").forEach((hb) => {
          if (hb !== bead) hb.classList.remove("lesson-selected");
        });
        bead.classList.add("lesson-selected");
        currentLessonId = lessonId;
      } else {
        bead.classList.remove("lesson-selected");
        currentLessonId = null;
      }
    }
    updateSorobanValue();
  }

  function toggleEarthBeads(clickedBead) {
    triggerHaptic();
    const beadGroup = Array.from(clickedBead.parentElement.children);
    const clickedDOMIndex = beadGroup.indexOf(clickedBead);
    if (clickedBead.classList.contains("active")) {
      beadGroup.forEach((b, i) => {
        if (i >= clickedDOMIndex) b.classList.remove("active");
      });
    } else {
      beadGroup.forEach((b, i) => {
        if (i <= clickedDOMIndex) b.classList.add("active");
      });
    }
    updateSorobanValue();
  }

  function clearSoroban(exitLesson = true) {
    triggerHaptic();
    document.querySelectorAll(".bead").forEach((b) => {
      b.classList.remove("active");
      if (exitLesson) b.classList.remove("lesson-selected");
    });
    if (exitLesson) {
      isLessonActive = false;
      currentLessonId = null;
      currentProblem = null;
      displayValue.textContent = "0";
      displayValue.classList.remove("correct");
      problemDisplay.textContent = "";
    }
    updateSorobanValue();
  }

  function updateSorobanValue() {
    sorobanState.fill(0);
    document.querySelectorAll(".bead.active").forEach((b) => {
      sorobanState[b.dataset.rod] += parseInt(b.dataset.value);
    });
    const valStr = sorobanState.join("").replace(/^0+/, "") || "0";

    displayValue.textContent = BigInt(valStr).toLocaleString();

    if (isLessonActive) {
      checkAnswer(valStr);
    }
  }

  function checkAnswer(currentValue) {
    if (!currentProblem || isCurrentProblemSolved) return;
    if (currentValue === currentProblem.answer) {
      displayValue.classList.add("correct");
      isCurrentProblemSolved = true;
      setTimeout(loadProblem, 1200);
    }
  }

  function startLesson() {
    if (currentLessonId === null || currentLessonId >= LESSONS.length) {
      alert("Please select a valid lesson first (from the right).");
      return;
    }
    triggerHaptic();
    isLessonActive = true;
    document
      .querySelectorAll(".heaven-bead")
      .forEach((b) => b.classList.remove("lesson-selected"));
    loadProblem();
  }

  function loadProblem() {
    const lesson = LESSONS[currentLessonId];
    if (!lesson) {
      isLessonActive = false;
      return;
    }

    isCurrentProblemSolved = false;
    displayValue.classList.remove("correct");
    currentProblem = lesson.generateProblem();
    problemDisplay.textContent = currentProblem.text;
    displayValue.textContent = "0";
    clearSoroban(false);
  }

  function showInfoModal() {
    const lessonToShowId = currentLessonId;

    if (lessonToShowId === null || lessonToShowId >= LESSONS.length) {
      alert(
        "Please select a lesson first by clicking a top bead (starting from the right).",
      );
      return;
    }
    if (isLessonActive) {
      clearSoroban(true);
    }
    currentLessonId = lessonToShowId;
    const lesson = LESSONS[currentLessonId];

    const lessonRodIndex = RODS - 1 - currentLessonId;
    const beadToShow = document.querySelector(
      `.bead[data-rod='${lessonRodIndex}'].heaven-bead`,
    );
    if (beadToShow) {
      document
        .querySelectorAll(".heaven-bead")
        .forEach((hb) => hb.classList.remove("lesson-selected"));
      beadToShow.classList.add("lesson-selected");
    }

    modalTitle.textContent = lesson.title;
    modalBody.innerHTML = lesson.description.replace(/\n/g, "<br>");
    modal.style.display = "flex";
  }

  // --- Event Listeners ---
  clearButton.addEventListener("click", () => clearSoroban(true));
  infoButton.addEventListener("click", showInfoModal);
  closeModalButton.addEventListener(
    "click",
    () => (modal.style.display = "none"),
  );
  window.addEventListener("click", (e) => {
    if (e.target == modal) modal.style.display = "none";
  });

  lessonButton.addEventListener("click", () => {
    triggerHaptic();
    if (!isLessonActive) {
      startLesson();
    }
  });

  createSoroban();
});
