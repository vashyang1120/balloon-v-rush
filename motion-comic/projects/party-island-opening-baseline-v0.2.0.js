/* 自動產生：與 party-island-opening-baseline-v0.2.0.json 內容相同。供 file:// 直接開啟時使用（瀏覽器在 file:// 下不允許讀取 JSON）。 */
window.MC_BASELINE_V2 = {
  "schemaVersion": "1.0",
  "projectId": "party-island-opening",
  "title": "派對島大作戰・開場",
  "editorVersion": "motion-comic-editor-v0.2.0-test-1",
  "contentVersion": 2,
  "stage": {
    "width": 1672,
    "height": 941,
    "fit": "contain"
  },
  "assets": {
    "scene1_bg": {
      "src": "assets/scene1_bg.png",
      "label": "第一幕背景",
      "width": 1672,
      "height": 941
    },
    "scene2_bg": {
      "src": "assets/scene2_bg.png",
      "label": "第二幕背景",
      "width": 1672,
      "height": 941
    },
    "scene2_char_2a": {
      "src": "assets/scene2_char_2a.png",
      "label": "2A 揉眼（人物＋床）",
      "width": 1448,
      "height": 1086
    },
    "scene2_char_2b": {
      "src": "assets/scene2_char_2b.png",
      "label": "2B 驚訝（人物＋床）",
      "width": 1484,
      "height": 1060
    },
    "intro_scene03_outside": {
      "src": "assets/intro_scene03_outside.png",
      "label": "第三幕 窗外景色",
      "width": 1672,
      "height": 941
    },
    "intro_scene03_window": {
      "src": "assets/intro_scene03_window.png",
      "label": "第三幕 窗框／室內前景",
      "width": 1672,
      "height": 941
    },
    "intro_scene03_v_confused": {
      "src": "assets/intro_scene03_v_confused.png",
      "label": "第三幕 3A 小V 疑惑",
      "width": 1122,
      "height": 1402
    },
    "intro_scene03_v_curious": {
      "src": "assets/intro_scene03_v_curious.png",
      "label": "第三幕 3B 小V 好奇",
      "width": 1145,
      "height": 1374
    }
  },
  "scenes": [
    {
      "id": "intro_scene01",
      "name": "第一人稱醒來",
      "status": "ready",
      "note": "移植自 opening-test v0.2.0 第一幕（已驗收）",
      "durationMs": 10950,
      "transitionIn": {
        "type": "cut"
      },
      "markers": [
        {
          "id": "open1",
          "label": "第一次睜眼開始",
          "t": 1000
        },
        {
          "id": "blink1",
          "label": "第一次眨眼",
          "t": 4500
        },
        {
          "id": "blink2",
          "label": "第二次眨眼",
          "t": 6900
        },
        {
          "id": "settle",
          "label": "完全清晰／鏡頭開始穩定",
          "t": 8300
        },
        {
          "id": "settleEnd",
          "label": "鏡頭穩定完成",
          "t": 10400
        },
        {
          "id": "animEnd",
          "label": "第一幕演出結束",
          "t": 10800
        }
      ],
      "layers": [
        {
          "id": "s1_bg",
          "name": "第一幕背景",
          "type": "image",
          "role": "background",
          "asset": "scene1_bg",
          "visible": true
        }
      ],
      "camera": {
        "originX": 0.5,
        "originY": 0.5,
        "tracks": {}
      },
      "effects": {
        "eyelids": {
          "enabled": true,
          "params": {
            "LID_FEATHER": 0.026,
            "LID_COLOR": "#070404",
            "LID_RIM_COLOR": "rgba(78, 26, 18, 0.55)",
            "LID_CENTER_Y": 0.5,
            "LID_CURVE_MIN": 0.04,
            "LID_CURVE_MAX": 0.2,
            "LOWER_LID_LAG": 1.18,
            "TREMOR": 0.018
          }
        },
        "breath": {
          "enabled": true,
          "params": {
            "BREATH_Y": 0.0045,
            "BREATH_X": 0.0022,
            "BREATH_ROT": 0.12,
            "BREATH_SCALE": 0.003,
            "BREATH_PERIOD": 4.2
          }
        }
      },
      "tracks": {
        "open": [
          {
            "m": "start",
            "o": 0,
            "v": 0,
            "label": "閉眼"
          },
          {
            "m": "open1",
            "o": 0,
            "v": 0,
            "label": "開始睜眼"
          },
          {
            "m": "open1",
            "o": 1600,
            "v": 0.42,
            "e": "inOut",
            "label": "第一次睜眼（半開）"
          },
          {
            "m": "open1",
            "o": 2500,
            "v": 0.5,
            "e": "inOut",
            "label": "迷濛地再撐開"
          },
          {
            "m": "blink1",
            "o": 0,
            "v": 0.5,
            "label": "第一次眨眼前"
          },
          {
            "m": "blink1",
            "o": 200,
            "v": 0,
            "e": "in",
            "label": "第一次眨眼：闔上"
          },
          {
            "m": "blink1",
            "o": 350,
            "v": 0,
            "label": "閉眼停留結束"
          },
          {
            "m": "blink1",
            "o": 1000,
            "v": 0.78,
            "e": "out",
            "label": "第二次睜開（較大）"
          },
          {
            "m": "blink2",
            "o": 0,
            "v": 0.78,
            "label": "第二次眨眼前"
          },
          {
            "m": "blink2",
            "o": 170,
            "v": 0,
            "e": "in",
            "label": "第二次眨眼：闔上"
          },
          {
            "m": "blink2",
            "o": 260,
            "v": 0,
            "label": "閉眼停留結束"
          },
          {
            "m": "blink2",
            "o": 1010,
            "v": 1,
            "e": "out",
            "label": "完全睜開"
          }
        ],
        "blur": [
          {
            "m": "start",
            "o": 0,
            "v": 0.024,
            "label": "高度模糊"
          },
          {
            "m": "blink1",
            "o": 200,
            "v": 0.024,
            "label": "模糊維持到第一次閉眼"
          },
          {
            "m": "blink1",
            "o": 350,
            "v": 0.011,
            "e": "linear",
            "label": "稍微清楚（閉眼時換檔）"
          },
          {
            "m": "blink2",
            "o": 170,
            "v": 0.011,
            "label": "維持到第二次閉眼"
          },
          {
            "m": "blink2",
            "o": 260,
            "v": 0.006,
            "e": "linear",
            "label": "再清楚一些（閉眼時換檔）"
          },
          {
            "m": "settle",
            "o": 0,
            "v": 0,
            "e": "out",
            "label": "對焦完全清晰"
          }
        ],
        "exposure": [
          {
            "m": "start",
            "o": 0,
            "v": 1.16,
            "label": "剛醒來偏亮"
          },
          {
            "m": "blink1",
            "o": 200,
            "v": 1.16,
            "label": "維持到第一次閉眼"
          },
          {
            "m": "blink1",
            "o": 350,
            "v": 1.07,
            "e": "linear",
            "label": "第一次眨眼後降低"
          },
          {
            "m": "blink2",
            "o": 260,
            "v": 1.07,
            "label": "維持"
          },
          {
            "m": "settle",
            "o": 0,
            "v": 1,
            "e": "out",
            "label": "回到正常亮度"
          }
        ],
        "breath": [
          {
            "m": "start",
            "o": 0,
            "v": 1,
            "label": "呼吸開始"
          },
          {
            "m": "settle",
            "o": 0,
            "v": 1,
            "label": "開始收束"
          },
          {
            "m": "settleEnd",
            "o": 0,
            "v": 0,
            "e": "inOut",
            "label": "完全穩定"
          }
        ],
        "overscan": [
          {
            "m": "start",
            "o": 0,
            "v": 1.025,
            "label": "預留放大"
          },
          {
            "m": "settle",
            "o": 0,
            "v": 1.025,
            "label": "開始收回"
          },
          {
            "m": "settleEnd",
            "o": 0,
            "v": 1,
            "e": "inOut",
            "label": "回到原始鏡位"
          }
        ],
        "tremor": [
          {
            "m": "start",
            "o": 0,
            "v": 1,
            "label": "顫動"
          },
          {
            "m": "blink2",
            "o": 0,
            "v": 1,
            "label": "顫動持續"
          },
          {
            "m": "blink2",
            "o": 170,
            "v": 0,
            "e": "linear",
            "label": "停止顫動"
          }
        ]
      },
      "dialogues": []
    },
    {
      "id": "intro_scene02",
      "name": "小V坐在床側，從揉眼到驚訝",
      "status": "ready",
      "note": "移植自 opening-test v0.2.0 第二幕（已驗收）",
      "durationMs": 3560,
      "transitionIn": {
        "type": "fadeBlack",
        "outMs": 160,
        "holdMs": 60,
        "inMs": 240
      },
      "markers": [
        {
          "id": "shown",
          "label": "淡入完成（2A 完全可見）",
          "t": 240
        },
        {
          "id": "switch",
          "label": "2A → 2B 開始",
          "t": 1640
        },
        {
          "id": "bShown",
          "label": "2B 完全取代 2A",
          "t": 1760
        }
      ],
      "layers": [
        {
          "id": "s2_bg",
          "name": "第二幕背景",
          "type": "image",
          "role": "background",
          "asset": "scene2_bg",
          "visible": true
        },
        {
          "id": "s2_vbed",
          "name": "小V＋床組（2A→2B）",
          "type": "swapPair",
          "role": "character",
          "visible": true,
          "assetA": "scene2_char_2a",
          "assetB": "scene2_char_2b",
          "switchFrom": {
            "m": "switch",
            "o": 0
          },
          "switchTo": {
            "m": "bShown",
            "o": 0
          },
          "foregroundScale": 0.56,
          "foregroundX": 0.255,
          "foregroundY": 0.945,
          "foregroundAnchorX": 0.4366,
          "foregroundAnchorY": 0.908,
          "bAlign": {
            "scale": 0.97699,
            "x": -5.28,
            "y": 41.55,
            "note": "2B 圖上的點 (u,v) → 2A 圖上 (u*scale+x, v*scale+y)。以床架 9 個地標擬合；殘差平均約 6px、最大約 10px（2A 原圖像素），因 2B 的床橫向比 2A 寬約 3%，屬素材本身差異。"
          },
          "look": {
            "brightness": 1,
            "saturate": 1,
            "warmth": 0,
            "opacity": 1
          },
          "shadow": {
            "opacity": 0.55,
            "color": "#3a1d08",
            "bedFeet": [
              [
                94,
                912
              ],
              [
                1171,
                1061
              ],
              [
                1356,
                943
              ],
              [
                279,
                794
              ]
            ],
            "shoesA": [
              [
                400,
                968,
                95,
                16
              ],
              [
                540,
                994,
                85,
                15
              ]
            ],
            "shoesB": [
              [
                411,
                946,
                95,
                16
              ],
              [
                583,
                1020,
                85,
                15
              ]
            ]
          }
        }
      ],
      "camera": {
        "originX": 0.4,
        "originY": 0.52,
        "tracks": {
          "scale": [
            {
              "m": "switch",
              "o": 0,
              "v": 1,
              "label": "推近開始（2B 出現時）"
            },
            {
              "m": "switch",
              "o": 1400,
              "v": 1.025,
              "e": "out",
              "label": "推近完成"
            }
          ]
        }
      },
      "effects": {},
      "tracks": {},
      "dialogues": []
    },
    {
      "id": "intro_scene03",
      "name": "小V走向窗邊",
      "status": "ready",
      "note": "v0.2.0 正式實作：窗外／窗框／人物 3A→3B 分層，疑惑 → 注意到氣球森林指示牌",
      "durationMs": 3020,
      "transitionIn": {
        "type": "fadeBlack",
        "outMs": 120,
        "holdMs": 40,
        "inMs": 200
      },
      "markers": [
        {
          "id": "s3_look",
          "label": "03-01 疑惑看窗外（淡入完成）",
          "t": 200
        },
        {
          "id": "s3_cross",
          "label": "03-03 注意到指示牌（3A→3B 疊化開始）",
          "t": 1500
        },
        {
          "id": "s3_curious",
          "label": "03-04 好奇停留（疊化完成）",
          "t": 1720
        }
      ],
      "layers": [
        {
          "id": "s3_outside",
          "name": "窗外景色（可獨立替換）",
          "type": "image",
          "role": "far",
          "asset": "intro_scene03_outside",
          "visible": true,
          "x": 0.645,
          "y": 0.5,
          "scale": 1.08,
          "anchorX": 0.5,
          "anchorY": 0.5,
          "opacity": 1,
          "rotation": 0,
          "tracks": {
            "scale": [
              {
                "m": "start",
                "o": 0,
                "v": 1.08,
                "label": "初始推拉值"
              },
              {
                "m": "end",
                "o": 0,
                "v": 1.09,
                "e": "out",
                "label": "非常輕微的慢推（到本幕結束）"
              }
            ],
            "x": [
              {
                "m": "start",
                "o": 0,
                "v": 0.645,
                "label": "初始位置"
              },
              {
                "m": "s3_cross",
                "o": 0,
                "v": 0.645,
                "label": "轉頭前維持不動"
              },
              {
                "m": "s3_curious",
                "o": 600,
                "v": 0.649,
                "e": "inOut",
                "label": "微平移：把視線帶到左側指示牌"
              }
            ]
          }
        },
        {
          "id": "s3_window",
          "name": "窗框／室內前景",
          "type": "image",
          "role": "foreground",
          "asset": "intro_scene03_window",
          "visible": true,
          "x": 0.5,
          "y": 0.5,
          "scale": 1,
          "anchorX": 0.5,
          "anchorY": 0.5,
          "opacity": 1,
          "rotation": 0,
          "tracks": {}
        },
        {
          "id": "s3_v",
          "name": "小V（3A 疑惑 → 3B 好奇）",
          "type": "swapPair",
          "role": "character",
          "visible": true,
          "assetA": "intro_scene03_v_confused",
          "assetB": "intro_scene03_v_curious",
          "labelA": "3A 疑惑",
          "labelB": "3B 好奇",
          "switchFrom": {
            "m": "s3_cross",
            "o": 0
          },
          "switchTo": {
            "m": "s3_curious",
            "o": 0
          },
          "foregroundScale": 0.46,
          "foregroundX": 0.66,
          "foregroundY": 0.86,
          "foregroundAnchorX": 0.4955,
          "foregroundAnchorY": 0.5492,
          "bAlign": {
            "scale": 1.0,
            "x": -2,
            "y": 48,
            "note": "3B 圖上的點 (u,v) → 3A 圖上 (u*scale+x, v*scale+y)。兩張圖人物大小相同（皮帶到鞋底 599／598px），以皮帶中央對齊；3B 的頭比 3A 低約 50px 是「往左下看」的姿勢，不是誤差。"
          },
          "look": {
            "brightness": 1,
            "saturate": 1,
            "warmth": 0,
            "opacity": 1
          },
          "shadow": {
            "opacity": 0,
            "color": "#3a1d08",
            "bedFeet": [],
            "shoesA": [],
            "shoesB": []
          }
        }
      ],
      "camera": {
        "originX": 0.5,
        "originY": 0.5,
        "tracks": {}
      },
      "effects": {},
      "tracks": {},
      "dialogues": [
        {
          "id": "s3_d1",
          "speaker": "小V",
          "text": "這裡是哪裡...？",
          "styleType": "rpg_box_no_portrait",
          "at": {
            "m": "s3_look",
            "o": 450
          },
          "mode": "auto",
          "autoMs": 0,
          "charMs": 55,
          "after": "resume",
          "enabled": true
        },
        {
          "id": "s3_d2",
          "speaker": "小V",
          "text": "氣球森林...?",
          "styleType": "rpg_box_no_portrait",
          "at": {
            "m": "s3_curious",
            "o": 150
          },
          "mode": "auto",
          "autoMs": 0,
          "charMs": 70,
          "after": "resume",
          "enabled": false,
          "note": "選用的第二句。勾選「啟用」即可開啟；開啟後會接替第一句顯示。"
        }
      ]
    },
    {
      "id": "intro_scene04",
      "name": "氣球森林入口",
      "status": "draft",
      "note": "尚未製作正式素材",
      "durationMs": 4000,
      "transitionIn": {
        "type": "fadeBlack",
        "outMs": 300,
        "holdMs": 100,
        "inMs": 400
      },
      "markers": [],
      "layers": [],
      "camera": {
        "originX": 0.5,
        "originY": 0.5,
        "tracks": {}
      },
      "effects": {},
      "tracks": {},
      "dialogues": []
    },
    {
      "id": "intro_scene05",
      "name": "氣球森林小徑",
      "status": "draft",
      "note": "尚未製作正式素材",
      "durationMs": 4000,
      "transitionIn": {
        "type": "fadeBlack",
        "outMs": 300,
        "holdMs": 100,
        "inMs": 400
      },
      "markers": [],
      "layers": [],
      "camera": {
        "originX": 0.5,
        "originY": 0.5,
        "tracks": {}
      },
      "effects": {},
      "tracks": {},
      "dialogues": [
        {
          "id": "s5_d1",
          "speaker": "小V",
          "text": "不是氣球森林嗎……怎麼沒看到什麼氣球……？",
          "at": {
            "m": "start",
            "o": 1500
          },
          "mode": "wait",
          "autoMs": 3000,
          "charMs": 60,
          "after": "resume",
          "enabled": true,
          "draft": true,
          "styleType": "rpg_box_no_portrait"
        }
      ]
    }
  ]
};
