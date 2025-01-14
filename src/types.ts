import * as PIXI from 'pixi.js';

/**
 * 可拖拽容器接口
 * 扩展PIXI.Container以支持拖拽功能
 */
export interface DraggableContainer extends PIXI.Container {
    /** 是否正在拖拽中 */
    dragging: boolean;
    /** 拖拽事件的数据 */
    dragData: PIXI.FederatedPointerEvent['data'] | null;
    /** 拖拽开始时的位置 */
    dragStartPos: PIXI.Point;
    /** 拖拽的偏移量 */
    dragOffset: PIXI.Point;
}

/**
 * 网格位置接口
 * 表示游戏板上的行列位置
 */
export interface Position {
    /** 行索引 */
    row: number;
    /** 列索引 */
    col: number;
}

/**
 * 方块接口
 * 表示游戏板上的单个方块
 */
export interface Block {
    /** 方块的颜色值 */
    color: number;
    /** 方块的PIXI显示对象 */
    sprite: PIXI.DisplayObject;
    /** 方块在网格中的位置 */
    position: Position;
    /** 是否为空方块 */
    isEmpty: boolean;
}

/**
 * 形状接口
 * 表示游戏中的一个完整形状
 */
export interface Shape {
    /** 形状的布局矩阵，true表示有方块，false表示空 */
    blocks: boolean[][];
    /** 形状的颜色值 */
    color: number;
    /** 形状的容器对象 */
    container: DraggableContainer;
    /** 形状的宽度（方块数） */
    width: number;
    /** 形状的高度（方块数） */
    height: number;
}

/**
 * 游戏状态接口
 * 存储游戏的当前状态信息
 */
export interface GameState {
    /** 当前得分 */
    score: number;
    /** 游戏是否结束 */
    isGameOver: boolean;
    /** 当前可用的形状列表 */
    shapes: Shape[];
    /** 已放置的形状数量 */
    placedShapesCount: number;
    /** AI模式是否启用 */
    isAIEnabled: boolean;
} 