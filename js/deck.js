/**
 * deck.js - Управление колодами карт
 * Содержит данные о всех типах карт и функции для работы с колодой
 */

// Типы докладов (гостей)
const TOPIC_TYPES = {
    MORAL_RESPONSIBILITY: {
        id: 'moral',
        name: 'Моральная ответственность',
        icon: '⚖️',
        rarity: 'common',
        points: 1
    },
    FICTIONAL_OBJECTS: {
        id: 'fictional',
        name: 'Фикциональные объекты',
        icon: '📚',
        rarity: 'common',
        points: 1
    },
    PHILOSOPHY_LOGIC: {
        id: 'logic',
        name: 'Философия логики',
        icon: '🔬',
        rarity: 'common',
        points: 1
    },
    ANALYTIC_METAPHYSICS: {
        id: 'metaphysics',
        name: 'Аналитическая метафизика',
        icon: '🌌',
        rarity: 'common',
        points: 1
    },
    CROSSWORLD_PREDICATION: {
        id: 'crossworld',
        name: 'Кроссмировая предикация',
        icon: '🌍',
        rarity: 'common',
        points: 1
    },
    KEYNOTE_SPEAKER: {
        id: 'keynote',
        name: 'Киспикер',
        icon: '👑',
        rarity: 'legendary',
        points: 2
    },
    MATH_PHILOSOPHY: {
        id: 'unicorn',
        name: 'Философия математики',
        icon: '🦄',
        rarity: 'rare',
        points: 0 // Особая система подсчёта
    },
    BAD_TALK: {
        id: 'bad',
        name: 'Плохой доклад',
        icon: '❌',
        rarity: 'bad',
        points: -1
    }
};

// Фигуры для размещения (адаптация из правил)
const SHAPES = [
    { id: 1, name: 'Линия 2', cells: [[0,0], [0,1]] },
    { id: 2, name: 'Линия 3', cells: [[0,0], [0,1], [0,2]] },
    { id: 3, name: 'Угол', cells: [[0,0], [0,1], [1,0]] },
    { id: 4, name: 'Квадрат 2x2', cells: [[0,0], [0,1], [1,0], [1,1]] },
    { id: 5, name: 'Крест', cells: [[0,1], [1,0], [1,1], [1,2], [2,1]] },
    { id: 6, name: 'T-форма', cells: [[0,0], [0,1], [0,2], [1,1]] },
    { id: 7, name: 'L-форма', cells: [[0,0], [1,0], [2,0], [2,1]] },
    { id: 8, name: 'Зигзаг', cells: [[0,0], [0,1], [1,1], [1,2]] }
];

// События (карты часов)
const EVENTS = [
    { id: 'fireworks', name: 'Фейерверк', icon: '🎆', description: '1 очко за каждого гостя у окон' },
    { id: 'lambada', name: 'Ламбада', icon: '💃', description: 'Очки за самую большую группу' },
    { id: 'toast', name: 'Тост за короля', icon: '🥂', description: 'Нарисуйте короля и получите очки за соседей' }
];

// Особые действия
const SPECIAL_ACTIONS = [
    { id: 'lights_out', name: 'Тушите свет', icon: '🌙', description: 'Поменять местами карты в фигуре' },
    { id: 'masquerade', name: 'Маскарад', icon: '🎭', description: 'Заменить один символ на любой другой' },
    { id: 'dancefloor', name: 'Вращающийся танцпол', icon: '💃', description: 'Повернуть фигуру' }
];

// Авторитеты для сложного уровня
const AUTHORITIES = [
    { id: 'hartree_field', name: 'Хартри Филд', icon: '⚛️', bonus: 'logic' },
    { id: 'leon_horsten', name: 'Леон Хорстен', icon: '📐', bonus: 'math' },
    { id: 'timothy_williamson', name: 'Тимоти Уильямсон', icon: '🎓', bonus: 'metaphysics' }
];

class Deck {
    constructor() {
        this.guestDeck = [];
        this.shapeDeck = [];
        this.eventDeck = [];
        this.discardedGuests = [];
        this.discardedShapes = [];
    }

    /**
     * Инициализация колоды гостей
     */
    initGuestDeck() {
        this.guestDeck = [];

        // Добавляем обычные темы (по 10 каждого типа)
        const commonTopics = [
            TOPIC_TYPES.MORAL_RESPONSIBILITY,
            TOPIC_TYPES.FICTIONAL_OBJECTS,
            TOPIC_TYPES.PHILOSOPHY_LOGIC,
            TOPIC_TYPES.ANALYTIC_METAPHYSICS,
            TOPIC_TYPES.CROSSWORLD_PREDICATION
        ];

        commonTopics.forEach(topic => {
            for (let i = 0; i < 10; i++) {
                this.guestDeck.push({ ...topic, uniqueId: `${topic.id}_${i}` });
            }
        });

        // Добавляем киспикеров (по 1 каждого типа)
        for (let i = 0; i < 5; i++) {
            this.guestDeck.push({ ...TOPIC_TYPES.KEYNOTE_SPEAKER, uniqueId: `keynote_${i}` });
        }

        // Добавляем единорогов (философия математики)
        for (let i = 0; i < 5; i++) {
            this.guestDeck.push({ ...TOPIC_TYPES.MATH_PHILOSOPHY, uniqueId: `unicorn_${i}` });
        }

        // Добавляем плохие доклады
        for (let i = 0; i < 10; i++) {
            this.guestDeck.push({ ...TOPIC_TYPES.BAD_TALK, uniqueId: `bad_${i}` });
        }

        this.shuffleDeck(this.guestDeck);
    }

    /**
     * Инициализация колоды фигур
     */
    initShapeDeck() {
        this.shapeDeck = [];

        // Создаём 4 стопки фигур
        const shapesPerStack = Math.floor(SHAPES.length / 4);

        for (let i = 0; i < 4; i++) {
            const stack = SHAPES.slice(i * shapesPerStack, (i + 1) * shapesPerStack);

            // В 3 стопки добавляем карты часов
            if (i < 3) {
                stack.push({ isEvent: true, event: EVENTS[i] });
            }

            this.shuffleDeck(stack);
            this.shapeDeck.push(...stack);
        }
    }

    /**
     * Перемешивание колоды (алгоритм Фишера-Йетса)
     */
    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    /**
     * Взять карту из колоды гостей
     */
    drawGuest() {
        if (this.guestDeck.length === 0) {
            if (this.discardedGuests.length === 0) return null;
            this.guestDeck = [...this.discardedGuests];
            this.discardedGuests = [];
            this.shuffleDeck(this.guestDeck);
        }
        return this.guestDeck.pop();
    }

    /**
     * Взять карту из колоды фигур
     */
    drawShape() {
        if (this.shapeDeck.length === 0) return null;
        return this.shapeDeck.pop();
    }

    /**
     * Сбросить карту в колоду сброса
     */
    discardGuest(card) {
        this.discardedGuests.push(card);
    }

    discardShape(card) {
        this.discardedShapes.push(card);
    }

    /**
     * Получить количество карт в колоде
     */
    getGuestDeckCount() {
        return this.guestDeck.length;
    }

    getShapeDeckCount() {
        return this.shapeDeck.length;
    }
}

// Экспорт для использования в других модулях
window.Deck = Deck;
window.TOPIC_TYPES = TOPIC_TYPES;
window.SHAPES = SHAPES;
window.EVENTS = EVENTS;
window.SPECIAL_ACTIONS = SPECIAL_ACTIONS;
window.AUTHORITIES = AUTHORITIES;