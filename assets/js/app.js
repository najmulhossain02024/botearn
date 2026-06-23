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

    // পেমেন্ট প্রোফাইল ডেটা পপুলেট
    if (data.user.payment_details) {
      savedPaymentProfileData = JSON.parse(data.user.payment_details);
      renderSavedPaymentInfo();
    }
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
    loadUserData();
  } catch (e) {
    // Error handled by apiRequest helper
  }
}

// টাস্ক ২ এবং ৩ লিস্ট রেন্ডার ও লোড লজিক
async function loadEarningTasks() {
  const tg_id = getTelegramId();
  const vipBox = document.getElementById("vip-tasks-list");
  const codeBox = document.getElementById("code-tasks-list");

  vipBox.innerHTML = "<p class='empty-msg'>Loading VIP Tasks...</p>";
  codeBox.innerHTML = "<p class='empty-msg'>Loading Code Tasks...</p>";

  try {
    const data = await apiRequest(`/api/tasks?tg_id=${tg_id}`, "GET");

    // VIP (টাস্ক ২) রেন্ডার
    if (data.vip.length === 0) {
      vipBox.innerHTML = "<p class='empty-msg'>No VIP Tasks available.</p>";
    } else {
      vipBox.innerHTML = "";
      data.vip.forEach((task) => {
        const isDone = data.completed_vip.find(c => c.task_id === task.id);
        const btnHtml = isDone 
          ? `<button class="action-btn" style="background-color:gray;" disabled>${isDone.status.toUpperCase()}</button>`
          : `<button class="action-btn" onclick="openTaskModal(${task.id}, 'vip', '${task.title}', '${task.instructions}', '${task.link}')">Open</button>`;

        vipBox.innerHTML += `
          <div class="single-task-row">
            <div class="task-info-side">
              <h4>${task.title}</h4>
              <span>+$${task.reward}</span>
            </div>
            ${btnHtml}
          </div>`;
      });
    }

    // Code Tasks (টাস্ক ৩) রেন্ডার
    if (data.code.length === 0) {
      codeBox.innerHTML = "<p class='empty-msg'>No Code Tasks available.</p>";
    } else {
      codeBox.innerHTML = "";
      data.code.forEach((task) => {
        const isDone = data.completed_code.find(c => c.task_id === task.id);
        const btnHtml = isDone 
          ? `<button class="action-btn" style="background-color:gray;" disabled>CLAIMED</button>`
          : `<button class="action-btn" onclick="openTaskModal(${task.id}, 'code', '${task.title}', 'Visit the website, perform 5 clicks, stay 3 seconds and copy-paste the code.', '${task.link}')">Open</button>`;

        codeBox.innerHTML += `
          <div class="single-task-row">
            <div class="task-info-side">
              <h4>${task.title}</h4>
              <span>+$${task.reward}</span>
            </div>
            ${btnHtml}
          </div>`;
      });
    }
  } catch (error) {
    console.error("Error loading tasks:", error);
  }
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

// অ্যাপ খোলার সাথে সাথে অটো ডেটা লোড
window.onload = function() {
  loadUserData();
};
