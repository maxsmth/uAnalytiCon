/**
 * board.js - Управление игровым полем
 * Отрисовка сетки, размещение фигур, проверка валидности
 */

class Board {
    constructor(size = 8) {
        this.size = size;
        this.grid = [];
        this.bridge = [];
        this.moat = [];
        this.authorities = [];
        this.windows = []; // Для события "Фейерверк"

        this.initGrid();
        this.initWindows();
    }

    /**
     * Инициализация пустой сетки
     */
    initGrid() {
        this.grid = [];
        for (let row = 0; row < this.size; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.size; col++) {
                this.grid[row][col] = {
                    occupied: false,
                    content: null,
                    isAuthority: false,
                    authorityId: null
                };
            }
        }
    }

    /**
     * Инициализация окон для события "Фейерверк"
     * Окна находятся по краям поля
     */
    initWindows() {
        this.windows = [];

        // Верхний и нижний ряд
        for (let col = 0; col < this.size; col++) {
            this.windows.push({ row: 0, col });
            this.windows.push({ row: this.size - 1, col });
        }

        // Левый и правый ряд (без углов, чтобы не дублировать)
        for (let row = 1; row < this.size - 1; row++) {
            this.windows.push({ row, col: 0 });
            this.windows.push({ row, col: this.size - 1 });
        }
    }

    /**
     * Добавление авторитетов на поле (сложный уровень)
     */
    addAuthorities(authoritiesConfig) {
        authoritiesConfig.forEach(auth => {
            const { row, col, authority } = auth;
            if (this.isValidPosition(row, col)) {
                this.grid[row][col] = {
                    occupied: true,
                    content: null,
                    isAuthority: true,
                    authorityId: authority.id
                };
                this.authorities.push({ row, col, authority });
            }
        });
    }

    /**
     * Проверка валидности позиции
     */
    isValidPosition(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    /**
     * Проверка возможности размещения фигуры
     */
    canPlaceShape(shape, startRow, startCol, rotation = 0) {
        const rotatedCells = this.rotateShape(shape.cells, rotation);

        for (const [cellRow, cellCol] of rotatedCells) {
            const row = startRow + cellRow;
            const col = startCol + cellCol;

            if (!this.isValidPosition(row, col)) {
                return false;
            }

            if (this.grid[row][col].occupied) {
                return false;
            }
        }

        return true;
    }

    /**
     * Поворот фигуры
     */
    rotateShape(cells, rotation) {
        let rotated = [...cells];

        for (let i = 0; i < rotation; i++) {
            rotated = rotated.map(([row, col]) => [col, -row]);
            // Нормализуем координаты чтобы не было отрицательных
            const minRow = Math.min(...rotated.map(c => c[0]));
            const minCol = Math.min(...rotated.map(c => c[1]));
            rotated = rotated.map(([row, col]) => [row - minRow, col - minCol]);
        }

        return rotated;
    }

    /**
     * Размещение фигуры на поле
     */
    placeShape(shape, startRow, startCol, cards, rotation = 0) {
        const rotatedCells = this.rotateShape(shape.cells, rotation);
        const placedCards = [];

        rotatedCells.forEach(([cellRow, cellCol], index) => {
            const row = startRow + cellRow;
            const col = startCol + cellCol;

            if (this.isValidPosition(row, col) && !this.grid[row][col].occupied) {
                this.grid[row][col] = {
                    occupied: true,
                    content: cards[index] || null,
                    isAuthority: false,
                    authorityId: null,
                    row,
                    col
                };
                placedCards.push({ row, col, card: cards[index] });
            }
        });

        return placedCards;
    }

    /**
     * Размещение карты в ров или на мост
     */
    placeOutOfBoard(card, zone) {
        if (zone === 'bridge') {
            this.bridge.push(card);
        } else if (zone === 'moat') {
            this.moat.push(card);
        }
    }

    /**
     * Получение соседей клетки (8 направлений)
     */
    getNeighbors(row, col) {
        const neighbors = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (this.isValidPosition(newRow, newCol)) {
                neighbors.push({ row: newRow, col: newCol });
            }
        }

        return neighbors;
    }

    /**
     * Поиск групп одинаковых карт (BFS алгоритм)
     */
    findGroups() {
        const visited = new Set();
        const groups = {};

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const cell = this.grid[row][col];
                if (!cell.occupied || !cell.content || visited.has(`${row},${col}`)) {
                    continue;
                }

                const cardId = cell.content.id;
                if (!groups[cardId]) {
                    groups[cardId] = [];
                }

                const group = this.findGroupFromCell(row, col, cardId, visited);
                if (group.length > 0) {
                    groups[cardId].push(group);
                }
            }
        }

        return groups;
    }

    /**
     * Поиск группы от конкретной клетки
     */
    findGroupFromCell(startRow, startCol, cardId, visited) {
        const group = [];
        const queue = [{ row: startRow, col: startCol }];

        while (queue.length > 0) {
            const { row, col } = queue.shift();
            const key = `${row},${col}`;

            if (visited.has(key)) continue;

            const cell = this.grid[row][col];
            if (!cell.occupied || !cell.content || cell.content.id !== cardId) {
                continue;
            }

            visited.add(key);
            group.push({ row, col, content: cell.content });

            // Добавляем соседей по горизонтали и вертикали
            const neighbors = [
                { row: row - 1, col },
                { row: row + 1, col },
                { row, col: col - 1 },
                { row, col: col + 1 }
            ];

            for (const neighbor of neighbors) {
                if (this.isValidPosition(neighbor.row, neighbor.col)) {
                    queue.push(neighbor);
                }
            }
        }

        return group;
    }

    /**
     * Подсчёт очков за группы
     */
    calculateGroupScore() {
        const groups = this.findGroups();
        let totalScore = 0;

        for (const cardId in groups) {
            const cardGroups = groups[cardId];
            if (cardGroups.length === 0) continue;

            // Находим самую большую группу
            const largestGroup = cardGroups.reduce((max, group) =>
                group.length > max.length ? group : max, cardGroups[0]);

            // Базовые очки за каждого в группе
            totalScore += largestGroup.length;

            // Проверка на короля/королеву в группе
            const hasKeynote = largestGroup.some(cell =>
                cell.content && cell.content.id === 'keynote');

            if (hasKeynote) {
                // Дополнительные очки за соседей короля
                for (const cell of largestGroup) {
                    if (cell.content && cell.content.id === 'keynote') {
                        const neighbors = this.getNeighbors(cell.row, cell.col);
                        for (const neighbor of neighbors) {
                            const neighborCell = this.grid[neighbor.row][neighbor.col];
                            if (neighborCell.occupied && neighborCell.content) {
                                totalScore += 1;
                            }
                        }
                    }
                }
            }
        }

        return totalScore;
    }

    /**
     * Подсчёт очков за единорогов
     */
    calculateUnicornScore() {
        const groups = this.findGroups();
        const unicornGroups = groups['unicorn'] || [];

        if (unicornGroups.length === 0) return 0;

        const largestGroup = unicornGroups.reduce((max, group) =>
            group.length > max.length ? group : max, unicornGroups[0]);

        const count = largestGroup.length;

        // Особая система подсчёта для единорогов
        const unicornScores = {
            1: -5,
            2: 1,
            3: 5,
            4: 10,
            5: 15
        };

        return unicornScores[count] || 0;
    }

    /**
     * Подсчёт очков за событие "Фейерверк"
     */
    calculateFireworksScore() {
        let score = 0;

        for (const window of this.windows) {
            const neighbors = this.getNeighbors(window.row, window.col);
            for (const neighbor of neighbors) {
                const cell = this.grid[neighbor.row][neighbor.col];
                if (cell.occupied && cell.content) {
                    score += 1;
                }
            }
        }

        return score;
    }

    /**
     * Подсчёт очков за авторитетов (сложный уровень)
     */
    calculateAuthorityScore() {
        let score = 0;

        for (const auth of this.authorities) {
            const neighbors = this.getNeighbors(auth.row, auth.col);
            for (const neighbor of neighbors) {
                const cell = this.grid[neighbor.row][neighbor.col];
                if (cell.occupied && cell.content) {
                    score += 1;
                }
            }
        }

        return score;
    }

    /**
     * Штрафы за ров
     */
    calculateMoatPenalty() {
        let penalty = 0;

        for (const card of this.moat) {
            if (card.id !== 'bad') {
                penalty += 1;
            }
        }

        return penalty;
    }

    /**
     * Полный подсчёт очков
     */
    calculateTotalScore(unusedActions = 0) {
        const groupScore = this.calculateGroupScore();
        const unicornScore = this.calculateUnicornScore();
        const authorityScore = this.calculateAuthorityScore();
        const moatPenalty = this.calculateMoatPenalty();
        const actionBonus = unusedActions * 2;

        return {
            groups: groupScore,
            unicorns: unicornScore,
            authorities: authorityScore,
            moatPenalty: -moatPenalty,
            actionBonus,
            total: groupScore + unicornScore + authorityScore - moatPenalty + actionBonus
        };
    }

    /**
     * Очистка поля для новой игры
     */
    reset() {
        this.initGrid();
        this.bridge = [];
        this.moat = [];
        this.authorities = [];
    }
}

// Экспорт для использования в других модулях
window.Board = Board;