/**
 * 游戏画布宽度（像素）
 */
export const GAME_WIDTH = 400;

/**
 * 游戏画布高度（像素）
 */
export const GAME_HEIGHT = 700;

/**
 * 游戏网格大小（方块数量）
 */
export const GRID_SIZE = 8;

/**
 * 单个方块的大小（像素）
 */
export const BLOCK_SIZE = 40;

/**
 * 游戏板的X轴偏移量，用于水平居中
 */
export const BOARD_OFFSET_X = (GAME_WIDTH - GRID_SIZE * BLOCK_SIZE) / 2;

/**
 * 游戏板的Y轴偏移量，留出顶部空间
 */
export const BOARD_OFFSET_Y = 80;

/**
 * 形状显示区域的配置参数
 */
export const SHAPES_AREA = {
    x: 20,                                           // X轴起始位置
    y: BOARD_OFFSET_Y + (GRID_SIZE * BLOCK_SIZE) + 40, // Y轴起始位置（在游戏板下方）
    height: 140,                                     // 区域高度
    spacing: 120                                     // 形状之间的间距
};

/**
 * 方块的颜色列表
 * 使用十六进制颜色值表示
 */
export const BLOCK_COLORS = [
    0xff0000, // 红色
    0x00ff00, // 绿色
    0x0000ff, // 蓝色
    0xffff00, // 黄色
    0xff00ff, // 紫色
    0x00ffff, // 青色
    0xffa500  // 橙色
];

/**
 * 游戏中所有可能的形状定义
 * 使用二维布尔数组表示，true表示有方块，false表示空
 */
export const SHAPES = [
    // 1x1 单个方块
    [[true]],
    
    // 1x2 水平双方块
    [[true, true]],
    
    // 2x1 垂直双方块
    [[true],
     [true]],
     
    // I形
    [[true],
     [true],
     [true],
     [true]],
     
    // L形
    [[true, false],
     [true, false],
     [true, true]],
     
    // J形
    [[false, true],
     [false, true],
     [true, true]],
     
    // O形
    [[true, true],
     [true, true]],
     
    // S形
    [[false, true, true],
     [true, true, false]],
     
    // T形
    [[true, true, true],
     [false, true, false]],
     
    // Z形
    [[true, true, false],
     [false, true, true]]
]; 