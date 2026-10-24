# 由 opening-test v0.2.0 的常數產生專案 JSON（只在開發時使用）
# v0.3.1-test-1：第二幕（放大＋兩句對話）、第四幕（定點分鏡）、第五幕（大幅張望）
# v0.3.2-test-1（audio-foundation）：新增空的 audio 區塊（音訊素材＋音訊片段）；五幕視覺資料與 v0.3.1 完全相同
import json, os
def K(m,o,v,e=None):
    k={"m":m,"o":o,"v":v}
    if e: k["e"]=e
    return k
# =====================================================================
# SCENE2（v0.3.1 修改）：床＋小V組再放大、更靠近鏡頭、往左（床頭局部出框）；兩句對話；2A→2B 真正交叉淡化
#   床畫在人物圖 scene2_char_2a/2b 裡（不是背景），所以整組放大移動；背景 scene2_bg 不動、也不再做鏡頭推近（背景不會被放大）
#   幾何（2A 原圖 1448×1086）：床頭柱在 x≈52～200，小V在 x≈340～770、頭頂 y≈28、鞋底 y≈1000
#   縮放 0.84（v0.2.0：0.56、v0.3.0：0.72）→ 小V頭頂距上緣約 1%、鞋底剛好貼齊下緣；畫面左緣切在原圖 x≈240（床頭柱與床頭板左半出框；小V頭髮左緣距畫面左緣約 6%）
# =====================================================================
SCENE2 = {
  "BED_SCALE": 0.84,   # 2A 圖寬 ÷ 舞台寬（v0.3.0：0.72）→ 再放大約 1.17 倍（比 v0.2.0 大 1.5 倍）
  "BED_X": 0.227,      # 錨點（前側兩隻床腳著地點中間）的水平位置（v0.3.0：0.200；因為放大，同樣位置會更靠左）→ 畫面左緣切在原圖 x≈240
  "BED_Y": 1.000,      # 錨點的垂直位置（床腳落在畫面下緣之外＝更靠近鏡頭）
  # ---- 節拍（本幕毫秒；0＝第二幕開始淡入）----
  "SHOWN": 240,        # 2A 淡入完成
  "D1_AT": 900,        # 第一句「……咦……？」（等玩家按繼續）
  "CROSS_DELAY": 250,  # 按繼續後，隔多久開始 2A→2B
  "CROSS_MS": 700,     # 2A→2B 交叉淡化長度
  "D2_AFTER": 350,     # 2B 完全出現後幾毫秒，出現第二句
  "TAIL_MS": 500,      # 第二句按繼續後，停留多久接第三幕
  "D1_TEXT": "……咦……？",
  "D2_TEXT": "我家在飛……？",
}
c2 = SCENE2
t2_switch = c2["D1_AT"] + c2["CROSS_DELAY"]
t2_b = t2_switch + c2["CROSS_MS"]
t2_d2 = t2_b + c2["D2_AFTER"]
t2_end = t2_d2 + c2["TAIL_MS"]
scene1 = {
  "id":"intro_scene01","name":"第一人稱醒來","status":"ready",
  "note":"移植自 opening-test v0.2.0 第一幕（已驗收）",
  "durationMs":10950,
  "transitionIn":{"type":"cut"},
  "markers":[
    {"id":"open1","label":"第一次睜眼開始","t":1000},
    {"id":"blink1","label":"第一次眨眼","t":4500},
    {"id":"blink2","label":"第二次眨眼","t":6900},
    {"id":"settle","label":"完全清晰／鏡頭開始穩定","t":8300},
    {"id":"settleEnd","label":"鏡頭穩定完成","t":10400},
    {"id":"animEnd","label":"第一幕演出結束","t":10800}
  ],
  "layers":[{"id":"s1_bg","name":"第一幕背景","type":"image","role":"background","asset":"scene1_bg","visible":True}],
  "camera":{"originX":0.5,"originY":0.5,"tracks":{}},
  "effects":{
    "eyelids":{"enabled":True,"params":{
      "LID_FEATHER":0.026,"LID_COLOR":"#070404","LID_RIM_COLOR":"rgba(78, 26, 18, 0.55)",
      "LID_CENTER_Y":0.5,"LID_CURVE_MIN":0.04,"LID_CURVE_MAX":0.20,"LOWER_LID_LAG":1.18,"TREMOR":0.018}},
    "breath":{"enabled":True,"params":{
      "BREATH_Y":0.0045,"BREATH_X":0.0022,"BREATH_ROT":0.12,"BREATH_SCALE":0.003,"BREATH_PERIOD":4.2}}
  },
  "tracks":{
    "open":[K("start",0,0),K("open1",0,0),K("open1",1600,0.42,"inOut"),K("open1",2500,0.50,"inOut"),
            K("blink1",0,0.50),K("blink1",200,0,"in"),K("blink1",350,0),K("blink1",1000,0.78,"out"),
            K("blink2",0,0.78),K("blink2",170,0,"in"),K("blink2",260,0),K("blink2",1010,1,"out")],
    "blur":[K("start",0,0.024),K("blink1",200,0.024),K("blink1",350,0.011,"linear"),
            K("blink2",170,0.011),K("blink2",260,0.006,"linear"),K("settle",0,0,"out")],
    "exposure":[K("start",0,1.16),K("blink1",200,1.16),K("blink1",350,1.07,"linear"),
                K("blink2",260,1.07),K("settle",0,1,"out")],
    "breath":[K("start",0,1),K("settle",0,1),K("settleEnd",0,0,"inOut")],
    "overscan":[K("start",0,1.025),K("settle",0,1.025),K("settleEnd",0,1,"inOut")],
    "tremor":[K("start",0,1),K("blink2",0,1),K("blink2",170,0,"linear")]
  },
  "dialogues":[]
}
scene2 = {
  "id":"intro_scene02","name":"小V坐在床側，從揉眼到驚訝","status":"ready",
  "note":"v0.3.1：床＋小V再放大、更靠近鏡頭、往左（床頭出框）；「……咦……？」→ 按繼續 → 2A→2B 交叉淡化 → 「我家在飛……？」；不做鏡頭推近（背景不放大）",
  "durationMs":t2_end,
  "transitionIn":{"type":"fadeBlack","outMs":160,"holdMs":60,"inMs":240},
  "markers":[
    {"id":"shown","label":"淡入完成（2A 揉眼）","t":c2["SHOWN"]},
    {"id":"s2_d1","label":"第一句「……咦……？」（等待繼續）","t":c2["D1_AT"]},
    {"id":"switch","label":"按繼續後：2A → 2B 交叉淡化開始","t":t2_switch},
    {"id":"bShown","label":"2B 完全取代 2A","t":t2_b},
    {"id":"s2_d2","label":"第二句「我家在飛……？」（等待繼續）","t":t2_d2}
  ],
  "layers":[
    {"id":"s2_bg","name":"第二幕背景","type":"image","role":"background","asset":"scene2_bg","visible":True},
    {"id":"s2_vbed","name":"小V＋床組（2A→2B）","type":"swapPair","role":"character","visible":True,
     "assetA":"scene2_char_2a","assetB":"scene2_char_2b",
     "switchFrom":{"m":"switch","o":0},"switchTo":{"m":"bShown","o":0},
     "crossfade":"dissolve",
     "foregroundScale":SCENE2["BED_SCALE"],"foregroundX":SCENE2["BED_X"],"foregroundY":SCENE2["BED_Y"],
     "foregroundAnchorX":0.4366,"foregroundAnchorY":0.9080,
     "bAlign":{"scale":0.97699,"x":-5.28,"y":41.55,
               "note":"2B 圖上的點 (u,v) → 2A 圖上 (u*scale+x, v*scale+y)。以床架 9 個地標擬合；殘差平均約 6px、最大約 10px（2A 原圖像素），因 2B 的床橫向比 2A 寬約 3%，屬素材本身差異。"},
     "look":{"brightness":1,"saturate":1,"warmth":0,"opacity":1},
     "shadow":{"opacity":0.55,"color":"#3a1d08",
               "bedFeet":[[94,912],[1171,1061],[1356,943],[279,794]],
               "shoesA":[[400,968,95,16],[540,994,85,15]],
               "shoesB":[[411,946,95,16],[583,1020,85,15]]}}
  ],
  "camera":{"originX":0.40,"originY":0.52,"tracks":{}},
  "effects":{},
  "tracks":{},
  "dialogues":[
    {"id":"s2_d1","speaker":"小V","text":c2["D1_TEXT"],"styleType":"rpg_box_no_portrait",
     "at":{"m":"s2_d1","o":0},"mode":"wait","autoMs":0,"charMs":90,"after":"resume","enabled":True},
    {"id":"s2_d2","speaker":"小V","text":c2["D2_TEXT"],"styleType":"rpg_box_no_portrait",
     "at":{"m":"s2_d2","o":0},"mode":"wait","autoMs":0,"charMs":70,"after":"resume","enabled":True}]
}
def draft(i, sid, name, dlg):
    return {"id":sid,"name":name,"status":"draft","note":"尚未製作正式素材",
            "durationMs":4000,"transitionIn":{"type":"fadeBlack","outMs":300,"holdMs":100,"inMs":400},
            "markers":[],"layers":[],"camera":{"originX":0.5,"originY":0.5,"tracks":{}},
            "effects":{},"tracks":{},"dialogues":dlg}
