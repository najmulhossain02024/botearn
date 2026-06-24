let currentActiveTaskId = null;
let currentActiveTaskType = null; // 'vip' or 'code'
let savedPaymentProfileData = null;

// পেজ পরিবর্তন বা নেভিগেশন কন্ট্রোল (SPA Engine)
function switchScreen(screenId, navElement) {
  document.querySelectorAll(".app-screen").forEach((screen) => {
    screen.classList.remove("active");
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });

  document.getElementById(screenId).classList.add("active");
  navElement.classList.add("active");

  // প্রতিবার ট্যাব পরিবর্তনের সময় ডেটা লাইভ রিলোড
  if (screenId === "screen-earning") {
    loadEarningTasks();
  } else if (screenId === "screen-dashboard") {
    loadUserData();
  }
}

// ইউজারের ব্যালেন্স এবং হিস্টোরি লোড
async function loadUserData() {
  const tg_id = getTelegramId();
  try {
    const data = await apiRequest(`/api/user?tg_id=${tg_id}`, "GET");
    
    // ড্যাশবোর্ড ডেটা অ্যাসাইনমেন্ট
    document.getElementById("header-name").innerText = data.user.first_name || "Guest";
    document.getElementById("header-id").innerText = `ID: ${data.user.tg_id}`;
    document.getElementById("main-balance").innerText = parseFloat(data.user.balance).toFixed(4);
    document.getElementById("pending-balance").innerText = parseFloat(data.user.pending_balance).toFixed(4);
    
    document.getElementById("stat-ref-count").innerText = data.referral_count || 0;
    document.getElementById("stat-ref-earnings").innerText = `$${(data.referral_count * 0.50).toFixed(2)}`;

    // বিজ্ঞপ্তির প্রগ্রেস এবং বোতাম লেবেল সেটআপ
    const adsClaimed = data.stats ? data.stats.ads_claimed_today : 0;
    document.getElementById("ad-count-text").innerText = `${adsClaimed}/50`;
    document.getElementById("ad-action-label").innerText = getAdLabel(adsClaimed);

    // ডাইনামিক রেফারেল লিংক জেনারেশন (আপনার মিনি অ্যাপের ইনপুট বক্সে লিংকটি সেটআপ করা হলো)
    document.getElementById("referral-link").value = `https://t.me/GlobalMintbot?start=ref_${tg_id}`;

    // রেফারেল তালিকা রিয়েল-টাইমে টেবিল আকারে রেন্ডার করা হলো
    const refTableBody = document.getElementById("referrals-table-body");
    if (data.referral_list && data.referral_list.length > 0) {
      refTableBody.innerHTML = ""; // আগের ডামি নোটিশ ডিলিট
      data.referral_list.forEach((ref) => {
        const name = ref.username ? `@${ref.username}` : ref.first_name;
        const earned = parseFloat(ref.balance).toFixed(2);
        refTableBody.innerHTML += `
          <tr>
            <td>${name}</td>
            <td>$${earned}</td>
            <td><span class="badge" style="background-color: var(--success);">Active</span></td>
          </tr>`;
      });
    } else {
      refTableBody.innerHTML = `<tr><td colspan="3" class="empty-msg">No referrals yet. Invite friends to grow!</td></tr>`;
    }
    // পেমেন্ট প্রোফাইল ডেটা পপুলেট
    if (data.user.payment_details) {
      savedPaymentProfileData = JSON.parse(data.user.payment_details);
      renderSavedPaymentInfo();
    }
// উইথড্র হিস্টোরি তালিকা রিয়েল-টাইমে রেন্ডার করা হলো
    const historyList = document.getElementById("withdrawal-history-list");
    if (data.withdrawals && data.withdrawals.length > 0) {
      historyList.innerHTML = ""; // পুরনো ফাকা মেসেজ ডিলিট
      data.withdrawals.forEach((w) => {
        // স্ট্যাটাস অনুযায়ী ব্যাজের ব্যাকগ্রাউন্ড কালার নির্ধারণ
        const statusColor = w.status === "approved" ? "var(--success)" : (w.status === "rejected" ? "var(--error)" : "var(--warning)");
        const statusText = w.status.toUpperCase();
        
        historyList.innerHTML += `
          <div class="single-task-row" style="margin-bottom: 10px;">
            <div class="task-info-side">
              <h4>Withdrawal: $${parseFloat(w.amount).toFixed(2)}</h4>
              <span style="color: var(--text-secondary); font-weight: normal;">Method: ${w.method.toUpperCase()}</span>
            </div>
            <span class="badge" style="background-color: ${statusColor}; color: #fff; padding: 4px 10px;">${statusText}</span>
          </div>`;
      });
    } else {
      historyList.innerHTML = `<p class="empty-msg">No withdrawals made yet.</p>`;
    }
    // অ্যাপ ওপেন করার সাথে সাথে ডেইলি বোনাসের কাউন্টডাউন টাইমার চেক করা হবে
    updateDailyBonusTimer(tg_id);

  } catch (error) {
    console.error("Load User Data Failed:", error);
  }
}

