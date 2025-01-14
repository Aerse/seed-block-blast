import * as PIXI from 'pixi.js';
import { Block, DraggableContainer, GameState, Shape } from './types';
import { BLOCK_COLORS, BLOCK_SIZE, BOARD_OFFSET_X, BOARD_OFFSET_Y, GAME_HEIGHT, GAME_WIDTH, GRID_SIZE, SHAPES, SHAPES_AREA } from './constants';
import gsap from 'gsap';
import { GameAI } from './GameAI';
import { StartScreen } from './screens/StartScreen';
import { PauseScreen } from './screens/PauseScreen';
import { SettingsButton } from './ui/SettingsButton';
import { UIButton } from './ui/UIButton';

interface GameStateInterface {
    score: number;
    isGameOver: boolean;
    shapes: Shape[];
    previousAIState: boolean;
    isAIEnabled: boolean;
    currentState: string;
}

/**
 * 方块消除游戏的主类
 * 负责管理游戏的核心逻辑、渲染和交互
 */
export class Game {
    private app: PIXI.Application;
    private gameBoard: Block[][] = [];
    private state: GameStateInterface;
    private boardContainer: PIXI.Container;
    private shapeContainer: PIXI.Container;
    private uiContainer: PIXI.Container;
    private menuContainer: PIXI.Container;
    private scoreText?: PIXI.Text;
    private particles: Array<{
        sprite: PIXI.DisplayObject;
        vx: number;
        vy: number;
        rotation: number;
        life: number;
        curve: number;
        maxLife: number;
    }> = [];
    private particleContainer: PIXI.Container;
    private particleTexture: PIXI.Texture;
    private gameAI!: GameAI;
    private startScreen: StartScreen;
    private pauseScreen: PauseScreen;

    constructor() {
        // 获取设备像素比
        const devicePixelRatio = window.devicePixelRatio || 1;

        this.app = new PIXI.Application({
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            backgroundColor: 0x1099bb,
            antialias: true,
            resolution: devicePixelRatio,    // 设置渲染分辨率
            autoDensity: true               // 自动处理高DPI显示
        });

        // 设置视图样式
        const view = this.app.view as HTMLCanvasElement;
        view.style.width = `${GAME_WIDTH}px`;
        view.style.height = `${GAME_HEIGHT}px`;

        document.getElementById('game-container')?.appendChild(view);

        // 创建容器
        this.particleContainer = new PIXI.Container();
        this.boardContainer = new PIXI.Container();
        this.shapeContainer = new PIXI.Container();
        this.uiContainer = new PIXI.Container();
        this.menuContainer = new PIXI.Container();

        // 设置交互区域
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT);

        this.app.stage.addChild(this.boardContainer);
        this.app.stage.addChild(this.particleContainer);
        this.app.stage.addChild(this.shapeContainer);
        this.app.stage.addChild(this.uiContainer);
        this.app.stage.addChild(this.menuContainer);

        // 初始化粒子系统
        this.particles = [];
        this.particleTexture = PIXI.Texture.WHITE;

        this.state = {
            score: 0,
            isGameOver: false,
            shapes: [],
            previousAIState: false,
            isAIEnabled: false,
            currentState: 'START'
        };

        // 创建开始界面
        this.startScreen = new StartScreen(() => this.startGame());
        this.menuContainer.addChild(this.startScreen);

        // 创建暂停界面
        this.pauseScreen = new PauseScreen({
            onContinue: () => {
                this.pauseScreen.hide();
                this.state.currentState = 'PLAYING';
                // 恢复之前的AI状态
                this.state.isAIEnabled = this.state.previousAIState;
                if (this.state.isAIEnabled) {
                    this.runAI();
                }
            },
            onHome: () => {
                this.pauseScreen.hide();
                this.resetGame();
            }
        });
        this.pauseScreen.hide();
        this.menuContainer.addChild(this.pauseScreen);

