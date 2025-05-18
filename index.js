// index.js

// --- CONSTANTES DEL JUEGO ---
const TOTAL_QUESTIONS_PER_GAME = 25;
const MIN_QUESTIONS_PER_UNIT = 3;
const TOTAL_UNITS = 8; // Número total de unidades temáticas

// --- ESTADO DEL JUEGO ---
let allQuestions = []; // Se llenará con preguntas de todos los módulos
let currentQuestions = []; // Preguntas para la partida actual
let currentQuestionIndex = 0;
let scoreCorrect = 0;
let scoreIncorrect = 0;
let lastGameQuestionIds = []; // IDs de preguntas de la partida anterior

// --- ELEMENTOS DEL DOM ---
let startScreen, gameScreen, endScreen;
let startGameBtn, nextQuestionBtn, playAgainBtn;
let errorMessageP;
let questionCounterP, scoreCounterP;
let questionTextH2, optionsContainerDiv;
let feedbackContainerDiv, feedbackTextP, explanationTextP;
let finalScoreCorrectP, finalScoreIncorrectP;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    assignDOMelements();
    setupEventListeners();
    loadAllQuestions().then(() => {
        console.log("Banco de preguntas cargado. Total de preguntas válidas: " + allQuestions.length);
        if (!areEnoughQuestionsAvailable()) {
            showError("No hay suficientes preguntas variadas en el banco para iniciar el juego. Se requieren al menos 3 preguntas por cada una de las 8 unidades y un total de 25 preguntas únicas para una partida. Contacta al administrador.");
            if(startGameBtn) startGameBtn.disabled = true;
        } else {
            if(startGameBtn) startGameBtn.disabled = false;
        }
    }).catch(error => {
        console.error("Error crítico al cargar las preguntas:", error);
        showError("Error crítico al cargar las preguntas. La aplicación no puede iniciar.");
        if(startGameBtn) startGameBtn.disabled = true;
    });
});

function assignDOMelements() {
    startScreen = document.getElementById('start-screen');
    gameScreen = document.getElementById('game-screen');
    endScreen = document.getElementById('end-screen');
    startGameBtn = document.getElementById('start-game-btn');
    nextQuestionBtn = document.getElementById('next-question-btn');
    playAgainBtn = document.getElementById('play-again-btn');
    errorMessageP = document.getElementById('error-message');
    questionCounterP = document.getElementById('question-counter');
    scoreCounterP = document.getElementById('score-counter');
    questionTextH2 = document.getElementById('question-text');
    optionsContainerDiv = document.getElementById('options-container');
    feedbackContainerDiv = document.getElementById('feedback-container');
    feedbackTextP = document.getElementById('feedback-text');
    explanationTextP = document.getElementById('explanation-text');
    finalScoreCorrectP = document.getElementById('final-score-correct');
    finalScoreIncorrectP = document.getElementById('final-score-incorrect');

    // Verificación de elementos
    const elements = { startScreen, gameScreen, endScreen, startGameBtn, nextQuestionBtn, playAgainBtn, errorMessageP, questionCounterP, scoreCounterP, questionTextH2, optionsContainerDiv, feedbackContainerDiv, feedbackTextP, explanationTextP, finalScoreCorrectP, finalScoreIncorrectP };
    for (const key in elements) {
        if (!elements[key]) {
            console.error(`Error: Elemento del DOM no encontrado - ${key}. La aplicación podría no funcionar correctamente.`);
        }
    }
}

function setupEventListeners() {
    if (startGameBtn) startGameBtn.addEventListener('click', startGame);
    if (nextQuestionBtn) nextQuestionBtn.addEventListener('click', displayNextQuestion);
    if (playAgainBtn) playAgainBtn.addEventListener('click', startGame);
}

