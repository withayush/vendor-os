import crypto from "crypto";
import bcrypt from "bcrypt";

const OTP_SALT_ROUNDS = 10;

export const generateOtp = () => {
  // Cryptographically secure 6-digit number
  return crypto.randomInt(100000, 1000000).toString();
};

export const hashOtp = async (otp) => {
  return bcrypt.hash(otp, OTP_SALT_ROUNDS);
};

export const compareOtp = async (otp, hash) => {
  return bcrypt.compare(otp, hash);
};