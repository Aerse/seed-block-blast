/**
 * 游戏入口文件
 * 负责初始化游戏实例
 */

import { Game } from './Game';

/**
 * 当页面加载完成时初始化游戏
 * 创建新的Game实例以启动游戏
 */
window.onload = () => {
    new Game();
}; 