// --- LÓGICA DE CARGA DE PREGUNTAS ---
async function loadAllQuestions() {
    console.log("Iniciando carga de todas las preguntas...");
    allQuestions = [];
    const questionModulesPaths = [
        './unit1_questions.js', './unit2_questions.js', './unit3_questions.js',
        './unit4_questions.js', './unit5_questions.js', './unit6_questions.js',
        './unit7_questions.js', './unit8_questions.js'
    ];

    const importPromises = questionModulesPaths.map((path, index) => {
        const unitNumber = index + 1;
        return import(path)
            .then(module => {
                const questionsKey = `unit${unitNumber}Questions`; // ej: unit1Questions
                if (module[questionsKey] && Array.isArray(module[questionsKey])) {
                    // Validar cada pregunta antes de añadirla
                    const validUnitQuestions = module[questionsKey].filter(q => 
                        q && typeof q.id === 'string' && q.id &&
                        q.unit === unitNumber && // Asegurar que la unidad en la pregunta coincida
                        typeof q.questionText === 'string' && q.questionText &&
                        Array.isArray(q.options) && q.options.length === 4 && q.options.every(opt => typeof opt === 'string') &&
                        typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < 4 &&
                        typeof q.explanation === 'string' && q.explanation
                    );
                    allQuestions = allQuestions.concat(validUnitQuestions);
                    console.log(`Preguntas de la unidad ${unitNumber} cargadas y validadas: ${validUnitQuestions.length} preguntas.`);
                    if (validUnitQuestions.length !== module[questionsKey].length) {
                        console.warn(`Algunas preguntas de la unidad ${unitNumber} fueron filtradas por formato incorrecto.`);
                    }
                } else {
                    console.warn(`No se encontraron preguntas o el formato es incorrecto para la unidad ${unitNumber} en ${path}`);
                }
            })
            .catch(error => {
                console.error(`Error al importar el módulo de preguntas para la unidad ${unitNumber} desde ${path}:`, error);
                // No se añaden preguntas de este módulo, pero se continúa con los demás.
            });
    });

    await Promise.all(importPromises);

    // Eliminar duplicados por ID, por si acaso
    const uniqueQuestionIds = new Set();
    allQuestions = allQuestions.filter(q => {
        if (uniqueQuestionIds.has(q.id)) {
            console.warn(`ID de pregunta duplicado eliminado globalmente: ${q.id}`);
            return false;
        }
        uniqueQuestionIds.add(q.id);
        return true;
    });

    console.log("Carga de todas las preguntas completada. Total de preguntas únicas y válidas: " + allQuestions.length);
}


function areEnoughQuestionsAvailable() {
    if (allQuestions.length < TOTAL_QUESTIONS_PER_GAME) {
        console.warn(`Insuficientes preguntas totales: ${allQuestions.length} (necesarias: ${TOTAL_QUESTIONS_PER_GAME})`);
        return false;
    }

    const questionsByUnit = {};
    allQuestions.forEach(q => {
        if (!questionsByUnit[q.unit]) {
            questionsByUnit[q.unit] = [];
        }
        questionsByUnit[q.unit].push(q);
    });

    for (let i = 1; i <= TOTAL_UNITS; i++) {
        if (!questionsByUnit[i] || questionsByUnit[i].length < MIN_QUESTIONS_PER_UNIT) {
            console.warn(`Unidad ${i} no tiene suficientes preguntas: ${questionsByUnit[i] ? questionsByUnit[i].length : 0} (necesarias: ${MIN_QUESTIONS_PER_UNIT})`);
            return false; // Todas las unidades deben cumplir el mínimo
        }
    }
    console.log("Suficientes preguntas disponibles para iniciar el juego.");
    return true;
}

