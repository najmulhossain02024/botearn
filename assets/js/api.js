// আপনার সক্রিয় ক্লাউডফ্লেয়ার ওয়ার্কারের সঠিক ডোমেইন ইউআরএল
const API_BASE = "https://botearn.najmulhossain02024.workers.dev";

/**
 * টেলিগ্রাম মিনি অ্যাপ SDK এবং প্যারামিটার থেকে ডাইনামিক ইউজার আইডি ফিল্টার করা
 */
function getTelegramId() {
  // ১. প্রথমে রিয়েল-টাইম টেলিগ্রাম লাইভ সেশন চেক (WebApp API)
  if (
    window.Telegram &&
    window.Telegram.WebApp &&
    window.Telegram.WebApp.initDataUnsafe &&
    window.Telegram.WebApp.initDataUnsafe.user
  ) {
    return window.Telegram.WebApp.initDataUnsafe.user.id.toString();
  }

  // ২. লাইভ সেশন না থাকলে ব্যাকআপ ইউআরএল প্যারামিটার চেক
  const urlParams = new URLSearchParams(window.location.search);
  let tgId = urlParams.get("tg_id");
  if (tgId) {
    return tgId;
  }

  // ৩. লোকাল ব্রাউজার টেস্টিং করার জন্য ডামি আইডি
  return "123456789"; 
}

/**
 * গ্লোবাল নেটওয়ার্ক ফেচ ফাংশন (এপিআই রিকোয়েস্ট সহজ করার জন্য)
 */
async function apiRequest(endpoint, method = "GET", body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json"
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Something went wrong with the server.");
    }
    
    return data;
  } catch (error) {
    console.error("API Fetch Error:", error);
    alert(`Error: ${error.message}`);
    throw error;
  }
}
