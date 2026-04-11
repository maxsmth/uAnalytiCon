/**
 * game.js - Основная логика игры
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
            gameEnded: false
        };

        this.selectedCard = null;
        this.shapeRotation = 0;

        this.init();
    }

    /**
     * Инициализация игры
     */
    init() {
        this.deck.initGuestDeck();
        this.deck.initShapeDeck();
        this.state.hand = [
            this.deck.drawGuest(),
            this.deck.drawGuest(),
            this.deck.drawGuest()
        ];

        this.renderHand();
        this.renderBoard();
        this.renderDeckInfo();
        this.updateUI();

        this.attachEventListeners();
    }

    /**
     * Отрисовка руки игрока
     */
    renderHand() {
        const handContainer = document.getElementById('player-hand');
        handContainer.innerHTML = '';

        this.state.hand.forEach((card, index) => {
            if (!card) return;

            const cardElement = document.createElement('div');
            cardElement.className = `card ${this.selectedCard === index ? 'selected' : ''}`;
            cardElement.innerHTML = `
                <div class="card-type">${card.icon}</div>
                <div class="card-name">${card.name}</div>
                <div class="card-rarity ${card.rarity}">${this.getRarityName(card.rarity)}</div>
            `;

            cardElement.addEventListener('click', () => this.selectCard(index));
            handContainer.appendChild(cardElement);
        });
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
    }

    /**
     * Отрисовка игрового поля
     */
    renderBoard() {
        const boardContainer = document.getElementById('game-board');
        boardContainer.innerHTML = '';

        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                const cell = this.board.grid[row][col];
                const cellElement = document.createElement('div');
                cellElement.className = `board-cell ${cell.occupied ? 'occupied' : ''} ${cell.isAuthority ? 'authority' : ''}`;
                cellElement.dataset.row = row;
                cellElement.dataset.col = col;

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
    }

    /**
     * Отрисовка зон (ров и мост)
     */
    renderZones() {
        const bridgeContainer = document.getElementById('bridge-cards');
        const moatContainer = document.getElementById('moat-cards');

        bridgeContainer.innerHTML = '';
        moatContainer.innerHTML = '';

        this.board.bridge.forEach(card => {
            const miniCard = document.createElement('div');
            miniCard.className = 'mini-card';
            miniCard.textContent = card.icon;
            bridgeContainer.appendChild(miniCard);
        });

        this.board.moat.forEach(card => {
            const miniCard = document.createElement('div');
            miniCard.className = 'mini-card';
            miniCard.textContent = card.icon;
            moatContainer.appendChild(miniCard);
        });
    }

    /**
     * Отрисовка текущей фигуры
     */
    renderShape() {
        const shapePreview = document.getElementById('shape-preview');
        shapePreview.innerHTML = '';

        if (!this.state.currentShape) {
            shapePreview.innerHTML = '<p>Нажмите "Взять фигуру"</p>';
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
        document.getElementById('guest-deck-count').textContent = this.deck.getGuestDeckCount();
        document.getElementById('shape-deck-count').textContent = this.deck.getShapeDeckCount();
    }

    /**
     * Обновление UI
     */
    updateUI() {
        document.getElementById('current-score').textContent = this.state.score;
        document.getElementById('current-turn').textContent = this.state.turn;
        document.getElementById('clocks-used').textContent = this.state.clocksUsed;

        // Обновление кнопок особых действий
        document.getElementById('btn-lights-out').disabled = this.state.specialActionsUsed.lights_out;
        document.getElementById('btn-masquerade').disabled = this.state.specialActionsUsed.masquerade;
        document.getElementById('btn-dancefloor').disabled = this.state.specialActionsUsed.dancefloor;

        // Обновление кнопок событий
        document.getElementById('btn-fireworks').disabled = this.state.eventsTriggered.fireworks;
        document.getElementById('btn-lambada').disabled = this.state.eventsTriggered.lambada;
        document.getElementById('btn-toast').disabled = this.state.eventsTriggered.toast;

        // Обновление статистики
        const scoreBreakdown = this.board.calculateTotalScore(
            Object.values(this.state.specialActionsUsed).filter(used => !used).length
        );

        document.getElementById('stat-groups').textContent = scoreBreakdown.groups;
        document.getElementById('stat-unicorns').textContent = scoreBreakdown.unicorns;
        document.getElementById('stat-actions').textContent =
            Object.values(this.state.specialActionsUsed).filter(used => used).length;
        document.getElementById('stat-penalties').textContent = scoreBreakdown.moatPenalty;

        this.renderShape();
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
            this.triggerEvent(shape.event);
            this.state.currentShape = null;
            this.state.currentShapeCards = [];
        } else {
            this.state.currentShape = shape;
            this.state.currentShapeCards = new Array(shape.cells.length).fill(null);
            this.shapeRotation = 0;
        }

        this.renderShape();
        this.updateUI();
    }

    /**
     * Размещение фигуры на поле
     */
    placeShape() {
        if (!this.state.currentShape) {
            alert('Сначала возьмите фигуру!');
            return;
        }

        // Проверяем, все ли ячейки фигуры заполнены картами
        const emptySlots = this.state.currentShapeCards.filter(c => c === null).length;
        if (emptySlots > 0) {
            // Автоматически заполняем пустые слоты картами из руки или колоды
            for (let i = 0; i < this.state.currentShapeCards.length; i++) {
                if (this.state.currentShapeCards[i] === null) {
                    if (this.state.hand.length > 0) {
                        this.state.currentShapeCards[i] = this.state.hand.shift();
                    } else {
                        this.state.currentShapeCards[i] = this.deck.drawGuest();
                    }
                }
            }
        }

        alert('Выберите клетку на поле для размещения фигуры (верхний левый угол)');
        // В полной версии здесь будет интерактивный выбор позиции
    }

    /**
     * Обработка клика по клетке поля
     */
    handleCellClick(row, col) {
        if (!this.state.currentShape) return;

        if (this.board.canPlaceShape(this.state.currentShape, row, col, this.shapeRotation)) {
            this.board.placeShape(
                this.state.currentShape,
                row,
                col,
                this.state.currentShapeCards,
                this.shapeRotation
            );

            // Сброс карт из руки которые были использованы
            this.refillHand();

            // Сброс текущей фигуры
            this.state.currentShape = null;
            this.state.currentShapeCards = [];

            this.state.turn++;

            this.renderBoard();
            this.renderHand();
            this.renderShape();
            this.updateUI();

            // Проверка на конец игры
            if (this.state.clocksUsed >= 3) {
                this.endGame();
            }
        } else {
            alert('Невозможно разместить фигуру в этой позиции!');
        }
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
    }

    /**
     * Триггер события
     */
    triggerEvent(event) {
        const modal = document.getElementById('event-modal');
        modal.classList.add('active');

        const eventButtons = document.querySelectorAll('.modal-event-btn');
        eventButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const eventType = btn.dataset.event;
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
            return;
        }

        this.state.eventsTriggered[eventType] = true;

        let points = 0;
        switch (eventType) {
            case 'fireworks':
                points = this.board.calculateFireworksScore();
                break;
            case 'lambada':
                // Логика для ламбады
                points = 0;
                break;
            case 'toast':
                // Логика для тоста
                points = 0;
                break;
        }

        this.state.score += points;
        this.updateUI();

        alert(`Событие "${eventType}" активировано! Получено очков: ${points}`);
    }

    /**
     * Завершение игры
     */
    endGame() {
        this.state.gameEnded = true;

        const finalScore = this.board.calculateTotalScore(
            Object.values(this.state.specialActionsUsed).filter(used => !used).length
        );

        alert(`🎉 Игра окончена! 🎉\n\nИтоговый счёт: ${finalScore.total}\n` +
              `Группы: ${finalScore.groups}\n` +
              `Единороги: ${finalScore.unicorns}\n` +
              `Авторитеты: ${finalScore.authorities}\n` +
              `Штрафы: ${finalScore.moatPenalty}\n` +
              `Бонус за действия: ${finalScore.actionBonus}`);
    }

    /**
     * Привязка обработчиков событий
     */
    attachEventListeners() {
        document.getElementById('btn-draw-shape').addEventListener('click', () => this.drawShape());
        document.getElementById('btn-place-shape').addEventListener('click', () => this.placeShape());
        document.getElementById('btn-end-turn').addEventListener('click', () => {
            this.state.turn++;
            this.updateUI();
        });
        document.getElementById('btn-reset-game').addEventListener('click', () => {
            if (confirm('Начать новую игру?')) {
                location.reload();
            }
        });
        document.getElementById('close-modal').addEventListener('click', () => {
            document.getElementById('event-modal').classList.remove('active');
        });

        // Особые действия
        document.getElementById('btn-lights-out').addEventListener('click', () => {
            this.state.specialActionsUsed.lights_out = true;
            this.updateUI();
            alert('Действие "Тушите свет" активировано!');
        });

        document.getElementById('btn-masquerade').addEventListener('click', () => {
            this.state.specialActionsUsed.masquerade = true;
            this.updateUI();
            alert('Действие "Маскарад" активировано!');
        });

        document.getElementById('btn-dancefloor').addEventListener('click', () => {
            this.shapeRotation = (this.shapeRotation + 1) % 4;
            this.state.specialActionsUsed.dancefloor = true;
            this.renderShape();
            this.updateUI();
            alert('Фигура повернута!');
        });
    }
}

// Запуск игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});