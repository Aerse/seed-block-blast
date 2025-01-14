import * as PIXI from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { UIButton } from '../ui/UIButton';

/**
 * 游戏结束界面
 */
export class GameOverScreen extends PIXI.Container {
    constructor(private onHome: () => void) {
        super();
        this.createUI();
    }

    /**
     * 创建游戏结束界面UI
     */
    private createUI(): void {
        // 创建半透明背景
        const overlay = new PIXI.Graphics();
        overlay.beginFill(0x000000, 0.7);
        overlay.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        overlay.endFill();
        this.addChild(overlay);

        // 创建标题
        const title = new PIXI.Text('游戏结束', {
            fontSize: 48,
            fill: 0xffffff,
            fontWeight: 'bold'
        });
        title.anchor.set(0.5);
        title.x = GAME_WIDTH / 2;
        title.y = GAME_HEIGHT / 3;
        this.addChild(title);

        // 创建返回主页按钮
        const homeButton = new UIButton('返回主页', {
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT * 2 / 3,
            width: 200,
            height: 50,
            fontSize: 24
        });
        homeButton.on('pointerdown', () => this.onHome());
        this.addChild(homeButton);
    }

    /**
     * 设置最终分数
     */
    public setScore(score: number): void {
        const scoreText = new PIXI.Text(`最终分数: ${score}`, {
            fontSize: 32,
            fill: 0xffffff
        });
        scoreText.anchor.set(0.5);
        scoreText.x = GAME_WIDTH / 2;
        scoreText.y = GAME_HEIGHT / 2;
        this.addChild(scoreText);
    }

    /**
     * 显示界面
     */
    public show(): void {
        this.visible = true;
    }

    /**
     * 隐藏界面
     */
    public hide(): void {
        this.visible = false;
    }

    /**
     * 销毁界面
     */
    public destroy(): void {
        super.destroy({ children: true });
    }
} 