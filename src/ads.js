/**
 * ads.js - Google H5 Games Ad Placement API Integration Wrapper
 * Spec: Interstitial on completion, Rewarded Ad for hints, CLS-safe banner layout.
 * Includes interactive fallback simulator when testing without live AdSense/Ad Placement script.
 */

export class AdManager {
  constructor(options = {}) {
    this.publisherId = options.publisherId || 'ca-pub-placeholder';
    this.isInitialized = false;
    this.adBreakFn = null;
    this.adConfigFn = null;
    this.soundMutedByAd = false;
    this.onMuteAudio = options.onMuteAudio || (() => {});
    this.onUnmuteAudio = options.onUnmuteAudio || (() => {});
    this.init();
  }

  init() {
    window.adsbygoogle = window.adsbygoogle || [];
    this.adBreakFn = window.adBreak = window.adBreak || function(o) { window.adsbygoogle.push(o); };
    this.adConfigFn = window.adConfig = window.adConfig || function(o) { window.adsbygoogle.push(o); };

    try {
      this.adConfigFn({
        preloadAdBreaks: 'on',
        sound: 'on',
        onReady: () => {
          this.isInitialized = true;
          console.log('[AdManager] Google H5 Ad Placement API is ready.');
        }
      });
    } catch (e) {
      console.warn('[AdManager] Init error, falling back to simulated mode:', e);
    }
  }

  /**
   * Check if live Google Ad Placement API is actually loaded in DOM
   */
  hasLiveApi() {
    return typeof window.adBreak === 'function' && 
           window.adsbygoogle && 
           window.adsbygoogle.loaded === true;
  }

  /**
   * Trigger Interstitial Ad (e.g. after completing daily puzzle)
   */
  showInterstitial({ name = 'puzzle_complete', onStart = () => {}, onComplete = () => {} } = {}) {
    console.log(`[AdManager] Requesting Interstitial: ${name}`);
    this.onMuteAudio();
    onStart();

    if (this.hasLiveApi()) {
      window.adBreak({
        type: 'next',
        name,
        beforeAd: () => {
          this.onMuteAudio();
        },
        afterAd: () => {
          this.onUnmuteAudio();
        },
        adBreakDone: (placementInfo) => {
          console.log('[AdManager] Interstitial done:', placementInfo);
          this.onUnmuteAudio();
          onComplete();
        }
      });
    } else {
      // Graceful fallback for local development or adblockers
      this.showSimulatedInterstitial(name, () => {
        this.onUnmuteAudio();
        onComplete();
      });
    }
  }

  /**
   * Trigger Rewarded Ad for Hint
   */
  showRewardedHint({ onRewardGranted = () => {}, onDismissed = () => {} } = {}) {
    console.log('[AdManager] Requesting Rewarded Ad for Hint');
    this.onMuteAudio();

    if (this.hasLiveApi()) {
      let rewardGranted = false;
      window.adBreak({
        type: 'reward',
        name: 'hint_reward',
        beforeAd: () => {
          this.onMuteAudio();
        },
        afterAd: () => {
          this.onUnmuteAudio();
        },
        beforeReward: (showAdFn) => {
          // Immediately proceed to show ad
          showAdFn();
        },
        adDismissed: () => {
          console.log('[AdManager] Rewarded Ad dismissed early');
          this.onUnmuteAudio();
          if (!rewardGranted) {
            onDismissed();
          }
        },
        adViewed: () => {
          console.log('[AdManager] Rewarded Ad watched completely');
          rewardGranted = true;
          this.onUnmuteAudio();
          onRewardGranted();
        },
        adBreakDone: () => {
          this.onUnmuteAudio();
        }
      });
    } else {
      // Interactive simulated rewarded ad modal for development & testing
      this.showSimulatedRewardedAd(() => {
        this.onUnmuteAudio();
        onRewardGranted();
      }, () => {
        this.onUnmuteAudio();
        onDismissed();
      });
    }
  }

