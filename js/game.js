/**
 * game.js - Основная логика игры (Версия 2.0 с исправлениями)
 * Управление состоянием, ходами, взаимодействием с UI
 */

class Game {
    constructor() {
        this.deck = new Deck();
        this.board = new Board(8);
        
        this.state = {
            hand: [],
            currentShape: null,
            currentShapeCards: [],
            turn: 1,
            clocksUsed: 0,
            eventsTriggered: {
                fireworks: false,
                lambada: false,
                toast: false
            },
            specialActionsUsed: {
                lights_out: false,
                masquerade: false,
                dancefloor: false
            },
            score: 0,
            gameEnded: false,
            placementMode: false // Новый флаг для режима размещения
        };
        
        this.selectedCard = null;
        this.shapeRotation = 0;
        this.debugMode = false; // Режим отладки
        
        this.init();
    }

    /**
     * Инициализация игры
     */
    init() {
        console.log('🎮 Инициализация игры...');
        
        this.deck.initGuestDeck();
        this.deck.initShapeDeck();
        
        // Начальная рука из 3 карт
        this.state.hand = [
            this.deck.drawGuest(),
            this.deck.drawGuest(),
            this.deck.drawGuest()
        ].filter(card => card !== null);
        
        this.renderHand();
        this.renderBoard();
        this.renderDeckInfo();
        this.updateUI();
        
        this.attachEventListeners();
        
        console.log('✅ Игра готова!', this.getStateSummary());
    }

    /**
     * Краткая сводка состояния для отладки
     */
    getStateSummary() {
        return {
            handSize: this.state.hand.length,
            deckSize: this.deck.getGuestDeckCount(),
            shapeDeckSize: this.deck.getShapeDeckCount(),
            turn: this.state.turn,
            clocksUsed: this.state.clocksUsed
        };
    }

    /**
     * Отрисовка руки игрока
     */
    renderHand() {
        const handContainer = document.getElementById('player-hand');
        if (!handContainer) return;
        
        handContainer.innerHTML = '';
        
        this.state.hand.forEach((card, index) => {
            if (!card) return;
            
            const cardElement = document.createElement('div');
            cardElement.className = `card ${this.selectedCard === index ? 'selected' : ''}`;
            cardElement.dataset.index = index;
            cardElement.innerHTML = `
                <div class="card-type">${card.icon}</div>
                <div class="card-name">${card.name}</div>
                <div class="card-rarity ${card.rarity}">${this.getRarityName(card.rarity)}</div>
            `;
            
            cardElement.addEventListener('click', () => this.selectCard(index));
            handContainer.appendChild(cardElement);
        });
        
        console.log('📋 Рука отрисована:', this.state.hand.length, 'карт');
    }

    /**
     * Получение названия редкости
     */
    getRarityName(rarity) {
        const names = {
            common: 'Обычный',
            rare: 'Редкий',
            legendary: 'Легендарный',
            bad: 'Плохой'
        };
        return names[rarity] || rarity;
    }

    /**
     * Выбор карты из руки
     */
    selectCard(index) {
        if (this.selectedCard === index) {
            this.selectedCard = null;
        } else {
            this.selectedCard = index;
        }
        this.renderHand();
        console.log('🃏 Выбрана карта:', index);
    }

