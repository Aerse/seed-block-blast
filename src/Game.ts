import * as PIXI from 'pixi.js';
import { Block, DraggableContainer, GameState, Shape } from './types';
import { BLOCK_COLORS, BLOCK_SIZE, BOARD_OFFSET_X, BOARD_OFFSET_Y, GAME_HEIGHT, GAME_WIDTH, GRID_SIZE, SHAPES, SHAPES_AREA } from './constants';
import gsap from 'gsap';

/**
 * 方块消除游戏的主类
 * 负责管理游戏的核心逻辑、渲染和交互
 */
export class Game {
    private app: PIXI.Application;
    private gameBoard: Block[][];
    private state: GameState;
    private boardContainer: PIXI.Container;
    private shapeContainer: PIXI.Container;
    private scoreText?: PIXI.Text;
    private particles: Array<{
        sprite: PIXI.DisplayObject;
        vx: number;
        vy: number;
        rotation: number;
        life: number;
    }> = [];
    private particleContainer: PIXI.Container;
    private particleTexture: PIXI.Texture;

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

        // 创建粒子容器
        this.particleContainer = new PIXI.Container();
        this.boardContainer = new PIXI.Container();
        this.shapeContainer = new PIXI.Container();

        // 设置交互区域
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT);

        this.app.stage.addChild(this.boardContainer);
        this.app.stage.addChild(this.particleContainer);
        this.app.stage.addChild(this.shapeContainer);

        // 初始化粒子系统
        this.particles = [];
        this.particleTexture = PIXI.Texture.WHITE;

        this.state = {
            score: 0,
            isGameOver: false,
            shapes: [],
            placedShapesCount: 0,
            isAIEnabled: false
        };

        this.gameBoard = this.createEmptyBoard();
        this.initializeBoard();
        this.createScoreDisplay();
        this.createAIButton();
        this.generateNewShapes();

        // 添加动画循环
        this.app.ticker.add(this.updateParticles.bind(this));
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
        this.scoreText.x = BOARD_OFFSET_X;
        this.scoreText.y = 30;
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
        gradient.drawRect(0, BLOCK_SIZE/2, BLOCK_SIZE, BLOCK_SIZE/2);
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

        // 清除现有的形状
        this.state.shapes.forEach(shape => {
            gsap.to(shape.container, {
                alpha: 0,
                duration: 0.2,
                onComplete: () => {
                    this.shapeContainer.removeChild(shape.container);
                }
            });
        });

        this.state.shapes = [];
        this.state.placedShapesCount = 0;

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
        const message = new PIXI.Text('游戏结束', {
            fontSize: 48,
            fill: 0xffffff
        });
        message.anchor.set(0.5);
        message.x = GAME_WIDTH / 2;
        message.y = GAME_HEIGHT / 2;
        this.app.stage.addChild(message);
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
            this.state.placedShapesCount++;

            // 如果所有形状都已放置，生成新的形状
            if (this.state.placedShapesCount >= 3) {
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
        }
        const emptyBlock = this.createEmptyBlock(
            block.position.col * BLOCK_SIZE + BOARD_OFFSET_X,
            block.position.row * BLOCK_SIZE + BOARD_OFFSET_Y
        );
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
        // 创建动画序列
        const timeline = gsap.timeline();

        // 收集要清除的方块
        const blocksToRemove: Block[] = [];
        rows.forEach(row => {
            for (let col = 0; col < GRID_SIZE; col++) {
                blocksToRemove.push(this.gameBoard[row][col]);
            }
        });
        cols.forEach(col => {
            for (let row = 0; row < GRID_SIZE; row++) {
                if (!blocksToRemove.includes(this.gameBoard[row][col])) {
                    blocksToRemove.push(this.gameBoard[row][col]);
                }
            }
        });

        // 闪烁效果
        blocksToRemove.forEach(block => {
            gsap.to(block.sprite, {
                alpha: 0.2,
                duration: 0.1,
                repeat: 2, // 3次闪烁
                yoyo: true,
                ease: "none",
                onComplete: () => {
                    // 闪烁结束后的消失动画
                    gsap.to(block.sprite, {
                        alpha: 0,
                        scale: 0.8,
                        duration: 0.15,
                        ease: "power2.in",
                        onComplete: () => {
                            this.createParticleEffect(
                                block.sprite.x + BLOCK_SIZE / 2,
                                block.sprite.y + BLOCK_SIZE / 2,
                                block.color
                            );
                            this.clearBlock(block);
                            
                            // 在最后一个方块清除完成后检查游戏是否结束
                            if (block === blocksToRemove[blocksToRemove.length - 1]) {
                                this.checkGameOver();
                            }
                        }
                    });
                }
            });
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
            particle.life -= 0.016 * delta;
            
            if (particle.life <= 0) {
                this.particleContainer.removeChild(particle.sprite);
                particle.sprite.destroy();
                this.particles.splice(i, 1);
                continue;
            }
            
            // 更新位置
            particle.sprite.x += particle.vx * delta;
            particle.sprite.y += particle.vy * delta;
            particle.vy += 0.2 * delta; // 重力效果
            
            // 旋转效果
            particle.sprite.rotation += particle.rotation;
            
            // 缩放和透明度
            const lifeRatio = particle.life / 1.2;
            particle.sprite.alpha = lifeRatio;
            particle.sprite.scale.set(lifeRatio * 0.5);
        }
    }

    /**
     * 创建粒子特效
     * @param x - 特效的X坐标
     * @param y - 特效的Y坐标
     * @param color - 粒子的颜色
     */
    private createParticleEffect(x: number, y: number, color: number): void {
        const particleCount = 30; // 增加粒子数量
        for (let i = 0; i < particleCount; i++) {
            const particle = new PIXI.Graphics();
            
            // 随机选择粒子形状
            const shapeType = Math.random();
            if (shapeType < 0.3) {
                // 圆形粒子
                particle.beginFill(color);
                particle.drawCircle(0, 0, 3);
                particle.endFill();
            } else if (shapeType < 0.6) {
                // 星形粒子
                particle.beginFill(color);
                this.drawStar(particle, 0, 0, 5, 4, 2);
                particle.endFill();
            } else {
                // 方形粒子
                particle.beginFill(color);
                particle.drawRect(-2, -2, 4, 4);
                particle.endFill();
            }
            
            particle.x = x;
            particle.y = y;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            const scale = 0.5 + Math.random() * 0.5;
            particle.scale.set(scale);
            
            const particle_obj = {
                sprite: particle,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                rotation: (Math.random() - 0.5) * 0.2,
                life: 0.8 + Math.random() * 0.4
            };
            
            this.particles.push(particle_obj);
            this.particleContainer.addChild(particle);
            
            // 添加发光效果
            const glow = new PIXI.Graphics();
            glow.beginFill(color, 0.3);
            glow.drawCircle(0, 0, 6);
            glow.endFill();
            particle.addChild(glow);
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

        this.app.stage.addChild(button);
    }

    /**
     * 寻找最佳移动位置
     * @param shape - 要放置的形状
     * @returns 返回最佳的放置位置和得分
     */
    private findBestMove(shape: Shape): { row: number; col: number; score: number } {
        let bestScore = -Infinity;
        let bestRow = 0;
        let bestCol = 0;
        let foundValidMove = false;

        // 遍历所有可能的位置
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (this.canPlaceShape(row, col, shape)) {
                    foundValidMove = true;
                    let score = 0;
                    
                    // 检查放置后是否能消除行或列
                    let wouldClearLines = 0;
                    let wouldCreateGaps = 0;
                    
                    // 模拟放置并检查结果
                    const simulatedBoard = this.simulatePlacement(row, col, shape);
                    
                    // 检查行
                    for (let r = 0; r < GRID_SIZE; r++) {
                        let rowBlocks = 0;
                        let rowGaps = 0;
                        let lastWasEmpty = false;
                        
                        for (let c = 0; c < GRID_SIZE; c++) {
                            if (!simulatedBoard[r][c]) {
                                if (!lastWasEmpty && rowBlocks > 0) {
                                    rowGaps++;
                                }
                                lastWasEmpty = true;
                            } else {
                                rowBlocks++;
                                lastWasEmpty = false;
                            }
                        }
                        
                        if (rowBlocks === GRID_SIZE) {
                            wouldClearLines++;
                        }
                        wouldCreateGaps += rowGaps;
                    }
                    
                    // 检查列
                    for (let c = 0; c < GRID_SIZE; c++) {
                        let colBlocks = 0;
                        let colGaps = 0;
                        let lastWasEmpty = false;
                        
                        for (let r = 0; r < GRID_SIZE; r++) {
                            if (!simulatedBoard[r][c]) {
                                if (!lastWasEmpty && colBlocks > 0) {
                                    colGaps++;
                                }
                                lastWasEmpty = true;
                            } else {
                                colBlocks++;
                                lastWasEmpty = false;
                            }
                        }
                        
                        if (colBlocks === GRID_SIZE) {
                            wouldClearLines++;
                        }
                        wouldCreateGaps += colGaps;
                    }
                    
                    // 基础分数计算
                    score += wouldClearLines * 1000;  // 大幅提高消除行/列的权重
                    score -= wouldCreateGaps * 50;    // 惩罚创建空隙
                    
                    // 计算与已有方块的接触面
                    let touchingBlocks = 0;
                    let touchingEdges = 0;
                    
                    for (let r = 0; r < shape.blocks.length; r++) {
                        for (let c = 0; c < shape.blocks[r].length; c++) {
                            if (shape.blocks[r][c]) {
                                const boardRow = row + r;
                                const boardCol = col + c;
                                
                                // 检查四个方向
                                const directions = [[-1,0], [1,0], [0,-1], [0,1]];
                                for (const [dr, dc] of directions) {
                                    const newRow = boardRow + dr;
                                    const newCol = boardCol + dc;
                                    
                                    if (newRow >= 0 && newRow < GRID_SIZE && 
                                        newCol >= 0 && newCol < GRID_SIZE) {
                                        if (!this.gameBoard[newRow][newCol].isEmpty) {
                                            touchingBlocks++;
                                        }
                                    } else {
                                        touchingEdges++;
                                    }
                                }
                            }
                        }
                    }
                    
                    score += touchingBlocks * 100;   // 提高相邻方块的权重
                    score -= touchingEdges * 30;     // 轻微惩罚靠边
                    
                    // 优先选择底部位置
                    score += (GRID_SIZE - row) * 20;
                    
                    // 如果这个位置能立即消除，给予额外奖励
                    if (wouldClearLines > 0) {
                        score += 2000;  // 额外奖励
                    }

                    if (score > bestScore) {
                        bestScore = score;
                        bestRow = row;
                        bestCol = col;
                    }
                }
            }
        }

        // 如果找不到有效移动，返回特殊值
        if (!foundValidMove) {
            return { row: -1, col: -1, score: -Infinity };
        }

        return { row: bestRow, col: bestCol, score: bestScore };
    }

    /**
     * 模拟形状放置
     * @param row - 目标行
     * @param col - 目标列
     * @param shape - 要放置的形状
     * @returns 返回模拟后的游戏板状态
     */
    private simulatePlacement(row: number, col: number, shape: Shape): boolean[][] {
        const board: boolean[][] = Array(GRID_SIZE).fill(0).map(() => 
            Array(GRID_SIZE).fill(false)
        );
        
        // 复制当前棋盘状态
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                board[r][c] = !this.gameBoard[r][c].isEmpty;
            }
        }
        
        // 模拟放置新形状
        for (let r = 0; r < shape.blocks.length; r++) {
            for (let c = 0; c < shape.blocks[r].length; c++) {
                if (shape.blocks[r][c]) {
                    board[row + r][col + c] = true;
                }
            }
        }
        
        return board;
    }

    /**
     * 运行AI逻辑
     * 自动寻找并执行最佳移动
     */
    private async runAI(): Promise<void> {
        if (!this.state.isAIEnabled || this.state.isGameOver) return;

        // 找到最佳移动
        let bestShape = null;
        let bestMove = { row: -1, col: -1, score: -Infinity };

        for (const shape of this.state.shapes) {
            const move = this.findBestMove(shape);
            if (move.score > bestMove.score) {
                bestMove = move;
                bestShape = shape;
            }
        }

        if (bestShape && bestMove.score > -Infinity) {
            // 等待0.15秒
            await new Promise(resolve => setTimeout(resolve, 150));
            if (!this.state.isAIEnabled) return;

            // 计算目标位置
            const targetX = bestMove.col * BLOCK_SIZE + BOARD_OFFSET_X;
            const targetY = bestMove.row * BLOCK_SIZE + BOARD_OFFSET_Y;

            // 创建移动动画
            await new Promise<void>(resolve => {
                gsap.to(bestShape.container, {
                    x: targetX,
                    y: targetY,
                    duration: 0.5,
                    ease: "power2.out",
                    onComplete: resolve
                });
            });

            if (!this.state.isAIEnabled) return;

            // 放置形状
            this.placeShape(bestMove.row, bestMove.col, bestShape);
            this.checkLines();
            this.state.placedShapesCount++;
            
            // 移除已放置的形状
            const index = this.state.shapes.indexOf(bestShape);
            if (index > -1) {
                this.state.shapes.splice(index, 1);
                this.shapeContainer.removeChild(bestShape.container);
            }

            // 如果所有形状都已放置，生成新的形状
            if (this.state.placedShapesCount >= 3) {
                this.generateNewShapes();
            }

            // 继续运行AI
            this.runAI();
        } else {
            // 如果找不到有效移动，生成新的形状
            this.generateNewShapes();
            this.runAI();
        }
    }
} 