// --- LÓGICA DE SELECCIÓN DE PREGUNTAS ---
function selectGameQuestions() {
    let selectedQuestions = [];
    let availablePool = [...allQuestions]; // Copia para trabajar
    const questionsByUnit = {};

    // Agrupar todas las preguntas por unidad
    allQuestions.forEach(q => {
        if (!questionsByUnit[q.unit]) questionsByUnit[q.unit] = [];
        questionsByUnit[q.unit].push(q);
    });

    // 1. Garantizar representación mínima por unidad
    for (let unit = 1; unit <= TOTAL_UNITS; unit++) {
        let unitCandidates = questionsByUnit[unit] ? [...questionsByUnit[unit]] : [];
        if (unitCandidates.length === 0) continue; // Ya validado en areEnoughQuestionsAvailable

        // Intentar seleccionar preguntas no usadas en la partida anterior
        let unitSelection = unitCandidates.filter(q => !lastGameQuestionIds.includes(q.id));
        
        // Si no hay suficientes "nuevas", permitir repetición de la unidad para cumplir el mínimo
        if (unitSelection.length < MIN_QUESTIONS_PER_UNIT) {
            const neededFromOld = MIN_QUESTIONS_PER_UNIT - unitSelection.length;
            const oldCandidatesFromUnit = unitCandidates.filter(q => lastGameQuestionIds.includes(q.id) && !unitSelection.find(us => us.id === q.id));
            unitSelection.push(...oldCandidatesFromUnit.sort(() => 0.5 - Math.random()).slice(0, neededFromOld));
        }
        
        // Tomar MIN_QUESTIONS_PER_UNIT aleatoriamente de los candidatos de la unidad
        unitSelection = unitSelection.sort(() => 0.5 - Math.random()); // Mezclar candidatos de la unidad
        
        let countForUnit = 0;
        for (const question of unitSelection) {
            if (countForUnit < MIN_QUESTIONS_PER_UNIT && !selectedQuestions.find(sq => sq.id === question.id)) {
                selectedQuestions.push(question);
                countForUnit++;
            }
            if (countForUnit === MIN_QUESTIONS_PER_UNIT) break;
        }
    }
    
    // Filtrar las ya seleccionadas del pool disponible general
    availablePool = availablePool.filter(q => !selectedQuestions.find(sq => sq.id === q.id));

    // 2. Completar aleatoriamente hasta TOTAL_QUESTIONS_PER_GAME
    let remainingNeeded = TOTAL_QUESTIONS_PER_GAME - selectedQuestions.length;

    if (remainingNeeded > 0) {
        // Priorizar preguntas no seleccionadas para garantía y no en lastGameQuestionIds
        let potentialAdditions = availablePool.filter(q => !lastGameQuestionIds.includes(q.id));

        // Si no hay suficientes "nuevas", considerar las de lastGameQuestionIds que no estén ya en selectedQuestions
        if (potentialAdditions.length < remainingNeeded) {
            const oldButNotSelected = availablePool.filter(q => lastGameQuestionIds.includes(q.id));
            potentialAdditions.push(...oldButNotSelected.filter(op => !potentialAdditions.find(pa => pa.id === op.id)));
        }
        
        potentialAdditions = potentialAdditions.sort(() => 0.5 - Math.random()); // Mezclar

        for (const question of potentialAdditions) {
            if (remainingNeeded <= 0) break;
            if (!selectedQuestions.find(sq => sq.id === question.id)) {
                selectedQuestions.push(question);
                remainingNeeded--;
            }
        }
    }
    
    // 3. Mezcla Final del conjunto de preguntas de la partida
    for (let i = selectedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedQuestions[i], selectedQuestions[j]] = [selectedQuestions[j], selectedQuestions[i]];
    }
    
    console.log(`Preguntas seleccionadas para la partida (${selectedQuestions.length}):`, selectedQuestions.map(q=>q.id));
    return selectedQuestions.slice(0, TOTAL_QUESTIONS_PER_GAME); // Asegurar que no exceda el total
}


// --- LÓGICA DEL JUEGO ---
function startGame() {
    console.log("Iniciando juego...");
    if (!areEnoughQuestionsAvailable()) {
        showError("No hay suficientes preguntas variadas para iniciar. Se necesitan al menos 3 por unidad y 25 en total.");
        if(startGameBtn) startGameBtn.disabled = true;
        // Asegurar que solo se muestra la pantalla de inicio
        if(startScreen) startScreen.classList.remove('hidden');
        if(gameScreen) gameScreen.classList.add('hidden');
        if(endScreen) endScreen.classList.add('hidden');
        return;
    }

    if(errorMessageP) errorMessageP.classList.add('hidden');
    if(startGameBtn) startGameBtn.disabled = false;

    currentQuestions = selectGameQuestions();
    
    // Si después de la selección aún no hay suficientes (poco probable si areEnoughQuestionsAvailable pasó)
    if (currentQuestions.length < TOTAL_QUESTIONS_PER_GAME) {
        // Esto es un fallback, idealmente areEnoughQuestionsAvailable previene esto.
        // Podríamos ajustar TOTAL_QUESTIONS_PER_GAME dinámicamente si es aceptable jugar con menos.
        // Por ahora, si no se alcanzan las 25, es un problema.
        showError(`No se pudieron seleccionar las ${TOTAL_QUESTIONS_PER_GAME} preguntas requeridas (obtenidas: ${currentQuestions.length}). Intenta recargar.`);
        if(startScreen) startScreen.classList.remove('hidden');
        if(gameScreen) gameScreen.classList.add('hidden');
        if(endScreen) endScreen.classList.add('hidden');
        return;
    }

    currentQuestionIndex = 0;
    scoreCorrect = 0;
    scoreIncorrect = 0;
    updateScoreDisplay();

    if(startScreen) startScreen.classList.add('hidden');
    if(endScreen) endScreen.classList.add('hidden');
    if(gameScreen) gameScreen.classList.remove('hidden');

    displayNextQuestion();
}

