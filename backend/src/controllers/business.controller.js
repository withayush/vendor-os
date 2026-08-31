import * as businessService from "../services/business.service.js";

// =========================================================
// 1. CREATE OR UPDATE BUSINESS (Idempotent Onboarding Wizard)
// =========================================================
export const createBusiness = async (req, res, next) => {
  try {
    const accountId = req.user.accountId; 
    const business = await businessService.onboardBusiness(accountId, req.body);

    return res.status(201).json({
      success: true,
      message: "Business profile saved successfully.",
      data: { business }
    });
  } catch (error) {
    console.error("Error in createBusiness:", error);
    next(error);
  }
};

// =========================================================
// 2. GET USER BUSINESS (For Dashboard Check)
// =========================================================
export const getUserBusinesses = async (req, res, next) => {
  try {
    const accountId = req.user.accountId;
    const business = await businessService.getUserBusiness(accountId);

    return res.status(200).json({
      success: true,
      data: { business }
    });
  } catch (error) {
    console.error("Error in getUserBusinesses:", error);
    next(error);
  }
};

// =========================================================
// 3. ADD MEMBER / STAFF TO BUSINESS
// =========================================================
export const addBusinessMember = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { phone, role } = req.body; 

    const member = await businessService.addMember(businessId, phone, role);

    return res.status(201).json({
      success: true,
      message: "Staff member added successfully.",
      data: { member }
    });
  } catch (error) {
    console.error("Error in addBusinessMember:", error);
    next(error);
  }
};

// =========================================================
// 4. GET BUSINESS BY ID
// =========================================================
export const getBusinessById = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const business = await businessService.getBusinessById(businessId);

    return res.status(200).json({
      success: true,
      data: { business },
    });
  } catch (error) {
    console.error("Error in getBusinessById:", error);
    next(error);
  }
};

// =========================================================
// 5. UPDATE BUSINESS
// =========================================================
export const updateBusiness = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const business = await businessService.updateBusiness(businessId, req.body);

    return res.status(200).json({
      success: true,
      message: "Business profile updated successfully.",
      data: { business },
    });
  } catch (error) {
    console.error("Error in updateBusiness:", error);
    next(error);
  }
};