  /**
   * Simulated Interstitial Modal (Flashes briefly or allows quick dismiss)
   */
  showSimulatedInterstitial(name, onDone) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4 text-white text-center animate-fade-in';
    modal.innerHTML = `
      <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
        <div class="text-xs font-semibold tracking-wider text-amber-400 uppercase mb-2">Google H5 Ad Placement API</div>
        <div class="text-lg font-bold mb-3">Sponsor Interstitial</div>
        <div class="h-40 bg-gradient-to-tr from-indigo-900 to-purple-900 rounded-xl flex flex-col items-center justify-center p-4 mb-4 border border-indigo-700/50">
          <span class="text-3xl mb-2">🎮</span>
          <span class="text-sm font-medium text-slate-200">Featured Web Game</span>
          <span class="text-xs text-slate-400 mt-1">Simulated Ad Slot (#${name})</span>
        </div>
        <button id="sim-interstitial-close" class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-medium rounded-xl text-sm shadow-lg shadow-indigo-600/30">
          Continue to Game
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#sim-interstitial-close');
    const finish = () => {
      modal.remove();
      onDone();
    };
    closeBtn.addEventListener('click', finish);
    setTimeout(finish, 2500); // Auto-dismiss after 2.5s for seamless testing
  }

  /**
   * Simulated Rewarded Ad with countdown timer
   */
  showSimulatedRewardedAd(onReward, onDismiss) {
    let timeLeft = 3;
    let completed = false;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 text-white text-center backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
        <div class="flex items-center justify-between text-xs font-semibold tracking-wider text-amber-400 uppercase mb-3">
          <span>Rewarded Video Ad</span>
          <span id="sim-ad-timer" class="bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 font-mono">Reward in ${timeLeft}s</span>
        </div>
        <div class="h-48 bg-gradient-to-br from-amber-950/60 to-slate-950 rounded-xl flex flex-col items-center justify-center p-4 mb-4 border border-amber-500/20">
          <div class="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl mb-2 animate-bounce">
            💡
          </div>
          <span class="text-sm font-semibold text-amber-200">Watch to Unlock Daily Hint</span>
          <span class="text-xs text-slate-400 mt-1">Google Ad Placement API: Rewarded Format</span>
          <div class="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
            <div id="sim-ad-progress" class="bg-amber-400 h-1.5 transition-all duration-1000 ease-linear" style="width: 0%"></div>
          </div>
        </div>
        <div class="flex gap-2">
          <button id="sim-ad-cancel" class="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-medium transition-all">
            Cancel
          </button>
          <button id="sim-ad-claim" disabled class="flex-1 py-2 px-3 bg-slate-700 text-slate-500 rounded-xl text-xs font-medium transition-all cursor-not-allowed">
            Wait ${timeLeft}s...
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const timerEl = modal.querySelector('#sim-ad-timer');
    const progEl = modal.querySelector('#sim-ad-progress');
    const claimBtn = modal.querySelector('#sim-ad-claim');
    const cancelBtn = modal.querySelector('#sim-ad-cancel');

    const interval = setInterval(() => {
      timeLeft -= 1;
      const pct = ((3 - timeLeft) / 3) * 100;
      progEl.style.width = `${pct}%`;

      if (timeLeft <= 0) {
        clearInterval(interval);
        completed = true;
        timerEl.textContent = 'Reward Ready! ✓';
        timerEl.className = 'bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-400 font-mono';
        claimBtn.disabled = false;
        claimBtn.className = 'flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/30 transition-all cursor-pointer';
        claimBtn.textContent = 'Claim Hint 💡';
      } else {
        timerEl.textContent = `Reward in ${timeLeft}s`;
        claimBtn.textContent = `Wait ${timeLeft}s...`;
      }
    }, 1000);

    claimBtn.addEventListener('click', () => {
      clearInterval(interval);
      modal.remove();
      onReward();
    });

    cancelBtn.addEventListener('click', () => {
      clearInterval(interval);
      modal.remove();
      if (!completed) {
        onDismiss();
      }
    });
  }
}