    /**
     * Отрисовка игрового поля
     */
    renderBoard() {
        const boardContainer = document.getElementById('game-board');
        if (!boardContainer) return;
        
        boardContainer.innerHTML = '';
        
        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                const cell = this.board.grid[row][col];
                const cellElement = document.createElement('div');
                cellElement.className = `board-cell ${cell.occupied ? 'occupied' : ''} ${cell.isAuthority ? 'authority' : ''}`;
                cellElement.dataset.row = row;
                cellElement.dataset.col = col;
                
                // Подсветка для режима размещения
                if (this.state.placementMode && this.state.currentShape) {
                    if (this.board.canPlaceShape(this.state.currentShape, row, col, this.shapeRotation)) {
                        cellElement.style.background = '#d5f5e3';
                        cellElement.style.cursor = 'pointer';
                    } else {
                        cellElement.style.background = '#fadbd8';
                        cellElement.style.cursor = 'not-allowed';
                    }
                }
                
                if (cell.isAuthority) {
                    const auth = this.board.authorities.find(a => a.row === row && a.col === col);
                    cellElement.innerHTML = `
                        <div class="board-cell-content">${auth?.authority.icon || '★'}</div>
                        <div class="board-cell-label">${auth?.authority.name || ''}</div>
                    `;
                } else if (cell.occupied && cell.content) {
                    cellElement.innerHTML = `
                        <div class="board-cell-content">${cell.content.icon}</div>
                    `;
                }
                
                cellElement.addEventListener('click', () => this.handleCellClick(row, col));
                boardContainer.appendChild(cellElement);
            }
        }
        
        this.renderZones();
        this.renderShape();
    }

    /**
     * Отрисовка зон (ров и мост)
     */
    renderZones() {
        const bridgeContainer = document.getElementById('bridge-cards');
        const moatContainer = document.getElementById('moat-cards');
        
        if (bridgeContainer) {
            bridgeContainer.innerHTML = '';
            this.board.bridge.forEach(card => {
                if (!card) return;
                const miniCard = document.createElement('div');
                miniCard.className = 'mini-card';
                miniCard.textContent = card.icon;
                miniCard.title = card.name;
                bridgeContainer.appendChild(miniCard);
            });
        }
        
        if (moatContainer) {
            moatContainer.innerHTML = '';
            this.board.moat.forEach(card => {
                if (!card) return;
                const miniCard = document.createElement('div');
                miniCard.className = 'mini-card';
                miniCard.textContent = card.icon;
                miniCard.title = card.name;
                moatContainer.appendChild(miniCard);
            });
        }
    }

    /**
     * Отрисовка текущей фигуры
     */
    renderShape() {
        const shapePreview = document.getElementById('shape-preview');
        if (!shapePreview) return;
        
        shapePreview.innerHTML = '';
        
        if (!this.state.currentShape) {
            shapePreview.innerHTML = '<p style="color: #7f8c8d; font-size: 0.9rem;">Нажмите "Взять фигуру"</p>';
            return;
        }
        
        const shape = this.state.currentShape;
        const rotatedCells = this.board.rotateShape(shape.cells, this.shapeRotation);
        
        // Находим размеры фигуры
        const maxRow = Math.max(...rotatedCells.map(c => c[0]));
        const maxCol = Math.max(...rotatedCells.map(c => c[1]));
        
        shapePreview.style.gridTemplateRows = `repeat(${maxRow + 1}, 1fr)`;
        shapePreview.style.gridTemplateColumns = `repeat(${maxCol + 1}, 1fr)`;
        
        // Создаём сетку для фигуры
        const gridMap = new Map();
        rotatedCells.forEach((cell, index) => {
            gridMap.set(`${cell[0]},${cell[1]}`, index);
        });
        
        for (let row = 0; row <= maxRow; row++) {
            for (let col = 0; col <= maxCol; col++) {
                const cellElement = document.createElement('div');
                const key = `${row},${col}`;
                
                if (gridMap.has(key)) {
                    const cardIndex = gridMap.get(key);
                    const card = this.state.currentShapeCards[cardIndex];
                    
                    cellElement.className = 'shape-cell';
                    cellElement.textContent = card ? card.icon : '?';
                    
                    if (card) {
                        cellElement.style.background = this.getCardColor(card.rarity);
                        cellElement.title = card.name;
                    }
                } else {
                    cellElement.className = 'shape-cell empty';
                }
                
                shapePreview.appendChild(cellElement);
            }
        }
    }

    /**
     * Получение цвета карты по редкости
     */
    getCardColor(rarity) {
        const colors = {
            common: '#3498db',
            rare: '#9b59b6',
            legendary: '#f39c12',
            bad: '#e74c3c'
        };
        return colors[rarity] || '#3498db';
    }

    /**
     * Отрисовка информации о колоде
     */
    renderDeckInfo() {
        const guestCount = document.getElementById('guest-deck-count');
        const shapeCount = document.getElementById('shape-deck-count');
        
        if (guestCount) guestCount.textContent = this.deck.getGuestDeckCount();
        if (shapeCount) shapeCount.textContent = this.deck.getShapeDeckCount();
    }

    /**
     * Обновление UI
     */
    updateUI() {
        const scoreEl = document.getElementById('current-score');
        const turnEl = document.getElementById('current-turn');
        const clocksEl = document.getElementById('clocks-used');
        
        if (scoreEl) scoreEl.textContent = this.state.score;
        if (turnEl) turnEl.textContent = this.state.turn;
        if (clocksEl) clocksEl.textContent = this.state.clocksUsed;
        
        // Обновление кнопок особых действий
        const lightsBtn = document.getElementById('btn-lights-out');
        const masqueradeBtn = document.getElementById('btn-masquerade');
        const dancefloorBtn = document.getElementById('btn-dancefloor');
        
        if (lightsBtn) lightsBtn.disabled = this.state.specialActionsUsed.lights_out;
        if (masqueradeBtn) masqueradeBtn.disabled = this.state.specialActionsUsed.masquerade;
        if (dancefloorBtn) dancefloorBtn.disabled = this.state.specialActionsUsed.dancefloor;
        
        // Обновление кнопок событий
        const fireworksBtn = document.getElementById('btn-fireworks');
        const lambadaBtn = document.getElementById('btn-lambada');
        const toastBtn = document.getElementById('btn-toast');
        
        if (fireworksBtn) fireworksBtn.disabled = this.state.eventsTriggered.fireworks;
        if (lambadaBtn) lambadaBtn.disabled = this.state.eventsTriggered.lambada;
        if (toastBtn) toastBtn.disabled = this.state.eventsTriggered.toast;
        
        // Обновление статистики
        const unusedActions = Object.values(this.state.specialActionsUsed).filter(used => !used).length;
        const scoreBreakdown = this.board.calculateTotalScore(unusedActions);
        
        const statGroups = document.getElementById('stat-groups');
        const statUnicorns = document.getElementById('stat-unicorns');
        const statActions = document.getElementById('stat-actions');
        const statPenalties = document.getElementById('stat-penalties');
        
        if (statGroups) statGroups.textContent = scoreBreakdown.groups;
        if (statUnicorns) statUnicorns.textContent = scoreBreakdown.unicorns;
        if (statActions) statActions.textContent = Object.values(this.state.specialActionsUsed).filter(used => used).length;
        if (statPenalties) statPenalties.textContent = scoreBreakdown.moatPenalty;
        
        if (this.debugMode) {
            console.log('📊 Обновление UI:', scoreBreakdown);
        }
    }

    /**
     * Взять новую фигуру
     */
    drawShape() {
        if (this.state.currentShape) {
            alert('Сначала разместите текущую фигуру!');
            return;
        }
        
        const shape = this.deck.drawShape();
        if (!shape) {
            alert('Колода фигур пуста!');
            return;
        }
        
        if (shape.isEvent) {
            // Карта часов - событие
            this.state.clocksUsed++;
            console.log('🕐 Карта часов! Событие:', shape.event.name);
            this.triggerEvent(shape.event);
            this.state.currentShape = null;
            this.state.currentShapeCards = [];
        } else {
            this.state.currentShape = shape;
            this.state.currentShapeCards = new Array(shape.cells.length).fill(null);
            this.shapeRotation = 0;
            console.log('🔷 Новая фигура:', shape.name, 'ячеек:', shape.cells.length);
        }
        
        this.renderShape();
        this.updateUI();
        this.renderDeckInfo();
    }

    /**
     * Заполнение фигуры картами из руки
     */
    fillShapeWithCards() {
        if (!this.state.currentShape) return;
        
        for (let i = 0; i < this.state.currentShapeCards.length; i++) {
            if (this.state.currentShapeCards[i] === null) {
                if (this.selectedCard !== null && this.state.hand[this.selectedCard]) {
                    // Используем выбранную карту
                    this.state.currentShapeCards[i] = this.state.hand[this.selectedCard];
                    this.state.hand.splice(this.selectedCard, 1);
                    this.selectedCard = null;
                } else if (this.state.hand.length > 0) {
                    // Берём первую доступную карту
                    this.state.currentShapeCards[i] = this.state.hand.shift();
                } else {
                    // Добираем из колоды
                    this.state.currentShapeCards[i] = this.deck.drawGuest();
                }
            }
        }
        
        this.renderHand();
        this.renderShape();
    }

    /**
     * Размещение фигуры на поле
     */
    placeShape() {
        if (!this.state.currentShape) {
            alert('Сначала возьмите фигуру!');
            return;
        }
        
        // Заполняем фигуру картами
        this.fillShapeWithCards();
        
        // Проверяем, все ли ячейки заполнены
        const emptySlots = this.state.currentShapeCards.filter(c => c === null).length;
        if (emptySlots > 0) {
            alert(`Заполните все ${emptySlots} пустых ячеек фигуры картами!`);
            return;
        }
        
        // Включаем режим размещения
        this.state.placementMode = true;
        this.renderBoard();
        
        alert('Выберите клетку на поле для размещения фигуры (верхний левый угол)');
    }

    /**
     * Обработка клика по клетке поля
     */
    handleCellClick(row, col) {
        if (!this.state.placementMode || !this.state.currentShape) {
            return;
        }
        
        if (this.board.canPlaceShape(this.state.currentShape, row, col, this.shapeRotation)) {
            const placedCards = this.board.placeShape(
                this.state.currentShape,
                row,
                col,
                this.state.currentShapeCards,
                this.shapeRotation
            );
            
            console.log('✅ Фигура размещена:', placedCards.length, 'карт');
            
            // Сброс текущей фигуры
            this.state.currentShape = null;
            this.state.currentShapeCards = [];
            this.state.placementMode = false;
            this.state.turn++;
            
            // Пополнение руки
            this.refillHand();
            
            this.renderBoard();
            this.renderHand();
            this.renderShape();
            this.updateUI();
            this.renderDeckInfo();
            
            // Проверка на конец игры
            if (this.state.clocksUsed >= 3) {
                this.endGame();
            }
        } else {
            console.log('❌ Невозможно разместить фигуру в этой позиции');
        }
    }

    /**
     * Размещение карты в ров или на мост
     */
    placeCardToZone(card, zone) {
        if (!card) return;
        
        this.board.placeOutOfBoard(card, zone);
        
        // Удаляем карту из руки если она там есть
        const index = this.state.hand.indexOf(card);
        if (index > -1) {
            this.state.hand.splice(index, 1);
        }
        
        this.renderZones();
        this.renderHand();
        this.updateUI();
        
        console.log(`📍 Карта размещена в ${zone}:`, card.name);
    }

    /**
     * Пополнение руки
     */
    refillHand() {
        while (this.state.hand.length < 3) {
            const card = this.deck.drawGuest();
            if (card) {
                this.state.hand.push(card);
            } else {
                break;
            }
        }
        console.log('🔄 Рука пополнена:', this.state.hand.length, 'карт');
    }

    /**
     * Триггер события
     */
    triggerEvent(event) {
        const modal = document.getElementById('event-modal');
        if (!modal) return;
        
        modal.classList.add('active');
        
        const eventButtons = document.querySelectorAll('.modal-event-btn');
        eventButtons.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', () => {
                const eventType = newBtn.dataset.event;
                this.activateEvent(eventType);
                modal.classList.remove('active');
            }, { once: true });
        });
    }

    /**
     * Активация события
     */
    activateEvent(eventType) {
        if (this.state.eventsTriggered[eventType]) {
            console.log('⚠️ Событие уже активировано:', eventType);
            return;
        }
        
        this.state.eventsTriggered[eventType] = true;
        
        let points = 0;
        switch (eventType) {
            case 'fireworks':
                points = this.board.calculateFireworksScore();
                break;
            case 'lambada':
                points = this.board.calculateLambadaScore();
                break;
            case 'toast':
                points = this.board.calculateToastScore();
                break;
        }
        
        this.state.score += points;
        this.updateUI();
        
        console.log(`🎉 Событие "${eventType}" активировано! Очков: ${points}`);
        alert(`Событие "${eventType}" активировано!\nПолучено очков: ${points}`);
    }

    /**
     * Завершение игры
     */
    endGame() {
        if (this.state.gameEnded) return;
        
        this.state.gameEnded = true;
        
        const unusedActions = Object.values(this.state.specialActionsUsed).filter(used => !used).length;
        const finalScore = this.board.calculateTotalScore(unusedActions);
        
        const message = `🎉 Игра окончена! 🎉\n\n` +
              `Итоговый счёт: ${finalScore.total}\n\n` +
              `📊 Детализация:\n` +
              `• Группы: ${finalScore.groups}\n` +
              `• Единороги: ${finalScore.unicorns}\n` +
              `• Авторитеты: ${finalScore.authorities}\n` +
              `• Штрафы: ${finalScore.moatPenalty}\n` +
              `• Бонус за действия: ${finalScore.actionBonus}`;
        
        console.log(message);
        alert(message);
    }

    /**
     * Привязка обработчиков событий
     */
    attachEventListeners() {
        const drawShapeBtn = document.getElementById('btn-draw-shape');
        const placeShapeBtn = document.getElementById('btn-place-shape');
        const endTurnBtn = document.getElementById('btn-end-turn');
        const resetGameBtn = document.getElementById('btn-reset-game');
        const closeModalBtn = document.getElementById('close-modal');
        
        if (drawShapeBtn) drawShapeBtn.addEventListener('click', () => this.drawShape());
        if (placeShapeBtn) placeShapeBtn.addEventListener('click', () => this.placeShape());
        if (endTurnBtn) endTurnBtn.addEventListener('click', () => {
            this.state.turn++;
            this.updateUI();
            console.log('🔄 Ход завершён:', this.state.turn);
        });
        if (resetGameBtn) resetGameBtn.addEventListener('click', () => {
            if (confirm('Начать новую игру?')) {
                location.reload();
            }
        });
        if (closeModalBtn) closeModalBtn.addEventListener('click', () => {
            document.getElementById('event-modal').classList.remove('active');
        });
        
        // Особые действия
        const lightsBtn = document.getElementById('btn-lights-out');
        const masqueradeBtn = document.getElementById('btn-masquerade');
        const dancefloorBtn = document.getElementById('btn-dancefloor');
        
        if (lightsBtn) lightsBtn.addEventListener('click', () => {
            if (this.state.specialActionsUsed.lights_out) return;
            this.state.specialActionsUsed.lights_out = true;
            this.updateUI();
            alert('Действие "Тушите свет" активировано!\nТеперь можно поменять карты местами в фигуре.');
            console.log('🌙 Тушите свет активировано');
        });
        
        if (masqueradeBtn) masqueradeBtn.addEventListener('click', () => {
            if (this.state.specialActionsUsed.masquerade) return;
            this.state.specialActionsUsed.masquerade = true;
            this.updateUI();
            alert('Действие "Маскарад" активировано!\nТеперь можно заменить один символ на любой другой.');
            console.log('🎭 Маскарад активировано');
        });
        
        if (dancefloorBtn) dancefloorBtn.addEventListener('click', () => {
            if (this.state.specialActionsUsed.dancefloor) return;
            if (!this.state.currentShape) {
                alert('Сначала возьмите фигуру!');
                return;
            }
            this.shapeRotation = (this.shapeRotation + 1) % 4;
            this.state.specialActionsUsed.dancefloor = true;
            this.renderShape();
            this.updateUI();
            console.log('💃 Фигура повернута, ротация:', this.shapeRotation);
        });
        
        // Кнопки для отправки карт в ров/мост
        this.attachZoneButtons();
        
        console.log('✅ Обработчики событий привязаны');
    }

    /**
     * Привязка кнопок для зон (ров/мост)
     */
    attachZoneButtons() {
        // Создаём кнопки если их нет
        const handSection = document.querySelector('.hand-section');
        if (handSection && !document.getElementById('zone-buttons')) {
            const zoneButtonsDiv = document.createElement('div');
            zoneButtonsDiv.id = 'zone-buttons';
            zoneButtonsDiv.className = 'zone-buttons';
            zoneButtonsDiv.innerHTML = `
                <button class="zone-btn moat-btn" id="btn-to-moat">🚫 В ров</button>
                <button class="zone-btn bridge-btn" id="btn-to-bridge">🌉 На мост</button>
            `;
            handSection.appendChild(zoneButtonsDiv);
            
            document.getElementById('btn-to-moat').addEventListener('click', () => {
                if (this.selectedCard !== null && this.state.hand[this.selectedCard]) {
                    this.placeCardToZone(this.state.hand[this.selectedCard], 'moat');
                    this.selectedCard = null;
                } else {
                    alert('Выберите карту для отправки в ров!');
                }
            });
            
            document.getElementById('btn-to-bridge').addEventListener('click', () => {
                if (this.selectedCard !== null && this.state.hand[this.selectedCard]) {
                    this.placeCardToZone(this.state.hand[this.selectedCard], 'bridge');
                    this.selectedCard = null;
                } else {
                    alert('Выберите карту для отправки на мост!');
                }
            });
        }
    }

    /**
     * Включение/выключение режима отладки
     */
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        console.log('🔧 Режим отладки:', this.debugMode ? 'ВКЛ' : 'ВЫКЛ');
        if (this.debugMode) {
            console.log('📊 Текущее состояние:', this.getStateSummary());
        }
    }
}

// Запуск игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎓 uAnalytiCon загружается...');
    window.game = new Game();
    console.log('✅ Игра инициализирована');
    
    // Добавляем команду для отладки в консоль
    console.log('💡 Используйте game.toggleDebugMode() для включения режима отладки');
    console.log('💡 Используйте game.getStateSummary() для просмотра состояния');
});