# =====================================================================
# SCENE3（v0.3.0 修改）：窗外木牌更小、更低；人物淡入；兩句對話都等待玩家繼續；3A→3B 真正交叉淡化
#   所有時間都是「本幕時間」（毫秒，0＝第三幕畫面開始淡入）
# =====================================================================
SCENE3 = {
  # ---- 03-00 入場：從第二幕切入（淡黑，極短）----
  "TRANS_OUT": 120, "TRANS_HOLD": 40, "TRANS_IN": 200,
  # ---- 節拍 ----
  "V_FADE_START": 500,     # 先看到窗戶與窗外，這時人物才開始淡入
  "V_FADE_MS": 700,        # 人物淡入長度
  "DLG1_AFTER": 300,       # 人物完全出現後幾毫秒，出現第一句（等待玩家繼續）
  "CROSS_DELAY": 200,      # 玩家按繼續後，隔多久開始 3A→3B
  "CROSS_MS": 600,         # 3A→3B 交叉淡化長度（v0.2.0：220ms）
  "DLG2_AFTER": 700,       # 3B 完全出現後幾毫秒，出現第二句（讓視線先移到木牌）
  "TAIL_MS": 700,          # 第二句按繼續後，再停留多久接第四幕
  "DLG1_TEXT": "這裡是哪裡……？",
  "DLG2_TEXT": "氣球森林……？",
  # ---- 窗外層（遠景）----
  #   v0.2.0：scale 1.08、x 0.645、y 0.5（木牌寬約 26% 畫面、中心高度 47.8%）
  #   v0.3.0：scale 0.95、y 0.52 → 木牌寬約 23%（小 12%）、中心高度約 50%（低約 2.3%）
  #   素材限制：窗洞從 y＝0.049（拱頂）到 0.871、x＝0.139～0.861；窗外圖縮小後上緣必須仍蓋過拱頂，
  #   所以「更小」和「更低」只能各做一點（再低就會在拱頂露出空白）。
  "OUT_SCALE_START": 0.95,
  "OUT_SCALE_END": 0.96,   # 非常輕微的慢推（到本幕結束）
  "OUT_X": 0.612,          # 再往右會讓左側窗洞露出空白；木牌左端被左窗櫺擋住一點點，四個字都看得到
  "OUT_X_GUIDE": 0.616,    # 3A→3B 時微微平移，把視線帶到木牌
  "OUT_Y": 0.52,
  # ---- 人物（3A / 3B 共用定位，錨點＝皮帶中央；同 v0.2.0）----
  "CHAR_SCALE": 0.46, "CHAR_X": 0.66, "CHAR_Y": 0.86,
  "CHAR_ANCHOR_X": round(556/1122, 4), "CHAR_ANCHOR_Y": round(770/1402, 4),
  "B_ALIGN": {"scale":1.0, "x":-2, "y":48},
}
c3=SCENE3
t_look = c3["TRANS_IN"]
t_vin = c3["V_FADE_START"] + c3["V_FADE_MS"]
t_d1 = t_vin + c3["DLG1_AFTER"]
t_cross = t_d1 + c3["CROSS_DELAY"]
t_cur = t_cross + c3["CROSS_MS"]
t_d2 = t_cur + c3["DLG2_AFTER"]
t_end = t_d2 + c3["TAIL_MS"]
scene3 = {
  "id":"intro_scene03","name":"透過拱窗看見氣球森林","status":"ready",
  "note":"v0.3.0：木牌更小更低；人物淡入；兩句對話等待玩家繼續；3A→3B 真正交叉淡化",
  "durationMs":t_end,
  "transitionIn":{"type":"fadeBlack","outMs":c3["TRANS_OUT"],"holdMs":c3["TRANS_HOLD"],"inMs":c3["TRANS_IN"]},
  "markers":[
    {"id":"s3_look","label":"03-01 窗戶與窗外（淡入完成）","t":t_look},
    {"id":"s3_vin","label":"03-02 小V淡入完成（3A 疑惑）","t":t_vin},
    {"id":"s3_d1","label":"03-03 第一句「這裡是哪裡……？」","t":t_d1},
    {"id":"s3_cross","label":"03-04 按繼續後：3A→3B 交叉淡化開始","t":t_cross},
    {"id":"s3_curious","label":"03-05 3B 好奇（疊化完成）","t":t_cur},
    {"id":"s3_d2","label":"03-06 第二句「氣球森林……？」","t":t_d2}],
  "layers":[
    {"id":"s3_outside_base","name":"窗外景色・底層補邊（同一張圖，原尺寸）","type":"image","role":"far","asset":"intro_scene03_outside","visible":True,
     "x":0.5,"y":0.5,"scale":1.0,"anchorX":0.5,"anchorY":0.5,"opacity":1,"rotation":0,"tracks":{},
     "note":"窗框右上角有一個小透光孔（x 0.965～1、y 0～0.074）；主窗外層縮小後蓋不到，用同一張圖原尺寸墊在下面，避免露出底色"},
    {"id":"s3_outside","name":"窗外景色（主拱窗，可獨立運鏡）","type":"image","role":"far","asset":"intro_scene03_outside","visible":True,
     "x":c3["OUT_X"],"y":c3["OUT_Y"],"scale":c3["OUT_SCALE_START"],"anchorX":0.5,"anchorY":0.5,"opacity":1,"rotation":0,
     "tracks":{
       "scale":[{"m":"start","o":0,"v":c3["OUT_SCALE_START"],"label":"初始推拉值"},
                {"m":"end","o":0,"v":c3["OUT_SCALE_END"],"e":"out","label":"非常輕微的慢推（到本幕結束）"}],
       "x":[{"m":"start","o":0,"v":c3["OUT_X"],"label":"初始位置"},
            {"m":"s3_cross","o":0,"v":c3["OUT_X"],"label":"轉頭前維持不動"},
            {"m":"s3_d2","o":0,"v":c3["OUT_X_GUIDE"],"e":"inOut","label":"微平移：把視線帶到較低處的木牌"}]}},
    {"id":"s3_window","name":"窗框／室內前景","type":"image","role":"foreground","asset":"intro_scene03_window","visible":True,
     "x":0.5,"y":0.5,"scale":1,"anchorX":0.5,"anchorY":0.5,"opacity":1,"rotation":0,"tracks":{}},
    {"id":"s3_v","name":"小V（3A 疑惑 → 3B 好奇）","type":"swapPair","role":"character","visible":True,
     "assetA":"intro_scene03_v_confused","assetB":"intro_scene03_v_curious","labelA":"3A 疑惑","labelB":"3B 好奇",
     "crossfade":"dissolve",
     "switchFrom":{"m":"s3_cross","o":0},"switchTo":{"m":"s3_curious","o":0},
     "foregroundScale":c3["CHAR_SCALE"],"foregroundX":c3["CHAR_X"],"foregroundY":c3["CHAR_Y"],
     "foregroundAnchorX":c3["CHAR_ANCHOR_X"],"foregroundAnchorY":c3["CHAR_ANCHOR_Y"],
     "bAlign":dict(c3["B_ALIGN"], note="3B 圖上的點 (u,v) → 3A 圖上 (u*scale+x, v*scale+y)。兩張圖人物大小相同（皮帶到鞋底 599／598px），以皮帶中央對齊；3B 的頭比 3A 低約 50px 是「往左下看」的姿勢，不是誤差。"),
     "look":{"brightness":1,"saturate":1,"warmth":0,"opacity":1},
     "shadow":{"opacity":0,"color":"#3a1d08","bedFeet":[],"shoesA":[],"shoesB":[]},
     "tracks":{"opacity":[{"m":"start","o":c3["V_FADE_START"],"v":0,"label":"先看窗外（人物還沒出現）"},
                          {"m":"s3_vin","o":0,"v":1,"e":"inOut","label":"小V淡入完成"}]}}],
  "camera":{"originX":0.5,"originY":0.5,"tracks":{}},
  "effects":{},"tracks":{},
  "dialogues":[
    {"id":"s3_d1","speaker":"小V","text":c3["DLG1_TEXT"],"styleType":"rpg_box_no_portrait",
     "at":{"m":"s3_d1","o":0},"mode":"wait","autoMs":0,"charMs":60,"after":"resume","enabled":True},
    {"id":"s3_d2","speaker":"小V","text":c3["DLG2_TEXT"],"styleType":"rpg_box_no_portrait",
     "at":{"m":"s3_d2","o":0},"mode":"wait","autoMs":0,"charMs":70,"after":"resume","enabled":True}]
}

