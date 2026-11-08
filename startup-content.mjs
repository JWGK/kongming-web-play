// Public metadata: short observed interface labels and evidence identifiers only.
// No original story text, artwork, sound, ROM data, or claimed script binding.
export const STARTUP_REFERENCE = Object.freeze({
  url: 'https://kongming-tactics-lab.gavinkiang.chatgpt.site/',
  requestedName: 'v117', observedBuildLabel: '開發版 0.69.15', observedOn: '2026-11-08',
  shell: 'dark-green centered card; 3:2 scene; separate controls below scene',
  fidelity: 'CSS/text presentation, not original artwork or a complete runtime',
});
export const MENU_COPY = Object.freeze({
  resume: Object.freeze({ja:'中断から始める', zh:'從中斷處繼續', reason:'尚未接入原作中斷存檔。'}),
  record: Object.freeze({ja:'記録から始める', zh:'讀取記錄', reason:'尚未接入原作記錄。'}),
  'new-game': Object.freeze({ja:'最初から始める', zh:'從頭開始', reason:''}),
  'delete-record': Object.freeze({ja:'記録を消す', zh:'刪除記錄', reason:'此版不會刪除任何既有存檔。'}),
  officers: Object.freeze({ja:'武将列伝', zh:'武將列傳', reason:'列傳畫面尚未接入。'}),
  'free-mode': Object.freeze({ja:'フリーモード', zh:'自由模式', reason:'自由模式尚未接入。'}),
  'game-start': Object.freeze({ja:'ゲームを始める', zh:'立即開始遊戲', reason:''}),
  prologue: Object.freeze({ja:'プロローグを見る', zh:'觀看序章', reason:'序章播放尚未核實，暫不可用。'}),
});
export const OPENING_EVIDENCE = Object.freeze({
  checkpointId: 'opening-common-prefix-v1',
  sourceOffsets: Object.freeze(['0x134D60', '0x134FB3']),
  prefixEndOffsets: Object.freeze(['0x134DC3', '0x135016']),
  sourceByteLength: 99, tokenCount: 68, glyphCount: 58, lineCount: 5,
  speakerIdentity: null, entryHeaderPresent: false,
  sourcePrefixSha256: '7f62546782f330e7a3fba9858d9cb54d557c6c60dd62798c038cdeab2d647fc4',
  textSha256: 'd93a84fda6508061b60de212d3a612304737ee0579c940eded8c414eb9df1488',
  frameSha256: '99c6c3a666bf29766b3fd38a9253690f168826b82d08d3e4d2a7c9a577bd831c',
  frameWidth: 240, frameHeight: 160,
  limit: 'Only the common first five lines are established. The complete branch and runtime callback are not established.',
});