// ডেইলি বোনাস ক্লেম করার রিকোয়েস্ট
async function claimDailyBonus() {
  const tg_id = getTelegramId();
  try {
    const response = await apiRequest("/api/claim-daily", "POST", { tg_id });
    alert(response.message);
    
    // সাকসেসফুল ক্লেম হওয়ার সাথে সাথে লোকাল স্টোরেজে টাইম সেভ করা হচ্ছে
    localStorage.setItem(`daily_bonus_claim_${tg_id}`, Date.now().toString());
    
    // টাইমার স্ক্রিনে সচল এবং ব্যালেন্স রিলোড
    updateDailyBonusTimer(tg_id);
    loadUserData();
  } catch (e) {
    // Error handled by apiRequest helper
  }
}

// টাস্ক ২ এবং ৩ লিস্ট রেন্ডার ও লোড লজিক
// গ্লোবাল অবজেক্ট টাস্ক ডাটা ক্যাশ রাখার জন্য (স্পেশাল ক্যারেক্টার ক্র্যাশ এড়াতে)
window.vipTasksCache = {};
window.codeTasksCache = {};

// টাস্ক ২ এবং ৩ লিস্ট রেন্ডার ও লোড লজিক (সর্বোচ্চ ২টি এবং কমপ্লিটেড টাস্ক উধাও করার সিস্টেম)
async function loadEarningTasks() {
  const tg_id = getTelegramId();
  const vipBox = document.getElementById("vip-tasks-list");
  const codeBox = document.getElementById("code-tasks-list");

  vipBox.innerHTML = "<p class='empty-msg'>Loading VIP Tasks...</p>";
  codeBox.innerHTML = "<p class='empty-msg'>Loading Code Tasks...</p>";

  try {
    const data = await apiRequest(`/api/tasks?tg_id=${tg_id}`, "GET");

    // ক্যাশ ডাটা ক্লিয়ার করা হচ্ছে
    window.vipTasksCache = {};
    window.codeTasksCache = {};

    // ১. VIP (টাস্ক ২) রেন্ডার - সর্বোচ্চ ২টি এবং কমপ্লিটেড টাস্ক ফিল্টার
    let vipRenderCount = 0;
    let vipHtml = "";

    data.vip.forEach((task) => {
      // ক্যাশে সেভ করা হচ্ছে
      window.vipTasksCache[task.id] = task;

      // চেক করুন কাজটি ইউজার আগে করেছে কি না
      const isDone = data.completed_vip.find(c => c.task_id === task.id);
      
      // কাজটি করা থাকলে লিস্ট থেকে সম্পূর্ণ উধাও (Skip) করে দেবে
      if (isDone) return;

      // তালিকায় সর্বোচ্চ ২টি দেখাবে
      if (vipRenderCount >= 2) return;

      vipHtml += `
        <div class="single-task-row">
          <div class="task-info-side">
            <h4>${task.title}</h4>
            <span>+$${task.reward}</span>
          </div>
          <button class="action-btn" onclick="openVipTaskModal(${task.id})">Open</button>
        </div>`;
      vipRenderCount++;
    });

    vipBox.innerHTML = vipHtml || "<p class='empty-msg'>No VIP Tasks available.</p>";

    // ২. Code Tasks (টাস্ক ৩) রেন্ডার - সর্বোচ্চ ২টি এবং কমপ্লিটেড টাস্ক ফিল্টার
    let codeRenderCount = 0;
    let codeHtml = "";

    data.code.forEach((task) => {
      // ক্যাশে সেভ করা হচ্ছে
      window.codeTasksCache[task.id] = task;

      // চেক করুন কোডটি আগে সাবমিট করা হয়েছে কি না
      const isDone = data.completed_code.find(c => c.task_id === task.id);
      
      // কাজটি করা থাকলে লিস্ট থেকে সম্পূর্ণ উধাও (Skip) করে দেবে
      if (isDone) return;

      // তালিকায় সর্বোচ্চ ২টি দেখাবে
      if (codeRenderCount >= 2) return;

      codeHtml += `
        <div class="single-task-row">
          <div class="task-info-side">
            <h4>${task.title}</h4>
            <span>+$${task.reward}</span>
          </div>
          <button class="action-btn" onclick="openCodeTaskModal(${task.id})">Open</button>
        </div>`;
      codeRenderCount++;
    });

    codeBox.innerHTML = codeHtml || "<p class='empty-msg'>No Code Tasks available.</p>";

  } catch (error) {
    console.error("Error loading tasks:", error);
  }
}

