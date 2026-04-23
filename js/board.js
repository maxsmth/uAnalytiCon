// Добавьте в конец класса Board эти методы:

    /**
     * Подсчёт очков за событие "Ламбада"
     */
    calculateLambadaScore() {
        const groups = this.findGroups();
        let maxGroupSize = 0;
        
        for (const cardId in groups) {
            const cardGroups = groups[cardId];
            for (const group of cardGroups) {
                if (group.length > maxGroupSize) {
                    maxGroupSize = group.length;
                }
            }
        }
        
        return maxGroupSize; // 1 очко за каждого монстра в самой большой группе
    }

    /**
     * Подсчёт очков за событие "Тост за короля"
     */
    calculateToastScore() {
        // Находим все клетки с королями/королевами
        const kings = [];
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const cell = this.grid[row][col];
                if (cell.occupied && cell.content && cell.content.id === 'keynote') {
                    kings.push({ row, col });
                }
            }
        }
        
        if (kings.length === 0) {
            // Если королей нет, добавляем одного виртуально
            // В полной реализации игрок выбирает клетку сам
            return 0;
        }
        
        let score = 0;
        const countedTypes = new Set();
        
        for (const king of kings) {
            const neighbors = this.getNeighbors(king.row, king.col);
            for (const neighbor of neighbors) {
                const cell = this.grid[neighbor.row][neighbor.col];
                if (cell.occupied && cell.content) {
                    countedTypes.add(cell.content.id);
                }
            }
        }
        
        return countedTypes.size; // 1 очко за каждый уникальный тип соседей
    }