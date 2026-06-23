const IMGBB_API_KEY = "825ac8d3aa672f702b9280266867ce21";

// ছবি সিলেক্ট করার সাথে সাথে ImgBB-তে আপলোড করা হবে
async function uploadImageToImgBB(event) {
  const file = event.target.files[0];
  if (!file) return;

  const uploadStatusDiv = document.getElementById("upload-status");
  const submitBtn = document.getElementById("btn-submit-task");
  const hiddenInput = document.getElementById("screenshot-uploaded-url");

  // আপলোড শুরু হওয়ার সাথে সাথে সাবমিট বোতাম ডিজেবল এবং প্রগ্রেস বার অ্যাক্টিভ
  uploadStatusDiv.innerText = "⏳ Uploading proof to cloud, please wait...";
  uploadStatusDiv.style.color = "var(--warning)";
  submitBtn.disabled = true;

  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData
    });
    
    const result = await response.json();

    if (result.success) {
      // আপলোড সফল হলে ডিরেক্ট ইমেজ লিংকটি হিডেন ইনপুটে সেভ হবে
      hiddenInput.value = result.data.url;
      uploadStatusDiv.innerText = "✅ Proof uploaded successfully!";
      uploadStatusDiv.style.color = "var(--success)";
      submitBtn.disabled = false; // সাবমিট বোতাম অন করুন
    } else {
      throw new Error("Upload failed");
    }
  } catch (error) {
    console.error("ImgBB Upload Error:", error);
    uploadStatusDiv.innerText = "❌ Upload failed. Please try again.";
    uploadStatusDiv.style.color = "var(--error)";
    submitBtn.disabled = true;
  }
}
