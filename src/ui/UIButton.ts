import * as PIXI from 'pixi.js';

interface ButtonOptions {
    x: number;
    y: number;
    width?: number;
    height?: number;
    fontSize?: number;
    backgroundColor?: number;
    textColor?: number;
    borderColor?: number;
    borderWidth?: number;
    cornerRadius?: number;
}

/**
 * 通用按钮组件
 */
export class UIButton extends PIXI.Container {
    private bg: PIXI.Graphics;
    private text: PIXI.Text;

    constructor(label: string, options: ButtonOptions) {
        super();

        const {
            x,
            y,
            width = 200,
            height = 50,
            fontSize = 24,
            backgroundColor = 0x0066CC,
            textColor = 0xffffff,
            borderColor = 0xFFFFFF,
            borderWidth = 2,
            cornerRadius = 10
        } = options;

        this.x = x;
        this.y = y;

        // 创建背景
        this.bg = new PIXI.Graphics();
        this.bg.lineStyle(borderWidth, borderColor, 0.8);
        this.bg.beginFill(backgroundColor);
        this.bg.drawRoundedRect(-width/2, -height/2, width, height, cornerRadius);
        this.bg.endFill();

        // 创建文本
        this.text = new PIXI.Text(label, {
            fontSize: fontSize,
            fill: textColor,
            fontWeight: 'bold'
        });
        this.text.anchor.set(0.5);

        this.addChild(this.bg);
        this.addChild(this.text);

        // 设置交互
        this.eventMode = 'static';
        this.cursor = 'pointer';

        // 添加交互效果
        this.on('pointerover', this.onPointerOver.bind(this));
        this.on('pointerout', this.onPointerOut.bind(this));
    }

    /**
     * 鼠标悬停效果
     */
    private onPointerOver(): void {
        this.bg.tint = 0x0099FF;
        this.scale.set(1.05);
    }

    /**
     * 鼠标移出效果
     */
    private onPointerOut(): void {
        this.bg.tint = 0xFFFFFF;
        this.scale.set(1);
    }

    /**
     * 设置按钮文本
     */
    public setText(label: string): void {
        this.text.text = label;
    }

    /**
     * 设置按钮启用状态
     */
    public setEnabled(enabled: boolean): void {
        this.eventMode = enabled ? 'static' : 'none';
        this.alpha = enabled ? 1 : 0.5;
    }

    /**
     * 销毁按钮
     */
    public destroy(): void {
        this.removeAllListeners();
        super.destroy({ children: true });
    }
} 