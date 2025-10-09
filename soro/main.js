import { initHaptic, triggerHaptic } from "./haptic.js"; document.addEventListener("DOMContentLoaded", () => {
					
            initHaptic();

            const soroban = document.getElementById("soroban");
            const displayValue = document.getElementById("display-value");
            const clearButton = document.getElementById("clear-button");
            const infoButton = document.getElementById("info-button");
            const lessonButton = document.getElementById("lesson-button");
            const modal = document.getElementById('info-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body');
            const closeModalButton = document.getElementById('close-modal-button');

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
                } while ([...String(num1)].some((digit, i) => parseInt(digit) + parseInt(String(num2)[i]) >= 10));
                return { text: `${num1} + ${num2}`, answer: String(num1 + num2) };
            };

            const generateSimpleSubtractionProblem = () => {
                let num1, num2;
                do {
                    num1 = Math.floor(Math.random() * 444) + 555;
                    num2 = Math.floor(Math.random() * 444) + 111;
                } while (num1 < num2 || [...String(num1)].some((digit, i) => parseInt(digit) < parseInt(String(num2)[i])));
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
                return { text: `${num1} + ${num2} - ${num3}`, answer: String(num1 + num2 - num3) };
            };

            const generateDecimalsProblem = () => {
                const num1 = (Math.random() * 9 + 1).toFixed(2);
                const num2 = (Math.random() * 9 + 1).toFixed(2);
                return { text: `${num1} + ${num2}`, answer: String(parseFloat(num1) + parseFloat(num2)) };
            };

            const generateAllOperationsProblem = () => {
                // For simplicity, we'll stick to a multi-step addition/subtraction problem
                const num1 = Math.floor(Math.random() * 88) + 11;
                const num2 = Math.floor(Math.random() * 8) + 2;
                const num3 = Math.floor(Math.random() * 88) + 11;
                return { text: `${num1} * ${num2} + ${num3}`, answer: String(num1 * num2 + num3) };
            };

            const LESSONS = [
                {
                    title: "1. Number Representation",
                    description: "Learn to set numbers on the soroban...",
                    generateProblem: generateRepresentationProblem,
                },
                {
                    title: "2. Simple Addition",
                    description: "Perform simple addition without carrying...",
                    generateProblem: generateSimpleAdditionProblem,
                },
                {
                    title: "3. Simple Subtraction",
                    description: "Practice subtraction that doesn't require borrowing from the next rod.",
                    generateProblem: generateSimpleSubtractionProblem,
                },
                {
                    title: "4. Addition with Carrying",
                    description: "Learn how to handle addition when a column's total is 10 or more.",
                    generateProblem: generateAdditionWithCarryingProblem,
                },
                {
                    title: "5. Subtraction with Borrowing",
                    description: "Master subtracting larger numbers from smaller ones on a single rod by 'borrowing' from the next rod.",
                    generateProblem: generateSubtractionWithBorrowingProblem,
                },
                {
                    title: "6. Introduction to Multiplication",
                    description: "Start with single-digit multiplication to understand the basics.",
                    generateProblem: generateSingleDigitMultiplicationProblem,
                },
                {
                    title: "7. Multi-Digit Multiplication",
                    description: "Expand your multiplication skills to handle larger numbers.",
                    generateProblem: generateMultiDigitMultiplicationProblem,
                },
                {
                    title: "8. Basic Division",
                    description: "Learn the fundamentals of division with single-digit divisors.",
                    generateProblem: generateSingleDigitDivisionProblem,
                },
                {
                    title: "9. Long Division",
                    description: "Tackle more complex division problems.",
                    generateProblem: generateMultiDigitDivisionProblem,
                },
                {
                    title: "10. Combined Operations",
                    description: "Test your skills with problems that mix addition and subtraction.",
                    generateProblem: generateCombinedOperationsProblem,
                },
                {
                    title: "11. Introduction to Decimals",
                    description: "Learn how to represent and manipulate numbers with decimal points on the soroban.",
                    generateProblem: generateDecimalsProblem,
                },
                {
                    title: "12. All Operations Challenge",
                    description: "A final test of your soroban skills with all four operations.",
                    generateProblem: generateAllOperationsProblem,
                }
            ];

            let currentLessonId = null;
            let isLessonActive = false;
            let currentProblem = null;
            let isCurrentProblemSolved = false;
            let hasInteractedInLesson = false;

            function createSoroban() {
                soroban.innerHTML = '';
                for (let i = 0; i < RODS; i++) {
                    const rod = document.createElement("div"); rod.classList.add("rod");
                    const heavenBeadsContainer = document.createElement("div"); heavenBeadsContainer.classList.add("heaven-beads");
                    const heavenBead = createBead("heaven-bead", i, 0, 5);
                    heavenBead.addEventListener("click", () => toggleHeavenBead(heavenBead));
                    heavenBeadsContainer.appendChild(heavenBead);
                    const bar = document.createElement('div'); bar.classList.add('reckoning-bar');
                    const earthBeadsContainer = document.createElement("div"); earthBeadsContainer.classList.add("earth-beads");
                    for (let j = 0; j < 4; j++) { 
                        const earthBead = createBead("earth-bead", i, j, 1);
                        earthBead.addEventListener("click", () => toggleEarthBeads(earthBead));
                        earthBeadsContainer.appendChild(earthBead);
                    }
                    rod.appendChild(heavenBeadsContainer); rod.appendChild(bar); rod.appendChild(earthBeadsContainer);
                    soroban.appendChild(rod);
                }
            }

            function createBead(className, rodIndex, beadIndex, value) {
                const bead = document.createElement("div");
                bead.classList.add("bead", className);
                bead.dataset.rod = rodIndex; bead.dataset.bead = beadIndex; bead.dataset.value = value;
                return bead;
            }

            function handleInteraction() {
                if (isLessonActive && !hasInteractedInLesson) {
                    hasInteractedInLesson = true;
                }
                updateSorobanValue();
            }

            function toggleHeavenBead(bead) {
                triggerHaptic();
                const rodIndex = parseInt(bead.dataset.rod);

                if (isLessonActive) {
                    // Inside a lesson, clicking is ONLY for counting. Lesson selection is locked.
                    bead.classList.toggle("active");
                } else {
                    // Outside a lesson, clicking manages selection AND counting.
                    const lessonId = (RODS - 1) - rodIndex;
                    const wasSelected = bead.classList.contains('lesson-selected');

                    // Clicking a bead always toggles its active state for counting in free-play.
                    bead.classList.toggle('active');

                    // Now, handle the SELECTION logic separately. Only one can be selected.
                    if (!wasSelected) {
                        // If we are selecting a NEW lesson, deselect all others.
                        document.querySelectorAll('.heaven-bead').forEach(hb => {
                            if (hb !== bead) hb.classList.remove('lesson-selected');
                        });
                        bead.classList.add('lesson-selected');
                        currentLessonId = lessonId;
                    } else {
                        // If we are deselecting the current lesson bead.
                        bead.classList.remove('lesson-selected');
                        currentLessonId = null;
                    }
                }
                handleInteraction();
            }

            function toggleEarthBeads(clickedBead) {
                triggerHaptic();
                const beadGroup = Array.from(clickedBead.parentElement.children); 
                const clickedDOMIndex = beadGroup.indexOf(clickedBead);
                if (clickedBead.classList.contains("active")) {
                     beadGroup.forEach((b, i) => { if (i >= clickedDOMIndex) b.classList.remove("active"); });
                } else {
                    beadGroup.forEach((b, i) => { if (i <= clickedDOMIndex) b.classList.add("active"); });
                }
                handleInteraction();
            }
            
            function clearSoroban(exitLesson = true) {
                triggerHaptic();
                document.querySelectorAll('.bead').forEach(b => {
                    b.classList.remove('active');
                    if(exitLesson) b.classList.remove('lesson-selected');
                });
                if (exitLesson) {
                    isLessonActive = false; currentLessonId = null; currentProblem = null;
                    displayValue.textContent = '0'; displayValue.classList.remove('correct');
                }
                updateSorobanValue();
            }

            function updateSorobanValue() {
                sorobanState.fill(0);
                document.querySelectorAll(".bead.active").forEach(b => {
                    sorobanState[b.dataset.rod] += parseInt(b.dataset.value);
                });
                const valStr = sorobanState.join('').replace(/^0+/, '') || '0';
                
                if (isLessonActive) {
                    if (hasInteractedInLesson) {
                        displayValue.textContent = BigInt(valStr).toLocaleString();
                    }
                    checkAnswer(valStr);
                } else {
                    displayValue.textContent = BigInt(valStr).toLocaleString();
                }
            }

            function checkAnswer(currentValue) {
                if (!currentProblem || isCurrentProblemSolved) return;
                if (currentValue === currentProblem.answer) {
                    displayValue.classList.add('correct');
                    isCurrentProblemSolved = true;
                    setTimeout(loadProblem, 1200);
                }
            }

            function startLesson() {
                if (currentLessonId === null || currentLessonId >= LESSONS.length) {
                    alert('Please select a valid lesson first (from the right).');
                    return;
                }
                triggerHaptic();
                isLessonActive = true;
                document.querySelectorAll('.heaven-bead').forEach(b => b.classList.remove('lesson-selected'));
                loadProblem();
            }

            function loadProblem() {
                const lesson = LESSONS[currentLessonId];
                if (!lesson) { isLessonActive = false; return; }
                
                isCurrentProblemSolved = false;
                hasInteractedInLesson = false;
                displayValue.classList.remove('correct');
                currentProblem = lesson.generateProblem();
                displayValue.textContent = currentProblem.text;
                clearSoroban(false);
            }

            function showInfoModal() {
                const lessonToShowId = currentLessonId; // Capture the currently selected lesson ID.

                if (lessonToShowId === null || lessonToShowId >= LESSONS.length) {
                    alert('Please select a lesson first by clicking a top bead (starting from the right).');
                    return;
                }

                // If a lesson is currently active, pressing "I" will exit that lesson.
                if (isLessonActive) {
                    clearSoroban(true);
                }

                // Now, show the info for the captured lesson ID.
                currentLessonId = lessonToShowId;
                const lesson = LESSONS[currentLessonId];

                // Ensure the correct bead is visually selected, as clearSoroban might have removed it.
                const lessonRodIndex = (RODS - 1) - currentLessonId;
                const beadToShow = document.querySelector(`.bead[data-rod='${lessonRodIndex}'].heaven-bead`);
                if (beadToShow) {
                    document.querySelectorAll('.heaven-bead').forEach(hb => hb.classList.remove('lesson-selected'));
                    beadToShow.classList.add('lesson-selected');
                }

                modalTitle.textContent = lesson.title;
                modalBody.innerHTML = lesson.description.replace(/\n/g, '<br>');
                modal.style.display = 'flex';
            }

            // --- Event Listeners ---
            clearButton.addEventListener('click', () => clearSoroban(true));
            infoButton.addEventListener('click', showInfoModal);
            closeModalButton.addEventListener('click', () => modal.style.display = 'none');
            window.addEventListener('click', (e) => { if (e.target == modal) modal.style.display = 'none'; });

            lessonButton.addEventListener('click', () => {
                triggerHaptic();
                if (!isLessonActive) {
                    startLesson();
                }
            });

            createSoroban();
        });