        // 添加动画循环
        this.app.ticker.add(this.updateParticles.bind(this));
    }

    /**
     * 开始游戏
     */
    private startGame(): void {
        this.state.currentState = 'PLAYING';
        this.startScreen.hide();
        this.boardContainer.removeChildren(); // 清除之前的游戏板

        // 创建游戏板并初始化AI
        this.gameBoard = this.createEmptyBoard();
        this.gameAI = new GameAI(this.gameBoard, this.shapeContainer);

        this.initializeBoard();
        this.createScoreDisplay();
        this.createSettingsButton();
        this.createAIButton();
        this.generateNewShapes();
    }

    /**
     * 重置游戏状态
     */
    private resetGame(): void {
        // 停止AI操作
        this.state.isAIEnabled = false;

        // 清除分数显示
        if (this.scoreText && this.scoreText.parent) {
            this.scoreText.parent.removeChild(this.scoreText);
            this.scoreText.destroy();
            this.scoreText = undefined;
        }

        this.state = {
            score: 0,
            isGameOver: false,
            shapes: [],
            previousAIState: false,
            isAIEnabled: false,
            currentState: 'START'
        };

        // 清除所有容器
        this.boardContainer.removeChildren();
        this.shapeContainer.removeChildren();
        this.uiContainer.removeChildren();
        this.particleContainer.removeChildren();

        // 清除所有粒子
        this.particles.forEach(particle => {
            if (particle.sprite.parent) {
                particle.sprite.parent.removeChild(particle.sprite);
            }
            particle.sprite.destroy();
        });
        this.particles = [];

        // 显示开始界面
        this.startScreen.show();
    }

    /**
     * 创建一个空的方块精灵
     * @param x - 方块的X坐标
     * @param y - 方块的Y坐标
     * @returns 包含空方块的PIXI容器
     */
    private createEmptyBlock(x: number, y: number): PIXI.Container {
        const container = new PIXI.Container();
        const block = new PIXI.Graphics();
        block.beginFill(0x808080, 0.3);
        block.drawRoundedRect(0, 0, BLOCK_SIZE, BLOCK_SIZE, 4);
        block.endFill();
        container.addChild(block);
        container.x = x;
        container.y = y;
        return container;
    }

    /**
     * 创建一个空的游戏板
     * @returns 二维数组表示的游戏板，包含所有空方块
     */
    private createEmptyBoard(): Block[][] {
        const board: Block[][] = [];
        for (let row = 0; row < GRID_SIZE; row++) {
            board[row] = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                const sprite = this.createEmptyBlock(
                    col * BLOCK_SIZE + BOARD_OFFSET_X,
                    row * BLOCK_SIZE + BOARD_OFFSET_Y
                );

                board[row][col] = {
                    color: 0,
                    position: { row, col },
                    sprite,
                    isEmpty: true
                };

                this.boardContainer.addChild(sprite);
            }
        }
        return board;
    }

    /**
     * 初始化游戏板的视觉效果
     * 绘制网格线以显示游戏区域
     */
    private initializeBoard(): void {
        // 添加网格线
        const graphics = new PIXI.Graphics();
        graphics.lineStyle(1, 0xffffff, 0.3);

        // 绘制垂直线
        for (let i = 0; i <= GRID_SIZE; i++) {
            graphics.moveTo(BOARD_OFFSET_X + i * BLOCK_SIZE, BOARD_OFFSET_Y);
            graphics.lineTo(BOARD_OFFSET_X + i * BLOCK_SIZE, BOARD_OFFSET_Y + GRID_SIZE * BLOCK_SIZE);
        }

        // 绘制水平线
        for (let i = 0; i <= GRID_SIZE; i++) {
            graphics.moveTo(BOARD_OFFSET_X, BOARD_OFFSET_Y + i * BLOCK_SIZE);
            graphics.lineTo(BOARD_OFFSET_X + GRID_SIZE * BLOCK_SIZE, BOARD_OFFSET_Y + i * BLOCK_SIZE);
        }

        this.boardContainer.addChild(graphics);
    }

    /**
     * 创建并初始化分数显示
     */
    private createScoreDisplay(): void {
        this.scoreText = new PIXI.Text(`分数: ${this.state.score}`, {
            fontSize: 32,
            fill: 0xffffff,
            fontWeight: 'bold',
            dropShadow: true,
            dropShadowColor: 0x000000,
            dropShadowBlur: 4,
            dropShadowDistance: 2,
        });
        this.scoreText.x = BOARD_OFFSET_X + 50;
        this.scoreText.y = 20;
        this.app.stage.addChild(this.scoreText);
    }

    /**
     * 创建一个带有视觉效果的彩色方块
     * @param color - 方块的颜色值
     * @returns 包含方块及其视觉效果的PIXI容器
     */
    private createBlock(color: number): PIXI.Container {
        const container = new PIXI.Container();

        // 创建主体方块
        const block = new PIXI.Graphics();

        // 添加阴影效果
        const shadow = new PIXI.Graphics();
        shadow.beginFill(0x000000, 0.2);
        shadow.drawRoundedRect(2, 2, BLOCK_SIZE, BLOCK_SIZE, 4);
        shadow.endFill();

        // 添加渐变效果
        const gradient = new PIXI.Graphics();
        gradient.beginFill(0xFFFFFF, 0.3);
        gradient.drawRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
        gradient.endFill();
        gradient.beginFill(0x000000, 0.1);
        gradient.drawRect(0, BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE / 2);
        gradient.endFill();

        // 主体方块（带描边）
        block.lineStyle(2, 0xFFFFFF, 0.5);
        block.beginFill(color);
        block.drawRoundedRect(0, 0, BLOCK_SIZE, BLOCK_SIZE, 4);
        block.endFill();

        // 添加高光效果
        const highlight = new PIXI.Graphics();
        highlight.beginFill(0xFFFFFF, 0.2);
        highlight.drawPolygon([
            0, 0,
            BLOCK_SIZE * 0.4, 0,
            0, BLOCK_SIZE * 0.4
        ]);
        highlight.endFill();

        // 添加内发光效果
        const glow = new PIXI.Graphics();
        glow.beginFill(color, 0.3);
        glow.drawRoundedRect(-2, -2, BLOCK_SIZE + 4, BLOCK_SIZE + 4, 6);
        glow.endFill();

        container.addChild(shadow);
        container.addChild(glow);
        container.addChild(block);
        container.addChild(gradient);
        container.addChild(highlight);

        return container;
    }

    /**
     * 计算形状在预览区域的位置
     * @param index - 形状的索引（0-2）
     * @param shapeWidth - 形状的宽度
     * @param shapeHeight - 形状的高度
     * @returns 形状的目标位置坐标
     */
    private calculateShapePosition(index: number, shapeWidth: number, shapeHeight: number): { x: number, y: number } {
        const availableWidth = GAME_WIDTH - 40; // 左右各留 20px 边距
        const slotWidth = availableWidth / 3;
        const centerX = SHAPES_AREA.x + (slotWidth * index) + (slotWidth / 2);

        return {
            x: centerX - (shapeWidth * BLOCK_SIZE) / 2,
            y: SHAPES_AREA.y
        };
    }

    /**
     * 生成新的随机形状
     * 会清除现有形状并生成3个新的随机形状
     */
    private generateNewShapes(): void {
        // 如果游戏已经结束，不再生成新形状
        if (this.state.isGameOver) return;

        // 如果还有现有形状，不生成新的
        if (this.state.shapes.length > 0) return;

        // 生成3个新形状
        for (let i = 0; i < 3; i++) {
            const shapeIndex = Math.floor(Math.random() * SHAPES.length);
            const colorIndex = Math.floor(Math.random() * BLOCK_COLORS.length);
            let shape = SHAPES[shapeIndex];
            const color = BLOCK_COLORS[colorIndex];

            // 随机旋转形状
            const rotations = Math.floor(Math.random() * 4);
            for (let r = 0; r < rotations; r++) {
                shape = this.rotateShape(shape);
            }

            const container = new PIXI.Container() as DraggableContainer;
            const position = this.calculateShapePosition(i, shape[0].length, shape.length);
            container.x = position.x;
            container.y = position.y;
            container.alpha = 0;
            container.dragging = false;
            container.dragData = null;
            container.dragStartPos = new PIXI.Point();
            container.sortableChildren = true;

            // 添加形状方块
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const block = this.createBlock(color);
                        block.x = col * BLOCK_SIZE;
                        block.y = row * BLOCK_SIZE;
                        container.addChild(block);
                    }
                }
            }

            container.eventMode = 'static';
            container.cursor = 'pointer';
            container.on('pointerdown', this.onDragStart.bind(this));

            const newShape = {
                blocks: shape,
                color,
                container,
                width: shape[0].length,
                height: shape.length
            };

            this.state.shapes.push(newShape);
            this.shapeContainer.addChild(container);
        }

        // 检查是否有可放置的位置
        if (!this.hasValidMoves()) {
            this.gameOver();
            return;
        }

        // 添加出现动画
        this.state.shapes.forEach((shape, i) => {
            gsap.to(shape.container, {
                alpha: 1,
                duration: 0.3,
                delay: i * 0.1,
                ease: "back.out(1.2)"
            });
        });
    }

    /**
     * 检查游戏是否结束
     * 当没有有效移动且无法生成新形状时触发游戏结束
     */
    private checkGameOver(): void {
        if (!this.hasValidMoves()) {
            // 如果当前没有形状可以放置，且没有足够空间放置新形状
            this.gameOver();
        }
    }

    /**
     * 旋转形状矩阵
     * @param shape - 要旋转的形状矩阵
     * @returns 旋转90度后的新形状矩阵
     */
    private rotateShape(shape: boolean[][]): boolean[][] {
        const rows = shape.length;
        const cols = shape[0].length;
        const rotated: boolean[][] = Array(cols).fill(0).map(() => Array(rows).fill(false));

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // 90度顺时针旋转
                rotated[col][rows - 1 - row] = shape[row][col];
            }
        }

        return rotated;
    }

    /**
     * 检查当前是否有可行的移动
     * @returns 如果有可行的移动返回true，否则返回false
     */
    private hasValidMoves(): boolean {
        // 检查当前形状是否可以放置
        if (this.state.shapes.length > 0) {
            return this.state.shapes.some(shape => {
                for (let row = 0; row < GRID_SIZE; row++) {
                    for (let col = 0; col < GRID_SIZE; col++) {
                        if (this.canPlaceShape(row, col, shape)) {
                            return true;
                        }
                    }
                }
                return false;
            });
        }
        return false; // 如果没有当前形状，返回false
    }

    /**
     * 处理游戏结束的逻辑
     * 显示游戏结束界面并停止游戏
     */
    private gameOver(): void {
        this.state.isGameOver = true;
        this.state.currentState = 'GAME_OVER';

        const overlay = new PIXI.Graphics();
        overlay.beginFill(0x000000, 0.7);
        overlay.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        overlay.endFill();

        const menuContainer = new PIXI.Container();

        // 创建游戏结束文本
        const gameOverText = new PIXI.Text('游戏结束', {
            fontSize: 48,
            fill: 0xffffff,
            fontWeight: 'bold'
        });
        gameOverText.anchor.set(0.5);
        gameOverText.x = GAME_WIDTH / 2;
        gameOverText.y = GAME_HEIGHT / 3;

        // 创建分数文本
        const scoreText = new PIXI.Text(`最终分数: ${this.state.score}`, {
            fontSize: 32,
            fill: 0xffffff
        });
        scoreText.anchor.set(0.5);
        scoreText.x = GAME_WIDTH / 2;
        scoreText.y = GAME_HEIGHT / 2;

        // 创建返回主页按钮
        const homeButton = new UIButton('返回主页', {
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT * 2 / 3,
            width: 200,
            height: 50,
            fontSize: 24
        });
        homeButton.on('pointerdown', () => {
            this.resetGame();
            this.startScreen.show();
        });

        menuContainer.addChild(overlay);
        menuContainer.addChild(gameOverText);
        menuContainer.addChild(scoreText);
        menuContainer.addChild(homeButton);

        this.menuContainer.addChild(menuContainer);
    }

    /**
     * 处理拖拽开始事件
     * @param event - PIXI的指针事件对象
     */
    private onDragStart(event: PIXI.FederatedPointerEvent): void {
        const container = event.currentTarget as DraggableContainer;
        const shape = this.state.shapes.find(s => s.container === container);
        if (!shape || this.state.isGameOver) return;

        // 将容器移到顶层
        this.shapeContainer.removeChild(container);
        this.shapeContainer.addChild(container);

        container.alpha = 0.7;
        container.dragging = true;
        container.dragData = event.data;
        container.dragStartPos = container.position.clone();

        // 记录鼠标相对于容器的偏移
        const localPos = event.data.getLocalPosition(container);
        container.dragOffset = new PIXI.Point(localPos.x, localPos.y);

        // 添加全局移动和释放事件
        this.app.stage.on('pointermove', this.onDragMove, this);
        this.app.stage.on('pointerup', this.onDragEnd, this);
        this.app.stage.on('pointerupoutside', this.onDragEnd, this);
    }

    /**
     * 处理拖拽移动事件
     * @param event - PIXI的指针事件对象
     */
    private onDragMove(event: PIXI.FederatedPointerEvent): void {
        const draggedShape = this.state.shapes.find(s => s.container.dragging);
        if (!draggedShape) return;

        const container = draggedShape.container;
        if (container.dragData) {
            const newPosition = container.dragData.getLocalPosition(this.app.stage);
            container.position.set(
                newPosition.x - container.dragOffset.x,
                newPosition.y - container.dragOffset.y
            );

            // 显示网格预览
            const gridPos = this.getGridPosition(container);
            this.showGridPreview(container, gridPos.row, gridPos.col);
        }
    }

    /**
     * 处理拖拽结束事件
     * 检查并放置形状，更新游戏状态
     * @param event - PIXI的指针事件对象
     */
    private onDragEnd(event: PIXI.FederatedPointerEvent): void {
        const draggedShape = this.state.shapes.find(s => s.container.dragging);
        if (!draggedShape) return;

        const container = draggedShape.container;
        container.alpha = 1;
        container.dragging = false;
        container.dragData = null;

        // 移除全局事件监听
        this.app.stage.off('pointermove', this.onDragMove, this);
        this.app.stage.off('pointerup', this.onDragEnd, this);
        this.app.stage.off('pointerupoutside', this.onDragEnd, this);

        // 获取网格位置
        const gridPos = this.getGridPosition(container);

        if (this.canPlaceShape(gridPos.row, gridPos.col, draggedShape)) {
            this.placeShape(gridPos.row, gridPos.col, draggedShape);

            // 移除已放置的形状
            const index = this.state.shapes.indexOf(draggedShape);
            if (index > -1) {
                this.state.shapes.splice(index, 1);
                this.shapeContainer.removeChild(container);
            }

            // 清除预览
            this.clearGridPreview();

            // 检查并清除完整的行和列
            this.checkLines();

            // 如果所有形状都已放置或没有剩余形状，生成新的形状
            if (this.state.shapes.length === 0) {
                this.generateNewShapes();
            }
        } else {
            // 如果不能放置，返回原位置
            container.position.copyFrom(container.dragStartPos);
            // 清除预览
            this.clearGridPreview();
        }
    }

    /**
     * 检查形状是否可以放置在指定位置
     * @param startRow - 起始行
     * @param startCol - 起始列
     * @param shape - 要放置的形状
     * @returns 如果可以放置返回true，否则返回false
     */
    private canPlaceShape(startRow: number, startCol: number, shape: Shape): boolean {
        // 检查是否在边界内
        if (startRow < 0 || startRow + shape.blocks.length > GRID_SIZE ||
            startCol < 0 || startCol + shape.blocks[0].length > GRID_SIZE) {
            return false;
        }

        // 检查是否与其他方块重叠
        for (let row = 0; row < shape.blocks.length; row++) {
            for (let col = 0; col < shape.blocks[row].length; col++) {
                if (shape.blocks[row][col] && !this.gameBoard[startRow + row][startCol + col].isEmpty) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 在指定位置放置形状
     * @param startRow - 起始行
     * @param startCol - 起始列
     * @param shape - 要放置的形状
     */
    private placeShape(startRow: number, startCol: number, shape: Shape): void {
        const blocks = shape.blocks;
        const color = shape.color;

        for (let row = 0; row < blocks.length; row++) {
            for (let col = 0; col < blocks[row].length; col++) {
                if (blocks[row][col]) {
                    const block = this.gameBoard[startRow + row][startCol + col];
                    const newBlockContainer = this.createBlock(color);

                    // 设置位置
                    newBlockContainer.x = block.sprite.x;
                    newBlockContainer.y = block.sprite.y;
                    newBlockContainer.alpha = 1;
                    this.boardContainer.addChild(newBlockContainer);

                    // 添加快速的出现动画
                    gsap.to(newBlockContainer, {
                        alpha: 1,
                        duration: 0.1,
                        ease: "power1.out"
                    });

                    // 更新方块状态
                    block.isEmpty = false;
                    block.color = color;
                    if (block.sprite.parent) {
                        block.sprite.parent.removeChild(block.sprite);
                    }
                    block.sprite = newBlockContainer;
                }
            }
        }

        // 检查并清除完整的行和列
        this.checkLines();
    }

    /**
     * 检查并清除完整的行和列
     */
    private checkLines(): void {
        const rowsToRemove: number[] = [];
        const colsToRemove: number[] = [];

        // 检查行
        for (let row = 0; row < GRID_SIZE; row++) {
            let isFull = true;
            for (let col = 0; col < GRID_SIZE; col++) {
                if (this.gameBoard[row][col].isEmpty) {
                    isFull = false;
                    break;
                }
            }
            if (isFull) rowsToRemove.push(row);
        }

        // 检查列
        for (let col = 0; col < GRID_SIZE; col++) {
            let isFull = true;
            for (let row = 0; row < GRID_SIZE; row++) {
                if (this.gameBoard[row][col].isEmpty) {
                    isFull = false;
                    break;
                }
            }
            if (isFull) colsToRemove.push(col);
        }

        // 清除行和列
        if (rowsToRemove.length > 0 || colsToRemove.length > 0) {
            this.clearLines(rowsToRemove, colsToRemove);
            this.updateScore(rowsToRemove.length + colsToRemove.length);
        }

        // 在消除完成后检查游戏是否结束
        if (this.state.shapes.length === 1 && !this.hasValidMoves()) {
            this.gameOver();
        }
    }

    /**
     * 清除单个方块
     * @param block - 要清除的方块对象
     */
    private clearBlock(block: Block): void {
        if (block.sprite.parent) {
            block.sprite.parent.removeChild(block.sprite);
            block.sprite.destroy();
        }

        const emptyBlock = this.createEmptyBlock(
            block.position.col * BLOCK_SIZE + BOARD_OFFSET_X,
            block.position.row * BLOCK_SIZE + BOARD_OFFSET_Y
        );

        // 确保新的空方块有正确的透明度
        const graphics = emptyBlock.getChildAt(0) as PIXI.Graphics;
        graphics.clear();
        graphics.beginFill(0x808080, 0.3);
        graphics.drawRoundedRect(0, 0, BLOCK_SIZE, BLOCK_SIZE, 4);
        graphics.endFill();

        this.boardContainer.addChild(emptyBlock);
        block.sprite = emptyBlock;
        block.isEmpty = true;
        block.color = 0;
    }

    /**
     * 清除完整的行和列
     * @param rows - 要清除的行索引数组
     * @param cols - 要清除的列索引数组
     */
    private clearLines(rows: number[], cols: number[]): void {
        // 收集要清除的方块
        const blocksToRemove: Block[] = [];
        rows.forEach(row => {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (!blocksToRemove.includes(this.gameBoard[row][col])) {
                    blocksToRemove.push(this.gameBoard[row][col]);
                }
            }
        });
        cols.forEach(col => {
            for (let row = 0; row < GRID_SIZE; row++) {
                if (!blocksToRemove.includes(this.gameBoard[row][col])) {
                    blocksToRemove.push(this.gameBoard[row][col]);
                }
            }
        });

        // 创建动画序列
        const timeline = gsap.timeline();

        // 为每个方块创建消失动画
        blocksToRemove.forEach((block, index) => {
            timeline.to(block.sprite, {
                alpha: 0.2,
                duration: 0.05, // 加快闪烁速度
                repeat: 1, // 减少闪烁次数
                yoyo: true,
                ease: "none",
                onComplete: () => {
                    // 创建粒子效果
                    this.createParticleEffect(
                        block.sprite.x + BLOCK_SIZE / 2,
                        block.sprite.y + BLOCK_SIZE / 2,
                        block.color
                    );

                    // 清除方块
                    this.clearBlock(block);
                }
            }, index * 0.02); // 减少方块之间的延迟
        });

        // 动画完成后检查游戏状态
        timeline.call(() => {
            this.checkGameOver();
        });
    }

    /**
     * 更新游戏分数
     * @param linesCleared - 清除的行数
     */
    private updateScore(linesCleared: number): void {
        this.state.score += linesCleared * 100;
        if (this.scoreText) {
            this.scoreText.text = `分数: ${this.state.score}`;
        }
    }

    /**
     * 获取网格位置
     * @param container - PIXI容器对象
     * @returns 返回网格的行列位置
     */
    private getGridPosition(container: PIXI.Container): { row: number; col: number } {
        const localPos = this.boardContainer.toLocal(container.position, this.app.stage);
        return {
            row: Math.floor((localPos.y - BOARD_OFFSET_Y + BLOCK_SIZE / 2) / BLOCK_SIZE),
            col: Math.floor((localPos.x - BOARD_OFFSET_X + BLOCK_SIZE / 2) / BLOCK_SIZE)
        };
    }

    private previewGraphics: PIXI.Graphics | null = null;

    /**
     * 显示网格预览
     * 在拖拽形状时显示可能的放置位置
     * @param container - 形状容器
     * @param row - 目标行
     * @param col - 目标列
     */
    private showGridPreview(container: PIXI.Container, row: number, col: number): void {
        const shape = this.state.shapes.find(s => s.container === container);
        if (!shape) return;

        // 清除之前的预览
        this.clearGridPreview();

        // 创建新的预览
        this.previewGraphics = new PIXI.Graphics();
        this.previewGraphics.lineStyle(2, 0xffff00, 0.5);

        const isValid = this.canPlaceShape(row, col, shape);
        const color = isValid ? 0x00ff00 : 0xff0000;
        this.previewGraphics.beginFill(color, 0.2);

        // 绘制预览形状
        for (let r = 0; r < shape.blocks.length; r++) {
            for (let c = 0; c < shape.blocks[r].length; c++) {
                if (shape.blocks[r][c]) {
                    const x = (col + c) * BLOCK_SIZE + BOARD_OFFSET_X;
                    const y = (row + r) * BLOCK_SIZE + BOARD_OFFSET_Y;
                    this.previewGraphics.drawRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }

        this.previewGraphics.endFill();
        this.boardContainer.addChild(this.previewGraphics);
    }

    /**
     * 清除网格预览
     */
    private clearGridPreview(): void {
        if (this.previewGraphics) {
            this.boardContainer.removeChild(this.previewGraphics);
            this.previewGraphics.destroy();
            this.previewGraphics = null;
        }
    }

    /**
     * 更新粒子效果
     * @param delta - 帧间隔时间
     */
    private updateParticles(delta: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life -= 0.025 * delta; // 加快生命消耗

            if (particle.life <= 0) {
                if (particle.sprite.parent) {
                    particle.sprite.parent.removeChild(particle.sprite);
                }
                particle.sprite.destroy();
                this.particles.splice(i, 1);
                continue;
            }

            // 更新位置，添加曲线运动
            particle.sprite.x += particle.vx * delta * 1.2; // 加快水平移动
            particle.sprite.y += particle.vy * delta * 1.2; // 加快垂直移动
            particle.sprite.x += particle.curve * Math.sin(particle.life * 8) * delta; // 加快曲线频率
            particle.vy += 0.2 * delta; // 增加重力效果

            // 旋转效果
            particle.sprite.rotation += particle.rotation * delta * 1.2;

            // 使用生命值比例来创建更平滑的缩放和透明度过渡
            const lifeRatio = particle.life / particle.maxLife;
            const easeRatio = this.easeOutQuad(lifeRatio);

            particle.sprite.alpha = easeRatio;
            particle.sprite.scale.set(easeRatio * 0.8);
        }
    }

    /**
     * 创建粒子特效
     * @param x - 特效的X坐标
     * @param y - 特效的Y坐标
     * @param color - 粒子的颜色
     */
    private createParticleEffect(x: number, y: number, color: number): void {
        const particleCount = 25; // 减少粒子数量以提高性能
        const glowColor = color;

        // 创建爆炸波
        const blast = new PIXI.Graphics();
        blast.beginFill(color, 0.3);
        blast.drawCircle(0, 0, 5);
        blast.endFill();
        blast.x = x;
        blast.y = y;
        this.particleContainer.addChild(blast);

        // 加快爆炸波动画
        gsap.to(blast.scale, {
            x: 8,
            y: 8,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => {
                if (blast.parent) {
                    blast.parent.removeChild(blast);
                }
                blast.destroy();
            }
        });
        gsap.to(blast, {
            alpha: 0,
            duration: 0.3,
            ease: "power2.out"
        });

        for (let i = 0; i < particleCount; i++) {
            const particle = new PIXI.Graphics();

            // 随机选择粒子形状
            const shapeType = Math.random();
            if (shapeType < 0.3) {
                // 圆形粒子
                particle.beginFill(color, 0.9);
                particle.drawCircle(0, 0, 2);
                particle.endFill();
                // 添加发光效果
                particle.beginFill(glowColor, 0.4);
                particle.drawCircle(0, 0, 4);
                particle.endFill();
            } else if (shapeType < 0.6) {
                // 星形粒子
                particle.beginFill(color, 0.9);
                this.drawStar(particle, 0, 0, 5, 3, 1.5);
                particle.endFill();
                // 添加发光效果
                particle.beginFill(glowColor, 0.4);
                this.drawStar(particle, 0, 0, 5, 5, 2.5);
                particle.endFill();
            } else {
                // 菱形粒子
                particle.beginFill(color, 0.9);
                particle.moveTo(0, -3);
                particle.lineTo(3, 0);
                particle.lineTo(0, 3);
                particle.lineTo(-3, 0);
                particle.closePath();
                particle.endFill();
                // 添加发光效果
                particle.beginFill(glowColor, 0.4);
                particle.moveTo(0, -5);
                particle.lineTo(5, 0);
                particle.lineTo(0, 5);
                particle.lineTo(-5, 0);
                particle.closePath();
                particle.endFill();
            }

            particle.x = x;
            particle.y = y;

            // 创建更快的运动轨迹
            const angle = (Math.random() * Math.PI * 2);
            const speed = 3 + Math.random() * 5; // 增加速度
            const curve = (Math.random() - 0.5) * 3; // 增加曲线幅度
            const scale = 0.5 + Math.random() * 0.8;
            particle.scale.set(scale);

            const particle_obj = {
                sprite: particle,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4, // 增加向上的初始速度
                curve: curve,
                rotation: (Math.random() - 0.5) * 0.6, // 增加旋转速度
                life: 0.8 + Math.random() * 0.4, // 减少生命周期
                maxLife: 0.8 + Math.random() * 0.4
            };

            this.particles.push(particle_obj);
            this.particleContainer.addChild(particle);
        }
    }

    /**
     * 绘制星形
     * @param graphics - PIXI图形对象
     * @param x - 中心X坐标
     * @param y - 中心Y坐标
     * @param points - 星形的角数
     * @param radius - 外圆半径
     * @param innerRadius - 内圆半径
     */
    private drawStar(graphics: PIXI.Graphics, x: number, y: number, points: number, radius: number, innerRadius: number): void {
        const step = Math.PI * 2 / points;
        const halfStep = step / 2;
        const start = -Math.PI / 2;

        graphics.moveTo(
            x + Math.cos(start) * radius,
            y + Math.sin(start) * radius
        );

        for (let i = 1; i <= points * 2; i++) {
            const r = i % 2 === 0 ? radius : innerRadius;
            const angle = start + (i * halfStep);
            graphics.lineTo(
                x + Math.cos(angle) * r,
                y + Math.sin(angle) * r
            );
        }
    }

    /**
     * 绘制心形
     * @param graphics - PIXI图形对象
     * @param x - 中心X坐标
     * @param y - 中心Y坐标
     * @param size - 心形大小
     */
    private drawHeart(graphics: PIXI.Graphics, x: number, y: number, size: number): void {
        const bezierPoints = [
            { x: x, y: y - size * 0.5 },
            { x: x - size, y: y - size },
            { x: x - size, y: y },
            { x: x, y: y + size },
            { x: x + size, y: y },
            { x: x + size, y: y - size },
            { x: x, y: y - size * 0.5 }
        ];

        graphics.moveTo(bezierPoints[0].x, bezierPoints[0].y);

        for (let i = 0; i < bezierPoints.length - 2; i += 2) {
            const xc = (bezierPoints[i + 1].x + bezierPoints[i + 2].x) / 2;
            const yc = (bezierPoints[i + 1].y + bezierPoints[i + 2].y) / 2;
            graphics.quadraticCurveTo(
                bezierPoints[i + 1].x,
                bezierPoints[i + 1].y,
                xc,
                yc
            );
        }

        graphics.closePath();
    }

    /**
     * 缓动函数 - easeOutQuad
     * @param t - 时间比例 (0-1)
     * @returns 缓动后的值
     */
    private easeOutQuad(t: number): number {
        return t * (2 - t);
    }

    /**
     * 创建AI控制按钮
     */
    private createAIButton(): void {
        const button = new PIXI.Container();
        button.x = GAME_WIDTH - 60;
        button.y = 20;

        // 创建按钮背景
        const bg = new PIXI.Graphics();
        bg.lineStyle(2, 0xFFFFFF, 0.5);
        bg.beginFill(this.state.isAIEnabled ? 0x00ff00 : 0x808080);
        bg.drawRoundedRect(0, 0, 40, 40, 8);
        bg.endFill();

        // 创建文本
        const text = new PIXI.Text('AI', {
            fontSize: 20,
            fill: 0xffffff,
            fontWeight: 'bold',
        });
        text.anchor.set(0.5);
        text.x = 20;
        text.y = 20;

        button.addChild(bg);
        button.addChild(text);

        button.eventMode = 'static';
        button.cursor = 'pointer';
        button.on('pointerdown', () => {
            this.state.isAIEnabled = !this.state.isAIEnabled;
            bg.clear();
            bg.lineStyle(2, 0xFFFFFF, 0.5);
            bg.beginFill(this.state.isAIEnabled ? 0x00ff00 : 0x808080);
            bg.drawRoundedRect(0, 0, 40, 40, 8);
            bg.endFill();

            if (this.state.isAIEnabled) {
                this.runAI();
            }
        });

        this.uiContainer.addChild(button);
    }

    /**
     * 运行AI逻辑
     * 自动寻找并执行最佳移动
     */
    private async runAI(): Promise<void> {
        if (!this.state.isAIEnabled || this.state.isGameOver || this.state.currentState !== 'PLAYING') return;

        const success = await this.gameAI.executeMove(
            this.state.shapes,
            this.canPlaceShape.bind(this),
            (row: number, col: number, shape: Shape) => {
                this.placeShape(row, col, shape);
                this.checkLines();

                // 移除已放置的形状
                const index = this.state.shapes.indexOf(shape);
                if (index > -1) {
                    this.state.shapes.splice(index, 1);
                    this.shapeContainer.removeChild(shape.container);
                }

                // 如果所有形状都已放置或没有剩余形状，生成新的形状
                if (this.state.shapes.length === 0) {
                    this.generateNewShapes();
                }
            }
        );

        if (!success) {
            // 如果找不到有效移动，生成新的形状
            this.generateNewShapes();
        }

        // 继续运行AI
        this.runAI();
    }

    /**
     * 创建设置按钮
     */
    private createSettingsButton(): void {
        const settingsButton = new SettingsButton(20, 20, () => {
            this.state.previousAIState = this.state.isAIEnabled;
            this.state.isAIEnabled = false; // 暂停AI
            this.state.currentState = 'PAUSED';
            this.pauseScreen.show();
        });
        this.uiContainer.addChild(settingsButton);
    }
} 