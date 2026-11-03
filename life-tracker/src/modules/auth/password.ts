import { hash, verify } from "@node-rs/argon2";

// Production parameters. 2 is Argon2id. Tests must not replace these with a faster hash.
const productionOptions = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  algorithm: 2,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, productionOptions);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}
