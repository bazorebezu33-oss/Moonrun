import { LevelItem, SimulationState } from './types.ts';

/**
 * Canvas 2D renderer for MOONRUN.
 *
 * Logical-to-Display Mapping:
 * - Logical track distance: meters [0, 1000m].
 * - Logical altitude: meters (0m = ground surface, >0m = airborne, <0m = inside chasm).
 * - Player screen anchor: fixed at 25% of viewport width (W * 0.25).
 * - Visible horizon window: ~45 meters across viewport (pixelsPerMeterX = W / 45).
 * - Vertical scale: pixelsPerMeterY = Math.max(30, H / 20).
 * - Ground display line: groundY = H * 0.72.
 * - Player screen Y: groundY - altitudeMeters * pixelsPerMeterY.
 *
 * Resizing changes only the visual pixel projection; all physics and collision
 * calculations remain 100% invariant in logical units.
 */

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 1920;
  private height: number = 1080;

  // Starfield
  private stars: { x: number; y: number; size: number; alpha: number; twinkleSpeed: number }[] = [];

  // Particle pool (fixed ring buffer)
  private readonly maxParticles = 400;
  private particles: Particle[] = [];
  private particleIndex: number = 0;

  // Screen shake
  private trauma: number = 0;

  // Craggy mountain heightmaps
  private mountainRidge1: number[] = [];
  private mountainRidge2: number[] = [];
  private mountainRidge3: number[] = [];

  // Pre-rendered Earth offscreen canvas
  private earthCanvas: HTMLCanvasElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.initStars();
    this.initMountainData();
    this.initParticlePool();
    this.preRenderEarth();
  }

  public resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.preRenderEarth();
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 280; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.72,
        size: Math.random() < 0.12 ? 2.5 : Math.random() < 0.5 ? 1.5 : 1.0,
        alpha: 0.35 + Math.random() * 0.65,
        twinkleSpeed: 1.2 + Math.random() * 3.5,
      });
    }
  }

  private initMountainData() {
    this.mountainRidge1 = this.generateCraggyRidge(144, 75, 40);
    this.mountainRidge2 = this.generateCraggyRidge(144, 115, 50);
    this.mountainRidge3 = this.generateCraggyRidge(144, 150, 60);
  }

  private generateCraggyRidge(points: number, baseHeight: number, variance: number): number[] {
    const arr: number[] = [];
    for (let i = 0; i < points; i++) {
      const u = i / points;
      const o1 = Math.sin(u * Math.PI * 4) * variance;
      const o2 = Math.sin(u * Math.PI * 12 + 1.2) * (variance * 0.45);
      const o3 = Math.cos(u * Math.PI * 26 + 2.5) * (variance * 0.25);
      const o4 = Math.abs(Math.sin(u * Math.PI * 8)) * (variance * 0.35);
      arr.push(baseHeight + o1 + o2 + o3 + o4);
    }
    return arr;
  }

  private initParticlePool() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: '#ffffff',
        alpha: 1,
      });
    }
  }

  private preRenderEarth() {
    const size = Math.round(Math.min(this.width, this.height) * 0.34);
    if (size < 60) return;

    this.earthCanvas = document.createElement('canvas');
    this.earthCanvas.width = size;
    this.earthCanvas.height = size;
    const ectx = this.earthCanvas.getContext('2d')!;

    const cx = size * 0.5;
    const cy = size * 0.5;
    const r = size * 0.42;

    const halo = ectx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.2);
    halo.addColorStop(0, 'rgba(56, 189, 248, 0.65)');
    halo.addColorStop(0.4, 'rgba(37, 99, 235, 0.25)');
    halo.addColorStop(0.8, 'rgba(14, 165, 233, 0.08)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ectx.fillStyle = halo;
    ectx.beginPath();
    ectx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
    ectx.fill();

    ectx.save();
    ectx.beginPath();
    ectx.arc(cx, cy, r, 0, Math.PI * 2);
    ectx.clip();

    const ocean = ectx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
    ocean.addColorStop(0, '#1E40AF');
    ocean.addColorStop(0.45, '#1D4ED8');
    ocean.addColorStop(0.8, '#172554');
    ocean.addColorStop(1, '#030712');
    ectx.fillStyle = ocean;
    ectx.fillRect(0, 0, size, size);

    ectx.fillStyle = '#15803D';
    ectx.beginPath();
    ectx.arc(cx - r * 0.25, cy - r * 0.22, r * 0.36, 0, Math.PI * 2);
    ectx.arc(cx + r * 0.05, cy - r * 0.3, r * 0.28, 0, Math.PI * 2);
    ectx.fill();

    ectx.fillStyle = '#B45309';
    ectx.beginPath();
    ectx.ellipse(cx - r * 0.08, cy - r * 0.05, r * 0.24, r * 0.14, 0.2, 0, Math.PI * 2);
    ectx.fill();

    ectx.fillStyle = '#166534';
    ectx.beginPath();
    ectx.ellipse(cx + r * 0.12, cy + r * 0.18, r * 0.28, r * 0.42, 0.25, 0, Math.PI * 2);
    ectx.fill();

    ectx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ectx.beginPath();
    ectx.ellipse(cx - r * 0.15, cy - r * 0.35, r * 0.55, r * 0.12, -0.3, 0, Math.PI * 2);
    ectx.ellipse(cx + r * 0.22, cy - r * 0.16, r * 0.4, r * 0.14, 0.4, 0, Math.PI * 2);
    ectx.fill();

    ectx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ectx.beginPath();
    ectx.arc(cx - r * 0.25, cy - r * 0.38, r * 0.08, 0, Math.PI * 2);
    ectx.fill();

    ectx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ectx.beginPath();
    ectx.ellipse(cx - r * 0.1, cy + r * 0.08, r * 0.6, r * 0.12, -0.15, 0, Math.PI * 2);
    ectx.ellipse(cx + r * 0.15, cy + r * 0.32, r * 0.48, r * 0.16, 0.28, 0, Math.PI * 2);
    ectx.fill();

    ectx.fillStyle = '#FFFFFF';
    ectx.beginPath();
    ectx.ellipse(cx - r * 0.05, cy - r * 0.85, r * 0.36, r * 0.12, 0, 0, Math.PI * 2);
    ectx.fill();

    const terminator = ectx.createRadialGradient(
      cx - r * 0.5,
      cy - r * 0.5,
      r * 0.2,
      cx + r * 0.3,
      cy + r * 0.3,
      r * 1.35
    );
    terminator.addColorStop(0, 'rgba(0, 0, 0, 0)');
    terminator.addColorStop(0.5, 'rgba(2, 6, 23, 0.3)');
    terminator.addColorStop(0.82, 'rgba(2, 6, 23, 0.94)');
    terminator.addColorStop(1, 'rgba(0, 0, 0, 0.99)');
    ectx.fillStyle = terminator;
    ectx.fillRect(0, 0, size, size);

    ectx.strokeStyle = '#38BDF8';
    ectx.lineWidth = 3;
    ectx.beginPath();
    ectx.arc(cx, cy, r - 1.5, -Math.PI * 0.85, -Math.PI * 0.05);
    ectx.stroke();

    ectx.restore();
  }

  public spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    color: string,
    maxLife: number
  ) {
    const p = this.particles[this.particleIndex];
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.size = size;
    p.color = color;
    p.life = maxLife;
    p.maxLife = maxLife;
    p.alpha = 1;

    this.particleIndex = (this.particleIndex + 1) % this.maxParticles;
  }

  public addTrauma(amount: number) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  public render(
    dt: number,
    simState: SimulationState,
    items: LevelItem[]
  ) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const groundY = h * 0.72;

    const pixelsPerMeterX = w / 45;
    const pixelsPerMeterY = Math.max(28, h / 20);

    const playerScreenX = w * 0.25;
    const playerScreenY = groundY - simState.altitudeMeters * pixelsPerMeterY;

    // Screen shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.trauma > 0) {
      const shakeMag = this.trauma * this.trauma * 16;
      shakeX = (Math.random() * 2 - 1) * shakeMag;
      shakeY = (Math.random() * 2 - 1) * shakeMag;
      this.trauma = Math.max(0, this.trauma - dt * 2.2);
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Sky & Cosmos
    this.drawSky(ctx, w, h, simState.timeElapsedSec);

    // 2. Earth & Moonlet
    this.drawEarth(ctx, w, h, simState.distanceMeters);

    // 3. Parallax Mountains
    this.drawMountains(ctx, w, groundY, simState.distanceMeters);

    // 4. Distant Spacecraft or Launchpad
    this.drawSpacecraft(
      ctx,
      w,
      groundY,
      simState.distanceMeters,
      Math.max(0, 1000 - simState.distanceMeters),
      simState.gameOverReason,
      simState.timeElapsedSec
    );

    // 5. Lunar Terrain & Chasms
    this.drawTerrain(ctx, w, h, groundY, simState.distanceMeters, items, pixelsPerMeterX, playerScreenX);

    // 6. Level Items (Rocks derived from shared geometry, Collectibles)
    this.drawLevelItems(ctx, groundY, simState.distanceMeters, items, simState.timeElapsedSec, pixelsPerMeterX, pixelsPerMeterY, playerScreenX);

    // 7. Apollo Astronaut
    this.drawAstronaut(
      ctx,
      playerScreenX,
      playerScreenY,
      simState.vy,
      simState.isGrounded,
      simState.isBoosting,
      simState.slowdownTimer > 0,
      simState.timeElapsedSec,
      dt,
      pixelsPerMeterY
    );

    // 8. Alien Tentacles
    this.drawTentacles(ctx, groundY, simState.threatDistance, simState.timeElapsedSec, dt);

    // 9. Particles
    this.updateAndDrawParticles(ctx, dt);

    // 10. Vignette
    this.drawVignette(ctx, w, h);

    ctx.restore();
  }

  private drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#04070D');
    skyGrad.addColorStop(0.5, '#070B13');
    skyGrad.addColorStop(1, '#0C111C');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    const nebulaGrad = ctx.createRadialGradient(w * 0.68, h * 0.28, 50, w * 0.68, h * 0.28, w * 0.55);
    nebulaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
    nebulaGrad.addColorStop(0.4, 'rgba(147, 51, 234, 0.04)');
    nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, w, h);

    for (const star of this.stars) {
      const sx = star.x * w;
      const sy = star.y * h;
      const twinkle = 0.65 + 0.35 * Math.sin(time * star.twinkleSpeed + star.x * 30);
      ctx.fillStyle = `rgba(240, 246, 255, ${star.alpha * twinkle})`;
      ctx.fillRect(sx, sy, star.size, star.size);
    }
  }

  private drawEarth(ctx: CanvasRenderingContext2D, w: number, h: number, distanceMeters: number) {
    if (!this.earthCanvas) return;

    ctx.save();
    const earthX = w * 0.67 - (distanceMeters * 0.015) % (w * 0.15);
    const earthY = h * 0.27;
    const ew = this.earthCanvas.width;
    const eh = this.earthCanvas.height;

    ctx.drawImage(this.earthCanvas, earthX - ew * 0.5, earthY - eh * 0.5);

    const moon2X = w * 0.44;
    const moon2Y = h * 0.34;
    const moon2R = 9;
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.arc(moon2X, moon2Y, moon2R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#070B13';
    ctx.beginPath();
    ctx.arc(moon2X + 3.2, moon2Y - 1.2, moon2R * 0.88, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawMountains(
    ctx: CanvasRenderingContext2D,
    w: number,
    groundY: number,
    distanceMeters: number
  ) {
    ctx.save();
    const off1 = (distanceMeters * 1.5) % w;
    this.drawJaggedRidge(ctx, w, groundY - 165, off1, this.mountainRidge1, '#0F172A', '#1E293B');

    const off2 = (distanceMeters * 4.2) % w;
    this.drawJaggedRidge(ctx, w, groundY - 105, off2, this.mountainRidge2, '#1E293B', '#334155');

    const off3 = (distanceMeters * 9.0) % w;
    this.drawJaggedRidge(ctx, w, groundY - 55, off3, this.mountainRidge3, '#334155', '#475569');
    ctx.restore();
  }

  private drawJaggedRidge(
    ctx: CanvasRenderingContext2D,
    w: number,
    baseY: number,
    offset: number,
    ridge: number[],
    baseColor: string,
    peakColor: string
  ) {
    ctx.beginPath();
    ctx.moveTo(0, baseY + 200);

    const step = w / (ridge.length / 2);
    for (let x = -step; x <= w + step * 2; x += step) {
      const idx = Math.floor(Math.abs((x + offset) / step)) % ridge.length;
      const hVal = ridge[idx];
      ctx.lineTo(x, baseY - hVal);
    }

    ctx.lineTo(w, baseY + 200);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, baseY - 80, 0, baseY + 120);
    grad.addColorStop(0, peakColor);
    grad.addColorStop(1, baseColor);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  private drawSpacecraft(
    ctx: CanvasRenderingContext2D,
    w: number,
    groundY: number,
    _distanceMeters: number,
    remainingMeters: number,
    outcome: string | null,
    time: number
  ) {
    ctx.save();

    if (remainingMeters > 75) {
      const distShipX = w * 0.92;
      const distShipY = groundY - 32;

      ctx.translate(distShipX, distShipY);
      ctx.scale(0.65, 0.65);

      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(25, -2);
      ctx.lineTo(-12, -14);
      ctx.lineTo(-20, -20);
      ctx.lineTo(-18, -2);
      ctx.lineTo(-22, 10);
      ctx.lineTo(-12, 8);
      ctx.closePath();
      ctx.fill();

      const blink = 0.5 + 0.5 * Math.sin(time * 4);
      ctx.fillStyle = `rgba(255, 190, 85, ${blink})`;
      ctx.shadowColor = '#FFBE55';
      ctx.shadowBlur = 8;
      ctx.fillRect(8, -5, 5, 3);
    } else {
      let shipX = w * 0.72;
      let shipY = groundY - 12;
      const scale = 1.7;

      if (outcome === 'victory_escape') {
        const launchTime = Math.min(6, (time % 10));
        shipY -= launchTime * launchTime * 50;
        shipX += launchTime * 20;
      } else if (outcome === 'victory_crash') {
        const launchTime = Math.min(4, (time % 10));
        if (launchTime < 1.5) {
          shipY -= launchTime * 22;
        } else {
          shipY = groundY + 6;
        }
      }

      ctx.translate(shipX, shipY);
      ctx.scale(scale, scale);

      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(38, -2);
      ctx.lineTo(-20, -18);
      ctx.lineTo(-32, -26);
      ctx.lineTo(-28, -2);
      ctx.lineTo(-34, 14);
      ctx.lineTo(-18, 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(38, -2);
      ctx.lineTo(-18, 5);
      ctx.lineTo(-28, -2);
      ctx.lineTo(-34, 14);
      ctx.lineTo(-18, 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFBE55';
      ctx.shadowColor = '#FFBE55';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(14, -6, 7, 3, 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-30, -7, 6, 12);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-12, 8);
      ctx.lineTo(-20, 20);
      ctx.moveTo(12, 8);
      ctx.lineTo(18, 20);
      ctx.stroke();

      if (outcome === 'victory_escape' || (outcome === 'victory_crash' && time % 3 < 1.5)) {
        const flicker = 0.8 + 0.4 * Math.sin(time * 35);
        ctx.fillStyle = '#FFBE55';
        ctx.shadowColor = '#43D9F5';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.moveTo(-32, -6);
        ctx.lineTo(-75 * flicker, 0);
        ctx.lineTo(-32, 6);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawTerrain(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    groundY: number,
    distanceMeters: number,
    items: LevelItem[],
    ppmX: number,
    playerScreenX: number
  ) {
    ctx.save();

    const visibleChasms = items.filter(
      (it) => it.type === 'chasm' && Math.abs(it.distanceMeters - distanceMeters) < 80
    );

    const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
    groundGrad.addColorStop(0, '#A3AEBC');
    groundGrad.addColorStop(0.06, '#64748B');
    groundGrad.addColorStop(0.28, '#334155');
    groundGrad.addColorStop(1, '#0B111E');

    ctx.fillStyle = groundGrad;

    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, groundY);

    let currentX = 0;
    while (currentX < w) {
      const currentWorldM = distanceMeters + (currentX - playerScreenX) / ppmX;
      const chasm = visibleChasms.find(
        (c) =>
          currentWorldM >= c.distanceMeters &&
          currentWorldM < c.distanceMeters + (c.widthMeters ?? 10)
      );

      if (chasm) {
        const chasmStart = playerScreenX + (chasm.distanceMeters - distanceMeters) * ppmX;
        const chasmEnd =
          playerScreenX + (chasm.distanceMeters + (chasm.widthMeters ?? 10) - distanceMeters) * ppmX;

        if (chasmStart > currentX) {
          ctx.lineTo(chasmStart, groundY);
        }
        ctx.lineTo(chasmStart, h);
        ctx.lineTo(chasmEnd, h);
        ctx.lineTo(chasmEnd, groundY);
        currentX = chasmEnd + 2;
      } else {
        ctx.lineTo(currentX, groundY);
        currentX += 25;
      }
    }

    ctx.lineTo(w, groundY);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Chasm internal vertical walls
    for (const c of visibleChasms) {
      const cStart = playerScreenX + (c.distanceMeters - distanceMeters) * ppmX;
      const cEnd = playerScreenX + (c.distanceMeters + (c.widthMeters ?? 10) - distanceMeters) * ppmX;
      if (cEnd > 0 && cStart < w) {
        ctx.fillStyle = '#04070D';
        ctx.fillRect(cStart, groundY, cEnd - cStart, h - groundY);

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(cStart, groundY);
        ctx.lineTo(cStart + 8, groundY + 45);
        ctx.lineTo(cStart + 3, groundY + 95);
        ctx.lineTo(cStart + 12, h);
        ctx.moveTo(cEnd, groundY);
        ctx.lineTo(cEnd - 8, groundY + 40);
        ctx.lineTo(cEnd - 3, groundY + 90);
        ctx.lineTo(cEnd - 10, h);
        ctx.stroke();
      }
    }

    // Surface texture (purely cosmetic speckles, non-colliding)
    ctx.fillStyle = '#CBD5E1';
    for (let sx = 0; sx < w; sx += 24) {
      const worldM = distanceMeters + (sx - playerScreenX) / ppmX;
      const inChasm = visibleChasms.some(
        (c) => worldM >= c.distanceMeters && worldM < c.distanceMeters + (c.widthMeters ?? 10)
      );
      if (!inChasm) {
        const seed = Math.sin(worldM * 18.3);
        if (seed > 0.42) {
          ctx.fillRect(sx, groundY + 2 + seed * 3, 3.5, 2.0);
        }
      }
    }

    ctx.restore();
  }

  private drawLevelItems(
    ctx: CanvasRenderingContext2D,
    groundY: number,
    distanceMeters: number,
    items: LevelItem[],
    time: number,
    ppmX: number,
    ppmY: number,
    playerScreenX: number
  ) {
    for (const item of items) {
      if (item.collected || item.type === 'chasm') continue;

      const itemScreenX = playerScreenX + (item.distanceMeters - distanceMeters) * ppmX;
      if (itemScreenX < -80 || itemScreenX > this.width + 80) continue;

      if (item.type === 'oxygen') {
        const itemAlt = item.altitudeMeters ?? 1.1;
        const screenY = groundY - itemAlt * ppmY;
        this.drawOxygenCanister(ctx, itemScreenX, screenY, time);
      } else if (item.type === 'part') {
        const itemAlt = item.altitudeMeters ?? 1.2;
        const screenY = groundY - itemAlt * ppmY;
        this.drawRepairPart(ctx, itemScreenX, screenY, time);
      } else if (item.type === 'rock') {
        const rockW = (item.widthMeters ?? 2.0) * ppmX;
        const rockH = (item.heightMeters ?? 1.3) * ppmY;
        this.drawRockObstacle(ctx, itemScreenX, groundY, rockW, rockH);
      }
    }
  }

  private drawOxygenCanister(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number
  ) {
    ctx.save();
    const bob = Math.sin(time * 3.5) * 6;
    const cy = y + bob;

    const groundReflect = ctx.createRadialGradient(x, cy + 34, 2, x, cy + 34, 30);
    groundReflect.addColorStop(0, 'rgba(67, 217, 245, 0.55)');
    groundReflect.addColorStop(1, 'rgba(67, 217, 245, 0)');
    ctx.fillStyle = groundReflect;
    ctx.beginPath();
    ctx.ellipse(x, cy + 32, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = '#43D9F5';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#43D9F5';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x - 14, cy - 24, 28, 48, 8);
    ctx.stroke();

    const canGrad = ctx.createLinearGradient(x - 12, cy - 20, x + 12, cy + 20);
    canGrad.addColorStop(0, '#E0F2FE');
    canGrad.addColorStop(0.3, '#38BDF8');
    canGrad.addColorStop(0.7, '#0284C7');
    canGrad.addColorStop(1, '#0C4A6E');
    ctx.fillStyle = canGrad;
    ctx.beginPath();
    ctx.roundRect(x - 10, cy - 20, 20, 40, 6);
    ctx.fill();

    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px "Chakra Petch", monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('O₂', x, cy);

    ctx.restore();
  }

  private drawRepairPart(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number
  ) {
    ctx.save();
    const bob = Math.sin(time * 3.0 + 1) * 6;
    const cy = y + bob;
    const rot = time * 1.5;

    const groundReflect = ctx.createRadialGradient(x, cy + 30, 2, x, cy + 30, 26);
    groundReflect.addColorStop(0, 'rgba(255, 190, 85, 0.6)');
    groundReflect.addColorStop(1, 'rgba(255, 190, 85, 0)');
    ctx.fillStyle = groundReflect;
    ctx.beginPath();
    ctx.ellipse(x, cy + 30, 25, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(x, cy);
    ctx.rotate(rot);

    ctx.shadowColor = '#FFBE55';
    ctx.shadowBlur = 20;

    const r = 16;
    ctx.fillStyle = '#FFBE55';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const hx = r * Math.cos(angle);
      const hy = r * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#78350F';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const hx = (r * 0.68) * Math.cos(angle);
      const hy = (r * 0.68) * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawRockObstacle(
    ctx: CanvasRenderingContext2D,
    x: number,
    groundY: number,
    pixelW: number,
    pixelH: number
  ) {
    ctx.save();
    const halfW = pixelW * 0.5;

    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(x - halfW, groundY);
    ctx.lineTo(x - halfW * 0.9, groundY - pixelH * 0.65);
    ctx.lineTo(x - halfW * 0.3, groundY - pixelH);
    ctx.lineTo(x + halfW * 0.5, groundY - pixelH * 0.85);
    ctx.lineTo(x + halfW, groundY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#9CA3AF';
    ctx.beginPath();
    ctx.moveTo(x - halfW, groundY);
    ctx.lineTo(x - halfW * 0.9, groundY - pixelH * 0.65);
    ctx.lineTo(x - halfW * 0.3, groundY - pixelH);
    ctx.lineTo(x, groundY - pixelH * 0.5);
    ctx.lineTo(x - halfW * 0.4, groundY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.moveTo(x + halfW * 0.5, groundY - pixelH * 0.85);
    ctx.lineTo(x + halfW, groundY);
    ctx.lineTo(x + halfW * 0.2, groundY);
    ctx.lineTo(x, groundY - pixelH * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawAstronaut(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    vy: number,
    isGrounded: boolean,
    isBoosting: boolean,
    isSlowed: boolean,
    time: number,
    dt: number,
    ppmY: number
  ) {
    ctx.save();
    ctx.translate(x, y);

    const baseScale = (ppmY / 35.0) * 1.15;
    let scaleX = baseScale;
    let scaleY = baseScale;

    if (!isGrounded) {
      if (vy > 1.5) {
        scaleX = baseScale * 0.92;
        scaleY = baseScale * 1.15;
      } else {
        scaleX = baseScale * 0.96;
        scaleY = baseScale * 1.05;
      }
    }

    ctx.scale(scaleX, scaleY);

    if (isSlowed && Math.floor(time * 20) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const strideFreq = isBoosting ? 14 : 9.5;
    const runCycle = isGrounded ? (time * strideFreq) : 1.2;
    const legSwing = Math.sin(runCycle);
    const armSwing = Math.sin(runCycle + Math.PI);

    if (isBoosting) {
      this.drawJetPlume(ctx, -24, -20, time, dt, x, y);
    }

    if (isGrounded && Math.abs(legSwing) > 0.8 && Math.random() < 0.45) {
      this.spawnParticle(
        x - 12,
        y + 4,
        -70 - Math.random() * 50,
        -15 - Math.random() * 25,
        3.5,
        '#CBD5E1',
        0.45
      );
    }

    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Back Arm
    ctx.fillStyle = '#94A3B8';
    ctx.save();
    ctx.translate(-5, -22);
    ctx.rotate(armSwing * 0.65 + 0.3);
    ctx.fillRect(-3.5, 0, 7, 16);
    ctx.restore();

    // 2. Back Leg
    ctx.fillStyle = '#94A3B8';
    ctx.save();
    ctx.translate(-4, -6);
    ctx.rotate(legSwing * 0.75);
    ctx.fillRect(-4.5, 0, 9, 18);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-2, 14, 11, 5.5);
    ctx.restore();

    // 3. Life Support Backpack (PLSS)
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(-24, -32, 15, 26);
    ctx.fillStyle = '#43D9F5';
    ctx.fillRect(-22, -26, 11, 5);

    // 4. Spacesuit Torso
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(-11, -32, 20, 27, 5);
    ctx.fill();
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(-11, -16, 20, 4.5);

    // 5. Front Leg
    ctx.fillStyle = '#FFFFFF';
    ctx.save();
    ctx.translate(3, -6);
    ctx.rotate(-legSwing * 0.75);
    ctx.fillRect(-4.5, 0, 9, 18);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-2, 14, 11, 5.5);
    ctx.restore();

    // 6. Front Arm
    ctx.fillStyle = '#FFFFFF';
    ctx.save();
    ctx.translate(3, -22);
    ctx.rotate(-armSwing * 0.65 + 0.3);
    ctx.fillRect(-3.5, 0, 7, 16);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-3.5, 11, 7, 5.5);
    ctx.restore();

    // 7. Helmet & Visor
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(3, -40, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.ellipse(7, -40, 7, 8.5, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#43D9F5';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(8, -41, 4.5, -0.6, 0.8);
    ctx.stroke();

    ctx.restore();
  }

  private drawJetPlume(
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    time: number,
    _dt: number,
    worldX: number,
    worldY: number
  ) {
    ctx.save();
    const plumeLength = 40 + Math.sin(time * 30) * 10;

    const plumeGrad = ctx.createLinearGradient(bx, by, bx - plumeLength, by);
    plumeGrad.addColorStop(0, '#FFFFFF');
    plumeGrad.addColorStop(0.3, '#43D9F5');
    plumeGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.6)');
    plumeGrad.addColorStop(1, 'rgba(67, 217, 245, 0)');

    ctx.fillStyle = plumeGrad;
    ctx.shadowColor = '#43D9F5';
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.moveTo(bx, by - 5);
    ctx.lineTo(bx - plumeLength, by);
    ctx.lineTo(bx, by + 5);
    ctx.closePath();
    ctx.fill();

    if (Math.random() < 0.65) {
      this.spawnParticle(
        worldX + bx - 10,
        worldY + by + (Math.random() * 8 - 4),
        -130 - Math.random() * 90,
        Math.random() * 20 - 10,
        Math.random() * 4 + 2,
        Math.random() < 0.5 ? '#43D9F5' : '#E0F2FE',
        0.35
      );
    }

    ctx.restore();
  }

  private drawTentacles(
    ctx: CanvasRenderingContext2D,
    groundY: number,
    threatDistance: number,
    time: number,
    _dt: number
  ) {
    ctx.save();
    const w = this.width;

    const clampedThreat = Math.max(0, Math.min(45, threatDistance));
    const threatProgress = 1 - clampedThreat / 45;
    const tentacleBaseX = -120 + threatProgress * (w * 0.25 + 90);

    if (Math.random() < 0.7) {
      this.spawnParticle(
        tentacleBaseX + Math.random() * 90,
        groundY - 10 + Math.random() * 20,
        -50 + Math.random() * 90,
        -50 - Math.random() * 80,
        5.5,
        Math.random() < 0.4 ? '#9C73FF' : '#334155',
        0.65
      );
    }

    const tentacleConfigs = [
      { baseY: groundY - 50, length: 350, amp: 65, freq: 2.2, phase: 0, width: 55 },
      { baseY: groundY - 140, length: 430, amp: 85, freq: 1.8, phase: 1.4, width: 65 },
      { baseY: groundY - 220, length: 390, amp: 75, freq: 2.4, phase: 2.8, width: 50 },
      { baseY: groundY - 90, length: 320, amp: 55, freq: 3.0, phase: 4.1, width: 45 },
    ];

    for (const t of tentacleConfigs) {
      this.drawSingleTentacle(ctx, tentacleBaseX, t.baseY, t.length, t.amp, t.freq, t.phase, t.width, time);
    }

    const baseCloud = ctx.createRadialGradient(tentacleBaseX, groundY - 60, 20, tentacleBaseX, groundY - 60, 160);
    baseCloud.addColorStop(0, 'rgba(30, 12, 53, 0.85)');
    baseCloud.addColorStop(0.5, 'rgba(51, 65, 85, 0.4)');
    baseCloud.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = baseCloud;
    ctx.fillRect(tentacleBaseX - 100, groundY - 220, 260, 240);

    ctx.restore();
  }

  private drawSingleTentacle(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    length: number,
    amplitude: number,
    freq: number,
    phase: number,
    baseWidth: number,
    time: number
  ) {
    ctx.save();

    const segments = 28;
    const points: { x: number; y: number; width: number }[] = [];

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const wave = Math.sin(time * freq + u * 4.5 + phase) * amplitude * Math.sin(u * Math.PI);
      const px = startX + u * length;
      const py = startY + wave;
      const curWidth = baseWidth * (1 - u * 0.88);
      points.push({ x: px, y: py, width: curWidth });
    }

    ctx.shadowColor = '#9C73FF';
    ctx.shadowBlur = 28;
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 4;

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p.x, p.y - p.width * 0.5);
      else ctx.lineTo(p.x, p.y - p.width * 0.5);
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    const bodyGrad = ctx.createLinearGradient(startX, startY - 60, startX + length, startY + 60);
    bodyGrad.addColorStop(0, '#150624');
    bodyGrad.addColorStop(0.4, '#240A3E');
    bodyGrad.addColorStop(0.8, '#4A154B');
    bodyGrad.addColorStop(1, '#6B21A8');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p.x, p.y - p.width * 0.5);
      else ctx.lineTo(p.x, p.y - p.width * 0.5);
    }
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      ctx.lineTo(p.x, p.y + p.width * 0.5);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#C084FC';
    ctx.strokeStyle = '#581C87';
    ctx.lineWidth = 2;

    for (let i = 2; i < points.length - 2; i += 2) {
      const p = points[i];
      const suckerRadius = p.width * 0.35;
      const suckerX = p.x;
      const suckerY = p.y + p.width * 0.4;

      ctx.beginPath();
      ctx.arc(suckerX, suckerY, suckerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1E0C35';
      ctx.beginPath();
      ctx.arc(suckerX, suckerY, suckerRadius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#C084FC';
    }

    ctx.restore();
  }

  private updateAndDrawParticles(ctx: CanvasRenderingContext2D, dt: number) {
    ctx.save();
    for (const p of this.particles) {
      if (!p.active) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      const progress = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * progress;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * progress, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const vigGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.38, w * 0.5, h * 0.5, w * 0.75);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, 'rgba(4, 7, 13, 0.8)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);
  }
}
