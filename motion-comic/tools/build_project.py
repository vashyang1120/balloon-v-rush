# 由 opening-test v0.2.0 的常數產生專案 JSON（只在開發時使用）
import json, os
def K(m,o,v,e=None):
    k={"m":m,"o":o,"v":v}
    if e: k["e"]=e
    return k
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
  "note":"移植自 opening-test v0.2.0 第二幕（已驗收）",
  "durationMs":3560,
  "transitionIn":{"type":"fadeBlack","outMs":160,"holdMs":60,"inMs":240},
  "markers":[
    {"id":"shown","label":"淡入完成（2A 完全可見）","t":240},
    {"id":"switch","label":"2A → 2B 開始","t":1640},
    {"id":"bShown","label":"2B 完全取代 2A","t":1760}
  ],
  "layers":[
    {"id":"s2_bg","name":"第二幕背景","type":"image","role":"background","asset":"scene2_bg","visible":True},
    {"id":"s2_vbed","name":"小V＋床組（2A→2B）","type":"swapPair","role":"character","visible":True,
     "assetA":"scene2_char_2a","assetB":"scene2_char_2b",
     "switchFrom":{"m":"switch","o":0},"switchTo":{"m":"bShown","o":0},
     "foregroundScale":0.56,"foregroundX":0.255,"foregroundY":0.945,
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
# SCENE3：第三幕「小V走向窗邊」集中設定（v0.2.0 新增）
#   所有時間都是「本幕時間」（毫秒，0＝第三幕畫面開始淡入）
# =====================================================================
SCENE3 = {
  # ---- 03-00 入場：從第二幕切入（淡黑，極短）----
  "TRANS_OUT": 120,        # 第二幕淡到黑
  "TRANS_HOLD": 40,        # 全黑
  "TRANS_IN": 200,         # 淡入第三幕（同時也是 03-01 的開始）
  # ---- 節拍 ----
  "LOOK_MS": 1300,         # 03-01 疑惑看窗外（3A）持續時間
  "CROSS_MS": 220,         # 03-03 3A → 3B 疊化時間
  "HOLD_MS": 1300,         # 03-04 好奇停留（3B）
  # ---- 03-02 對話 ----
  "DLG1_DELAY": 450,       # 03-01 開始後幾毫秒出現第一句
  "DLG1_TEXT": "這裡是哪裡...？",
  "DLG2_ENABLED": False,   # 第二句（預設關閉＝方案 A：只保留第一句）
  "DLG2_DELAY": 150,       # 疊化完成後幾毫秒出現第二句
  "DLG2_TEXT": "氣球森林...?",
  # ---- 窗外層（遠景，可獨立運鏡）----
  "OUT_SCALE_START": 1.08, # 初始推拉值（寬度＝舞台寬 × 這個數）
  "OUT_SCALE_END": 1.09,   # 結束時（非常輕微的慢推）
  "OUT_X": 0.645,          # 中心點位置：讓「氣球森林」指示牌完整落在主拱窗內（左右各留邊距）
  "OUT_X_GUIDE": 0.649,    # 03-03 轉頭時微微平移（+0.4% 畫面寬，導視到左側指示牌）
  "OUT_Y": 0.5,
  # ---- 人物（3A / 3B 共用定位，錨點＝皮帶中央）----
  "CHAR_SCALE": 0.46,
  "CHAR_X": 0.66,
  "CHAR_Y": 0.86,
  "CHAR_ANCHOR_X": round(556/1122, 4),
  "CHAR_ANCHOR_Y": round(770/1402, 4),
  # 3B → 3A 對位：兩張圖的「皮帶到鞋底」距離相同（599 / 598px），以皮帶中央對齊
  "B_ALIGN": {"scale":1.0, "x":-2, "y":48},
}
c3=SCENE3
t_look = c3["TRANS_IN"]
t_cross = t_look + c3["LOOK_MS"]
t_cur = t_cross + c3["CROSS_MS"]
t_end = t_cur + c3["HOLD_MS"]
scene3 = {
  "id":"intro_scene03","name":"小V走向窗邊","status":"ready",
  "note":"v0.2.0 正式實作：窗外／窗框／人物 3A→3B 分層，疑惑 → 注意到氣球森林指示牌",
  "durationMs":t_end,
  "transitionIn":{"type":"fadeBlack","outMs":c3["TRANS_OUT"],"holdMs":c3["TRANS_HOLD"],"inMs":c3["TRANS_IN"]},
  "markers":[
    {"id":"s3_look","label":"03-01 疑惑看窗外（淡入完成）","t":t_look},
    {"id":"s3_cross","label":"03-03 注意到指示牌（3A→3B 疊化開始）","t":t_cross},
    {"id":"s3_curious","label":"03-04 好奇停留（疊化完成）","t":t_cur}],
  "layers":[
    {"id":"s3_outside","name":"窗外景色（可獨立替換）","type":"image","role":"far","asset":"intro_scene03_outside","visible":True,
     "x":c3["OUT_X"],"y":c3["OUT_Y"],"scale":c3["OUT_SCALE_START"],"anchorX":0.5,"anchorY":0.5,"opacity":1,"rotation":0,
     "tracks":{
       "scale":[{"m":"start","o":0,"v":c3["OUT_SCALE_START"],"label":"初始推拉值"},
                {"m":"end","o":0,"v":c3["OUT_SCALE_END"],"e":"out","label":"非常輕微的慢推（到本幕結束）"}],
       "x":[{"m":"start","o":0,"v":c3["OUT_X"],"label":"初始位置"},
            {"m":"s3_cross","o":0,"v":c3["OUT_X"],"label":"轉頭前維持不動"},
            {"m":"s3_curious","o":600,"v":c3["OUT_X_GUIDE"],"e":"inOut","label":"微平移：把視線帶到左側指示牌"}]}},
    {"id":"s3_window","name":"窗框／室內前景","type":"image","role":"foreground","asset":"intro_scene03_window","visible":True,
     "x":0.5,"y":0.5,"scale":1,"anchorX":0.5,"anchorY":0.5,"opacity":1,"rotation":0,"tracks":{}},
    {"id":"s3_v","name":"小V（3A 疑惑 → 3B 好奇）","type":"swapPair","role":"character","visible":True,
     "assetA":"intro_scene03_v_confused","assetB":"intro_scene03_v_curious","labelA":"3A 疑惑","labelB":"3B 好奇",
     "switchFrom":{"m":"s3_cross","o":0},"switchTo":{"m":"s3_curious","o":0},
     "foregroundScale":c3["CHAR_SCALE"],"foregroundX":c3["CHAR_X"],"foregroundY":c3["CHAR_Y"],
     "foregroundAnchorX":c3["CHAR_ANCHOR_X"],"foregroundAnchorY":c3["CHAR_ANCHOR_Y"],
     "bAlign":dict(c3["B_ALIGN"], note="3B 圖上的點 (u,v) → 3A 圖上 (u*scale+x, v*scale+y)。兩張圖人物大小相同（皮帶到鞋底 599／598px），以皮帶中央對齊；3B 的頭比 3A 低約 50px 是「往左下看」的姿勢，不是誤差。"),
     "look":{"brightness":1,"saturate":1,"warmth":0,"opacity":1},
     "shadow":{"opacity":0,"color":"#3a1d08","bedFeet":[],"shoesA":[],"shoesB":[]}}],
  "camera":{"originX":0.5,"originY":0.5,"tracks":{}},
  "effects":{},"tracks":{},
  "dialogues":[
    {"id":"s3_d1","speaker":"小V","text":c3["DLG1_TEXT"],"styleType":"rpg_box_no_portrait",
     "at":{"m":"s3_look","o":c3["DLG1_DELAY"]},"mode":"auto","autoMs":0,"charMs":55,"after":"resume","enabled":True},
    {"id":"s3_d2","speaker":"小V","text":c3["DLG2_TEXT"],"styleType":"rpg_box_no_portrait",
     "at":{"m":"s3_curious","o":c3["DLG2_DELAY"]},"mode":"auto","autoMs":0,"charMs":70,"after":"resume","enabled":c3["DLG2_ENABLED"],
     "note":"選用的第二句。勾選「啟用」即可開啟；開啟後會接替第一句顯示。"}]
}
scene4 = draft(4,"intro_scene04","氣球森林入口",[])
scene5 = draft(5,"intro_scene05","氣球森林小徑",[
  {"id":"s5_d1","speaker":"小V","text":"不是氣球森林嗎……怎麼沒看到什麼氣球……？","at":{"m":"start","o":1500},
   "mode":"wait","autoMs":3000,"charMs":60,"after":"resume","enabled":True,"draft":True,"styleType":"rpg_box_no_portrait"}])
project = {
  "schemaVersion":"1.0",
  "projectId":"party-island-opening",
  "title":"派對島大作戰・開場",
  "editorVersion":"motion-comic-editor-v0.2.0-test-1",
  "contentVersion":2,
  "stage":{"width":1672,"height":941,"fit":"contain"},
  "assets":{
    "scene1_bg":{"src":"assets/scene1_bg.png","label":"第一幕背景","width":1672,"height":941},
    "scene2_bg":{"src":"assets/scene2_bg.png","label":"第二幕背景","width":1672,"height":941},
    "scene2_char_2a":{"src":"assets/scene2_char_2a.png","label":"2A 揉眼（人物＋床）","width":1448,"height":1086},
    "scene2_char_2b":{"src":"assets/scene2_char_2b.png","label":"2B 驚訝（人物＋床）","width":1484,"height":1060},
    "intro_scene03_outside":{"src":"assets/intro_scene03_outside.png","label":"第三幕 窗外景色","width":1672,"height":941},
    "intro_scene03_window":{"src":"assets/intro_scene03_window.png","label":"第三幕 窗框／室內前景","width":1672,"height":941},
    "intro_scene03_v_confused":{"src":"assets/intro_scene03_v_confused.png","label":"第三幕 3A 小V 疑惑","width":1122,"height":1402},
    "intro_scene03_v_curious":{"src":"assets/intro_scene03_v_curious.png","label":"第三幕 3B 小V 好奇","width":1145,"height":1374}},
  "scenes":[scene1,scene2,scene3,scene4,scene5]
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
out='motion-comic/projects'
# v0.2.0：不再覆寫 v0.1.0 的基準檔 party-island-opening-baseline.json，另外產生 v0.2.0 基準檔
for name in ['party-island-opening','party-island-opening-baseline-v0.2.0']:
    s=json.dumps(project,ensure_ascii=False,indent=2)
    open(f'{out}/{name}.json','w',encoding='utf8').write(s+'\n')
    var='MC_BASELINE_V2' if 'baseline' in name else 'MC_PROJECT'
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
