import * as PIXI from 'pixi.js';
import { Block, Shape } from './types';
import { BLOCK_SIZE, BOARD_OFFSET_X, BOARD_OFFSET_Y, GRID_SIZE } from './constants';
import gsap from 'gsap';

/**
 * 游戏AI类
 * 负责处理游戏的AI逻辑
 */
export class GameAI {
    constructor(private gameBoard: Block[][], private shapeContainer: PIXI.Container) {}

    /**
     * 寻找最佳移动位置
     * @param shape - 要放置的形状
     * @param canPlaceShape - 检查形状是否可以放置的函数
     * @returns 返回最佳的放置位置和得分
     */
    public findBestMove(
        shape: Shape,
        canPlaceShape: (row: number, col: number, shape: Shape) => boolean
    ): { row: number; col: number; score: number } {
        let bestScore = -Infinity;
        let bestRow = 0;
        let bestCol = 0;
        let foundValidMove = false;

        // 遍历所有可能的位置
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (canPlaceShape(row, col, shape)) {
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
     * 执行AI移动
     * @param shapes - 当前可用的形状列表
     * @param canPlaceShape - 检查形状是否可以放置的函数
     * @param onPlaceShape - 放置形状的回调函数
     * @returns 返回是否成功执行了移动
     */
    public async executeMove(
        shapes: Shape[],
        canPlaceShape: (row: number, col: number, shape: Shape) => boolean,
        onPlaceShape: (row: number, col: number, shape: Shape) => void
    ): Promise<boolean> {
        // 找到最佳移动
        let bestShape = null;
        let bestMove = { row: -1, col: -1, score: -Infinity };

        for (const shape of shapes) {
            const move = this.findBestMove(shape, canPlaceShape);
            if (move.score > bestMove.score) {
                bestMove = move;
                bestShape = shape;
            }
        }

        if (bestShape && bestMove.score > -Infinity) {
            // 等待一小段时间
            await new Promise(resolve => setTimeout(resolve, 150));

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

            // 放置形状
            onPlaceShape(bestMove.row, bestMove.col, bestShape);
            return true;
        }

        return false;
    }
} 