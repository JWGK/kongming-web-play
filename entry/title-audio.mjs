// Title and new-game use the same original recordings as the campaign player.
const musicManifest = new URL("../assets/first-battle/music/manifest.json", import.meta.url);

export function createTitleAudio(document) {
  const button = document.getElementById("game-audio");
  const status = document.getElementById("game-audio-status");
  const view = document.defaultView;
  let context, source, gain, tracks, cachedTrack, pending;
  let selected = null, enabled = false, released = false;
  let offset = 0, started = 0;

  function showButton() {
    button.setAttribute("aria-pressed", String(enabled));
    button.textContent = enabled ? "關閉聲音" : "開啟聲音";
  }
  function stop() {
    pending?.abort();
    pending = null;
    if (!source) return;
    const {loopStart, loopEnd} = source;
    if (loopEnd > loopStart) {
      const position = offset + Math.max(0, context.currentTime - started);
      offset = position < loopEnd ? position : loopStart + (position - loopStart) % (loopEnd - loopStart);
    }
    try { source.stop(); } catch { /* Playback may have failed before start. */ }
    source.disconnect();
    gain?.disconnect();
    source = gain = null;
  }
  async function play() {
    if (released || !enabled || document.hidden || context?.state !== "running" || selected === null || source || pending) return;
    const request = new AbortController();
    pending = request;
    try {
      if (cachedTrack?.id !== selected) {
        const id = selected;
        const options = {signal: request.signal};
        if (!tracks) {
          const manifest = await view.fetch(musicManifest, options);
          if (!manifest.ok) throw new Error("Title music manifest unavailable");
          tracks = (await manifest.json()).tracks;
        }
        const track = tracks?.[id];
        if (track?.logicalId !== id || track.path !== (id === 13 ? "bgm-13-intro-loop.flac" : `bgm-${id}.flac`) ||
            !(track.loopEndSeconds > track.loopStartSeconds && track.loopStartSeconds >= 0)) {
          throw new Error("Missing title music cue");
        }
        const response = await view.fetch(new URL(track.path, musicManifest), options);
        if (!response.ok) throw new Error("Title music unavailable");
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        if (request !== pending) return;
        if (buffer.duration + 0.02 < track.loopEndSeconds) throw new Error("Incomplete title music");
        cachedTrack = {id, buffer, loopStart: track.loopStartSeconds, loopEnd: track.loopEndSeconds};
      }
      if (request !== pending || document.hidden || !enabled || released) return;
      source = context.createBufferSource();
      gain = context.createGain();
      source.buffer = cachedTrack.buffer;
      source.loop = true;
      source.loopStart = cachedTrack.loopStart;
      source.loopEnd = cachedTrack.loopEnd;
      gain.gain.value = 0.5;
      source.connect(gain);
      gain.connect(context.destination);
      started = context.currentTime;
      source.start(started, Math.min(offset, source.loopEnd - 0.001));
      status.hidden = true;
    } catch {
      if (request === pending) {
        stop();
        status.textContent = "暫時無法播放標題音樂。";
        status.hidden = false;
      }
    } finally {
      if (request === pending) pending = null;
    }
  }
  async function unlock() {
    if (released) return false;
    try {
      context ??= new (view.AudioContext ?? view.webkitAudioContext)();
      if (context.state !== "running") await context.resume();
      if (context.state !== "running" || released) return false;
      void play();
      return true;
    } catch { return false; }
  }
  function selectKnownBgm(id) {
    if (released || id === selected) return;
    stop();
    offset = 0;
    selected = id;
    void play();
  }
  function toggle(event) {
    event.stopImmediatePropagation();
    enabled = !enabled;
    showButton();
    if (!enabled) { stop(); return; }
    void unlock().then(ok => {
      if (!ok && !released && enabled) {
        enabled = false;
        showButton();
        status.textContent = "暫時無法開啟聲音。";
        status.hidden = false;
      }
    });
  }
  function visibility() {
    if (document.hidden) stop();
    else if (enabled) void unlock();
  }
  function release() {
    if (released) return;
    released = true;
    button.removeEventListener("click", toggle, true);
    document.removeEventListener("visibilitychange", visibility);
    stop();
    cachedTrack = null;
  }
  button.addEventListener("click", toggle, true);
  document.addEventListener("visibilitychange", visibility);
  showButton();
  return {
    unlock, release,
    selectBgm(id) { if ([0,7,null].includes(id)) selectKnownBgm(id); },
    selectFreeBgm(id) { if ([4,13,14,null].includes(id)) selectKnownBgm(id); },
    peekDecodedTrack() {
      return enabled && cachedTrack?.id === selected ? {id: selected, buffer: cachedTrack.buffer} : null;
    },
    get context() { return context; },
    get enabled() { return enabled; },
    destroy() { release(); if (context && context.state !== "closed") void context.close().catch(() => {}); }
  };
}