# =====================================================================
# v0.3.1：第四幕改成「定點插畫分鏡」——每張人物圖都是固定構圖（固定位置／大小），只靠淡入淡出切換；
#   不再讓人物圖位移、起伏、抖動來模擬走路。人物用一般圖片圖層（role＝character），
#   錨點設在腳底：位置 X／Y＝腳底在畫面上的位置；縮放＝圖寬 ÷ 舞台寬（由「人物身高 ÷ 舞台高」換算）。
# =====================================================================
STAGE_W, STAGE_H = 1672, 941
def still(lid, name, asset, imgW, imgH, footX, footY, figTop, x, y, height, opacity_keys, note=""):
    """固定構圖的人物圖層。height＝人物身高（頭頂到腳底）÷ 舞台高度。"""
    sc = imgW * height * STAGE_H / ((footY - figTop) * STAGE_W)
    return {"id":lid,"name":name,"type":"image","role":"character","asset":asset,"visible":True,
            "x":x,"y":y,"scale":round(sc,4),"anchorX":round(footX/imgW,4),"anchorY":round(footY/imgH,4),
            "opacity":0,"rotation":0,"blur":0,
            "note":note or f"固定構圖：腳底在畫面 ({x}, {y})，人物身高約 {height} 個舞台高；只做淡入淡出、不移動",
            "tracks":{"opacity":opacity_keys}}
