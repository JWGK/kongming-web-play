import {mountTitle} from './title.mjs?v=0.73.57-qishan-camp';
import {createTitleAudio} from './title-audio.mjs';
import {createTitleRecords} from './title-records.mjs?v=0.73.79-changan';

const handoff = document.getElementById('title-handoff');
const heading = document.getElementById('title-handoff-heading');
const progress = document.getElementById('title-handoff-status');
const gate = document.getElementById('entry-begin');
const gateStatus = document.getElementById('entry-loading-status');
const gameUrl = new URL('../site.bundle.mjs?v=0.73.86-wei-river-fixes', import.meta.url);
let failedImports = 0;

async function loadRuntime() {
  const url = new URL(gameUrl);
  if (failedImports) url.searchParams.set('retry', String(failedImports));
  try {
    return await import(url.href);
  } catch (error) {
    failedImports++;
    if (failedImports > 1) {
      // Browsers can keep a failed static dependency in the current document's module map.
      throw Object.assign(new Error('Campaign module could not be imported', {cause: error}), {reloadTitle: true});
    }
    throw error;
  }
}

async function prepareTitle() {
  gate.disabled = true;
  gate.onclick = null;
  gateStatus.textContent = '正在載入標題畫面…';
  let sound;
  try {
    const response = await fetch(new URL('./title-scenes.json', import.meta.url));
    if (!response.ok) throw new Error('Title images unavailable');
    const data = await response.json();
    const records = createTitleRecords(window);
    sound = createTitleAudio(document);
    const freeInspect = async raw => (await loadRuntime()).inspectFreeXinyeSlot07340(raw);
    await mountTitle({data, ...records, sound, freeInspect, async launch(action, releaseTitle) {
      const description = {
        resume: '正在從中斷處繼續',
        load: '正在讀取第 ' + action.slot + ' 格記錄',
        delete: '正在開啟記錄管理',
        transfer: '正在開啟存檔備份與匯入',
        prologue: '正在準備序章',
        new: '正在準備新遊戲',
        menu: '正在開啟遊戲選單'
      };
      heading.textContent = description[action.kind];
      progress.textContent = '正在載入遊戲程式…';
      handoff.hidden = false;
      document.body.classList.add('title-hydrating');
      heading.focus({preventScroll:true});
      handoff.scrollIntoView({block:'nearest'});
      let committed = false;
      try {
        const runtime = await loadRuntime();
        await runtime.startFromTitle(action, () => {
          releaseTitle();
          committed = true;
          document.body.classList.remove('title-only', 'title-hydrating');
          handoff.hidden = true;
        }, sound, message => { progress.textContent = message; });
      } finally {
        handoff.hidden = true;
        document.body.classList.remove('title-hydrating');
        if (!committed) document.body.classList.add('title-only');
      }
    }});
  } catch (error) {
    sound?.destroy();
    gate.disabled = false;
    gate.textContent = '重新載入標題';
    gateStatus.textContent = '標題畫面未能載入，請再試。';
    gate.onclick = prepareTitle;
    console.warn('Unable to open title', error);
  }
}

await prepareTitle();
