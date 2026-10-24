/* 自動產生：與 party-island-opening.json 內容相同。供 file:// 直接開啟時使用（瀏覽器在 file:// 下不允許讀取 JSON）。 */
window.MC_PROJECT = {
  "schemaVersion": "1.0",
  "projectId": "party-island-opening",
  "title": "派對島大作戰・開場",
  "editorVersion": "motion-comic-editor-v0.3.0-test-1",
  "contentVersion": 3,
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
    },
    "intro_scene04a_bg": {
      "src": "assets/intro_scene04a_bg.png",
      "label": "第四幕A 森林小徑背景",
      "width": 1672,
      "height": 941
    },
    "intro_scene04a_v_near": {
      "src": "assets/intro_scene04a_v_near.png",
      "label": "第四幕A 小V 近景（背影）",
      "width": 1024,
      "height": 1536
    },
    "intro_scene04a_v_far": {
      "src": "assets/intro_scene04a_v_far.png",
      "label": "第四幕A 小V 遠景",
      "width": 1024,
      "height": 1536
    },
    "intro_scene04b_bg": {
      "src": "assets/intro_scene04b_bg.png",
      "label": "第四幕B 側面森林背景",
      "width": 1672,
      "height": 941
    },
    "intro_scene04b_v_walk": {
      "src": "assets/intro_scene04b_v_walk.png",
      "label": "第四幕B 小V 謹慎步行",
      "width": 1086,
      "height": 1448
    },
    "intro_scene04b_v_look_back_up": {
      "src": "assets/intro_scene04b_v_look_back_up.png",
      "label": "第四幕B 小V 回頭仰望",
      "width": 1024,
      "height": 1536
    },
    "intro_scene04b_v_look_up": {
      "src": "assets/intro_scene04b_v_look_up.png",
      "label": "第四幕B 小V 抬頭張望",
      "width": 1122,
      "height": 1402
    },
    "intro_scene04b_fg_trees": {
      "src": "assets/intro_scene04b_fg_trees.png",
      "label": "第四幕B 前景失焦樹木",
      "width": 1672,
      "height": 941
    },
    "intro_scene05_bg": {
      "src": "assets/intro_scene05_bg.png",
      "label": "第五幕 第一人稱森林",
      "width": 1672,
      "height": 941
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
      "note": "v0.3.0：床＋小V放大、往左、局部出框（床畫在人物圖裡，可整組移動）；2A→2B 改為真正交叉淡化 600ms",
      "durationMs": 4040,
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
          "label": "2A → 2B 開始（交叉淡化）",
          "t": 1640
        },
        {
          "id": "bShown",
          "label": "2B 完全取代 2A",
          "t": 2240
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
          "crossfade": "dissolve",
          "foregroundScale": 0.72,
          "foregroundX": 0.2,
          "foregroundY": 0.975,
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
      "name": "透過拱窗看見氣球森林",
      "status": "ready",
      "note": "v0.3.0：木牌更小更低；人物淡入；兩句對話等待玩家繼續；3A→3B 真正交叉淡化",
      "durationMs": 3700,
      "transitionIn": {
        "type": "fadeBlack",
        "outMs": 120,
        "holdMs": 40,
        "inMs": 200
      },
      "markers": [
        {
          "id": "s3_look",
          "label": "03-01 窗戶與窗外（淡入完成）",
          "t": 200
        },
        {
          "id": "s3_vin",
          "label": "03-02 小V淡入完成（3A 疑惑）",
          "t": 1200
        },
        {
          "id": "s3_d1",
          "label": "03-03 第一句「這裡是哪裡……？」",
          "t": 1500
        },
        {
          "id": "s3_cross",
          "label": "03-04 按繼續後：3A→3B 交叉淡化開始",
          "t": 1700
        },
        {
          "id": "s3_curious",
          "label": "03-05 3B 好奇（疊化完成）",
          "t": 2300
        },
        {
          "id": "s3_d2",
          "label": "03-06 第二句「氣球森林……？」",
          "t": 3000
        }
      ],
      "layers": [
        {
          "id": "s3_outside_base",
          "name": "窗外景色・底層補邊（同一張圖，原尺寸）",
          "type": "image",
          "role": "far",
          "asset": "intro_scene03_outside",
          "visible": true,
          "x": 0.5,
          "y": 0.5,
          "scale": 1.0,
          "anchorX": 0.5,
          "anchorY": 0.5,
          "opacity": 1,
          "rotation": 0,
          "tracks": {},
          "note": "窗框右上角有一個小透光孔（x 0.965～1、y 0～0.074）；主窗外層縮小後蓋不到，用同一張圖原尺寸墊在下面，避免露出底色"
        },
        {
          "id": "s3_outside",
          "name": "窗外景色（主拱窗，可獨立運鏡）",
          "type": "image",
          "role": "far",
          "asset": "intro_scene03_outside",
          "visible": true,
          "x": 0.612,
          "y": 0.52,
          "scale": 0.95,
          "anchorX": 0.5,
          "anchorY": 0.5,
          "opacity": 1,
          "rotation": 0,
          "tracks": {
            "scale": [
              {
                "m": "start",
                "o": 0,
                "v": 0.95,
                "label": "初始推拉值"
              },
              {
                "m": "end",
                "o": 0,
                "v": 0.96,
                "e": "out",
                "label": "非常輕微的慢推（到本幕結束）"
              }
            ],
            "x": [
              {
                "m": "start",
                "o": 0,
                "v": 0.612,
                "label": "初始位置"
              },
              {
                "m": "s3_cross",
                "o": 0,
                "v": 0.612,
                "label": "轉頭前維持不動"
              },
              {
                "m": "s3_d2",
                "o": 0,
                "v": 0.616,
                "e": "inOut",
                "label": "微平移：把視線帶到較低處的木牌"
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
          "crossfade": "dissolve",
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
          },
          "tracks": {
            "opacity": [
              {
                "m": "start",
                "o": 500,
                "v": 0,
                "label": "先看窗外（人物還沒出現）"
              },
              {
                "m": "s3_vin",
                "o": 0,
                "v": 1,
                "e": "inOut",
                "label": "小V淡入完成"
              }
            ]
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
          "text": "這裡是哪裡……？",
          "styleType": "rpg_box_no_portrait",
          "at": {
            "m": "s3_d1",
            "o": 0
          },
          "mode": "wait",
          "autoMs": 0,
          "charMs": 60,
          "after": "resume",
          "enabled": true
        },
        {
          "id": "s3_d2",
          "speaker": "小V",
          "text": "氣球森林……？",
          "styleType": "rpg_box_no_portrait",
          "at": {
            "m": "s3_d2",
            "o": 0
          },
          "mode": "wait",
          "autoMs": 0,
          "charMs": 70,
          "after": "resume",
          "enabled": true
        }
      ]
    },
    {
      "id": "intro_scene04a",
      "name": "第四幕A：深入氣球森林",
      "status": "ready",
      "note": "v0.3.0：從小V後方看他走過木牌、沿小徑走進霧裡（近景→遠景交叉淡化；霧用霧插件產生，不新增圖片）",
      "durationMs": 8700,
      "transitionIn": {
        "type": "fadeBlack",
        "outMs": 300,
        "holdMs": 200,
        "inMs": 600
      },
      "markers": [
        {
          "id": "a_walk",
          "label": "4A-1 淡入完成，小V開始往深處走（近景）",
          "t": 600
        },
        {
          "id": "a_swap",
          "label": "4A-2 近景 → 遠景開始",
          "t": 3200
        },
        {
          "id": "a_far",
          "label": "4A-2 遠景完全取代近景",
          "t": 3600
        },
        {
          "id": "a_deep",
          "label": "4A-3 開始被霧吞沒",
          "t": 6200
        },
        {
          "id": "a_gone",
          "label": "4A-3 消失在霧中",
          "t": 8000
        }
      ],
      "layers": [
        {
          "id": "a_bg",
          "name": "森林小徑背景",
          "type": "image",
          "role": "background",
          "asset": "intro_scene04a_bg",
          "visible": true
        },
        {
          "id": "a_v",
          "name": "小V（近景背影 → 遠景）",
          "type": "poseSeq",
          "role": "character",
          "visible": true,
          "crossfade": "dissolve",
          "poses": [
            {
              "asset": "intro_scene04a_v_near",
              "label": "近景",
              "footX": 446.5,
              "footY": 1518,
              "figTop": 13,
              "figBottom": 1518,
              "scaleAdj": 1
            },
            {
              "asset": "intro_scene04a_v_far",
              "label": "遠景",
              "footX": 449,
              "footY": 1457,
              "figTop": 87,
              "figBottom": 1457,
              "scaleAdj": 1
            }
          ],
          "switches": [
            {
              "from": {
                "m": "a_swap",
                "o": 0
              },
              "to": {
                "m": "a_far",
                "o": 0
              }
            }
          ],
          "x": 0.605,
          "y": 1.09,
          "scale": 0.76,
          "opacity": 1,
          "rotation": 0,
          "blur": 0,
          "sway": {
            "periodMs": 1100,
            "x": 0,
            "y": 0.025,
            "rot": 0.6,
            "relative": true
          },
          "tracks": {
            "x": [
              {
                "m": "start",
                "o": 0,
                "v": 0.605,
                "label": "近景起點"
              },
              {
                "m": "a_swap",
                "o": 0,
                "v": 0.584,
                "e": "out"
              },
              {
                "m": "a_far",
                "o": 0,
                "v": 0.578
              },
              {
                "m": "a_deep",
                "o": 0,
                "v": 0.566,
                "e": "out"
              },
              {
                "m": "a_gone",
                "o": 0,
                "v": 0.562,
                "e": "out",
                "label": "霧中"
              }
            ],
            "y": [
              {
                "m": "start",
                "o": 0,
                "v": 1.09,
                "label": "近景起點（靠近鏡頭）"
              },
              {
                "m": "a_swap",
                "o": 0,
                "v": 0.86,
                "e": "out"
              },
              {
                "m": "a_far",
                "o": 0,
                "v": 0.832
              },
              {
                "m": "a_deep",
                "o": 0,
                "v": 0.716,
                "e": "out"
              },
              {
                "m": "a_gone",
                "o": 0,
                "v": 0.674,
                "e": "out",
                "label": "霧中"
              }
            ],
            "scale": [
              {
                "m": "start",
                "o": 0,
                "v": 0.76,
                "label": "近景身高"
              },
              {
                "m": "a_swap",
                "o": 0,
                "v": 0.4,
                "e": "out"
              },
              {
                "m": "a_far",
                "o": 0,
                "v": 0.368
              },
              {
                "m": "a_deep",
                "o": 0,
                "v": 0.19,
                "e": "out"
              },
              {
                "m": "a_gone",
                "o": 0,
                "v": 0.1,
                "e": "out",
                "label": "很小、很遠"
              }
            ],
            "opacity": [
              {
                "m": "a_deep",
                "o": 0,
                "v": 1,
                "label": "還清楚"
              },
              {
                "m": "a_gone",
                "o": 0,
                "v": 0,
                "e": "in",
                "label": "被霧吞沒"
              }
            ],
            "blur": [
              {
                "m": "a_deep",
                "o": 0,
                "v": 0
              },
              {
                "m": "a_gone",
                "o": 0,
                "v": 0.004,
                "e": "in",
                "label": "被霧模糊"
              }
            ]
          }
        }
      ],
      "camera": {
        "originX": 0.56,
        "originY": 0.62,
        "tracks": {
          "scale": [
            {
              "m": "start",
              "o": 0,
              "v": 1.0,
              "label": "原始鏡位"
            },
            {
              "m": "end",
              "o": 0,
              "v": 1.05,
              "e": "inOut",
              "label": "非常輕微的前推"
            }
          ]
        }
      },
      "effects": {
        "breath": {
          "enabled": true,
          "params": {
            "BREATH_Y": 0.0025,
            "BREATH_X": 0.0012,
            "BREATH_ROT": 0.06,
            "BREATH_SCALE": 0.002,
            "BREATH_PERIOD": 4.6,
            "BREATH_CLOCK": "ambient"
          }
        },
        "fog": {
          "enabled": true,
          "params": {
            "CX": 0.56,
            "CY": 0.6,
            "RX": 0.3,
            "RY": 0.2,
            "CORE": 0.9,
            "HAZE": 0.1,
            "COLOR": "236, 240, 234"
          }
        }
      },
      "tracks": {
        "breath": [
          {
            "m": "start",
            "o": 0,
            "v": 1,
            "label": "輕微呼吸感"
          }
        ],
        "overscan": [
          {
            "m": "start",
            "o": 0,
            "v": 1.012,
            "label": "預留放大（呼吸不露邊）"
          }
        ],
        "fog": [
          {
            "m": "start",
            "o": 0,
            "v": 0.12,
            "label": "遠處薄霧"
          },
          {
            "m": "a_deep",
            "o": 0,
            "v": 0.35,
            "e": "inOut"
          },
          {
            "m": "a_gone",
            "o": 0,
            "v": 0.85,
            "e": "inOut",
            "label": "濃霧吞沒小V"
          },
          {
            "m": "end",
            "o": 0,
            "v": 0.9
          }
        ]
      },
      "dialogues": []
    },
    {
      "id": "intro_scene04b",
      "name": "第四幕B：90° 側面森林小徑（被窺視感）",
      "status": "ready",
      "note": "v0.3.0：同一個小V依時間換姿勢 walk → look_back_up → look_up，腳底錨點連續左→右；前景失焦樹木在小V之前、移動較快",
      "durationMs": 10400,
      "transitionIn": {
        "type": "crossfade",
        "durMs": 700
      },
      "markers": [
        {
          "id": "b_turn",
          "label": "4B-2 步行 → 回頭仰望 開始",
          "t": 3000
        },
        {
          "id": "b_back",
          "label": "4B-2 回頭仰望（放慢）",
          "t": 3400
        },
        {
          "id": "b_up",
          "label": "4B-3 回頭仰望 → 抬頭張望 開始",
          "t": 6000
        },
        {
          "id": "b_upShown",
          "label": "4B-3 抬頭張望，繼續往右",
          "t": 6400
        },
        {
          "id": "b_push",
          "label": "鏡頭推近小V（銜接第一人稱）",
          "t": 8800
        }
      ],
      "layers": [
        {
          "id": "b_bg",
          "name": "側面森林背景（遠景，慢移）",
          "type": "image",
          "role": "far",
          "asset": "intro_scene04b_bg",
          "visible": true,
          "x": 0.51,
          "y": 0.5,
          "scale": 1.06,
          "anchorX": 0.5,
          "anchorY": 0.5,
          "opacity": 1,
          "rotation": 0,
          "tracks": {
            "x": [
              {
                "m": "start",
                "o": 0,
                "v": 0.51,
                "label": "背景慢移（視差：最慢）"
              },
              {
                "m": "end",
                "o": 0,
                "v": 0.49
              }
            ]
          }
        },
        {
          "id": "b_v",
          "name": "小V（步行 → 回頭仰望 → 抬頭張望）",
          "type": "poseSeq",
          "role": "character",
          "visible": true,
          "crossfade": "dissolve",
          "poses": [
            {
              "asset": "intro_scene04b_v_walk",
              "label": "1 步行",
              "footX": 549,
              "footY": 1405,
              "figTop": 59,
              "figBottom": 1405,
              "scaleAdj": 1
            },
            {
              "asset": "intro_scene04b_v_look_back_up",
              "label": "2 回頭仰望",
              "footX": 569,
              "footY": 1504,
              "figTop": 32,
              "figBottom": 1504,
              "scaleAdj": 1
            },
            {
              "asset": "intro_scene04b_v_look_up",
              "label": "3 抬頭張望",
              "footX": 601,
              "footY": 1388,
              "figTop": 34,
              "figBottom": 1388,
              "scaleAdj": 1
            }
          ],
          "switches": [
            {
              "from": {
                "m": "b_turn",
                "o": 0
              },
              "to": {
                "m": "b_back",
                "o": 0
              }
            },
            {
              "from": {
                "m": "b_up",
                "o": 0
              },
              "to": {
                "m": "b_upShown",
                "o": 0
              }
            }
          ],
          "x": 0.08,
          "y": 0.735,
          "scale": 0.4,
          "opacity": 1,
          "rotation": 0,
          "blur": 0,
          "sway": {
            "periodMs": 1000,
            "x": 0,
            "y": 0.012,
            "rot": 0,
            "relative": true
          },
          "tracks": {
            "x": [
              {
                "m": "start",
                "o": 0,
                "v": 0.08,
                "label": "從左側（前景樹後）走出"
              },
              {
                "m": "b_turn",
                "o": 0,
                "v": 0.4
              },
              {
                "m": "b_back",
                "o": 0,
                "v": 0.425,
                "label": "回頭仰望：放慢"
              },
              {
                "m": "b_up",
                "o": 0,
                "v": 0.465
              },
              {
                "m": "b_upShown",
                "o": 0,
                "v": 0.49
              },
              {
                "m": "end",
                "o": 0,
                "v": 0.76,
                "label": "繼續往右探索"
              }
            ],
            "scale": [
              {
                "m": "start",
                "o": 0,
                "v": 0.4
              },
              {
                "m": "end",
                "o": 0,
                "v": 0.42,
                "label": "輕微變近（+5%）"
              }
            ]
          }
        },
        {
          "id": "b_fg",
          "name": "前景失焦樹木（最前，快移）",
          "type": "image",
          "role": "foreground",
          "asset": "intro_scene04b_fg_trees",
          "visible": true,
          "x": 0.57,
          "y": 0.5,
          "scale": 1.14,
          "anchorX": 0.5,
          "anchorY": 0.5,
          "opacity": 1,
          "rotation": 0,
          "tracks": {
            "x": [
              {
                "m": "start",
                "o": 0,
                "v": 0.57,
                "label": "前景快移（視差：最快）"
              },
              {
                "m": "end",
                "o": 0,
                "v": 0.43
              }
            ]
          }
        }
      ],
      "camera": {
        "originX": 0.76,
        "originY": 0.4,
        "tracks": {
          "scale": [
            {
              "m": "b_push",
              "o": 0,
              "v": 1.0,
              "label": "推近開始"
            },
            {
              "m": "end",
              "o": 0,
              "v": 1.1,
              "e": "in",
              "label": "推近小V，銜接第一人稱"
            }
          ]
        }
      },
      "effects": {},
      "tracks": {},
      "dialogues": []
    },
    {
      "id": "intro_scene05",
      "name": "第五幕：第一人稱森林探索",
      "status": "ready",
      "note": "v0.3.0：只有一張背景，靠鏡頭左右上下張望＋呼吸；兩句台詞穿插在運鏡中（左上看完出第一句、右上看完出第二句）",
      "durationMs": 14000,
      "transitionIn": {
        "type": "crossfade",
        "durMs": 800
      },
      "markers": [
        {
          "id": "c_settle",
          "label": "5-1 看向前方（承接 4B 的抬頭）",
          "t": 1100
        },
        {
          "id": "c_left",
          "label": "5-2 往左看",
          "t": 2700
        },
        {
          "id": "c_leftUp",
          "label": "5-3 往左上看樹冠",
          "t": 4200
        },
        {
          "id": "c_d1",
          "label": "5-4 左上停留：第一句",
          "t": 4500
        },
        {
          "id": "c_right",
          "label": "5-5 轉向右邊",
          "t": 7300
        },
        {
          "id": "c_rightDown",
          "label": "5-6 往右下看小徑與草叢",
          "t": 8900
        },
        {
          "id": "c_rightUp",
          "label": "5-7 往右上看高處",
          "t": 10800
        },
        {
          "id": "c_d2",
          "label": "5-8 右上停留：第二句",
          "t": 11100
        },
        {
          "id": "c_endLook",
          "label": "結尾：視線收回",
          "t": 13000
        }
      ],
      "layers": [
        {
          "id": "c_bg",
          "name": "第一人稱森林背景",
          "type": "image",
          "role": "background",
          "asset": "intro_scene05_bg",
          "visible": true
        }
      ],
      "camera": {
        "originX": 0.5,
        "originY": 0.5,
        "tracks": {
          "scale": [
            {
              "m": "start",
              "o": 0,
              "v": 1.16,
              "label": "放大 1.16（預留張望空間）"
            }
          ],
          "x": [
            {
              "m": "start",
              "o": 0,
              "v": 0.0,
              "label": "5-1 前方"
            },
            {
              "m": "c_settle",
              "o": 0,
              "v": 0.0
            },
            {
              "m": "c_left",
              "o": 0,
              "v": 0.05,
              "e": "inOut",
              "label": "5-2 往左"
            },
            {
              "m": "c_leftUp",
              "o": 0,
              "v": 0.062,
              "e": "inOut",
              "label": "5-3 左上"
            },
            {
              "m": "c_d1",
              "o": 0,
              "v": 0.062,
              "label": "第一句：停住（只剩呼吸）"
            },
            {
              "m": "c_right",
              "o": 0,
              "v": -0.052,
              "e": "inOut",
              "label": "5-5 轉向右"
            },
            {
              "m": "c_rightDown",
              "o": 0,
              "v": -0.062,
              "e": "inOut",
              "label": "5-6 右下"
            },
            {
              "m": "c_rightDown",
              "o": 950,
              "v": -0.066,
              "e": "inOut",
              "label": "往上抬時視線微微外擺（曲線）"
            },
            {
              "m": "c_rightUp",
              "o": 0,
              "v": -0.06,
              "e": "inOut",
              "label": "5-7 右上"
            },
            {
              "m": "c_d2",
              "o": 0,
              "v": -0.06,
              "label": "第二句：停住"
            },
            {
              "m": "c_endLook",
              "o": 0,
              "v": -0.02,
              "e": "inOut",
              "label": "視線收回"
            }
          ],
          "y": [
            {
              "m": "start",
              "o": 0,
              "v": 0.03,
              "label": "承接 4B 抬頭（稍微往上）"
            },
            {
              "m": "c_settle",
              "o": 0,
              "v": 0.012,
              "e": "inOut",
              "label": "回到前方"
            },
            {
              "m": "c_left",
              "o": 0,
              "v": 0.008,
              "e": "inOut"
            },
            {
              "m": "c_leftUp",
              "o": 0,
              "v": 0.05,
              "e": "inOut",
              "label": "往上看樹冠"
            },
            {
              "m": "c_d1",
              "o": 0,
              "v": 0.05
            },
            {
              "m": "c_d1",
              "o": 1400,
              "v": 0.012,
              "e": "inOut",
              "label": "轉頭途中視線先回到水平（曲線）"
            },
            {
              "m": "c_right",
              "o": 0,
              "v": 0.01,
              "e": "inOut"
            },
            {
              "m": "c_rightDown",
              "o": 0,
              "v": -0.048,
              "e": "inOut",
              "label": "往下看小徑"
            },
            {
              "m": "c_rightUp",
              "o": 0,
              "v": 0.048,
              "e": "inOut",
              "label": "往上看高處"
            },
            {
              "m": "c_d2",
              "o": 0,
              "v": 0.048
            },
            {
              "m": "c_endLook",
              "o": 0,
              "v": 0.015,
              "e": "inOut"
            }
          ],
          "rotation": [
            {
              "m": "start",
              "o": 0,
              "v": 0
            },
            {
              "m": "c_left",
              "o": 0,
              "v": -0.15,
              "e": "inOut"
            },
            {
              "m": "c_leftUp",
              "o": 0,
              "v": -0.35,
              "e": "inOut",
              "label": "頭微微側傾"
            },
            {
              "m": "c_d1",
              "o": 0,
              "v": -0.35
            },
            {
              "m": "c_right",
              "o": 0,
              "v": 0.15,
              "e": "inOut"
            },
            {
              "m": "c_rightDown",
              "o": 0,
              "v": 0.3,
              "e": "inOut"
            },
            {
              "m": "c_rightUp",
              "o": 0,
              "v": 0.4,
              "e": "inOut"
            },
            {
              "m": "c_d2",
              "o": 0,
              "v": 0.4
            },
            {
              "m": "c_endLook",
              "o": 0,
              "v": 0.1,
              "e": "inOut"
            }
          ]
        }
      },
      "effects": {
        "breath": {
          "enabled": true,
          "params": {
            "BREATH_Y": 0.0035,
            "BREATH_X": 0.0018,
            "BREATH_ROT": 0.09,
            "BREATH_SCALE": 0.0025,
            "BREATH_PERIOD": 4.4,
            "BREATH_CLOCK": "ambient"
          }
        }
      },
      "tracks": {
        "breath": [
          {
            "m": "start",
            "o": 0,
            "v": 1,
            "label": "呼吸感（對話時也持續）"
          }
        ],
        "exposure": [
          {
            "m": "start",
            "o": 0,
            "v": 1
          },
          {
            "m": "c_endLook",
            "o": 200,
            "v": 1
          },
          {
            "m": "end",
            "o": 0,
            "v": 0,
            "e": "in",
            "label": "結尾淡出（之後接飛行屋地圖／第一關；目前未接通）"
          }
        ]
      },
      "dialogues": [
        {
          "id": "s5_d1",
          "speaker": "小V",
          "text": "這裡不是叫氣球森林嗎……？",
          "styleType": "rpg_box_no_portrait",
          "at": {
            "m": "c_d1",
            "o": 0
          },
          "mode": "wait",
          "autoMs": 0,
          "charMs": 60,
          "after": "resume",
          "enabled": true
        },
        {
          "id": "s5_d2",
          "speaker": "小V",
          "text": "怎麼都沒看到什麼氣球……？",
          "styleType": "rpg_box_no_portrait",
          "at": {
            "m": "c_d2",
            "o": 0
          },
          "mode": "wait",
          "autoMs": 0,
          "charMs": 60,
          "after": "resume",
          "enabled": true
        }
      ]
    }
  ]
};
