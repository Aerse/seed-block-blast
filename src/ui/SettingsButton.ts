import * as PIXI from 'pixi.js';

/**
 * 设置按钮组件
 */
export class SettingsButton extends PIXI.Container {
    constructor(x: number, y: number, onClick: () => void) {
        super();

        this.x = x;
        this.y = y;

        // 创建按钮背景
        const bg = new PIXI.Graphics();
        bg.lineStyle(2, 0xFFFFFF, 0.5);
        bg.beginFill(0x808080);
        bg.drawRoundedRect(0, 0, 40, 40, 8);
        bg.endFill();

        // 创建设置图标
        const icon = new PIXI.Graphics();
        icon.lineStyle(2, 0xFFFFFF);
        icon.drawCircle(20, 20, 12);
        icon.moveTo(20, 8);
        icon.lineTo(20, 12);
        icon.moveTo(20, 28);
        icon.lineTo(20, 32);
        icon.moveTo(8, 20);
        icon.lineTo(12, 20);
        icon.moveTo(28, 20);
        icon.lineTo(32, 20);

        this.addChild(bg);
        this.addChild(icon);

        this.eventMode = 'static';
        this.cursor = 'pointer';
        this.on('pointerdown', onClick);
    }
} 