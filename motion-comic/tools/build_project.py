# 由 opening-test v0.2.0 的常數產生專案 JSON（只在開發時使用）
import json, os
def K(m,o,v,e=None):
    k={"m":m,"o":o,"v":v}
    if e: k["e"]=e
    return k
# =====================================================================
# SCENE2（v0.3.0 修改）：床＋小V組放大、往左、靠近鏡頭（左側出框）；2A→2B 真正交叉淡化
#   床畫在人物圖 scene2_char_2a/2b 裡（不是背景），所以可以整組放大移動；背景 scene2_bg 沒有床，不動
# =====================================================================
SCENE2 = {
  "BED_SCALE": 0.72,   # 2A 圖寬 ÷ 舞台寬（v0.2.0：0.56）→ 床與小V放大約 1.29 倍
  "BED_X": 0.200,      # 錨點（前側兩隻床腳著地點中間）的水平位置（v0.2.0：0.255）→ 往左，床尾超出畫面左側
  "BED_Y": 0.975,      # 錨點的垂直位置（v0.2.0：0.945）→ 床腳更靠近畫面下緣＝更靠近鏡頭
  "SWITCH_AT": 1640,   # 2A 揉眼停留到這裡（同 v0.2.0）
  "CROSS_MS": 600,     # 2A→2B 交叉淡化長度（v0.2.0：120ms，看起來像換圖）
  "HOLD_B_MS": 1800,   # 2B 驚訝停留（同 v0.2.0）
}
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
  "note":"v0.3.0：床＋小V放大、往左、局部出框（床畫在人物圖裡，可整組移動）；2A→2B 改為真正交叉淡化 600ms",
  "durationMs":SCENE2["SWITCH_AT"]+SCENE2["CROSS_MS"]+SCENE2["HOLD_B_MS"],
  "transitionIn":{"type":"fadeBlack","outMs":160,"holdMs":60,"inMs":240},
  "markers":[
    {"id":"shown","label":"淡入完成（2A 完全可見）","t":240},
    {"id":"switch","label":"2A → 2B 開始（交叉淡化）","t":SCENE2["SWITCH_AT"]},
    {"id":"bShown","label":"2B 完全取代 2A","t":SCENE2["SWITCH_AT"]+SCENE2["CROSS_MS"]}
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
  "camera":{"originX":0.40,"originY":0.52,"tracks":{
    "scale":[K("switch",0,1),K("switch",1400,1.025,"out")]}},
  "effects":{},
  "tracks":{},
  "dialogues":[]
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
# SCENE4A（v0.3.0 新增）：第三人稱、從小V後方看他走進霧中的森林小徑（沒有台詞）
#   poseSeq：近景背影 → 遠景；x／y＝腳底位置、scale＝人物身高 ÷ 舞台高度
# =====================================================================
A4 = {
  "IN": {"type":"fadeBlack","outMs":300,"holdMs":200,"inMs":600},
  "T_WALK": 600, "T_SWAP": 3200, "T_FAR": 3600, "T_DEEP": 6200, "T_GONE": 8000, "DUR": 8700,
  # 腳底路徑（沿著小徑往消失點 0.56, 0.63 走）
  "X": [0.605, 0.584, 0.578, 0.566, 0.562], "Y": [1.090, 0.860, 0.832, 0.716, 0.674],
  "S": [0.760, 0.400, 0.368, 0.190, 0.100],   # 身高 ÷ 舞台高：越走越遠越小
}
scene4a = {
  "id":"intro_scene04a","name":"第四幕A：深入氣球森林","status":"ready",
  "note":"v0.3.0：從小V後方看他走過木牌、沿小徑走進霧裡（近景→遠景交叉淡化；霧用霧插件產生，不新增圖片）",
  "durationMs":A4["DUR"], "transitionIn":A4["IN"],
  "markers":[
    {"id":"a_walk","label":"4A-1 淡入完成，小V開始往深處走（近景）","t":A4["T_WALK"]},
    {"id":"a_swap","label":"4A-2 近景 → 遠景開始","t":A4["T_SWAP"]},
    {"id":"a_far","label":"4A-2 遠景完全取代近景","t":A4["T_FAR"]},
    {"id":"a_deep","label":"4A-3 開始被霧吞沒","t":A4["T_DEEP"]},
    {"id":"a_gone","label":"4A-3 消失在霧中","t":A4["T_GONE"]}],
  "layers":[
    {"id":"a_bg","name":"森林小徑背景","type":"image","role":"background","asset":"intro_scene04a_bg","visible":True},
    {"id":"a_v","name":"小V（近景背影 → 遠景）","type":"poseSeq","role":"character","visible":True,"crossfade":"dissolve",
     "poses":[{"asset":"intro_scene04a_v_near","label":"近景","footX":446.5,"footY":1518,"figTop":13,"figBottom":1518,"scaleAdj":1},
              {"asset":"intro_scene04a_v_far","label":"遠景","footX":449,"footY":1457,"figTop":87,"figBottom":1457,"scaleAdj":1}],
     "switches":[{"from":{"m":"a_swap","o":0},"to":{"m":"a_far","o":0}}],
     "x":A4["X"][0],"y":A4["Y"][0],"scale":A4["S"][0],"opacity":1,"rotation":0,"blur":0,
     "sway":{"periodMs":1100,"x":0,"y":0.025,"rot":0.6,"relative":True},
     "tracks":{
       "x":[{"m":"start","o":0,"v":A4["X"][0],"label":"近景起點"},{"m":"a_swap","o":0,"v":A4["X"][1],"e":"out"},{"m":"a_far","o":0,"v":A4["X"][2]},
            {"m":"a_deep","o":0,"v":A4["X"][3],"e":"out"},{"m":"a_gone","o":0,"v":A4["X"][4],"e":"out","label":"霧中"}],
       "y":[{"m":"start","o":0,"v":A4["Y"][0],"label":"近景起點（靠近鏡頭）"},{"m":"a_swap","o":0,"v":A4["Y"][1],"e":"out"},{"m":"a_far","o":0,"v":A4["Y"][2]},
            {"m":"a_deep","o":0,"v":A4["Y"][3],"e":"out"},{"m":"a_gone","o":0,"v":A4["Y"][4],"e":"out","label":"霧中"}],
       "scale":[{"m":"start","o":0,"v":A4["S"][0],"label":"近景身高"},{"m":"a_swap","o":0,"v":A4["S"][1],"e":"out"},{"m":"a_far","o":0,"v":A4["S"][2]},
                {"m":"a_deep","o":0,"v":A4["S"][3],"e":"out"},{"m":"a_gone","o":0,"v":A4["S"][4],"e":"out","label":"很小、很遠"}],
       "opacity":[{"m":"a_deep","o":0,"v":1,"label":"還清楚"},{"m":"a_gone","o":0,"v":0,"e":"in","label":"被霧吞沒"}],
       "blur":[{"m":"a_deep","o":0,"v":0},{"m":"a_gone","o":0,"v":0.004,"e":"in","label":"被霧模糊"}]}}],
  "camera":{"originX":0.56,"originY":0.62,"tracks":{
    "scale":[{"m":"start","o":0,"v":1.0,"label":"原始鏡位"},{"m":"end","o":0,"v":1.05,"e":"inOut","label":"非常輕微的前推"}]}},
  "effects":{
    "breath":{"enabled":True,"params":{"BREATH_Y":0.0025,"BREATH_X":0.0012,"BREATH_ROT":0.06,"BREATH_SCALE":0.002,"BREATH_PERIOD":4.6,"BREATH_CLOCK":"ambient"}},
    "fog":{"enabled":True,"params":{"CX":0.56,"CY":0.60,"RX":0.30,"RY":0.20,"CORE":0.90,"HAZE":0.10,"COLOR":"236, 240, 234"}}},
  "tracks":{
    "breath":[{"m":"start","o":0,"v":1,"label":"輕微呼吸感"}],
    "overscan":[{"m":"start","o":0,"v":1.012,"label":"預留放大（呼吸不露邊）"}],
    "fog":[{"m":"start","o":0,"v":0.12,"label":"遠處薄霧"},{"m":"a_deep","o":0,"v":0.35,"e":"inOut"},
           {"m":"a_gone","o":0,"v":0.85,"e":"inOut","label":"濃霧吞沒小V"},{"m":"end","o":0,"v":0.9}]},
  "dialogues":[]
}

# =====================================================================
# SCENE4B（v0.3.0 新增）：90° 側面鏡位；小V由左往右：步行 → 回頭仰望 → 抬頭張望（沒有台詞）
#   圖層順序（下→上）：背景（遠景，慢移）→ 小V（poseSeq）→ 前景失焦樹木（快移）＝視差
# =====================================================================
B4 = {
  "IN": {"type":"crossfade","durMs":700},
  "T_TURN": 3000, "T_BACK": 3400, "T_UP": 6000, "T_UPSHOWN": 6400, "T_PUSH": 8800, "DUR": 10400,
  "X": [0.080, 0.400, 0.425, 0.465, 0.490, 0.760],   # 腳底 x：start、turn、back、up、upShown、end（連續的一條路徑）
  "FOOT_Y": 0.735,
  "S0": 0.400, "S1": 0.420,                          # 身高 ÷ 舞台高：整段只變大 5%（輕微遠近）
}
scene4b = {
  "id":"intro_scene04b","name":"第四幕B：90° 側面森林小徑（被窺視感）","status":"ready",
  "note":"v0.3.0：同一個小V依時間換姿勢 walk → look_back_up → look_up，腳底錨點連續左→右；前景失焦樹木在小V之前、移動較快",
  "durationMs":B4["DUR"], "transitionIn":B4["IN"],
  "markers":[
    {"id":"b_turn","label":"4B-2 步行 → 回頭仰望 開始","t":B4["T_TURN"]},
    {"id":"b_back","label":"4B-2 回頭仰望（放慢）","t":B4["T_BACK"]},
    {"id":"b_up","label":"4B-3 回頭仰望 → 抬頭張望 開始","t":B4["T_UP"]},
    {"id":"b_upShown","label":"4B-3 抬頭張望，繼續往右","t":B4["T_UPSHOWN"]},
    {"id":"b_push","label":"鏡頭推近小V（銜接第一人稱）","t":B4["T_PUSH"]}],
  "layers":[
    {"id":"b_bg","name":"側面森林背景（遠景，慢移）","type":"image","role":"far","asset":"intro_scene04b_bg","visible":True,
     "x":0.51,"y":0.5,"scale":1.06,"anchorX":0.5,"anchorY":0.5,"opacity":1,"rotation":0,
     "tracks":{"x":[{"m":"start","o":0,"v":0.51,"label":"背景慢移（視差：最慢）"},{"m":"end","o":0,"v":0.49}]}},
    {"id":"b_v","name":"小V（步行 → 回頭仰望 → 抬頭張望）","type":"poseSeq","role":"character","visible":True,"crossfade":"dissolve",
     "poses":[{"asset":"intro_scene04b_v_walk","label":"1 步行","footX":549,"footY":1405,"figTop":59,"figBottom":1405,"scaleAdj":1},
              {"asset":"intro_scene04b_v_look_back_up","label":"2 回頭仰望","footX":569,"footY":1504,"figTop":32,"figBottom":1504,"scaleAdj":1},
              {"asset":"intro_scene04b_v_look_up","label":"3 抬頭張望","footX":601,"footY":1388,"figTop":34,"figBottom":1388,"scaleAdj":1}],
     "switches":[{"from":{"m":"b_turn","o":0},"to":{"m":"b_back","o":0}},{"from":{"m":"b_up","o":0},"to":{"m":"b_upShown","o":0}}],
     "x":B4["X"][0],"y":B4["FOOT_Y"],"scale":B4["S0"],"opacity":1,"rotation":0,"blur":0,
     "sway":{"periodMs":1000,"x":0,"y":0.012,"rot":0,"relative":True},
     "tracks":{
       "x":[{"m":"start","o":0,"v":B4["X"][0],"label":"從左側（前景樹後）走出"},{"m":"b_turn","o":0,"v":B4["X"][1]},
            {"m":"b_back","o":0,"v":B4["X"][2],"label":"回頭仰望：放慢"},{"m":"b_up","o":0,"v":B4["X"][3]},
            {"m":"b_upShown","o":0,"v":B4["X"][4]},{"m":"end","o":0,"v":B4["X"][5],"label":"繼續往右探索"}],
       "scale":[{"m":"start","o":0,"v":B4["S0"]},{"m":"end","o":0,"v":B4["S1"],"label":"輕微變近（+5%）"}]}},
    {"id":"b_fg","name":"前景失焦樹木（最前，快移）","type":"image","role":"foreground","asset":"intro_scene04b_fg_trees","visible":True,
     "x":0.57,"y":0.5,"scale":1.14,"anchorX":0.5,"anchorY":0.5,"opacity":1,"rotation":0,
     "tracks":{"x":[{"m":"start","o":0,"v":0.57,"label":"前景快移（視差：最快）"},{"m":"end","o":0,"v":0.43}]}}],
  "camera":{"originX":0.76,"originY":0.40,"tracks":{
    "scale":[{"m":"b_push","o":0,"v":1.0,"label":"推近開始"},{"m":"end","o":0,"v":1.10,"e":"in","label":"推近小V，銜接第一人稱"}]}},
  "effects":{},"tracks":{},"dialogues":[]
}

# =====================================================================
# SCENE5（v0.3.0 新增）：第一人稱東張西望（只有一張背景；鏡頭 x／y／旋轉的關鍵影格＋呼吸）
#   鏡頭 x 正值＝畫面往右移＝視線往左看；y 正值＝畫面往下移＝視線往上看
#   安全範圍：鏡頭放大 1.16 → 每邊多 8%；|x| ≤ 0.066、|y| ≤ 0.05、旋轉 ≤ 0.4° 時不露邊（含呼吸）
# =====================================================================
C5 = {
  "IN": {"type":"crossfade","durMs":800},
  "SCALE": 1.16,
  # 視線關鍵點（本幕毫秒）
  "T_SETTLE": 1100, "T_LEFT": 2700, "T_LEFTUP": 4200, "T_D1": 4500,
  "T_RIGHT": 7300, "T_RIGHTDOWN": 8900, "T_RIGHTUP": 10800, "T_D2": 11100, "T_END_LOOK": 13000, "DUR": 14000,
}
k5 = lambda m, o, v, e=None, label=None: dict({"m":m,"o":o,"v":v}, **({"e":e} if e else {}), **({"label":label} if label else {}))
scene5 = {
  "id":"intro_scene05","name":"第五幕：第一人稱森林探索","status":"ready",
  "note":"v0.3.0：只有一張背景，靠鏡頭左右上下張望＋呼吸；兩句台詞穿插在運鏡中（左上看完出第一句、右上看完出第二句）",
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
    "scale":[k5("start",0,C5["SCALE"],None,"放大 1.16（預留張望空間）")],
    "x":[k5("start",0,0.000,None,"5-1 前方"), k5("c_settle",0,0.000),
         k5("c_left",0,0.050,"inOut","5-2 往左"), k5("c_leftUp",0,0.062,"inOut","5-3 左上"), k5("c_d1",0,0.062,None,"第一句：停住（只剩呼吸）"),
         k5("c_right",0,-0.052,"inOut","5-5 轉向右"), k5("c_rightDown",0,-0.062,"inOut","5-6 右下"),
         k5("c_rightDown",950,-0.066,"inOut","往上抬時視線微微外擺（曲線）"), k5("c_rightUp",0,-0.060,"inOut","5-7 右上"),
         k5("c_d2",0,-0.060,None,"第二句：停住"), k5("c_endLook",0,-0.020,"inOut","視線收回")],
    "y":[k5("start",0,0.030,None,"承接 4B 抬頭（稍微往上）"), k5("c_settle",0,0.012,"inOut","回到前方"),
         k5("c_left",0,0.008,"inOut"), k5("c_leftUp",0,0.050,"inOut","往上看樹冠"), k5("c_d1",0,0.050),
         k5("c_d1",1400,0.012,"inOut","轉頭途中視線先回到水平（曲線）"), k5("c_right",0,0.010,"inOut"),
         k5("c_rightDown",0,-0.048,"inOut","往下看小徑"), k5("c_rightUp",0,0.048,"inOut","往上看高處"),
         k5("c_d2",0,0.048), k5("c_endLook",0,0.015,"inOut")],
    "rotation":[k5("start",0,0), k5("c_left",0,-0.15,"inOut"), k5("c_leftUp",0,-0.35,"inOut","頭微微側傾"), k5("c_d1",0,-0.35),
                k5("c_right",0,0.15,"inOut"), k5("c_rightDown",0,0.30,"inOut"), k5("c_rightUp",0,0.40,"inOut"), k5("c_d2",0,0.40),
                k5("c_endLook",0,0.10,"inOut")]}},
  "effects":{
    "breath":{"enabled":True,"params":{"BREATH_Y":0.0035,"BREATH_X":0.0018,"BREATH_ROT":0.09,"BREATH_SCALE":0.0025,"BREATH_PERIOD":4.4,"BREATH_CLOCK":"ambient"}}},
  "tracks":{
    "breath":[k5("start",0,1,None,"呼吸感（對話時也持續）")],
    "exposure":[k5("start",0,1), k5("c_endLook",200,1), k5("end",0,0,"in","結尾淡出（之後接飛行屋地圖／第一關；目前未接通）")]},
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
  "editorVersion":"motion-comic-editor-v0.3.0-test-1",
  "contentVersion":3,
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
  "scenes":[scene1,scene2,scene3,scene4a,scene4b,scene5]
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
scene2['camera']['tracks']['scale'][0]['label']='推近開始（2B 出現時）'
scene2['camera']['tracks']['scale'][1]['label']='推近完成'
out=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','projects')
# v0.3.0：不覆寫 v0.1.0／v0.2.0 的基準檔，另外產生 v0.3.0 基準檔
for name in ['party-island-opening','party-island-opening-baseline-v0.3.0']:
    s=json.dumps(project,ensure_ascii=False,indent=2)
    open(f'{out}/{name}.json','w',encoding='utf8').write(s+'\n')
    var='MC_BASELINE_V3' if 'baseline' in name else 'MC_PROJECT'
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
