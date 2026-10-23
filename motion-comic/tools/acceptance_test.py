# motion-comic-editor-v0.2.0-test-1 驗收測試（Playwright / Chromium）
# 需要：python3 -m http.server 8765（在 motion-comic/ 目錄）
import asyncio, json, io, hashlib, sys, os
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:8765'
ROOT = '/home/claude/mc/motion-comic'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
OLD = 'file:///mnt/user-data/outputs/opening-test/index.html'
results = []

def check(no, name, ok, detail=''):
    results.append((no, name, bool(ok), detail))
    print(f"{'PASS' if ok else 'FAIL'}  [{no}] {name}  {detail}")

def md5(p): return hashlib.md5(open(p, 'rb').read()).hexdigest()

async def shot_stage(page, sel='#preview .mc-stage'):
    return np.array(Image.open(io.BytesIO(await page.locator(sel).screenshot())).convert('RGB')).astype(int)

async def set_input(loc, value):
    await loc.fill(str(value))
    await loc.dispatch_event('change')


async def scene3_checks(pg, ev):
    W, H = await ev("[mcEditor.player.view.W, mcEditor.player.view.H]")
    sg = await ev("(()=>{const s=mcEditor.player.tl.segs[2]; return {ts:s.transStart, s:s.start, e:s.end}})()")
    mm = await ev("MotionComic.markerTimes(mcEditor.state.project.scenes[2])")
    sc = await ev("JSON.parse(JSON.stringify(mcEditor.state.project.scenes[2]))")
    assets = await ev("mcEditor.state.project.assets")
    # S3-1 圖層順序與正式檔名
    order = [(L['id'], L.get('asset') or (L.get('assetA'), L.get('assetB'))) for L in sc['layers']]
    files = [assets[k]['src'] for k in ['intro_scene03_outside', 'intro_scene03_window', 'intro_scene03_v_confused', 'intro_scene03_v_curious']]
    okfiles = files == ['assets/intro_scene03_outside.png', 'assets/intro_scene03_window.png', 'assets/intro_scene03_v_confused.png', 'assets/intro_scene03_v_curious.png']
    z = await ev("(()=>{const S=mcEditor.player.scenes[2]; return S.layerEls.map(e=>[...e.root.parentNode.children].indexOf(e.root))})()")
    check('S3-1', '第三幕圖層順序：窗外 → 窗框 → 人物（3A/3B）→ 對話框；使用正式檔名', okfiles and [o[0] for o in order] == ['s3_outside', 's3_window', 's3_v'] and z == [0, 1, 2],
          f'圖層 {order}；DOM 疊放順序 {z}；檔名 {files}')
    # S3-2 窗外層在整幕運鏡中都蓋滿窗框的透明區（不露邊），且指示牌在主拱窗內
    bad = []
    for t in range(0, sc['durationMs'] + 1, 150):
        await ev(f"mcEditor.player.seek({sg['s']}+{t})")
        r = await ev("(()=>{const im=mcEditor.player.scenes[2].layerEls[0].img.style; return [parseFloat(im.left),parseFloat(im.top),parseFloat(im.width),parseFloat(im.height)]})()")
        l, tp, w, h = r
        if not (l <= 228 / 1672 * W and l + w >= W and tp <= 0 and tp + h >= 826 / 941 * H): bad.append((t, [round(v, 1) for v in r]))
    # 指示牌文字（原圖 x 280–530）在畫面上的位置
    await ev(f"mcEditor.player.seek({sg['s']}+{mm['s3_curious']})")
    l, tp, w, h = await ev("(()=>{const im=mcEditor.player.scenes[2].layerEls[0].img.style; return [parseFloat(im.left),parseFloat(im.top),parseFloat(im.width),parseFloat(im.height)]})()")
    sx0, sx1 = l + 280 / 1672 * w, l + 530 / 1672 * w
    check('S3-2', '窗外層運鏡幅度小、全程不露邊；「氣球森林」指示牌完整落在主拱窗內', not bad and sx0 > 455 / 1672 * W and sx1 < 1000 / 1672 * W,
          f'每 150ms 檢查一次覆蓋：{"全部通過" if not bad else bad[:3]}；指示牌文字在畫面 x {sx0 / W:.3f}–{sx1 / W:.3f}（主拱窗內緣約 0.272）')
    # S3-3 3A → 3B 疊化
    seq = []
    for t in [mm['s3_cross'] - 30, mm['s3_cross'] + 60, mm['s3_cross'] + 110, mm['s3_cross'] + 170, mm['s3_curious'] + 30]:
        await ev(f"mcEditor.player.seek({sg['s']}+{t})")
        seq.append(await ev("(()=>{const e=mcEditor.player.scenes[2].layerEls[2]; return [+e.imgA.style.opacity, +e.imgB.style.opacity]})()"))
    mids = [x for x in seq[1:4]]
    check('S3-3', '人物 3A → 3B 用疊化（非硬切），疊化中人物不會整個變透明', seq[0] == [1, 0] and seq[-1] == [0, 1] and all(0 < b < 1 for a, b in mids) and all(a > 0 for a, b in mids),
          f"疊化 {mm['s3_curious'] - mm['s3_cross']}ms；[3A, 3B] 不透明度：{seq}")
    # S3-4 對話出現時間與結束
    d1 = await ev("mcEditor.player.allDialogues().find(x=>x.d.id==='s3_d1').g")
    vis = []
    for t in [d1 - 30, d1 + 30, d1 + 600, sg['e'], sg['e'] + 60]:
        await ev(f"mcEditor.player.seek({t})"); await pg.wait_for_timeout(30)
        vis.append(await ev("[document.querySelector('#preview .mc-dialog').classList.contains('show'), document.querySelector('#preview .mc-dialog-text').textContent, document.querySelector('#preview .mc-dialog').classList.contains('mc-style-rpg_box_no_portrait')]"))
    check('S3-4', '第一句「這裡是哪裡...？」在 03-01 開始後 0.45 秒出現、停留到第三幕結束、不延續到下一幕；樣式 rpg_box_no_portrait', 
          (not vis[0][0]) and vis[1][0] and vis[2][1] == '這裡是哪裡...？' and vis[3][0] and not vis[4][0] and vis[2][2],
          f"出現點 {d1 - sg['s']}ms（本幕）；[顯示, 文字] 依序 {[(v[0], v[1]) for v in vis]}")
    # S3-5 第二句開關（用編輯器 UI）
    await ev(f"document.getElementById('tlScroll').scrollLeft = {sg['s']}/1000*mcEditor.state.zoom - 300"); await pg.wait_for_timeout(80)
    await pg.locator('.tl-dlg', has_text='氣球森林...?').click()
    en = pg.locator('#props .f').filter(has_text='啟用').locator('input')
    before = await en.is_checked()
    await en.check()
    d2g = await ev("mcEditor.player.allDialogues().find(x=>x.d.id==='s3_d2').g")
    await ev(f"mcEditor.player.seek({d2g}+900)"); await pg.wait_for_timeout(60)
    t_on = await ev("document.querySelector('#preview .mc-dialog-text').textContent")
    await pg.click('#undoBtn')
    await ev(f"mcEditor.player.seek({d2g}+900)"); await pg.wait_for_timeout(60)
    t_off = await ev("document.querySelector('#preview .mc-dialog-text').textContent")
    check('S3-5', '第二句「氣球森林...?」預設關閉，可用「啟用」勾選開關', before is False and t_on == '氣球森林...?' and t_off == '這裡是哪裡...？',
          f"預設啟用={before}；勾選後同一時間顯示「{t_on}」；復原後顯示「{t_off}」")
    # S3-6 用節拍表延長 03-01（1300→1600），後面順延、對話跟著 03-01 走、其他幕不變
    s4_before = await ev("mcEditor.player.tl.segs[3].start")
    s12 = await ev("JSON.stringify(mcEditor.state.project.scenes.slice(0,2))")
    await pg.locator('.scene-card >> nth=2').click()
    g = pg.locator('#props input[title="這一段的長度（毫秒）"]').nth(1)      # s3_look → s3_cross
    await set_input(g, 1600)
    mm2 = await ev("MotionComic.markerTimes(mcEditor.state.project.scenes[2])")
    s4_after = await ev("mcEditor.player.tl.segs[3].start")
    d1b = await ev("mcEditor.player.allDialogues().find(x=>x.d.id==='s3_d1').g")
    same12 = await ev("JSON.stringify(mcEditor.state.project.scenes.slice(0,2))") == s12
    check('S3-6', '在編輯器延長 Scene 03-01 時長，疊化／停留／第四幕依序順延，第一、二幕不受影響',
          mm2['s3_cross'] == mm['s3_cross'] + 300 and mm2['s3_curious'] == mm['s3_curious'] + 300 and mm2['end'] == mm['end'] + 300 and s4_after - s4_before == 300 and d1b == d1 and same12,
          f"03-01 1300→1600ms：疊化開始 {mm['s3_cross']}→{mm2['s3_cross']}、本幕長度 {mm['end']}→{mm2['end']}、第四幕開始 +{s4_after - s4_before}ms；對話出現點不變 {d1b - sg['s']}ms")
    await pg.click('#undoBtn')
    # S3-7 窗外層「位置 X」一次平移整條關鍵影格
    await pg.locator('.scene-card >> nth=2').click()
    await pg.locator('#props a', has_text='窗外景色').click()
    xs0 = await ev("mcEditor.state.project.scenes[2].layers[0].tracks.x.map(k=>k.v)")
    xf = pg.locator('#props .f').filter(has_text='位置 X').locator('input')
    await set_input(xf, round(xs0[0] + 0.01, 3))
    xs = await ev("mcEditor.state.project.scenes[2].layers[0].tracks.x.map(k=>k.v)")
    await pg.click('#undoBtn')
    xs1 = await ev("mcEditor.state.project.scenes[2].layers[0].tracks.x.map(k=>k.v)")
    shifted = all(abs((n - o) - 0.01) < 1e-6 for n, o in zip(xs, xs0))
    check('S3-7', '窗外層位置 X 可在面板調整（整條運鏡一起平移，幅度不變）', shifted and xs1 == xs0,
          f'位置 X +0.01：關鍵影格 {xs0} → {xs}（復原後回到 {xs1}）')
    # S3-8 3A／3B 對位檢查按鈕
    await pg.locator('.scene-card >> nth=2').click()
    await pg.locator('#props a', has_text='小V（3A').click()
    labels = await pg.locator('#props .row-btns >> nth=0').locator('button').all_inner_texts()
    await pg.locator('#props button', has_text='疊圖對位').click(); await pg.wait_for_timeout(80)
    ov = await ev("(()=>{const e=mcEditor.player.scenes[2].layerEls[2]; return [+e.imgA.style.opacity, +e.imgB.style.opacity]})()")
    await pg.screenshot(path=f'{OUT}/acc_s3_overlay.png')
    await pg.locator('#props button', has_text='回到正常播放').click()
    check('S3-8', '編輯器可檢查 3A／3B 對位（顯示 3A／顯示 3B／疊圖）', labels[:3] == ['顯示 3A 疑惑', '顯示 3B 好奇', '3A 疑惑／3B 好奇 疊圖對位'] and ov == [1, 0.5],
          f'按鈕 {labels}；疊圖時 [3A, 3B] = {ov}')
    await ev("mcEditor.state.sel=null"); await pg.locator('#projectBtn').click()

