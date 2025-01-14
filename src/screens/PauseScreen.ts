import * as PIXI from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { UIButton } from '../ui/UIButton';

interface PauseScreenCallbacks {
    onContinue: () => void;
    onHome: () => void;
}

/**
 * 暂停菜单界面
 */
export class PauseScreen extends PIXI.Container {
    constructor(private callbacks: PauseScreenCallbacks) {
        super();
        this.createUI();
    }

    /**
     * 创建暂停菜单UI
     */
    private createUI(): void {
        // 创建半透明背景
        const overlay = new PIXI.Graphics();
        overlay.beginFill(0x000000, 0.7);
        overlay.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        overlay.endFill();
        this.addChild(overlay);

        // 创建标题
        const title = new PIXI.Text('游戏暂停', {
            fontSize: 48,
            fill: 0xffffff,
            fontWeight: 'bold'
        });
        title.anchor.set(0.5);
        title.x = GAME_WIDTH / 2;
        title.y = GAME_HEIGHT / 3;
        this.addChild(title);

        // 创建继续按钮
        const continueButton = new UIButton('继续游戏', {
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            width: 200,
            height: 50,
            fontSize: 24
        });
        continueButton.on('pointerdown', () => this.callbacks.onContinue());
        this.addChild(continueButton);

        // 创建返回主页按钮
        const homeButton = new UIButton('返回主页', {
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2 + 70,
            width: 200,
            height: 50,
            fontSize: 24
        });
        homeButton.on('pointerdown', () => this.callbacks.onHome());
        this.addChild(homeButton);
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