def op(m, v, e=None, label=None, o=0):
    k = {"m":m,"o":o,"v":v}
    if e: k["e"] = e
    if label: k["label"] = label
    return k

# ---------------- 第四幕A：深入氣球森林（背景固定；近景偏右較大 → 淡出；遠景偏左較小 → 淡入）----------------
A4 = {
  "IN": {"type":"fadeBlack","outMs":300,"holdMs":200,"inMs":600},   # 從第三幕進來（同 v0.3.0）
  # 節拍（本幕毫秒）
  "NEAR_IN": 600,      # 背景淡入完成，近景小V同時完整出現
  "NEAR_OUT": 3000,    # 近景開始淡出
  "NEAR_GONE": 3900,   # 近景完全消失
  "FAR_IN": 3600,      # 遠景開始淡入（和近景淡出重疊 300ms）
  "FAR_SHOWN": 4500,   # 遠景完全出現
  "DUR": 7000,         # 遠景停留到本幕結束 → 全畫面淡出進第四幕B
  # 固定構圖（腳底位置、身高）
  "NEAR": {"x":0.680, "y":0.985, "h":0.70},   # 畫面偏右、靠近鏡頭、較大（小徑右半）
  "FAR":  {"x":0.520, "y":0.775, "h":0.25},   # 畫面偏左、小徑深處、較小（小徑左半）
}
scene4a = {
  "id":"intro_scene04a","name":"第四幕A：深入氣球森林","status":"ready",
  "note":"v0.3.1：定點分鏡——背景固定；近景小V（偏右、較大）淡出 → 遠景小V（偏左、較小）淡入；人物不移動、不起伏；結束後全畫面淡出進第四幕B",
  "durationMs":A4["DUR"], "transitionIn":A4["IN"],
  "markers":[
    {"id":"a_nearIn","label":"4A-1 近景小V（偏右、較大）","t":A4["NEAR_IN"]},
    {"id":"a_nearOut","label":"4A-2 近景開始淡出","t":A4["NEAR_OUT"]},
    {"id":"a_farIn","label":"4A-2 遠景開始淡入","t":A4["FAR_IN"]},
    {"id":"a_nearGone","label":"4A-2 近景完全消失","t":A4["NEAR_GONE"]},
    {"id":"a_farShown","label":"4A-3 遠景小V（偏左、較小）完全出現","t":A4["FAR_SHOWN"]}],
  "layers":[
    {"id":"a_bg","name":"森林小徑背景（固定）","type":"image","role":"background","asset":"intro_scene04a_bg","visible":True},
    still("a_near","小V 近景（偏右、較大）","intro_scene04a_v_near",1024,1536,446.5,1518,13,
          A4["NEAR"]["x"],A4["NEAR"]["y"],A4["NEAR"]["h"],
          [op("start",1,None,"隨背景一起淡入"),op("a_nearOut",1,None,"停留"),op("a_nearGone",0,"inOut","淡出")]),
    still("a_far","小V 遠景（偏左、較小）","intro_scene04a_v_far",1024,1536,449,1457,87,
          A4["FAR"]["x"],A4["FAR"]["y"],A4["FAR"]["h"],
          [op("a_farIn",0,None,"還沒出現"),op("a_farShown",1,"inOut","淡入"),op("end",1,None,"停留到本幕結束")])],
  "camera":{"originX":0.5,"originY":0.5,"tracks":{}},
  "effects":{
    "fog":{"enabled":True,"params":{"CX":0.56,"CY":0.60,"RX":0.30,"RY":0.20,"CORE":0.90,"HAZE":0.10,"COLOR":"236, 240, 234"}}},
  "tracks":{
    "fog":[{"m":"start","o":0,"v":0.12,"label":"遠處薄霧（固定，不再吞沒小V）"}]},
  "dialogues":[]
}