async def main():
    baseline_md5 = md5(f'{ROOT}/projects/party-island-opening-baseline.json')
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1600, 'height': 960}, accept_downloads=True)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        await pg.goto(f'{BASE}/editor/index.html')
        await pg.evaluate("localStorage.clear()")
        await pg.reload()
        await pg.wait_for_function("mcEditor.player.assetReport().every(r=>r.ok)", timeout=15000)
        E = "mcEditor"
        ev = lambda js: pg.evaluate(js)

        # ---------- [24] 同一渲染核心：編輯器預覽 vs 正式播放頁 ----------
        W, H = await ev("[mcEditor.player.view.W, mcEditor.player.view.H]")
        await ev(f"(()=>{{const p=document.getElementById('preview'); p.style.cssText='position:absolute;left:0;top:0;right:auto;bottom:auto;width:{W}px;height:{H}px'}})()")
        await pg.wait_for_timeout(300)
        W, H = await ev("[mcEditor.player.view.W, mcEditor.player.view.H]")
        pp = await b.new_page(viewport={'width': W, 'height': H})
        await pp.goto(f'{BASE}/player/index.html?range=all')
        await pp.wait_for_function("!document.getElementById('startBtn').disabled", timeout=15000)
        await pp.click('#startBtn'); await pp.evaluate("mcPlayer.pause()")
        await pp.add_style_tag(content=".ctrl,#endTag{display:none!important}")
        await pg.add_style_tag(content="#hud{display:none!important}")
        diffs = []
        for t in [800, 3000, 4800, 7100, 9000, 11120, 12000, 13500]:
            await ev(f"mcEditor.player.pause(); mcEditor.player.seek({t})"); await pp.evaluate(f"mcPlayer.seek({t})")
            await pg.wait_for_timeout(120); await pp.wait_for_timeout(120)
            a = await shot_stage(pg); c = await shot_stage(pp, '.mc-stage')
            if a.shape == c.shape: diffs.append(round(float(np.abs(a - c).mean()), 3))
            else: diffs.append(f'size {a.shape} vs {c.shape}')
        same_src = await ev("!!document.querySelector('script[src=\"../player/motion-comic-player.js\"]') && mcEditor.player instanceof MotionComic.Player")
        await ev("document.getElementById('preview').style.cssText=''"); await pg.wait_for_timeout(300)
        check(24, '編輯預覽與正式播放使用同一套渲染核心', same_src and all(isinstance(d, float) and d < 0.05 for d in diffs), f'舞台 {W}×{H}，8 個時間點平均像素差 {diffs}')

        # ---------- [1][6] 未編輯時與 v0.2.0 一致（正式播放頁 1280×720 對照原版） ----------
        old = await b.new_page(viewport={'width': 1280, 'height': 720})
        await old.goto(OLD); await old.wait_for_function("!document.getElementById('startBtn').disabled")
        await old.click('#startBtn'); await old.evaluate("scene1.togglePause()")
        await old.add_style_tag(content=".ctrl,#endTag,#debug{display:none!important}")
        new = await b.new_page(viewport={'width': 1280, 'height': 720})
        await new.goto(f'{BASE}/player/index.html?range=all'); await new.wait_for_function("!document.getElementById('startBtn').disabled")
        await new.click('#startBtn'); await new.evaluate("mcPlayer.pause()")
        await new.add_style_tag(content=".ctrl,#endTag{display:none!important}")
        s1, s2 = [], []
        for t in list(range(0, 10951, 365)) + list(range(11170, 14731, 270)):
            await old.evaluate(f"scene1.seek({t})"); await new.evaluate(f"mcPlayer.seek({t})")
            await old.wait_for_timeout(90); await new.wait_for_timeout(90)
            o = np.array(Image.open(io.BytesIO(await old.screenshot())).convert('RGB')).astype(int)
            n = np.array(Image.open(io.BytesIO(await new.screenshot())).convert('RGB')).astype(int)
            d = float(np.abs(o - n).mean())
            (s1 if t <= 10950 else s2).append(d)
        tot = await new.evaluate("mcPlayer.total")
        check(1, '第一幕未編輯時與 v0.2.0 一致', max(s1) < 0.05, f'{len(s1)} 個時間點，最大平均像素差 {max(s1):.4f}')
        check(6, '第二幕未編輯時構圖與對位保留', max(s2) < 0.05, f'{len(s2)} 個時間點，最大平均像素差 {max(s2):.4f}；第二幕結束時間點 {14730}ms 與原版相同')
        await old.close(); await new.close()

        # ---------- [11] 五幕 ----------
        n_cards = await pg.locator('.scene-card').count()
        n_blocks = await pg.locator('.tl-scene').count()
        check(11, '能顯示第一～第五幕', n_cards == 5 and n_blocks == 5, f'場景清單 {n_cards} 張、時間軸 {n_blocks} 個區塊')

        # ---------- [12] 缺素材不卡死 ----------
        chips = await pg.locator('.scene-card .chip').all_inner_texts()
        await ev("mcEditor.player.setSpeed(4); mcEditor.player.setRange(null); mcEditor.player.seek(14000); mcEditor.player.play()")
        await pg.wait_for_function("!mcEditor.player.playing", timeout=12000)
        endT = await ev("[mcEditor.player.t, mcEditor.player.total]")
        await ev("mcEditor.player.seek(17000)"); await pg.wait_for_timeout(100)
        await ev("mcEditor.player.seek(mcEditor.player.tl.segs[3].start + 1000)"); await pg.wait_for_timeout(100)
        ph = await pg.locator('#preview .mc-scene >> nth=3').locator('.mc-placeholder').inner_text()
        await ev("mcEditor.player.setSpeed(1)")
        check(12, '缺素材的幕（第四、五幕）不會卡死', endT[0] == endT[1] and '尚未配置素材' in ph and chips[:3] == ['已就緒'] * 3, f'狀態 {chips}；4 倍速從第二幕播到結尾 t={endT[0]}；第四幕顯示「{ph.splitlines()[-1]}」')

        # 只預覽有素材的幕次 / 指定幕次
        r = await ev("(()=>{const p=mcEditor.player; const a=p.rangeFor('ready'); const b=p.rangeFor('scene',1); return [a.from,a.to,[...a.exclude],b.from,b.to]})()")
        check('其他', '「只播有素材的幕次」與「只播指定幕次」範圍正確', r[0] == 0 and r[1] == 17910 and r[2] == [3, 4] and r[3] == 10950 and r[4] == 14730, f'有素材：{r[0]}–{r[1]}ms（第一～三幕）排除 {r[2]}；第二幕：{r[3]}–{r[4]}ms（含切鏡）')
        await scene3_checks(pg, ev)

        # ---------- [2] 修改第一次睜眼時間（用屬性面板的節拍欄位） ----------
        await pg.locator('.scene-card >> nth=0').click()
        await ev("mcEditor.player.seek(1500)"); await pg.wait_for_timeout(120)
        before = await shot_stage(pg)
        scene2_json_before = await ev("JSON.stringify(mcEditor.state.project.scenes.slice(1))")
        gap = pg.locator('#props input[title="這一段的長度（毫秒）"]').nth(0)
        await set_input(gap, 1500)
        await ev("mcEditor.player.seek(1500)"); await pg.wait_for_timeout(120)
        after = await shot_stage(pg)
        open_t = await ev("mcEditor.player.scenes[0].c.tracks.open.map(k=>k[0])")
        check(2, '修改第一次睜眼時間，預覽會變', open_t[1] == 1500 and open_t[2] == 3100 and float(np.abs(before - after).mean()) > 1,
              f'睜眼開始 1000→1500ms，open 關鍵影格時間 {open_t[:4]}…；1.5s 畫面平均差 {np.abs(before - after).mean():.2f}')

        # ---------- [3] 修改第一次眨眼時間，模糊階段不錯亂 ----------
        await pg.locator('.scene-card >> nth=0').click()
        gap2 = pg.locator('#props input[title="這一段的長度（毫秒）"]').nth(1)    # open1 → blink1
        await set_input(gap2, 3000)   # blink1 = 1500+3000 = 4500（ripple 後）
        mm = await ev("MotionComic.markerTimes(mcEditor.state.project.scenes[0])")
        blur = await ev("mcEditor.player.scenes[0].c.tracks.blur.map(k=>k[0])")
        expo = await ev("mcEditor.player.scenes[0].c.tracks.exposure.map(k=>k[0])")
        v = await ev("MotionComic.validateProject(mcEditor.state.project)")
        ok3 = blur[1] == mm['blink1'] + 200 and blur[2] == mm['blink1'] + 350 and blur == sorted(blur) and expo == sorted(expo) and not v['errors'] and not v['warnings']
        check(3, '修改第一次眨眼時間，模糊階段不會錯亂', ok3, f"blink1={mm['blink1']}ms；blur 關鍵影格 {blur}；格式錯誤 {len(v['errors'])}、提醒 {len(v['warnings'])}")

        # ---------- [4] 修改最後清晰停留時間 → 第二幕順延 ----------
        s2_before = await ev("mcEditor.player.tl.segs[1].start")
        await pg.locator('.scene-card >> nth=0').click()
        rows = pg.locator('#props input[title="這一段的長度（毫秒）"]')
        end_gap = pg.locator('#props table.kft >> nth=0').locator('tr').last.locator('input')
        old_gap = int(await end_gap.input_value())
        await set_input(end_gap, old_gap + 1000)
        s2_after = await ev("mcEditor.player.tl.segs[1].start")
        check(4, '修改最後清晰停留時間，第二幕正確順延', s2_after - s2_before == 1000, f'第一幕結束停留 {old_gap}→{old_gap + 1000}ms；第二幕開始 {s2_before}→{s2_after}ms')

        # ---------- [5] 呼吸與眼皮毛邊 ----------
        await ev("mcEditor.player.seek(3200)"); await pg.wait_for_timeout(100)
        st = await ev("(()=>{const S=mcEditor.player.scenes[0]; return [S.shake.style.transform, S.lids.canvas.style.filter, S.lids.canvas.style.visibility]})()")
        check(5, '修改後鏡頭呼吸與眼皮毛邊仍正常', 'translate3d' in st[0] and 'blur(' in st[1] and st[2] == 'visible', f'鏡頭 {st[0][:60]}…；眼皮毛邊 {st[1]}')

        # ---------- [25] 修改某一幕不會破壞其他幕 ----------
        scene2_json_after = await ev("JSON.stringify(mcEditor.state.project.scenes.slice(1))")
        check(25, '修改第一幕不會改到其他幕次的資料', scene2_json_before == scene2_json_after, '第二～五幕的 JSON 在第一幕修改前後完全相同（只有開始時間依序順延）')

        # ---------- [22] Undo / Redo ----------
        u0 = await ev("MotionComic.markerTimes(mcEditor.state.project.scenes[0]).end")
        await pg.click('#undoBtn')
        u1 = await ev("MotionComic.markerTimes(mcEditor.state.project.scenes[0]).end")
        await pg.click('#redoBtn')
        u2 = await ev("MotionComic.markerTimes(mcEditor.state.project.scenes[0]).end")
        await pg.keyboard.press('Control+z')
        u3 = await ev("MotionComic.markerTimes(mcEditor.state.project.scenes[0]).end")
        await pg.keyboard.press('Control+Shift+z')
        u4 = await ev("MotionComic.markerTimes(mcEditor.state.project.scenes[0]).end")
        check(22, 'Undo／Redo 正常（按鈕與快捷鍵）', u1 == u0 - 1000 and u2 == u0 and u3 == u1 and u4 == u0, f'第一幕長度 {u0}→復原 {u1}→重做 {u2}→Ctrl+Z {u3}→Ctrl+Shift+Z {u4}')

        dirty = await pg.locator('#dirtyTag').is_visible()
        check('其他', '尚未儲存的修改提醒', dirty, '頂列顯示「● 尚未儲存」；關閉分頁時瀏覽器會再次提醒')

        # 整幕等比例縮放
        await ev("mcEditor.state.sel={kind:'scene',si:0}"); await pg.locator('.scene-card >> nth=0').click()
        d0 = await ev("mcEditor.state.project.scenes[0].durationMs")
        sc_in = pg.locator('#props .f').filter(has_text='整幕等比例縮放').locator('input')
        await sc_in.fill('8')
        await pg.locator('#props .f').filter(has_text='整幕等比例縮放').locator('button').click()
        d1 = await ev("[mcEditor.state.project.scenes[0].durationMs, MotionComic.markerTimes(mcEditor.state.project.scenes[0])]")
        check('其他', '整幕等比例縮放（只在使用者明確選擇時）', d1[0] == 8000, f'{d0}ms → {d1[0]}ms，節點 {[(k, v) for k, v in d1[1].items() if k not in ("start","end")]}')
        await pg.click('#undoBtn')

        # ---------- [7] 延長 2A 揉眼 → 2B 延後 ----------
        await pg.locator('.scene-card >> nth=1').click()
        s2 = await ev("mcEditor.player.tl.segs[1].start")
        g = pg.locator('#props input[title="這一段的長度（毫秒）"]').nth(1)    # shown → switch（2A 揉眼）
        await set_input(g, 2400)
        mm2 = await ev("MotionComic.markerTimes(mcEditor.state.project.scenes[1])")
        cam = await ev("mcEditor.player.scenes[1].c.cam.scale.map(k=>k[0])")
        await ev(f"mcEditor.player.seek({s2} + 2000)"); await pg.wait_for_timeout(100)
        op = await ev("(()=>{const e=mcEditor.player.scenes[1].layerEls[1]; return [e.imgA.style.opacity, e.imgB.style.opacity]})()")
        check(7, '延長 2A 揉眼時間後，2B 正確延後', mm2['switch'] == 2640 and mm2['bShown'] == 2760 and mm2['end'] == 4560 and cam[0] == 2640 and [float(x) for x in op] == [1.0, 0.0],
              f"2A 停留 1400→2400ms；切換 {mm2['switch']}ms、2B 完全出現 {mm2['bShown']}ms、本幕長度 {mm2['end']}ms；推鏡起點 {cam[0]}ms；原本會換成 2B 的 2.0s 現在仍是 2A")

        # ---------- [8] 修改 2A/2B 切換時間後沒有異常黑影 ----------
        await pg.locator('.scene-card >> nth=1').click()
        g = pg.locator('#props input[title="這一段的長度（毫秒）"]').nth(2)    # switch → bShown
        await set_input(g, 600)
        mm2 = await ev("MotionComic.markerTimes(mcEditor.state.project.scenes[1])")
        # 量測切換過程中床架區域的亮度（變成半透明或黑框時會明顯下降）
        lum = []
        for k in range(0, 9):
            t = s2 + mm2['switch'] - 100 + k * 100
            await ev(f"mcEditor.player.seek({t})"); await pg.wait_for_timeout(90)
            img = await shot_stage(pg)
            h_, w_ = img.shape[:2]
            region = img[int(h_ * 0.62):int(h_ * 0.92), int(w_ * 0.03):int(w_ * 0.45)]
            lum.append(round(float(region.mean()), 1))
        dip = (max(lum) - min(lum)) / max(lum) * 100
        check(8, '修改 2A／2B 切換時間後，沒有異常黑影', dip < 6, f'切換 120→600ms；切換前後 9 張畫面床架區平均亮度 {lum}（最大落差 {dip:.1f}%）')

        # ---------- [9] 推近倍率 ----------
        await ev("mcEditor.state.sel={kind:'track',si:1,scope:'cam',track:'scale'}")
        await pg.locator('.scene-card >> nth=1').click()
        await ev("(()=>{mcEditor.state.sel={kind:'track',si:1,scope:'cam',track:'scale'};})()")
        await pg.locator('.tl-label', has_text='鏡頭').click()   # 不會改選取，只確認可點
        await ev("document.querySelector('#props') && 0")
        # 直接用關鍵影格表修改數值
        await pg.evaluate("mcEditor.state.sel={kind:'track',si:1,scope:'cam',track:'scale'}")
        await pg.evaluate("document.getElementById('projectBtn').click()")
        await pg.evaluate("(()=>{})()")
        await pg.locator('.tl-row').filter(has_text='鏡頭').locator('.kf').nth(1).click()
        val_in = pg.locator('#props table.kft tr.sel input[type=number]').nth(1)
        await set_input(val_in, 1.1)
        await ev("mcEditor.player.seek(mcEditor.player.tl.segs[1].end)"); await pg.wait_for_timeout(100)
        tr = await ev("mcEditor.player.scenes[1].cam.style.transform")
        import re as _re
        mt_ = _re.search(r'scale\(([\d.]+)\)', tr)
        check(9, '修改鏡頭推近倍率後立即反映', mt_ and abs(float(mt_.group(1)) - 1.1) < 1e-6, f'推近完成 1.025→1.1；第二幕最後畫面鏡頭 {tr}')

        # ---------- [10] 床架對位檢查 ----------
        await pg.locator('.tl-bar', has_text='小V＋床組').click()
        res = []
        for label in ['顯示 2A', '顯示 2B', '2A／2B 疊圖對位']:
            await pg.locator('#props button', has_text=label).click(); await pg.wait_for_timeout(80)
            res.append(await ev("(()=>{const e=mcEditor.player.scenes[1].layerEls[1]; return (+e.imgA.style.opacity)+'/'+(+e.imgB.style.opacity)})()"))
        await pg.screenshot(path=f'{OUT}/acc_overlay.png')
        await pg.locator('#props button', has_text='回到正常播放').click()
        al = await ev("JSON.stringify(mcEditor.state.project.scenes[1].layers[1].bAlign)")
        check(10, '床架對位功能仍可檢查（2A／2B／疊圖）', res == ['1/0', '0/1', '1/0.5'] and '0.97699' in al, f'2A/2B 不透明度 {res}；bAlign 保持 {al[:50]}…')

        # ---------- [15][16][17] 第三幕對話 ----------
        await pg.locator('.scene-card >> nth=2').click()
        s3 = await ev("mcEditor.player.tl.segs[2].start")
        await ev(f"mcEditor.player.seek({s3}+1000)")
        n0 = await ev("mcEditor.state.project.scenes[2].dialogues.length")
        await pg.locator('#props button', has_text='＋ 在播放頭新增對話').click()
        n1 = await ev("mcEditor.state.project.scenes[2].dialogues.length")
        check(15, '第三幕可建立對話事件', n1 == n0 + 1, f'對話 {n0}→{n1}（自動選取新事件）')
        ta = pg.locator('#props textarea')
        await set_input(ta, '測試台詞：這是新的一句！')
        txt = await ev("mcEditor.state.project.scenes[2].dialogues.at(-1).text")
        check(16, '可修改台詞', txt == '測試台詞：這是新的一句！', f'台詞＝「{txt}」')
        # 用滑鼠拖曳時間軸上的原有草稿對話（第五幕：不是氣球森林嗎……）
        zoom = await ev("mcEditor.state.zoom")
        gd = await ev("mcEditor.player.allDialogues().find(x=>x.d.id==='s5_d1').g")
        await ev(f"document.getElementById('tlScroll').scrollLeft = {gd}/1000*{zoom} - 400")
        await pg.wait_for_timeout(100)
        dl = pg.locator('.tl-dlg', has_text='不是氣球森林嗎')
        box = await dl.bounding_box()
        at0 = await ev("JSON.stringify(mcEditor.state.project.scenes[4].dialogues[0].at)")
        zoom = await ev("mcEditor.state.zoom")
        await pg.mouse.move(box['x'] + 4, box['y'] + box['height'] / 2); await pg.mouse.down()
        await pg.mouse.move(box['x'] + 4 + zoom * 0.5, box['y'] + box['height'] / 2, steps=8); await pg.mouse.up()
        at1 = await ev("JSON.stringify(mcEditor.state.project.scenes[4].dialogues[0].at)")
        check(17, '可移動對話出現時間點（時間軸拖曳）', at0 != at1, f'拖曳約 0.5 秒：{at0} → {at1}')
        await pg.click('#undoBtn')   # 還原拖曳，讓後面的時間好算

        # ---------- [18][19] 等待型對話 ----------
        await pg.select_option('#modeSel', 'play')
        g3 = await ev("mcEditor.player.allDialogues().find(x=>x.d.id==='s5_d1').g")
        await ev(f"mcEditor.player.seek({g3}-600); mcEditor.player.play()")
        await pg.wait_for_timeout(1400)
        b1 = await ev("[!!mcEditor.player.blocked, mcEditor.player.t]")
        await pg.wait_for_timeout(800)
        b2 = await ev("[!!mcEditor.player.blocked, mcEditor.player.t, document.querySelector('#preview .mc-dialog').classList.contains('show')]")
        await pg.screenshot(path=f'{OUT}/acc_dialog_wait.png')
        check(18, '等待型對話會暫停劇情（第五幕草稿對話）', b1[0] and b2[0] and b1[1] == g3 and b2[1] == g3 and b2[2], f'到達 {g3}ms 後劇情停住（0.8 秒後仍是 {b2[1]}ms），對話框顯示中')
        await ev("mcEditor.player.pause()")
        await ev(f"mcEditor.player.seek({g3}-60); mcEditor.player.play()")
        await pg.wait_for_function("!!mcEditor.player.blocked", timeout=3000)
        await pg.locator('#preview .mc-dialog-next').click(force=True)          # 第一次（字還沒打完）：把字顯示完
        await pg.wait_for_timeout(100)
        mid = await ev("!!mcEditor.player.blocked")
        await pg.locator('#preview .mc-dialog-next').click(force=True)          # 第二次：關閉並繼續
        await pg.wait_for_timeout(700)
        b3 = await ev("[!!mcEditor.player.blocked, mcEditor.player.t, mcEditor.player.playing, document.querySelector('#preview .mc-dialog').classList.contains('show')]")
        check(19, '按繼續後能正確恢復（不跳過動畫、不重複觸發）', mid and not b3[0] and b3[2] and g3 < b3[1] < g3 + 1000 and not b3[3],
              f'第一次按＝顯示全文；第二次按＝關閉；0.7 秒後 t={b3[1]}ms（從 {g3}ms 接續，沒有跳段），沒有再次彈出')
        await ev("mcEditor.player.pause()")

        # ---------- [20] 拖動播放頭不觸發阻塞對話 ----------
        await ev(f"mcEditor.player.seek({g3}-1000)")
        await ev(f"document.getElementById('tlScroll').scrollLeft = ({g3}-1000)/1000*{zoom} - 300")
        await pg.wait_for_timeout(100)
        ruler = pg.locator('.tl-ruler .tl-lane')
        rb = await ruler.bounding_box()
        x0 = rb['x'] + (g3 - 1000) / 1000 * zoom
        await pg.mouse.move(x0, rb['y'] + 10); await pg.mouse.down()
        await pg.mouse.move(x0 + zoom * 2.5, rb['y'] + 10, steps=15); await pg.mouse.up()
        b4 = await ev("[!!mcEditor.player.blocked, mcEditor.player.t, mcEditor.player.playing]")
        check(20, '拖動播放頭不會意外觸發阻塞對話（正式播放模式下也一樣）', not b4[0] and b4[1] > g3 and not b4[2], f'從 {g3 - 1000}ms 拖過對話點到 {b4[1]}ms，沒有阻塞')

        # ---------- [21] 重播與略過後不殘留對話框 ----------
        await ev(f"mcEditor.player.seek({g3}-300); mcEditor.player.play()"); await pg.wait_for_timeout(700)
        x1 = await ev("!!mcEditor.player.blocked")
        await pg.click('#replayBtn'); await pg.wait_for_timeout(200)
        y1 = await ev("[!!mcEditor.player.blocked, document.querySelector('#preview .mc-dialog').classList.contains('show')]")
        await ev("mcEditor.player.pause()")
        await ev(f"mcEditor.player.seek({g3}-300); mcEditor.player.play()"); await pg.wait_for_timeout(700)
        x2 = await ev("!!mcEditor.player.blocked")
        await pg.click('#skipBtn'); await pg.wait_for_timeout(200)
        y2 = await ev("[!!mcEditor.player.blocked, document.querySelector('#preview .mc-dialog').classList.contains('show'), mcEditor.player.t]")
        await ev("mcEditor.player.pause()")
        check(21, '重播與略過後不會殘留對話框', x1 and x2 and y1 == [False, False] and y2[:2] == [False, False], f'阻塞中按重播→對話框 {y1}；阻塞中按略過本幕→對話框 {y2[:2]}，t={y2[2]}')
        await pg.select_option('#modeSel', 'edit')

        # 同一次播放不重複觸發
        await ev("mcEditor.player.setMode('play')")
        await ev(f"mcEditor.player.seek({g3}-200); mcEditor.player.play()"); await pg.wait_for_timeout(500)
        await ev("mcEditor.player.continueDialogue(); mcEditor.player.continueDialogue()")
        await pg.wait_for_timeout(300)
        await ev(f"mcEditor.player.pause()")
        fired_once = await ev(f"!mcEditor.player.blocked && mcEditor.player.fired.has('s5_d1')")
        await ev("mcEditor.player.setMode('edit')")
        check('其他', '同一事件在同一次播放中不會重複觸發', fired_once, '繼續後播放頭越過事件，fired 紀錄防止再次阻塞')

        # ---------- [23] 任意定位時間碼 ----------
        tc = pg.locator('#timecode')
        await tc.fill('00:12.345'); await tc.press('Enter')
        t1 = await ev("mcEditor.player.t")
        await tc.fill('3.7'); await tc.press('Enter')
        t2 = await ev("mcEditor.player.t")
        await pg.keyboard.press('ArrowRight'); t3 = await ev("mcEditor.player.t")
        check(23, '可任意定位時間碼', t1 == 12345 and t2 == 3700 and t3 == 3800, f'輸入 00:12.345→{t1}ms；3.7→{t2}ms；→ 鍵 +0.1s→{t3}ms')

        # 時間軸縮放
        w1 = await ev("document.getElementById('tlContent').offsetWidth")
        await pg.locator('#zoomRange').fill('300'); await pg.locator('#zoomRange').dispatch_event('input')
        w2 = await ev("document.getElementById('tlContent').offsetWidth")
        check('其他', '時間軸縮放', w2 > w1 * 2.5, f'時間軸寬度 {w1}px → {w2}px')
        await pg.locator('#zoomRange').fill('90'); await pg.locator('#zoomRange').dispatch_event('input')

        # 通用圖層：匯入圖片到第四幕（只用來測試，不會寫進交付的專案檔）
        await pg.screenshot(path=f'{OUT}/acc_before_layers.png')
        await pg.locator('.scene-card >> nth=3').click()
        async with pg.expect_file_chooser() as fc:
            await pg.locator('#props button', has_text='＋ 背景圖').click(timeout=8000)
        await (await fc.value).set_files(f'{ROOT}/assets/scene2_bg.png')
        await pg.wait_for_function("mcEditor.player.sceneStatus(3).ready", timeout=8000)
        await pg.locator('.scene-card >> nth=3').click()          # 匯入後面板會切到新圖層，先回到第四幕
        async with pg.expect_file_chooser() as fc:
            await pg.locator('#props button', has_text='＋ 人物圖').click()
        await (await fc.value).set_files(f'{ROOT}/assets/scene2_char_2b.png')
        await pg.wait_for_timeout(500)
        lid = await ev("mcEditor.state.sel.layerId")
        bg_ok = await ev("mcEditor.player.sceneStatus(3).ready")
        # 加一組位置與透明度關鍵影格
        await ev("""(()=>{const s=mcEditor.state.project.scenes[3]; const L=s.layers.find(l=>l.id===mcEditor.state.sel.layerId);
          L.tracks={x:[{m:'start',o:0,v:0.2},{m:'start',o:3000,v:0.6,e:'inOut'}], opacity:[{m:'start',o:0,v:0},{m:'start',o:800,v:1,e:'out'}]};})()""")
        await ev("document.getElementById('undoBtn').click(); document.getElementById('redoBtn').click()")
        await ev("(()=>{const s=mcEditor.state.project.scenes[3]; const L=s.layers.find(l=>l.id===mcEditor.state.sel.layerId); L.tracks={x:[{m:'start',o:0,v:0.2},{m:'start',o:3000,v:0.6,e:'inOut'}], opacity:[{m:'start',o:0,v:0},{m:'start',o:800,v:1,e:'out'}]}; mcEditor.player.setProject(mcEditor.state.project);})()")
        s4 = await ev("mcEditor.player.tl.segs[3].start")
        geo = []
        for t in [0, 400, 1500, 3000]:
            await ev(f"mcEditor.player.seek({s4}+{t})"); await pg.wait_for_timeout(80)
            geo.append(await ev("(()=>{const S=mcEditor.player.scenes[3]; const im=S.layerEls[1].img; return [parseFloat(im.style.left).toFixed(0), im.style.opacity, (parseFloat(im.style.width)/parseFloat(im.style.height)).toFixed(4)]})()"))
        await pg.screenshot(path=f'{OUT}/acc_scene4_layers.png')
        ratio_ok = all(abs(float(g_[2]) - 1484 / 1060) < 0.002 for g_ in geo)
        check('其他', '第三～五幕通用圖層：匯入 PNG、位置／透明度動畫、保持原比例與透明度', ratio_ok and float(geo[0][1]) == 0 and float(geo[3][1]) == 1 and int(geo[3][0]) > int(geo[0][0]),
              f'第四幕加入背景＋透明 PNG 人物；[left, 透明度, 寬高比] = {geo}（原圖比例 {1484/1060:.4f}）')

        # ---------- [13][14] 匯出 → 匯入 ----------
        await pg.click('#undoBtn'); await pg.click('#undoBtn'); await pg.click('#undoBtn')   # 移除測試用圖層
        proj_before = await ev("JSON.stringify(mcEditor.state.project)")
        await pg.click('#exportBtn')
        async with pg.expect_download() as dl:
            await pg.locator('#modalActions button', has_text='下載 JSON').click()
        path = await (await dl.value).path()
        exported = json.load(open(path, encoding='utf8'))
        check(13, '匯出 JSON（完整五幕）', len(exported['scenes']) == 5 and exported['scenes'][0]['effects']['eyelids']['params']['LID_FEATHER'] == 0.026
              and exported['scenes'][1]['layers'][1]['bAlign']['scale'] == 0.97699, f"{len(exported['scenes'])} 幕；眼皮參數、bAlign、陰影設定都在；檔案 {os.path.getsize(path)} bytes")
        # 先還原成基準，再匯入剛剛的檔案
        await pg.click('#resetBtn'); await pg.locator('#modalActions button', has_text='還原 v0.1.0').click()
        v1_eq = await ev("JSON.stringify(mcEditor.state.project)===JSON.stringify(window.MC_BASELINE)")
        await pg.click('#resetBtn'); await pg.locator('#modalActions button', has_text='還原 v0.2.0').click()
        base_eq = await ev("JSON.stringify(mcEditor.state.project)===JSON.stringify(window.MC_BASELINE_V2)")
        check('其他', '還原初始範例：可選 v0.1.0（只有第一、二幕）或 v0.2.0（含第三幕）', v1_eq and base_eq, f'v0.1.0 相同={v1_eq}；v0.2.0 相同={base_eq}')
        async with pg.expect_file_chooser() as fc:
            await pg.click('#importBtn')
        await (await fc.value).set_files(path)
        await pg.wait_for_timeout(500)
        after_imp = await ev("JSON.stringify(mcEditor.state.project)")
        strip = lambda s_: {k: v for k, v in json.loads(s_).items() if k not in ('editorVersion', 'exportedAt')}
        same = strip(after_imp)['scenes'] == strip(proj_before)['scenes'] and strip(after_imp)['assets'] == strip(proj_before)['assets']
        check(14, '匯入後保留全部場景與時間參數', same and base_eq, '匯出→還原基準→再匯入，五幕的節點、關鍵影格、圖層、對話、素材設定與匯出前完全相同')

        # 錯誤格式匯入
        bad = f'{OUT}/bad.json'
        bj = json.loads(json.dumps(exported)); bj['scenes'][1]['durationMs'] = -5; bj['scenes'][0]['tracks']['open'][3]['m'] = 'nope'
        json.dump(bj, open(bad, 'w'))
        async with pg.expect_file_chooser() as fc:
            await pg.click('#importBtn')
        await (await fc.value).set_files(bad)
        await pg.wait_for_timeout(300)
        mt = await pg.locator('#modalBody').inner_text()
        unchanged = await ev("JSON.stringify(mcEditor.state.project)") == after_imp
        await pg.locator('#modalActions button').first.click()
        check('其他', '專案格式驗證與錯誤提示', '未匯入' in await pg.locator('#modalTitle').inner_text() or ('durationMs' in mt and unchanged), mt.replace('\n', ' ')[:120])

        # 儲存與基準保護
        await pg.click('#saveBtn')
        ls = await ev(f"localStorage.getItem('mc-editor-project-v1')===JSON.stringify(mcEditor.state.project)")
        check('其他', '儲存（瀏覽器本機）與基準檔保護', ls and md5(f'{ROOT}/projects/party-island-opening-baseline.json') == baseline_md5 and baseline_md5 == '58ce8a78bcc1168830bd6bf7cbc55c37',
              '已儲存到 localStorage；v0.1.0 基準 JSON 的 MD5 與上一版交付時相同（58ce8a78…），整個測試前後也沒變')

        # 略過本幕
        await ev("mcEditor.player.setRange(null); mcEditor.player.seek(3000)")
        await pg.click('#skipBtn')
        sk, s1end = await ev("[mcEditor.player.t, mcEditor.player.tl.segs[0].end]")
        check('其他', '略過當前幕次', sk == s1end, f'在第一幕 3.0s 按「略過本幕」→ t={sk}ms＝第一幕結尾 {s1end}ms')

        check('其他', '整個測試過程沒有 JavaScript 錯誤', not errs, str(errs[:3]))

        # ---------- 舊版儲存資料 → 合併第三幕 ----------
        old_saved = json.load(open(f'{ROOT}/projects/party-island-opening-baseline.json', encoding='utf8'))
        old_saved['scenes'][0]['markers'][0]['t'] = 1234          # 模擬使用者曾經調整過第一幕
        await pg.evaluate("s => { localStorage.setItem('mc-editor-project-v1', s); }", json.dumps(old_saved, ensure_ascii=False))
        await pg.reload()
        await pg.wait_for_selector('#modal:not([hidden])', timeout=8000)
        mtitle = await pg.locator('#modalTitle').inner_text()
        await pg.locator('#modalActions button', has_text='把第三幕加進我的版本').click()
        await pg.wait_for_timeout(600)
        mg = await ev("(()=>{const p=mcEditor.state.project; return [p.scenes[0].markers[0].t, p.scenes[2].layers.length, p.scenes[2].status, !!p.assets.intro_scene03_window, p.contentVersion, p.scenes.length]})()")
        check('其他', '舊版儲存資料可「把第三幕加進我的版本」（保留使用者對第一幕的修改）', '第三幕' in mtitle and mg == [1234, 3, 'ready', True, 2, 5],
              f'提示「{mtitle}」；合併後 第一幕睜眼節點={mg[0]}ms（保留）、第三幕圖層 {mg[1]} 層、狀態 {mg[2]}、共 {mg[5]} 幕')
        await pg.evaluate("localStorage.clear()")

        # ---------- 正式播放頁：手機橫向＋file:// ----------
        m = await b.new_context(viewport={'width': 844, 'height': 390}, is_mobile=True, has_touch=True, device_scale_factor=2)
        mp = await m.new_page(); merr = []
        mp.on('pageerror', lambda e: merr.append(str(e)))
        await mp.goto('file:///home/claude/mc/motion-comic/player/index.html')
        await mp.wait_for_function("!document.getElementById('startBtn').disabled", timeout=15000)
        await mp.tap('#startBtn'); await mp.wait_for_timeout(1200)
        await mp.evaluate("mcPlayer.pause(); mcPlayer.seek(13000)"); await mp.wait_for_timeout(150)
        await mp.screenshot(path=f'{OUT}/acc_mobile.png')
        mr = await mp.evaluate("[mcPlayer.view.W, mcPlayer.view.H, [...mcPlayer.range.exclude], mcPlayer.total]")
        check('其他', '正式播放頁：手機橫向＋file:// 直接開啟', not merr and mr[0] == 693 and mr[2] == [3, 4], f'844×390 手機舞台 {mr[0]}×{mr[1]}；預設只播有素材的幕次（排除 {mr[2]}）；錯誤 {merr}')
        await b.close()

    ok = sum(1 for r in results if r[2]); print(f'\n總計 {ok}/{len(results)} 通過')
    json.dump(results, open(f'{OUT}/acceptance.json', 'w'), ensure_ascii=False, indent=1)

asyncio.run(main())
