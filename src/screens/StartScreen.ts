import * as PIXI from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { UIButton } from '../ui/UIButton';

export class StartScreen extends PIXI.Container {
    constructor(private onStartGame: () => void) {
        super();
        this.createUI();
    }

    /**
     * 创建开始界面UI
     */
    private createUI(): void {
        // 创建标题
        const title = new PIXI.Text('Block Blast', {
            fontSize: 64,
            fill: 0xffffff,
            fontWeight: 'bold',
            dropShadow: true,
            dropShadowColor: 0x000000,
            dropShadowBlur: 4,
            dropShadowDistance: 4
        });
        title.anchor.set(0.5);
        title.x = GAME_WIDTH / 2;
        title.y = GAME_HEIGHT / 3;

        // 创建开始按钮
        const startButton = new UIButton('开始游戏', {
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            width: 200,
            height: 50,
            fontSize: 24
        });
        startButton.on('pointerdown', () => this.onStartGame());

        this.addChild(title);
        this.addChild(startButton);
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