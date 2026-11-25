// The title uses the same timed screens and localized image planes as the campaign.
const menuLabels = {
  resume: '從中斷處繼續', records: '讀取記錄', new: '從頭開始', delete: '刪除記錄',
  biographies: '武將列傳', free: '自由模式', start: '立即開始遊戲', 'long-prologue': '觀看序章'
};
const stageNames = {boot: '啟動', title: '標題畫面', menu: '選單', newGame: '選單', loadSlots: '讀取記錄', deleteSlots: '刪除記錄'};

function addLabel(parent, text, box, size, {opacity = 1, color = '#fff4cf', align = 'center', role = '', image} = {}) {
  const el = document.createElement(image ? 'img' : 'span');
  if (image) { el.src = './' + image; el.alt = ''; }
  else el.textContent = text;
  el.className = ('entry-image-label ' + role).trimEnd();
  Object.assign(el.style, {
    left: box.x / 240 * 100 + '%', top: box.y / 160 * 100 + '%',
    width: box.width / 240 * 100 + '%', height: box.height / 160 * 100 + '%',
    fontSize: size / 240 * 100 + 'cqw', opacity, color, textAlign: align,
    justifyContent: align === 'left' ? 'flex-start' : 'center'
  });
  parent.append(el);
}

export async function mountTitle({data, launch, readSlot, readSuspend, sound}) {
  const byId = id => document.getElementById(id);
  const begin = byId('entry-begin'), next = byId('entry-next'), back = byId('entry-back'), skip = byId('entry-skip');
  const options = byId('entry-options'), image = byId('entry-image'), overlay = byId('entry-image-overlay');
  const error = byId('entry-error'), status = byId('entry-loading-status'), prompt = byId('entry-prompt');
  const events = new AbortController();
  const listen = (el, event, handler) => el.addEventListener(event, handler, {signal: events.signal});
  if (!data?.bootFrames?.length || !data.screens?.title) throw new Error('Title assets unavailable');

  let stage = 'gate', frame = 0, entries = [], selected = null, timer = 0, generation = 0;
  let pending = false, disposed = false, resumingFrame = false, paused = false;
  let suspend, slots = [];
  const images = new Map();
  function requestImage(screen) {
    const url = './' + screen.asset;
    if (!images.has(url)) {
      const request = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Title image unavailable'));
        img.src = url;
      });
      request.catch(() => { if (images.get(url) === request) images.delete(url); });
      images.set(url, request);
    }
    return images.get(url);
  }

  function screen() {
    if (stage === 'boot') return data.bootFrames[frame];
    if (stage === 'menu') return entries.find(row => row.id === selected)?.focusScreen ?? data.screens.mainMenu;
    if (stage === 'title') return data.screens.title;
    if (stage === 'newGame') return data.screens.newGame;
    return data.screens.saveSlots;
  }
  function draw() {
    const asset = screen(), url = './' + asset.asset;
    if (image.getAttribute('src') !== url) image.src = url;
    image.alt = '三國志孔明傳・原作畫面';
    overlay.replaceChildren();
    const spec = asset.overlay || {}, opacity = spec.opacity ?? 1;
    if (asset.role === 'boot-tagline') addLabel(overlay, '模擬角色扮演遊戲', spec.box, 14, {opacity});
    if (asset.role === 'title') {
      addLabel(overlay, '三國志\n孔明傳', spec.titleBox, 28, {opacity, role: 'title'});
      if (spec.showPrompt !== false) addLabel(overlay, '按下「開始」', spec.promptBox, 12, {opacity});
      if (spec.showCopyright !== false) addLabel(overlay, spec.copyrightText ?? '©1996-2005 KOEI Co., Ltd. 版權所有。', spec.copyrightBox, 8, {opacity});
    }
    if (spec.portraitBox) addLabel(overlay, '', spec.portraitBox, 12, {image: 'assets/zhuge-portrait.png'});
    if (spec.nativePanelBox) {
      for (const row of entries) {
        const color = !row.enabled ? '#899080' : row.id === selected ? '#f6df9e' : '#fff4cf';
        addLabel(overlay, row.label, row.nativeBounds, 12, {color, align: 'left'});
      }
    }
  }

  function refreshRecords() {
    const detail = stage === 'loadSlots' || stage === 'deleteSlots';
    suspend = readSuspend();
    slots = Array.from({length: 5}, (_, i) => readSlot(i + 1, detail));
  }
  function rows() {
    if (stage === 'newGame') return data.newGameMenu.map(row => ({...row, enabled: true, label: menuLabels[row.id]}));
    if (stage === 'loadSlots' || stage === 'deleteSlots') return slots.map((record, i) => ({
      id: 'slot:' + (i + 1), slot: i + 1, record,
      enabled: !!record.exists && (stage === 'deleteSlots' || record.valid !== false),
      label: (i + 1) + '：' + (record.label ?? (record.unavailable ? '無法讀取儲存空間。' : record.exists ? '記錄詳情待核對' : '記錄沒有資料。'))
    }));
    if (stage !== 'menu') return [];
    const available = {
      resume: !!suspend.exists && suspend.valid !== false, records: slots.some(r => r.exists && r.valid !== false),
      delete: slots.some(r => r.exists), new: true
    };
    const reasons = {resume: '中斷沒有資料。', records: '記錄沒有資料。', delete: '記錄沒有資料。',
      biographies: '此版本尚未加入武將列傳。', free: '此版本尚未加入自由模式。'};
    return data.mainMenu.map(row => ({
      ...row, label: menuLabels[row.id], enabled: !!available[row.id],
      reason: ((row.id === 'resume' && suspend.unavailable) || (['records','delete'].includes(row.id) && slots.every(r => r.unavailable)))
        ? '無法讀取儲存空間。' : reasons[row.id]
    }));
  }
  function focusRow(id) {
    if (selected === id) return;
    selected = id;
    for (const el of options.querySelectorAll('button')) el.setAttribute('aria-pressed', String(el.dataset.option === id));
    draw();
  }
  function cancelFrame() {
    generation++;
    clearTimeout(timer);
  }
  function setStage(value) {
    cancelFrame();
    stage = value;
    frame = 0;
    selected = null;
    paused = false;
    byId('entry-resume').hidden = true;
    error.hidden = true;
    render(true);
  }
  function render(moveFocus) {
    if (disposed || pending) return;
    const gate = stage === 'gate';
    byId('entry-gate').hidden = !gate;
    byId('entry-content').hidden = gate;
    begin.disabled = false;
    if (gate) return;
    if (['menu', 'loadSlots', 'deleteSlots'].includes(stage)) refreshRecords();
    entries = rows();
    if (!entries.some(r => r.enabled && r.id === selected)) selected = entries.find(r => r.enabled)?.id ?? null;
    next.hidden = stage !== 'title';
    back.hidden = !['menu', 'newGame', 'loadSlots', 'deleteSlots'].includes(stage);
    skip.hidden = stage !== 'boot';
    for (const el of [next,back,skip]) el.disabled = false;
    next.textContent = stage === 'title' ? '開始' : '下一步';
    byId('entry-stage').textContent = stageNames[stage];
    prompt.hidden = true;
    options.classList.toggle('title-record-list', stage === 'loadSlots' || stage === 'deleteSlots');
    options.replaceChildren();
    for (const row of entries) {
      const holder = document.createElement('div'), button = document.createElement('button');
      button.type = 'button'; button.textContent = row.label; button.disabled = !row.enabled;
      button.dataset.option = row.id;
      button.setAttribute('aria-pressed', String(row.id === selected));
      if (row.record?.exists) button.className = 'record-metadata-label';
      holder.append(button);
      if (row.reason && !row.enabled) {
        const reason = document.createElement('small');
        reason.id = 'title-reason-' + row.id; reason.textContent = row.reason;
        button.setAttribute('aria-describedby', reason.id);
        holder.append(reason);
      }
      options.append(holder);
    }
    draw();
    sound?.selectBgm(stage === 'boot' ? data.bootFrames[frame].bgmId : stage === 'newGame' ? 0 : 7);
    if (stage === 'boot') scheduleFrame();
    if (moveFocus) (stage === 'boot' ? skip : stage === 'title' ? next : options.querySelector('button[aria-pressed="true"]') ?? back).focus({preventScroll:true});
  }

  function failFrame() {
    resumingFrame = true;
    cancelFrame();
    stage = 'gate';
    begin.textContent = '重新載入';
    status.textContent = '請按「重新載入」再試。';
    error.textContent = '啟動畫面未能載入。';
    error.hidden = false;
    render(false);
    begin.focus({preventScroll:true});
  }
  function scheduleFrame() {
    const token = generation;
    if (document.hidden || paused) return;
    const upcoming = data.bootFrames.slice(frame + 1, frame + 5).map(requestImage);
    timer = setTimeout(async () => {
      try {
        if (upcoming.length) await upcoming[0];
      } catch {
        if (token === generation && !disposed) failFrame();
        return;
      }
      if (disposed || token !== generation || document.hidden || pending || paused) return;
      if (++frame === data.bootFrames.length) { setStage('title'); return; }
      draw();
      sound?.selectBgm(data.bootFrames[frame].bgmId);
      scheduleFrame();
    }, data.bootFrames[frame].durationMs);
  }
  async function playOpening() {
    if (disposed || pending || begin.disabled || stage !== 'gate') return;
    paused = false;
    byId('entry-resume').hidden = true;
    sound?.unlock();
    error.hidden = true;
    begin.disabled = true;
    begin.textContent = '正在載入…';
    if (!resumingFrame) frame = 0;
    const token = ++generation;
    try { await requestImage(data.bootFrames[frame]); }
    catch { if (token === generation && !disposed) failFrame(); return; }
    if (disposed || token !== generation) return;
    resumingFrame = false;
    begin.textContent = '點按開始';
    stage = 'boot';
    render(true);
  }

  const transfer = document.createElement('details'), summary = document.createElement('summary');
  transfer.id = 'save-transfer'; transfer.className = 'save-transfer';
  summary.textContent = '本機存檔備份與匯入'; transfer.append(summary);
  byId('app-error').before(transfer);
  function commit() {
    if (disposed) return;
    disposed = true;
    events.abort(); cancelFrame(); images.clear();
    transfer.remove();
    prompt.hidden = true;
    byId('entry-shell').removeAttribute('aria-busy');
    for (const el of [begin,next,back,skip]) el.disabled = false;
    sound?.release();
  }
  async function start(action) {
    if (disposed || pending) return;
    if (Object.hasOwn(action, 'expectedRaw')) {
      const current = action.kind === 'resume' ? readSuspend() : readSlot(action.slot);
      if (current.unavailable || current.raw !== action.expectedRaw) {
        render(true);
        error.textContent = current.unavailable ? '無法讀取儲存空間。請再試一次。' : '這格記錄已變更，請重新選擇。';
        error.hidden = false;
        return;
      }
    }
    pending = true;
    cancelFrame();
    error.hidden = true;
    sound?.unlock();
    byId('entry-shell').setAttribute('aria-busy','true');
    for (const el of [begin,next,back,skip,...options.querySelectorAll('button')]) el.disabled = true;
    try { await launch(action, commit, sound); commit(); }
    catch (failure) {
      if (disposed) return;
      pending = false;
      byId('entry-shell').removeAttribute('aria-busy'); transfer.open = false;
      render(true);
      if (stage === 'gate') status.textContent = '請點按開始。';
      error.textContent = '遊戲資料未能載入。請再選一次重試。';
      if (failure?.reloadTitle) {
        error.textContent = '遊戲程式未能載入。請重新開啟標題再試。';
        const reload = document.createElement('button');
        reload.type = 'button';
        reload.textContent = '重新載入標題';
        reload.onclick = () => window.location.reload();
        error.append(reload);
      }
      error.hidden = false;
      console.warn('Unable to open the selected game action', failure);
    }
  }
  function choose(id) {
    if (disposed || pending) return;
    const row = entries.find(r => r.id === id && r.enabled);
    if (!row) return;
    if (stage === 'menu') {
      if (id === 'resume') void start({kind:'resume',expectedRaw:suspend.raw});
      else setStage({records:'loadSlots',delete:'deleteSlots',new:'newGame'}[id]);
    } else if (stage === 'newGame') void start({kind:id === 'start' ? 'new' : 'prologue'});
    else if (row.slot) void start({kind:stage === 'loadSlots' ? 'load' : 'delete',slot:row.slot,expectedRaw:row.record.raw});
  }
  function goBack() {
    if (disposed || pending) return;
    if (stage === 'menu') setStage('title');
    else if (['loadSlots','deleteSlots','newGame'].includes(stage)) setStage('menu');
  }
  function refreshVisible() {
    if (disposed || pending || !['menu','loadSlots','deleteSlots'].includes(stage)) return;
    const focus = options.contains(document.activeElement); render(focus);
  }
  listen(begin,'click',playOpening);
  listen(skip,'click',() => {if (!pending && stage === 'boot') setStage('title');});
  listen(next,'click',() => {if (!pending && stage === 'title') setStage('menu');});
  listen(back,'click',goBack);
  listen(byId('game-new'),'click',() => {
    if (disposed || pending) return;
    resumingFrame = false; setStage('gate'); void playOpening();
  });
  listen(transfer,'toggle',() => {if (transfer.open) void start({kind:'transfer'});});
  listen(options,'focusin',event => {const b = event.target.closest('button'); if (b && !b.disabled && !pending) focusRow(b.dataset.option);});
  listen(options,'click',event => {const b = event.target.closest('button'); if (b && !b.disabled) choose(b.dataset.option);});
  listen(options,'keydown',event => {
    const button = event.target.closest('button');
    if (!button || pending) return;
    if (event.key === 'Escape') { event.preventDefault(); goBack(); return; }
    if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const visible = [...options.querySelectorAll('button:enabled')], i = visible.indexOf(button);
    if (visible.length) visible[event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 :
      (i + (event.key === 'ArrowUp' ? -1 : 1) + visible.length) % visible.length].focus();
  });
  listen(image,'click',event => {
    if (pending) return;
    if (stage === 'title') {setStage('menu'); return;}
    if (stage !== 'menu') return;
    const rect = image.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 240 / rect.width, y = (event.clientY - rect.top) * 160 / rect.height;
    for (const row of entries) {
      const b = row.nativeBounds;
      if (x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height) {choose(row.id); break;}
    }
  });
  function pauseOpening() {
    if (stage !== 'boot' || disposed || pending) return;
    cancelFrame();
    paused = true;
    skip.disabled = true;
    byId('entry-resume').hidden = false;
  }
  listen(byId('entry-resume'),'click',() => {
    if (!paused || pending || disposed) return;
    paused = false;
    byId('entry-resume').hidden = true;
    skip.disabled = false;
    sound?.unlock();
    skip.focus({preventScroll:true});
    scheduleFrame();
  });
  listen(window,'storage',refreshVisible);
  listen(window,'pagehide',pauseOpening);
  listen(window,'pageshow',refreshVisible);
  listen(document,'visibilitychange',() => {
    if (document.hidden) pauseOpening();
    else refreshVisible();
  });

  begin.textContent = '點按開始'; status.textContent = '請點按開始。';
  byId('game-new').disabled = false;
  byId('game-lobby').hidden = true;
  byId('game-save-status').textContent = '進度不會自動儲存。請使用「中斷」或原作的記錄提示／城內選單儲存。';
  byId('battle-title').textContent = '戰場'; byId('battle-victory').textContent = ''; byId('game-phase').textContent = '劇情';
  render(false);
  return {dispose:commit};
}
