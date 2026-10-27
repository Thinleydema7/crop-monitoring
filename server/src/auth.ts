import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { UserModel } from "./models.js";

export type User = { id: string; name: string; email: string; role: "farmer" | "officer" };
type Account = User & { passwordHash: string };

export class RegistrationError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// Dev-only demo logins (so the apps keep working while you test). Off unless ENABLE_DEMO_ACCOUNTS=true.
const demoAccounts: Account[] =
  process.env.ENABLE_DEMO_ACCOUNTS === "true"
    ? [
        { id: "farmer-demo", name: "Demo Farmer", email: "farmer@cropcare.test", role: "farmer", passwordHash: bcrypt.hashSync("Farmer123!", 10) },
        { id: "officer-demo", name: "Demo Officer", email: "officer@cropcare.test", role: "officer", passwordHash: bcrypt.hashSync("Officer123!", 10) },
      ]
    : [];

const publicUser = ({ id, name, email, role }: Account): User => ({ id, name, email, role });
const fromDoc = (d: any): Account => ({ id: d._id, name: d.name, email: d.email, role: d.role, passwordHash: d.passwordHash });

export function createAuth(secret: string) {
  function session(account: Account) {
    const user = publicUser(account);
    return {
      user,
      token: jwt.sign({ role: user.role }, secret, { subject: user.id, expiresIn: "7d", algorithm: "HS256" }),
    };
  }
  async function findByEmail(email: string) {
    const e = email.trim().toLowerCase();
    const demo = demoAccounts.find((a) => a.email === e);
    if (demo) return demo;
    const doc = await UserModel.findOne({ email: e }).lean();
    return doc ? fromDoc(doc) : null;
  }

  return {
    async findUserById(id: string): Promise<User | null> {
      const demo = demoAccounts.find((a) => a.id === id);
      if (demo) return publicUser(demo);
      const doc = await UserModel.findById(id).lean();
      return doc ? publicUser(fromDoc(doc)) : null;
    },

    async login(email: string, password: string) {
      const account = await findByEmail(email);
      if (!account || !(await bcrypt.compare(password, account.passwordHash))) return null;
      return session(account);
    },

    async register(input: Record<string, unknown>) {
      const { name, email, password, passwordConfirmation, role } = input;
      if (role !== undefined && role !== "farmer")
        throw new RegistrationError("Only farmer accounts can be registered here.");
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80)
        throw new RegistrationError("Enter a name between 2 and 80 characters.");
      if (typeof email !== "string" || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        throw new RegistrationError("Enter a valid email address.");
      if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72)
        throw new RegistrationError("Use at least 8 characters; the password must fit within 72 UTF-8 bytes.");
      if (passwordConfirmation !== password) throw new RegistrationError("Passwords do not match.");

      const normalized = email.trim().toLowerCase();
      if (await findByEmail(normalized))
        throw new RegistrationError("An account with this email already exists. Sign in instead.", 409);

      const account: Account = {
        id: randomUUID(),
        name: name.trim(),
        email: normalized,
        role: "farmer",
        passwordHash: await bcrypt.hash(password, 12),
      };
      try {
        const { id, ...userData } = account;
await UserModel.create({ _id: id, ...userData });
      } catch (e: any) {
        if (e.code === 11000)
          throw new RegistrationError("An account with this email already exists. Sign in instead.", 409);
        throw e;
      }
      return session(account);
    },
  };
}