# ---------------- 第四幕B：90° 側面森林小徑（被窺視感）----------------
#   圖層（下→上）：背景（固定）→ 小V 三張固定構圖（依序淡入淡出）→ 前景失焦樹木（固定，最上層遮擋）
#   遠 → 稍近 → 稍遠：步行（左、較小、腳底較高）→ 回頭仰望（中、略大、腳底較低）→ 抬頭張望（右、和步行差不多大）
B4 = {
  "IN": {"type":"fadeBlack","outMs":700,"holdMs":250,"inMs":700},   # 第四幕A 結束：全畫面淡出 → 淡入第四幕B
  "FG_X": 0.49, "FG_Y": 0.47, "FG_SCALE": 1.06,   # 前景樹木：左側樹幹遮到步行、右側枝葉遮到抬頭張望；下緣剛好貼齊畫面下緣
  # 節拍（本幕毫秒）
  "WALK_IN": 500, "WALK_SHOWN": 1300, "WALK_OUT": 3100, "WALK_GONE": 3800,
  "BACK_IN": 3500, "BACK_SHOWN": 4300, "BACK_OUT": 6300, "BACK_GONE": 7000,
  "UP_IN": 6700, "UP_SHOWN": 7500, "DUR": 9800,
  "WALK": {"x":0.205, "y":0.690, "h":0.36},   # 被左側前景樹遮住約 1／4
  "BACK": {"x":0.480, "y":0.745, "h":0.42},
  "UP":   {"x":0.845, "y":0.700, "h":0.37},   # 被右側前景枝葉遮住約 1／6
}
b = B4
scene4b = {
  "id":"intro_scene04b","name":"第四幕B：90° 側面森林小徑（被窺視感）","status":"ready",
  "note":"v0.3.1：定點分鏡——三張固定構圖依序淡入淡出：步行（左、遠）→ 回頭仰望（中、稍近）→ 抬頭張望（右、稍遠）；前景失焦樹木固定在最上層遮擋；不做人物平移／起伏",
  "durationMs":b["DUR"], "transitionIn":b["IN"],
  "markers":[
    {"id":"b_walkIn","label":"4B-1 步行 淡入開始","t":b["WALK_IN"]},
    {"id":"b_walkShown","label":"4B-1 步行（左、較遠）完全出現","t":b["WALK_SHOWN"]},
    {"id":"b_walkOut","label":"4B-1 步行 淡出開始","t":b["WALK_OUT"]},
    {"id":"b_backIn","label":"4B-2 回頭仰望 淡入開始","t":b["BACK_IN"]},
    {"id":"b_walkGone","label":"4B-1 步行 完全消失","t":b["WALK_GONE"]},
    {"id":"b_backShown","label":"4B-2 回頭仰望（中、稍近）完全出現","t":b["BACK_SHOWN"]},
    {"id":"b_backOut","label":"4B-2 回頭仰望 淡出開始","t":b["BACK_OUT"]},
    {"id":"b_upIn","label":"4B-3 抬頭張望 淡入開始","t":b["UP_IN"]},
    {"id":"b_backGone","label":"4B-2 回頭仰望 完全消失","t":b["BACK_GONE"]},
    {"id":"b_upShown","label":"4B-3 抬頭張望（右、稍遠）完全出現","t":b["UP_SHOWN"]}],
  "layers":[
    {"id":"b_bg","name":"側面森林背景（固定）","type":"image","role":"far","asset":"intro_scene04b_bg","visible":True,
     "x":0.5,"y":0.5,"scale":1.0,"anchorX":0.5,"anchorY":0.5,"opacity":1,"rotation":0,"tracks":{}},
    still("b_walk","小V 1 步行（左、較遠）","intro_scene04b_v_walk",1086,1448,549,1405,59,
          b["WALK"]["x"],b["WALK"]["y"],b["WALK"]["h"],
          [op("b_walkIn",0,None,"還沒出現"),op("b_walkShown",1,"inOut","淡入"),op("b_walkOut",1,None,"停留"),op("b_walkGone",0,"inOut","淡出")]),
    still("b_back","小V 2 回頭仰望（中、稍近）","intro_scene04b_v_look_back_up",1024,1536,569,1504,32,
          b["BACK"]["x"],b["BACK"]["y"],b["BACK"]["h"],
          [op("b_backIn",0,None,"還沒出現"),op("b_backShown",1,"inOut","淡入"),op("b_backOut",1,None,"停留"),op("b_backGone",0,"inOut","淡出")]),
    still("b_up","小V 3 抬頭張望（右、稍遠）","intro_scene04b_v_look_up",1122,1402,601,1388,34,
          b["UP"]["x"],b["UP"]["y"],b["UP"]["h"],
          [op("b_upIn",0,None,"還沒出現"),op("b_upShown",1,"inOut","淡入"),op("end",1,None,"停留到本幕結束 → 第五幕")]),
    {"id":"b_fg","name":"前景失焦樹木（固定，最上層遮擋）","type":"image","role":"foreground","asset":"intro_scene04b_fg_trees","visible":True,
     "x":b["FG_X"],"y":b["FG_Y"],"scale":b["FG_SCALE"],"anchorX":0.5,"anchorY":0.5,"opacity":1,"rotation":0,"tracks":{}}],
  "camera":{"originX":0.5,"originY":0.5,"tracks":{}},
  "effects":{},"tracks":{},"dialogues":[]
}

