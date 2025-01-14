import * as PIXI from 'pixi.js';
import gsap from 'gsap';

interface Particle {
    sprite: PIXI.DisplayObject;
    vx: number;
    vy: number;
    rotation: number;
    life: number;
    curve: number;
    maxLife: number;
}

/**
 * 粒子系统类
 * 负责管理和渲染粒子效果
 */
export class ParticleSystem {
    private particles: Particle[] = [];
    private particleTexture: PIXI.Texture;
    private container: PIXI.Container;

    constructor() {
        this.container = new PIXI.Container();
        this.particleTexture = PIXI.Texture.WHITE;
    }

    /**
     * 获取粒子容器
     */
    public getContainer(): PIXI.Container {
        return this.container;
    }

    /**
     * 更新粒子效果
     * @param delta - 帧间隔时间
     */
    public update(delta: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life -= 0.025 * delta; // 加快生命消耗

            if (particle.life <= 0) {
                if (particle.sprite.parent) {
                    particle.sprite.parent.removeChild(particle.sprite);
                }
                particle.sprite.destroy();
                this.particles.splice(i, 1);
                continue;
            }

            // 更新位置，添加曲线运动
            particle.sprite.x += particle.vx * delta * 1.2; // 加快水平移动
            particle.sprite.y += particle.vy * delta * 1.2; // 加快垂直移动
            particle.sprite.x += particle.curve * Math.sin(particle.life * 8) * delta; // 加快曲线频率
            particle.vy += 0.2 * delta; // 增加重力效果

            // 旋转效果
            particle.sprite.rotation += particle.rotation * delta * 1.2;

            // 使用生命值比例来创建更平滑的缩放和透明度过渡
            const lifeRatio = particle.life / particle.maxLife;
            const easeRatio = this.easeOutQuad(lifeRatio);

            particle.sprite.alpha = easeRatio;
            particle.sprite.scale.set(easeRatio * 0.8);
        }
    }

    /**
     * 创建粒子特效
     * @param x - 特效的X坐标
     * @param y - 特效的Y坐标
     * @param color - 粒子的颜色
     */
    public createEffect(x: number, y: number, color: number): void {
        const particleCount = 25; // 减少粒子数量以提高性能
        const glowColor = color;

        // 创建爆炸波
        const blast = new PIXI.Graphics();
        blast.beginFill(color, 0.3);
        blast.drawCircle(0, 0, 5);
        blast.endFill();
        blast.x = x;
        blast.y = y;
        this.container.addChild(blast);

        // 加快爆炸波动画
        gsap.to(blast.scale, {
            x: 8,
            y: 8,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => {
                if (blast.parent) {
                    blast.parent.removeChild(blast);
                }
                blast.destroy();
            }
        });
        gsap.to(blast, {
            alpha: 0,
            duration: 0.3,
            ease: "power2.out"
        });

        for (let i = 0; i < particleCount; i++) {
            const particle = new PIXI.Graphics();

            // 随机选择粒子形状
            const shapeType = Math.random();
            if (shapeType < 0.3) {
                // 圆形粒子
                particle.beginFill(color, 0.9);
                particle.drawCircle(0, 0, 2);
                particle.endFill();
                // 添加发光效果
                particle.beginFill(glowColor, 0.4);
                particle.drawCircle(0, 0, 4);
                particle.endFill();
            } else if (shapeType < 0.6) {
                // 星形粒子
                particle.beginFill(color, 0.9);
                this.drawStar(particle, 0, 0, 5, 3, 1.5);
                particle.endFill();
                // 添加发光效果
                particle.beginFill(glowColor, 0.4);
                this.drawStar(particle, 0, 0, 5, 5, 2.5);
                particle.endFill();
            } else {
                // 菱形粒子
                particle.beginFill(color, 0.9);
                particle.moveTo(0, -3);
                particle.lineTo(3, 0);
                particle.lineTo(0, 3);
                particle.lineTo(-3, 0);
                particle.closePath();
                particle.endFill();
                // 添加发光效果
                particle.beginFill(glowColor, 0.4);
                particle.moveTo(0, -5);
                particle.lineTo(5, 0);
                particle.lineTo(0, 5);
                particle.lineTo(-5, 0);
                particle.closePath();
                particle.endFill();
            }

            particle.x = x;
            particle.y = y;

            // 创建更快的运动轨迹
            const angle = (Math.random() * Math.PI * 2);
            const speed = 3 + Math.random() * 5; // 增加速度
            const curve = (Math.random() - 0.5) * 3; // 增加曲线幅度
            const scale = 0.5 + Math.random() * 0.8;
            particle.scale.set(scale);

            const particle_obj = {
                sprite: particle,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4, // 增加向上的初始速度
                curve: curve,
                rotation: (Math.random() - 0.5) * 0.6, // 增加旋转速度
                life: 0.8 + Math.random() * 0.4, // 减少生命周期
                maxLife: 0.8 + Math.random() * 0.4
            };

            this.particles.push(particle_obj);
            this.container.addChild(particle);
        }
    }

    /**
     * 清除所有粒子
     */
    public clear(): void {
        this.particles.forEach(particle => {
            if (particle.sprite.parent) {
                particle.sprite.parent.removeChild(particle.sprite);
            }
            particle.sprite.destroy();
        });
        this.particles = [];
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
     * 缓动函数 - easeOutQuad
     * @param t - 时间比例 (0-1)
     * @returns 缓动后的值
     */
    private easeOutQuad(t: number): number {
        return t * (2 - t);
    }
} 