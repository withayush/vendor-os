import { pool } from "../db/db.js";
import * as businessRepo from "../repositories/business.repository.js";

export const getBusinessById = async (businessId) => {
  const business = await businessRepo.findBusinessById(businessId);
  if (!business) {
    throw { statusCode: 404, message: "Business not found." };
  }
  return business;
};

export const updateBusiness = async (businessId, body) => {
  const business = await businessRepo.findBusinessById(businessId);
  if (!business) {
    throw { statusCode: 404, message: "Business not found." };
  }

  const updatedBusiness = await businessRepo.updateBusinessProfile(businessId, body);
  return updatedBusiness;
};

export const onboardBusiness = async (accountId, body) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get associated vendor_id
    const vendor = await businessRepo.findVendorByAccountId(accountId, client);
    if (!vendor) {
      throw { statusCode: 404, message: "Vendor profile not found for this account." };
    }

    // 2. UPSERT: business profile
    const business = await businessRepo.upsertBusinessRecord(vendor.id, body, client);

    // 3. Map OWNER role
    await businessRepo.createBusinessMemberRecord(accountId, business.id, "OWNER", client);

    // 4. Update vendor onboarding status
    await businessRepo.updateVendorOnboardingStatus(vendor.id, "COMPLETED", client);

    await client.query("COMMIT");
    return business;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const getUserBusiness = async (accountId) => {
  const business = await businessRepo.findBusinessByAccountId(accountId);
  if (!business) {
    throw { statusCode: 404, message: "No business found for this account." };
  }
  return business;
};

export const addMember = async (businessId, phone, role) => {
  if (!phone || !role) {
    throw { statusCode: 400, message: "Phone and role are required." };
  }

  const account = await businessRepo.findAccountByPhone(phone);
  if (!account) {
    throw { statusCode: 404, message: "User with this phone number not found." };
  }

  const existingMember = await businessRepo.findBusinessMemberRecord(account.id, businessId);
  if (existingMember) {
    throw { statusCode: 400, message: "User is already a member of this business." };
  }

  const member = await businessRepo.createBusinessMemberRecord(account.id, businessId, role.toUpperCase());
  return member;
};