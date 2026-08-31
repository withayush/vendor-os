import * as vendorService from "../services/vendor.service.js";

// 1. Create Vendor Profile
export const createVendorProfile = async (req, res, next) => {
  try {
    const accountId = req.user.accountId;
    const vendor = await vendorService.createProfile(accountId, req.body);

    return res.status(201).json({
      success: true,
      message: "Vendor profile created successfully.",
      data: { vendor }
    });
  } catch (error) {
    console.error("Error in createVendorProfile:", error);
    next(error);
  }
};

// 2. Get Vendor Profile
export const getVendorProfile = async (req, res, next) => {
  try {
    const accountId = req.user.accountId;
    const vendor = await vendorService.getProfile(accountId);

    return res.status(200).json({
      success: true,
      data: { vendor }
    });
  } catch (error) {
    console.error("Error in getVendorProfile:", error);
    next(error);
  }
};

// 3. Update Vendor Profile
export const updateVendorProfile = async (req, res, next) => {
  try {
    const accountId = req.user.accountId;
    const vendor = await vendorService.updateProfile(accountId, req.body);

    return res.status(200).json({
      success: true,
      message: "Vendor profile updated successfully.",
      data: { vendor }
    });
  } catch (error) {
    console.error("Error in updateVendorProfile:", error);
    next(error);
  }
};