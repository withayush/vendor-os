import * as vendorRepo from "../repositories/vendor.repository.js";

export const createProfile = async (accountId, body) => {
  const existingVendor = await vendorRepo.findVendorByAccountId(accountId);
  if (existingVendor) {
    throw { statusCode: 400, message: "Vendor profile already exists for this user." };
  }

  const vendor = await vendorRepo.createVendorRecord(accountId, body);
  return vendor;
};

export const getProfile = async (accountId) => {
  const vendor = await vendorRepo.findVendorByAccountId(accountId);
  if (!vendor) {
    throw { statusCode: 404, message: "Vendor profile not found." };
  }
  return vendor;
};

export const updateProfile = async (accountId, body) => {
  const existingVendor = await vendorRepo.findVendorByAccountId(accountId);
  if (!existingVendor) {
    throw { statusCode: 404, message: "Vendor profile not found." };
  }

  const vendor = await vendorRepo.updateVendorRecord(accountId, body);
  return vendor;
};
