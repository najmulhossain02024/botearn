// আপনার ক্লাউডফ্লেয়ার ওয়ার্কারের মূল ডোমেইন বা ইউআরএল
const API_BASE = "https://earnbot.najmulhossain02024.workers.dev";

// টেলিগ্রাম মিনি অ্যাপ থেকে 'tg_id' প্যারামিটার সংগ্রহ করা
function getTelegramId() {
  const urlParams = new URLSearchParams(window.location.search);
  let tgId = urlParams.get("tg_id");
  
  if (!tgId) {
    // লোকাল ব্রাউজারে টেস্টিং করার জন্য একটি ডামি আইডি (লাইভ অ্যাপে এটি টেলিগ্রাম থেকে আসবে)
    tgId = "123456789"; 
  }
  return tgId;
}

// গ্লোবাল নেটওয়ার্ক ফেচ ফাংশন (এপিআই রিকোয়েস্ট সহজ করার জন্য)
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
      throw new Error(data.error || "Something went wrong");
    }
    return data;
  } catch (error) {
    console.error("API Error:", error);
    alert(`Error: ${error.message}`);
    throw error;
  }
}
