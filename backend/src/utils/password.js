import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

export const comparePassword = async (plainPassword, hash) => {
  return bcrypt.compare(plainPassword, hash);
};