# =====================================================================
# SCENE5（v0.3.1 修改）：第一人稱東張西望——運鏡幅度加大，含上下視線；路徑走曲線、有過頭再回正的小停頓
#   鏡頭 x 正值＝畫面往右移＝視線往左看；y 正值＝畫面往下移＝視線往上看
#   安全範圍：鏡頭放大 1.30 → 每邊多 15%；|x| ≤ 0.13、|y| ≤ 0.12、旋轉 ≤ 0.8°（含呼吸）不露邊
# =====================================================================
C5 = {
  "IN": {"type":"crossfade","durMs":900},
  "SCALE": 1.30, "SCALE_LEAN": 1.33,   # 第二句前微微往前湊（疑惑加深）
  "T_SETTLE": 1000, "T_LEFT": 2700, "T_LEFTUP": 4300, "T_D1": 4600,
  "T_RIGHT": 7100, "T_RIGHTDOWN": 8900, "T_RIGHTUP": 10900, "T_D2": 11200, "T_END_LOOK": 12700, "DUR": 14200,
}
k5 = lambda m, o, v, e=None, label=None: dict({"m":m,"o":o,"v":v}, **({"e":e} if e else {}), **({"label":label} if label else {}))
scene5 = {
  "id":"intro_scene05","name":"第五幕：第一人稱森林探索","status":"ready",
  "note":"v0.3.1：運鏡幅度加大（左右約 ±12%、上下約 ±11%）；正前 → 左 → 左上 →〔第一句〕→ 右 → 右下 → 右上 →〔第二句〕；對話時視線停住、呼吸持續，按繼續從原位接續",
  "durationMs":C5["DUR"], "transitionIn":C5["IN"],
  "markers":[
    {"id":"c_settle","label":"5-1 看向前方（承接 4B 的抬頭）","t":C5["T_SETTLE"]},
    {"id":"c_left","label":"5-2 往左看","t":C5["T_LEFT"]},
    {"id":"c_leftUp","label":"5-3 往左上看樹冠","t":C5["T_LEFTUP"]},
    {"id":"c_d1","label":"5-4 左上停留：第一句","t":C5["T_D1"]},
    {"id":"c_right","label":"5-5 轉向右邊","t":C5["T_RIGHT"]},
    {"id":"c_rightDown","label":"5-6 往右下看小徑與草叢","t":C5["T_RIGHTDOWN"]},
    {"id":"c_rightUp","label":"5-7 往右上看高處","t":C5["T_RIGHTUP"]},
    {"id":"c_d2","label":"5-8 右上停留：第二句","t":C5["T_D2"]},
    {"id":"c_endLook","label":"結尾：視線收回","t":C5["T_END_LOOK"]}],
  "layers":[
    {"id":"c_bg","name":"第一人稱森林背景","type":"image","role":"background","asset":"intro_scene05_bg","visible":True}],
  "camera":{"originX":0.5,"originY":0.5,"tracks":{
    "scale":[k5("start",0,C5["SCALE"],None,"放大 1.30（預留大幅張望空間）"), k5("c_rightDown",0,C5["SCALE"]),
             k5("c_d2",0,C5["SCALE_LEAN"],"inOut","往前湊近一點（疑惑加深）"), k5("end",0,C5["SCALE_LEAN"])],
    "x":[k5("start",0,0.000,None,"5-1 前方"), k5("c_settle",0,0.000),
         k5("c_settle",500,-0.018,"inOut","先往右瞄一下（猶豫）"),
         k5("c_left",0,0.118,"inOut","5-2 往左（轉過頭一點）"), k5("c_left",450,0.105,"inOut","回正一點"),
         k5("c_leftUp",0,0.125,"inOut","5-3 左上"), k5("c_d1",0,0.125,None,"第一句：停住（只剩呼吸）"),
         k5("c_d1",900,0.090,"inOut","慢慢收回"), k5("c_d1",1700,0.000,"inOut","轉頭途中"),
         k5("c_right",0,-0.118,"inOut","5-5 轉向右（轉過頭一點）"), k5("c_right",450,-0.106,"inOut","回正一點"),
         k5("c_rightDown",0,-0.122,"inOut","5-6 右下"), k5("c_rightDown",1000,-0.128,"inOut","往上抬時視線往外擺（曲線）"),
         k5("c_rightUp",0,-0.100,"inOut","5-7 右上"), k5("c_d2",0,-0.100,None,"第二句：停住"),
         k5("c_endLook",0,-0.030,"inOut","視線收回")],
    "y":[k5("start",0,0.060,None,"承接 4B 抬頭（往上）"), k5("c_settle",0,0.000,"inOut","回到前方"),
         k5("c_left",0,0.020,"inOut"), k5("c_leftUp",0,0.112,"inOut","往上看樹冠"), k5("c_d1",0,0.112),
         k5("c_d1",900,0.060,"inOut"), k5("c_d1",1700,-0.030,"inOut","轉頭時視線往下沉（弧線）"),
         k5("c_right",0,0.000,"inOut"),
         k5("c_rightDown",0,-0.110,"inOut","往下看小徑"), k5("c_rightDown",500,-0.110,None,"停一下"),
         k5("c_rightUp",0,0.115,"inOut","往上看高處"), k5("c_d2",0,0.115),
         k5("c_endLook",0,0.030,"inOut")],
    "rotation":[k5("start",0,0), k5("c_left",0,-0.35,"inOut"), k5("c_leftUp",0,-0.60,"inOut","頭微微側傾"), k5("c_d1",0,-0.60),
                k5("c_d1",1700,0.00,"inOut"), k5("c_right",0,0.30,"inOut"), k5("c_rightDown",0,0.50,"inOut"),
                k5("c_rightUp",0,0.70,"inOut"), k5("c_d2",0,0.70), k5("c_endLook",0,0.15,"inOut")]}},
  "effects":{
    "breath":{"enabled":True,"params":{"BREATH_Y":0.0040,"BREATH_X":0.0020,"BREATH_ROT":0.10,"BREATH_SCALE":0.0025,"BREATH_PERIOD":4.2,"BREATH_CLOCK":"ambient"}}},
  "tracks":{
    "breath":[k5("start",0,1,None,"呼吸感（對話時也持續）")],
    "exposure":[k5("start",0,1), k5("c_endLook",500,1), k5("end",0,0,"in","結尾淡出（之後接飛行屋地圖／第一關；本輪不接）")]},
  "dialogues":[
    {"id":"s5_d1","speaker":"小V","text":"這裡不是叫氣球森林嗎……？","styleType":"rpg_box_no_portrait",
     "at":{"m":"c_d1","o":0},"mode":"wait","autoMs":0,"charMs":60,"after":"resume","enabled":True},
    {"id":"s5_d2","speaker":"小V","text":"怎麼都沒看到什麼氣球……？","styleType":"rpg_box_no_portrait",
     "at":{"m":"c_d2","o":0},"mode":"wait","autoMs":0,"charMs":60,"after":"resume","enabled":True}]
}
project = {
  "schemaVersion":"1.0",
  "projectId":"party-island-opening",
  "title":"派對島大作戰・開場",
  "editorVersion":"motion-comic-editor-v0.3.2-test-1",
  "contentVersion":4,   # 五幕內容與 v0.3.1 相同，所以不升級（已儲存 v0.3.1 專案的使用者不會被要求更新）
  "stage":{"width":1672,"height":941,"fit":"contain"},
  "assets":{
    "scene1_bg":{"src":"assets/scene1_bg.png","label":"第一幕背景","width":1672,"height":941},
    "scene2_bg":{"src":"assets/scene2_bg.png","label":"第二幕背景","width":1672,"height":941},
    "scene2_char_2a":{"src":"assets/scene2_char_2a.png","label":"2A 揉眼（人物＋床）","width":1448,"height":1086},
    "scene2_char_2b":{"src":"assets/scene2_char_2b.png","label":"2B 驚訝（人物＋床）","width":1484,"height":1060},
    "intro_scene03_outside":{"src":"assets/intro_scene03_outside.png","label":"第三幕 窗外景色","width":1672,"height":941},
    "intro_scene03_window":{"src":"assets/intro_scene03_window.png","label":"第三幕 窗框／室內前景","width":1672,"height":941},
    "intro_scene03_v_confused":{"src":"assets/intro_scene03_v_confused.png","label":"第三幕 3A 小V 疑惑","width":1122,"height":1402},
    "intro_scene03_v_curious":{"src":"assets/intro_scene03_v_curious.png","label":"第三幕 3B 小V 好奇","width":1145,"height":1374},
    "intro_scene04a_bg":{"src":"assets/intro_scene04a_bg.png","label":"第四幕A 森林小徑背景","width":1672,"height":941},
    "intro_scene04a_v_near":{"src":"assets/intro_scene04a_v_near.png","label":"第四幕A 小V 近景（背影）","width":1024,"height":1536},
    "intro_scene04a_v_far":{"src":"assets/intro_scene04a_v_far.png","label":"第四幕A 小V 遠景","width":1024,"height":1536},
    "intro_scene04b_bg":{"src":"assets/intro_scene04b_bg.png","label":"第四幕B 側面森林背景","width":1672,"height":941},
    "intro_scene04b_v_walk":{"src":"assets/intro_scene04b_v_walk.png","label":"第四幕B 小V 謹慎步行","width":1086,"height":1448},
    "intro_scene04b_v_look_back_up":{"src":"assets/intro_scene04b_v_look_back_up.png","label":"第四幕B 小V 回頭仰望","width":1024,"height":1536},
    "intro_scene04b_v_look_up":{"src":"assets/intro_scene04b_v_look_up.png","label":"第四幕B 小V 抬頭張望","width":1122,"height":1402},
    "intro_scene04b_fg_trees":{"src":"assets/intro_scene04b_fg_trees.png","label":"第四幕B 前景失焦樹木","width":1672,"height":941},
    "intro_scene05_bg":{"src":"assets/intro_scene05_bg.png","label":"第五幕 第一人稱森林","width":1672,"height":941}},
  "scenes":[scene1,scene2,scene3,scene4a,scene4b,scene5],
  # v0.3.2：音訊（尚未提供任何正式音檔，所以素材與片段都是空的；不放不存在的路徑，避免 404）
  "audio":{"version":1,
           "mix":{"master":1,"bgm":0.7,"ambient":0.6,"sfx":0.9,"voice":1},
           "assets":{},
           "clips":[]}
}
LABELS = {
 'open':['閉眼','開始睜眼','第一次睜眼（半開）','迷濛地再撐開','第一次眨眼前','第一次眨眼：闔上','閉眼停留結束','第二次睜開（較大）','第二次眨眼前','第二次眨眼：闔上','閉眼停留結束','完全睜開'],
 'blur':['高度模糊','模糊維持到第一次閉眼','稍微清楚（閉眼時換檔）','維持到第二次閉眼','再清楚一些（閉眼時換檔）','對焦完全清晰'],
 'exposure':['剛醒來偏亮','維持到第一次閉眼','第一次眨眼後降低','維持','回到正常亮度'],
 'breath':['呼吸開始','開始收束','完全穩定'],
 'overscan':['預留放大','開始收回','回到原始鏡位'],
 'tremor':['顫動','顫動持續','停止顫動'],
}
for k,arr in LABELS.items():
    for kf,lab in zip(scene1['tracks'][k],arr): kf['label']=lab
    assert len(arr)==len(scene1['tracks'][k]),k