// VIP টাস্ক ওপেন করার নিরাপদ ডাইনামিক হেল্পার (ক্র্যাশ প্রতিরোধক)
function openVipTaskModal(id) {
  const task = window.vipTasksCache[id];
  if (!task) return;
  openTaskModal(task.id, 'vip', task.title, task.instructions, task.link);
}

// Code টাস্ক ওপেন করার নিরাপদ ডাইনামিক হেল্পার (ক্র্যাশ প্রতিরোধক)
function openCodeTaskModal(id) {
  const task = window.codeTasksCache[id];
  if (!task) return;
  openTaskModal(task.id, 'code', task.title, 'Visit the website, perform 5 to 10 clicks, stay minimum 3 seconds and copy-paste the secret code.', task.link);
}

// কাজ খোলার পর মোডাল পপআপ প্রদর্শন
function openTaskModal(id, type, title, desc, link) {
  currentActiveTaskId = id;
  currentActiveTaskType = type;

  document.getElementById("modal-task-title").innerText = title;
  document.getElementById("modal-task-desc").innerText = desc;
  document.getElementById("modal-task-link").href = link;

  document.getElementById("proof-screenshot-block").classList.add("hidden");
  document.getElementById("proof-code-block").classList.add("hidden");

  // প্রুফ ইনপুট টাইপ নির্ধারণ
  if (type === "vip") {
    document.getElementById("proof-screenshot-block").classList.remove("hidden");
  } else {
    document.getElementById("proof-code-block").classList.remove("hidden");
  }

  document.getElementById("task-modal").classList.remove("hidden");
}

function closeTaskModal() {
  document.getElementById("task-modal").classList.add("hidden");
}

// টাস্ক ৩ এর জন্য ৩ সেকেন্ডের রিয়েল-টাইম টাইমার সচল করা
function startTaskCounter() {
  if (currentActiveTaskType === "code") {
    let secondsLeft = 3;
    const timerDiv = document.getElementById("modal-cooldown-timer");
    const submitBtn = document.getElementById("btn-submit-task");
    
    timerDiv.classList.remove("hidden");
    submitBtn.disabled = true;

    const interval = setInterval(() => {
      secondsLeft--;
      timerDiv.innerText = `Please wait ${secondsLeft}s on the page...`;
      if (secondsLeft <= 0) {
        clearInterval(interval);
        timerDiv.classList.add("hidden");
        submitBtn.disabled = false;
      }
    }, 1000);
  }
}

// কাজ শেষ করে ডাটা সাবমিট করা
async function submitTaskProof() {
  const tg_id = getTelegramId();
  
  if (currentActiveTaskType === "vip") {
    const screenshotUrl = document.getElementById("screenshot-uploaded-url").value;
    if (!screenshotUrl) {
      alert("Please upload a proof screenshot first.");
      return;
    }
    await apiRequest("/api/submit-vip", "POST", { tg_id, task_id: currentActiveTaskId, screenshot_url: screenshotUrl });
  } else {
    const submittedCode = document.getElementById("submitted-secret-code").value;
    if (!submittedCode) {
      alert("Please enter the verification code.");
      return;
    }
    await apiRequest("/api/submit-code", "POST", { tg_id, task_id: currentActiveTaskId, code_submitted: submittedCode });
  }

  alert("Task submitted successfully!");
  closeTaskModal();
  loadEarningTasks();
}

// পেমেন্ট ফিল্ড পরিবর্তন হ্যান্ডলার
function togglePaymentFields() {
  const value = document.getElementById("payment-gateway").value;
  document.getElementById("group-phone").classList.add("hidden");
  document.getElementById("group-email").classList.add("hidden");
  document.getElementById("group-crypto").classList.add("hidden");
  document.getElementById("group-bank").classList.add("hidden");

  if (value === "paypal") {
    document.getElementById("group-email").classList.remove("hidden");
  } else if (value === "usdt") {
    document.getElementById("group-crypto").classList.remove("hidden");
  } else if (value === "bank") {
    document.getElementById("group-bank").classList.remove("hidden");
  } else {
    document.getElementById("group-phone").classList.remove("hidden");
  }
}

