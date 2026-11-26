'use strict';

// Timings, layers and anchors from Chapter 3 Water Supplement Art v1.3.
const chapter3HeroWaterData = {
  size: [640,720],
  feet: [320,598],
  entry: [320,20],
  splash: [320,609],
  visibleHeight: 490,
  dripFeet: [320,598],
  intro: [
    {"ms":80,"mirror":true,"entry":14,"files":["18A_v_water_splash_cover/character/side.png","18A_v_water_splash_cover/intro/water_01.png","18A_v_water_splash_cover/eye_overlay/side.png","18A_v_water_splash_cover/hand_overlay/side.png","18A_v_water_splash_cover/intro/splash_01.png"]},
    {"ms":90,"mirror":true,"entry":12,"files":["18A_v_water_splash_cover/character/side.png","18A_v_water_splash_cover/intro/water_02.png","18A_v_water_splash_cover/eye_overlay/side.png","18A_v_water_splash_cover/hand_overlay/side.png","18A_v_water_splash_cover/intro/splash_02.png"]},
    {"ms":100,"mirror":true,"entry":11,"files":["18A_v_water_splash_cover/character/side.png","18A_v_water_splash_cover/intro/water_03.png","18A_v_water_splash_cover/eye_overlay/side.png","18A_v_water_splash_cover/hand_overlay/side.png","18A_v_water_splash_cover/intro/splash_03.png"]},
    {"ms":100,"mirror":true,"entry":11,"files":["18A_v_water_splash_cover/character/side.png","18A_v_water_splash_cover/intro/water_04.png","18A_v_water_splash_cover/eye_overlay/side.png","18A_v_water_splash_cover/hand_overlay/side.png","18A_v_water_splash_cover/intro/splash_04.png"]},
    {"ms":100,"mirror":true,"entry":11,"files":["18A_v_water_splash_cover/character/side.png","18A_v_water_splash_cover/intro/water_05.png","18A_v_water_splash_cover/eye_overlay/side.png","18A_v_water_splash_cover/hand_overlay/side.png","18A_v_water_splash_cover/intro/splash_05.png"]},
    {"ms":100,"mirror":true,"entry":11,"files":["18A_v_water_splash_cover/character/side.png","18A_v_water_splash_cover/intro/water_06.png","18A_v_water_splash_cover/eye_overlay/side.png","18A_v_water_splash_cover/hand_overlay/side.png","18A_v_water_splash_cover/intro/splash_06.png"]},
    {"ms":100,"mirror":true,"entry":11,"files":["18A_v_water_splash_cover/character/side.png","18A_v_water_splash_cover/intro/water_07.png","18A_v_water_splash_cover/eye_overlay/side.png","18A_v_water_splash_cover/hand_overlay/side.png","18A_v_water_splash_cover/intro/splash_07.png"]},
    {"ms":90,"mirror":true,"entry":11,"files":["18A_v_water_splash_cover/character/turn_01.png","18A_v_water_splash_cover/intro/water_08.png","18A_v_water_splash_cover/eye_overlay/turn_01.png","18A_v_water_splash_cover/hand_overlay/turn_01.png","18A_v_water_splash_cover/intro/splash_08.png"]},
    {"ms":90,"mirror":true,"entry":11,"files":["18A_v_water_splash_cover/character/turn_02.png","18A_v_water_splash_cover/intro/water_09.png","18A_v_water_splash_cover/eye_overlay/turn_02.png","18A_v_water_splash_cover/hand_overlay/turn_02.png","18A_v_water_splash_cover/intro/splash_09.png"]},
    {"ms":110,"mirror":false,"entry":11,"files":["18A_v_water_splash_cover/character/open_relaxed.png","18A_v_water_splash_cover/intro/water_10.png","18A_v_water_splash_cover/eye_overlay/open_relaxed.png","18A_v_water_splash_cover/hand_overlay/open_relaxed.png","18A_v_water_splash_cover/intro/splash_10.png"]},
  ],
  loop: [
    {"ms":130,"mirror":false,"entry":11,"files":["18A_v_water_splash_cover/character/open_relaxed.png","18A_v_water_splash_cover/loop/water_01.png","18A_v_water_splash_cover/eye_overlay/open_relaxed.png","18A_v_water_splash_cover/hand_overlay/open_relaxed.png","18A_v_water_splash_cover/loop/splash_01.png"]},
    {"ms":130,"mirror":false,"entry":11,"files":["18A_v_water_splash_cover/character/open_lift_1.png","18A_v_water_splash_cover/loop/water_02.png","18A_v_water_splash_cover/eye_overlay/open_lift_1.png","18A_v_water_splash_cover/hand_overlay/open_lift_1.png","18A_v_water_splash_cover/loop/splash_02.png"]},
    {"ms":130,"mirror":false,"entry":11,"files":["18A_v_water_splash_cover/character/open_lift_2.png","18A_v_water_splash_cover/loop/water_03.png","18A_v_water_splash_cover/eye_overlay/open_lift_2.png","18A_v_water_splash_cover/hand_overlay/open_lift_2.png","18A_v_water_splash_cover/loop/splash_03.png"]},
    {"ms":130,"mirror":false,"entry":11,"files":["18A_v_water_splash_cover/character/open_lift_3.png","18A_v_water_splash_cover/loop/water_04.png","18A_v_water_splash_cover/eye_overlay/open_lift_3.png","18A_v_water_splash_cover/hand_overlay/open_lift_3.png","18A_v_water_splash_cover/loop/splash_04.png"]},
    {"ms":70,"mirror":false,"entry":11,"files":["18A_v_water_splash_cover/character/half_eyes.png","18A_v_water_splash_cover/loop/water_05.png","18A_v_water_splash_cover/eye_overlay/half_eyes.png","18A_v_water_splash_cover/hand_overlay/half_eyes.png","18A_v_water_splash_cover/loop/splash_05.png"]},
    {"ms":90,"mirror":false,"entry":11,"files":["18A_v_water_splash_cover/character/closed_eyes.png","18A_v_water_splash_cover/loop/water_06.png","18A_v_water_splash_cover/eye_overlay/closed_eyes.png","18A_v_water_splash_cover/hand_overlay/closed_eyes.png","18A_v_water_splash_cover/loop/splash_06.png"]},
    {"ms":80,"mirror":false,"entry":11,"files":["18A_v_water_splash_cover/character/reopen_eyes.png","18A_v_water_splash_cover/loop/water_07.png","18A_v_water_splash_cover/eye_overlay/reopen_eyes.png","18A_v_water_splash_cover/hand_overlay/reopen_eyes.png","18A_v_water_splash_cover/loop/splash_07.png"]},
    {"ms":160,"mirror":false,"entry":11,"files":["18A_v_water_splash_cover/character/open_relaxed.png","18A_v_water_splash_cover/loop/water_08.png","18A_v_water_splash_cover/eye_overlay/open_relaxed.png","18A_v_water_splash_cover/hand_overlay/open_relaxed.png","18A_v_water_splash_cover/loop/splash_08.png"]},
  ],
  windDryFeet: [320,598],
  windDry: [
    {"ms":120,"files":["19_v_wind_dry_effect/v_wind_dry_effect_01.png"]},
    {"ms":110,"files":["19_v_wind_dry_effect/v_wind_dry_effect_02.png"]},
    {"ms":110,"files":["19_v_wind_dry_effect/v_wind_dry_effect_03.png"]},
    {"ms":130,"files":["19_v_wind_dry_effect/v_wind_dry_effect_04.png"]},
    {"ms":160,"files":["19_v_wind_dry_effect/v_wind_dry_effect_05.png"]},
  ],
  drips: [
    {"ms":120,"files":["18B_v_wet_drip/v_wet_drip_01.png"]},
    {"ms":130,"files":["18B_v_wet_drip/v_wet_drip_02.png"]},
    {"ms":120,"files":["18B_v_wet_drip/v_wet_drip_03.png"]},
    {"ms":130,"files":["18B_v_wet_drip/v_wet_drip_04.png"]},
    {"ms":120,"files":["18B_v_wet_drip/v_wet_drip_05.png"]},
    {"ms":130,"files":["18B_v_wet_drip/v_wet_drip_06.png"]},
  ],
};