out=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','projects')
# v0.3.2：不覆寫 v0.1.0～v0.3.1 的基準檔，另外產生 v0.3.2 基準檔
for name in ['party-island-opening','party-island-opening-baseline-v0.3.2']:
    s=json.dumps(project,ensure_ascii=False,indent=2)
    open(f'{out}/{name}.json','w',encoding='utf8').write(s+'\n')
    var='MC_BASELINE_V32' if 'baseline' in name else 'MC_PROJECT'
    open(f'{out}/{name}.js','w',encoding='utf8').write(
      f'/* 自動產生：與 {name}.json 內容相同。供 file:// 直接開啟時使用（瀏覽器在 file:// 下不允許讀取 JSON）。 */\n'
      f'window.{var} = {s};\n')
print('ok')
# 驗證：還原成 v0.2.0 的絕對時間
mm={'start':0,'end':10950,**{m['id']:m['t'] for m in scene1['markers']}}
abs_open=[mm[k['m']]+k['o'] for k in scene1['tracks']['open']]
print('open 絕對時間', abs_open)
print('blur', [mm[k['m']]+k['o'] for k in scene1['tracks']['blur']])
print('exposure', [mm[k['m']]+k['o'] for k in scene1['tracks']['exposure']])
print('breath/overscan', [mm[k['m']]+k['o'] for k in scene1['tracks']['breath']])
print('tremor', [mm[k['m']]+k['o'] for k in scene1['tracks']['tremor']])
