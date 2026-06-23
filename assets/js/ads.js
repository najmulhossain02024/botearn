let adCooldownActive = false;

// বিজ্ঞাপন ক্লেম বোতামের টেক্সট পরিবর্তনের লজিক
function getAdLabel(adsClaimed) {
  const labels = ["Watch Now", "Play Now", "Click Now", "Continue Now"];
  return labels[adsClaimed % labels.length];
}

// Monetag SDK কল এবং ওয়াচ ভেরিফিকেশন লজিক
async function triggerMonetagAd() {
  const tg_id = getTelegramId();
  
  if (adCooldownActive) {
    alert("Cooldown is active. Please wait for the timer to finish.");
    return;
  }

  try {
    // ১. Monetag interstitial/Rewarded SDK রান
    if (typeof show_11190428 === "function") {
      show_11190428().then(async () => {
        // ২. বিজ্ঞাপন দেখা সফল হলে ব্যাকএন্ডের এপিআই কল হবে
        const response = await apiRequest("/api/claim-ad", "POST", { tg_id });
        if (response.success) {
          alert(`🎉 Congratulation! You earned $${response.reward_earned}`);
          
          // ড্যাশবোর্ড এবং ব্যালেন্স রিয়েল-টাইমে রেন্ডার
          loadUserData();
          
          // ২ মিনিটের লোকাল ও ডাইনামিক কুলডাউন লক সচল করুন
          startAdCooldown(120);
        }
      }).catch((err) => {
        alert("Failed to play the ad or ad was closed too early.");
        console.error("Monetag closed error:", err);
      });
    } else {
      alert("Ad network initialization failed. Please reload the Mini App.");
    }
  } catch (error) {
    console.error("Ad Claim Error:", error);
  }
}

// ২ মিনিটের কাউন্টডাউন টাইমার কন্ট্রোল
function startAdCooldown(seconds) {
  const timerDiv = document.getElementById("ad-cooldown-timer");
  const watchBtn = document.getElementById("btn-watch-ad");
  adCooldownActive = true;
  
  watchBtn.disabled = true;
  timerDiv.classList.remove("hidden");

  let remaining = seconds;
  const interval = setInterval(() => {
    remaining--;
    const minutes = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timerDiv.innerText = `Next Ad in ${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (remaining <= 0) {
      clearInterval(interval);
      adCooldownActive = false;
      watchBtn.disabled = false;
      timerDiv.classList.add("hidden");
    }
  }, 1000);
}