// অ্যাকাউন্ট সেটিংসে পেমেন্ট প্রোফাইল সেভ করা
async function savePaymentProfile() {
  const tg_id = getTelegramId();
  const gateway = document.getElementById("payment-gateway").value;

  const profileData = { gateway };

  if (gateway === "paypal") {
    profileData.email = document.getElementById("pay-email").value;
  } else if (gateway === "usdt") {
    profileData.wallet = document.getElementById("pay-crypto").value;
  } else if (gateway === "bank") {
    profileData.bank_name = document.getElementById("pay-bank-name").value;
    profileData.bank_acc = document.getElementById("pay-bank-acc").value;
    profileData.bank_swift = document.getElementById("pay-bank-swift").value;
    profileData.bank_holder = document.getElementById("pay-bank-holder").value;
  } else {
    profileData.phone = document.getElementById("pay-phone").value;
  }

  await apiRequest("/api/update-payment", "POST", { tg_id, payment_json: profileData });
  alert("Profile saved!");
  loadUserData();
}

// উইথড্র স্ক্রিনে সেভ করা প্রোফাইল রেন্ডার
function renderSavedPaymentInfo() {
  if (!savedPaymentProfileData) return;
  const preview = document.getElementById("withdraw-info-preview");
  const gw = savedPaymentProfileData.gateway.toUpperCase();

  if (savedPaymentProfileData.gateway === "paypal") {
    preview.innerHTML = `💳 <strong>${gw}</strong>: ${savedPaymentProfileData.email}`;
  } else if (savedPaymentProfileData.gateway === "usdt") {
    preview.innerHTML = `💳 <strong>${gw}</strong>: ${savedPaymentProfileData.wallet}`;
  } else if (savedPaymentProfileData.gateway === "bank") {
    preview.innerHTML = `🏦 <strong>${gw}</strong><br>Acc Name: ${savedPaymentProfileData.bank_holder}<br>Acc No: ${savedPaymentProfileData.bank_acc}<br>Swift: ${savedPaymentProfileData.bank_swift}`;
  } else {
    preview.innerHTML = `📱 <strong>${gw}</strong>: ${savedPaymentProfileData.phone}`;
  }
}

// টাকা উত্তোলনের জন্য রিকোয়েস্ট সাবমিট
async function submitWithdrawal() {
  const tg_id = getTelegramId();
  const amount = parseFloat(document.getElementById("withdraw-amount").value);

  if (!amount || amount < 30) {
    alert("Minimum withdraw amount is $30.");
    return;
  }

  if (!savedPaymentProfileData) {
    alert("Please set up and save your Payment Profile first under Account Tab.");
    return;
  }

  const method = savedPaymentProfileData.gateway;
  let info = "";
  if (method === "paypal") info = savedPaymentProfileData.email;
  else if (method === "usdt") info = savedPaymentProfileData.wallet;
  else if (method === "bank") info = `${savedPaymentProfileData.bank_holder} | ${savedPaymentProfileData.bank_acc} | ${savedPaymentProfileData.bank_name}`;
  else info = savedPaymentProfileData.phone;

  await apiRequest("/api/withdraw", "POST", { tg_id, amount, method_name: method, account_info: info });
  alert("Withdrawal request sent successfully!");
  loadUserData();
}

// রুলস ডায়ালগ বক্স কন্ট্রোল
function openRules() { document.getElementById("rules-modal").classList.remove("hidden"); }
function closeRules() { document.getElementById("rules-modal").classList.add("hidden"); }

// রেফারেল লিংক কপি করুন
function copyReferralLink() {
  const linkBox = document.getElementById("referral-link");
  linkBox.select();
  document.execCommand("copy");
  alert("Referral Link Copied!");
}

// ২৪ ঘণ্টার ডেইলি বোনাস কাউন্টডাউন টাইমার কন্ট্রোলার
function updateDailyBonusTimer(tg_id) {
  const btn = document.getElementById("btn-daily-bonus");
  if (!btn) return;

  const lastClaim = localStorage.getItem(`daily_bonus_claim_${tg_id}`);
  if (!lastClaim) {
    btn.disabled = false;
    btn.innerText = "Claim $0.10";
    return;
  }

  const timePassed = Date.now() - parseInt(lastClaim);
  const cooldown = 24 * 60 * 60 * 1000; // ২৪ ঘণ্টা মিলি-সেকেন্ডে

  if (timePassed < cooldown) {
    btn.disabled = true;
    const timeLeft = cooldown - timePassed;

    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);

    // বাটনের ওপর কাউন্টডাউন টাইমার টেক্সট প্রদর্শন
    btn.innerText = `Claimed (Retry in ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')})`;

    // প্রতি সেকেন্ডে রিয়েল-টাইমে রিলোড
    setTimeout(() => updateDailyBonusTimer(tg_id), 1000);
  } else {
    btn.disabled = false;
    btn.innerText = "Claim $0.10";
    localStorage.removeItem(`daily_bonus_claim_${tg_id}`);
  }
}

// অ্যাপ খোলার সাথে সাথে অটো ডেটা লোড
window.onload = function() {
  loadUserData();
};