function displayNextQuestion() {
    if (currentQuestionIndex < currentQuestions.length) {
        const question = currentQuestions[currentQuestionIndex];
        if (!question || !question.options) { // Salvaguarda por si una pregunta es undefined
            console.error("Error: Pregunta inválida o incompleta en el índice actual:", currentQuestionIndex, question);
            showError("Error al cargar la pregunta. Intentando la siguiente.");
            currentQuestionIndex++;
            displayNextQuestion(); // Intentar cargar la siguiente
            return;
        }

        if(questionTextH2) questionTextH2.textContent = question.questionText;
        if(optionsContainerDiv) optionsContainerDiv.innerHTML = '';

        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.classList.add('btn', 'option-btn', 'w-full', 'text-left', 'p-3', 'hover:bg-slate-50', 'rounded-md', 'border', 'border-slate-300', 'bg-white', 'text-slate-700');
            button.textContent = option;
            button.dataset.index = index;
            button.addEventListener('click', handleAnswer);
            if(optionsContainerDiv) optionsContainerDiv.appendChild(button);
        });

        if(feedbackContainerDiv) feedbackContainerDiv.classList.add('hidden');
        if(nextQuestionBtn) nextQuestionBtn.classList.add('hidden');
        updateQuestionCounter();
    } else {
        endGame();
    }
}

function handleAnswer(event) {
    const selectedOptionButton = event.target;
    const selectedAnswerIndex = parseInt(selectedOptionButton.dataset.index);
    const question = currentQuestions[currentQuestionIndex];

    if (!question) {
        console.error("Error: No se pudo obtener la pregunta actual al manejar la respuesta.");
        // Podría intentar avanzar o finalizar el juego
        endGame(); 
        return;
    }


    const optionButtons = optionsContainerDiv.querySelectorAll('.option-btn');
    optionButtons.forEach(btn => {
        btn.disabled = true;
        // Quitar clases de hover para que no interfieran con los colores de feedback
        btn.classList.remove('hover:bg-slate-50');
    });

    if (selectedAnswerIndex === question.correctAnswerIndex) {
        scoreCorrect++;
        selectedOptionButton.classList.remove('bg-white', 'border-slate-300', 'text-slate-700');
        selectedOptionButton.classList.add('correct'); // Verde
        if(feedbackTextP) {
            feedbackTextP.textContent = "¡Respuesta Correcta!";
            feedbackTextP.className = 'text-lg font-medium mb-2 text-emerald-600';
        }
    } else {
        scoreIncorrect++;
        selectedOptionButton.classList.remove('bg-white', 'border-slate-300', 'text-slate-700');
        selectedOptionButton.classList.add('incorrect'); // Rojo
        
        // Resaltar la correcta también
        const correctButton = optionButtons[question.correctAnswerIndex];
        if (correctButton) {
            correctButton.classList.remove('bg-white', 'border-slate-300', 'text-slate-700');
            correctButton.classList.add('correct'); // Verde
        }
        
        if(feedbackTextP) {
            feedbackTextP.textContent = "Respuesta Incorrecta.";
            feedbackTextP.className = 'text-lg font-medium mb-2 text-red-600';
        }
    }

    if(explanationTextP) explanationTextP.textContent = question.explanation;
    if(feedbackContainerDiv) feedbackContainerDiv.classList.remove('hidden');
    if(nextQuestionBtn) nextQuestionBtn.classList.remove('hidden');
    updateScoreDisplay();

    currentQuestionIndex++;
}

function updateQuestionCounter() {
    if(questionCounterP) questionCounterP.textContent = `Pregunta ${Math.min(currentQuestionIndex + 1, currentQuestions.length)} / ${currentQuestions.length}`;
}

function updateScoreDisplay() {
    if(scoreCounterP) scoreCounterP.textContent = `Aciertos: ${scoreCorrect} | Fallos: ${scoreIncorrect}`;
}

function endGame() {
    if(gameScreen) gameScreen.classList.add('hidden');
    if(endScreen) endScreen.classList.remove('hidden');
    if(finalScoreCorrectP) finalScoreCorrectP.textContent = `Aciertos: ${scoreCorrect}`;
    if(finalScoreIncorrectP) finalScoreIncorrectP.textContent = `Fallos: ${scoreIncorrect}`;

    lastGameQuestionIds = currentQuestions.map(q => q.id);
    console.log("IDs de la partida finalizada (para evitar repetición):", lastGameQuestionIds);
}

function showError(message) {
    if (errorMessageP) {
        errorMessageP.textContent = message;
        errorMessageP.classList.remove('hidden');
    }
    console.error("Mensaje de error mostrado al usuario:", message);
}
