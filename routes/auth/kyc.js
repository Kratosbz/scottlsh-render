const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Create a MongoDB model for storing image URLs
const Image = mongoose.model('Image', {
  imageUrl: Array,
  owner: String,
  docNum: String,
  docEmail:String,
});

// Middleware to parse JSON in requests
router.use(express.json());

// Endpoint to store image URL
router.post('/kyc', async (req, res) => {
  try {
    const { imageUrl, owner, docNum,docEmail } = req.body;

    // Create a new document in the 'images' collection
    const image = new Image({ imageUrl, owner, docNum,docEmail });
    await image.save();

    res.status(201).json({ message: 'Image URL stored successfully' });
  } catch (error) {
    console.error('Error storing image URL:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Generic endpoint to handle 'kyc2' and 'kyc3' logic
router.post('/kyc/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const imageUrlKey = `imageUrl${type.slice(-1)}`; // Determines if it's kyc2 or kyc3
    const imageUrl = req.body[imageUrlKey];

    if (!imageUrl) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    // Create a new document in the 'images' collection
    const image = new Image({ imageUrl });
    await image.save();

    res.status(201).json({ message: `Image URL ${imageUrlKey} stored successfully` });
  } catch (error) {
    console.error('Error storing image URL:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint for fetching images
router.get('/kyc/fetch-images', async (req, res) => {
  try {
    const images = await Image.find();
    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.put("/:_id/kyc/approve", async (req, res) => {
  try {
    const { _id } = req.params;
    console.log("🔹 Approving KYC for user ID:", _id);

    // ✅ Validate ID
    if (!_id || _id === "undefined" || _id === "null") {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    // ✅ Find user
    const user = await UsersDatabase.findById(_id);
    if (!user) {
      console.warn("⚠️ User not found for ID:", _id);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ✅ Check if already verified
    if (user.kyc === "Verified") {
      console.log("ℹ️ User already verified:", user.email);
      return res.status(400).json({ success: false, message: "KYC already verified" });
    }

    // ✅ Update KYC status
    user.kyc = "Verified";
    user.kycApprovedAt = new Date();
    await user.save();

    console.log("✅ User KYC updated:", { email: user.email, status: user.kyc });

    // ✅ Send approval email
    try {
      await sendKYCApprovalEmail({
        email: user.email,
        firstName: user.firstName || "User",
      });
      console.log("📧 KYC approval email sent to:", user.email);
    } catch (emailError) {
      console.error("❌ Failed to send KYC approval email:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: "KYC verified successfully and email notification sent",
      user: {
        _id: user._id,
        email: user.email,
        kyc: user.kyc,
        kycApprovedAt: user.kycApprovedAt,
      },
    });

  } catch (error) {
    console.error("🔥 Error approving KYC:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while verifying KYC",
      error: error.message,
    });
  }
});

router.put("/:_id/kyc/reject", async (req, res) => {
  try {
    const { _id } = req.params;
    console.log("🔹 Rejecting KYC for user ID:", _id);

    // ✅ Validate ID
    if (!_id || _id === "undefined" || _id === "null") {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    // ✅ Find user
    const user = await UsersDatabase.findById(_id);
    if (!user) {
      console.warn("⚠️ User not found for ID:", _id);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ✅ Check if already rejected
    if (user.kyc === "Rejected") {
      console.log("ℹ️ User already rejected:", user.email);
      return res.status(400).json({ success: false, message: "KYC already rejected" });
    }

    // ✅ Update KYC status
    user.kyc = "Rejected";
    user.kycRejectedAt = new Date();
    await user.save();

    console.log("❌ User KYC updated:", { email: user.email, status: user.kyc });

    // ✅ Send rejection email
    try {
      await sendKYCRejectionEmail({
        email: user.email,
        firstName: user.firstName || "User",
      });
      console.log("📧 KYC rejection email sent to:", user.email);
    } catch (emailError) {
      console.error("❌ Failed to send KYC rejection email:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: "KYC rejected and email notification sent",
      user: {
        _id: user._id,
        email: user.email,
        kyc: user.kyc,
        kycRejectedAt: user.kycRejectedAt,
      },
    });

  } catch (error) {
    console.error("🔥 Error rejecting KYC:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while rejecting KYC",
      error: error.message,
    });
  }
});

module.exports = router;
