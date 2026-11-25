// Both ending menus use the same stock campaign launcher.
let launchCampaign = null;

export function registerReplayStart(launch) {
  if (typeof launch !== 'function') throw new TypeError('Expected a campaign launcher');
  launchCampaign = launch;
}

const replayTarget = 0x08027f9a;

export function connectReplayMenu({ ending, readCompletion, isCurrent, readScreen, repaint, onError }) {
  let state = 'ready';
  const isHeld = () => {
    if (!isCurrent()) return false;
    const view = readScreen();
    return view.screen === 'held-native-replay-success' && view.native === replayTarget;
  };

  async function start() {
    try {
      if (state === 'starting' || state === 'started' || !isHeld()) return;
      state = 'starting';
      repaint();
      const current = () => state === 'starting' && isHeld();
      const completion = readCompletion();
      if (!completion || !current()) throw new Error('The completion record has changed');
      const { origin, campaign, settings, previousCycle } = completion;
      if (!launchCampaign || (await launchCampaign({ ending, origin, campaign, settings, previousCycle, isCurrent: current })) !== true) {
        throw new Error('The second playthrough could not be started');
      }
      state = 'started';
    } catch (error) {
      state = 'failed';
      if (isCurrent()) {
        repaint();
        onError(error);
      }
    }
  }

  return Object.freeze({
    afterDispatch(view) {
      if (view.screen !== 'held-native-replay-success') return repaint();
      void start();
      return true;
    },
    get failed() { return state === 'failed'; },
    retry() { if (state === 'failed') void start(); }
  });
}
