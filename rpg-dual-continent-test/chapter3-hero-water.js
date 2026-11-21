'use strict';

const c34HeroWater = (() => {
  const art = chapter3HeroWaterData;
  const images = new Map();
  const tracks = [art.intro, art.loop, art.drips, art.windDry];
  const duration = frames => frames.reduce((total, frame) => total + frame.ms, 0);
  const introMs = duration(art.intro), loopMs = duration(art.loop), dripMs = duration(art.drips);
  const files = [...new Set(tracks.flat().flatMap(frame => frame.files))];
  const windDryMs = duration(art.windDry);
  const STEP_MS = 1000 / 60;

  function entries() {
    return files.map(file => ({
      path: 'rpg-dual-continent-test/chapter3-art/' + file,
      type: 'image', critical: false, label: 'chapter3-hero-water:' + file,
      apply(img) { images.set(file, img); },
    }));
  }

  function frameAt(frames, ms) {
    for (const frame of frames) {
      if (ms < frame.ms) return frame;
      ms -= frame.ms;
    }
    return frames[frames.length - 1];
  }

  function scale() {
    // Same standing sprite and visible height used to calibrate C1's waterfall widths.
    return player.w * HERO_DRAW_SCALE * 387 / (410 * art.visibleHeight);
  }

  function shower() {
    if (!c34.shower || c34.swim) return null;
    const { fall, tick, mirror } = c34.shower;
    const elapsed = (c34.waterTick - tick) * STEP_MS;
    const frame = elapsed < introMs
      ? frameAt(art.intro, elapsed)
      : frameAt(art.loop, (elapsed - introMs) % loopMs);
    if (!frame.files.every(file => images.has(file))) return null;
    const factor = scale();
    const feet = player.y + player.h + c34Art.landPose().footOffset;
    // Intro entry follows the first nontransparent row. The rest uses the shared entry reference.
    const seam = feet + (Math.max(frame.entry, art.entry[1]) - art.feet[1]) * factor;
    return { fall, frame, feet, factor, seam, mirror: mirror && frame.mirror };
  }

  function layer(file, x, feet, factor, anchor, mirror = false) {
    ctx.save();
    ctx.translate(x, feet);
    if (mirror) ctx.scale(-1, 1);
    ctx.drawImage(images.get(file), -anchor[0] * factor, -anchor[1] * factor, art.size[0] * factor, art.size[1] * factor);
    ctx.restore();
  }

  function drawShower(cx, pose = shower(), effectsOnly = false) {
    if (!pose) return false;
    const [body, water, eyes, hands, splash] = pose.frame.files;
    const x = player.x + player.w / 2 - cx;
    const { feet, factor, mirror, fall } = pose;
    if (!effectsOnly) layer(body, x, feet, factor, art.feet, mirror);
    layer(water, fall.x - cx, feet, factor, [art.entry[0], art.feet[1]]);
    if (!effectsOnly) {
      layer(eyes, x, feet, factor, art.feet, mirror);
      layer(hands, x, feet, factor, art.feet, mirror);
    }
    layer(splash, x, feet, factor, art.splash);
    return true;
  }

  function drips(x, feet, factor = scale()) {
    const wet = c34.wet / C34.water.steps;
    if (wet <= 0) return;
    if (c34.dryingWindStart !== null) {
      const elapsed = (c34.waterTick - c34.dryingWindStart) * STEP_MS;
      const [windFile] = frameAt(art.windDry, elapsed % windDryMs).files;
      if (images.has(windFile)) {
        layer(windFile, x, feet, factor, art.windDryFeet);
        return;
      }
    }
    const frame = frameAt(art.drips, c34.waterTick * STEP_MS % dripMs);
    const [file] = frame.files;
    if (!images.has(file)) return;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, wet);
    layer(file, x, feet, factor, art.dripFeet);
    ctx.restore();
  }

  function heroDrips(img, rect) {
    if (c34.wet <= 0) return;
    const sole = c1dHeroSole(img) ?? HERO_FOOT_ANCHOR_Y;
    drips(rect.dX + rect.dW / 2, rect.dY + rect.dH * sole);
  }

  return { entries, shower, drawShower, drips, heroDrips };
})();
