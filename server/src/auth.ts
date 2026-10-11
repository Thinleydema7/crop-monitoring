import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
export type User = {
  id: string;
  name: string;
  email: string;
  role: "farmer" | "officer";
};
type DemoAccount = User & { passwordHash: string };
const demoAccounts: DemoAccount[] = [
  {
    id: "farmer-demo",
    name: "Demo Farmer",
    email: "farmer@cropcare.test",
    role: "farmer",
    passwordHash: bcrypt.hashSync("Farmer123!", 10),
  },
  {
    id: "officer-demo",
    name: "Demo Officer",
    email: "officer@cropcare.test",
    role: "officer",
    passwordHash: bcrypt.hashSync("Officer123!", 10),
  },
];

export class RegistrationError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const publicUser = ({ id, name, email, role }: DemoAccount): User => ({
  id,
  name,
  email,
  role,
});
export function createAuth(
  secret: string,
  directory = path.resolve("storage"),
) {
  let queue: Promise<void> = Promise.resolve();
  const file = path.join(directory, "users.json");
  async function readAccounts(): Promise<DemoAccount[]> {
    try {
      const value: unknown = JSON.parse(await readFile(file, "utf8"));
      if (
        !Array.isArray(value) ||
        !value.every(
          (a) =>
            a &&
            typeof a.id === "string" &&
            typeof a.name === "string" &&
            typeof a.email === "string" &&
            a.role === "farmer" &&
            typeof a.passwordHash === "string",
        )
      )
        throw new Error("Invalid account storage.");
      return value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
  function session(account: DemoAccount) {
    const user = publicUser(account);
    return {
      user,
      token: jwt.sign({ role: user.role }, secret, {
        subject: user.id,
        expiresIn: "7d",
        algorithm: "HS256",
      }),
    };
  }
  return {
    async findUserById(id: string): Promise<User | null> {
      const account = [...demoAccounts, ...(await readAccounts())].find(
        (a) => a.id === id,
      );
      return account ? publicUser(account) : null;
    },
    async login(email: string, password: string) {
      const account = [...demoAccounts, ...(await readAccounts())].find(
        (a) => a.email === email.trim().toLowerCase(),
      );
      if (!account || !(await bcrypt.compare(password, account.passwordHash)))
        return null;
      return session(account);
    },
    register(input: Record<string, unknown>) {
      const operation = queue.then(async () => {
        const { name, email, password, passwordConfirmation, role } = input;
        if (role !== undefined && role !== "farmer")
          throw new RegistrationError(
            "Only farmer accounts can be registered here.",
          );
        if (
          typeof name !== "string" ||
          name.trim().length < 2 ||
          name.trim().length > 80
        )
          throw new RegistrationError(
            "Enter a name between 2 and 80 characters.",
          );
        if (
          typeof email !== "string" ||
          email.trim().length > 254 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        )
          throw new RegistrationError("Enter a valid email address.");
        if (
          typeof password !== "string" ||
          password.length < 8 ||
          Buffer.byteLength(password, "utf8") > 72
        )
          throw new RegistrationError(
            "Use at least 8 characters; the password must fit within 72 UTF-8 bytes.",
          );
        if (passwordConfirmation !== password)
          throw new RegistrationError("Passwords do not match.");
        const normalized = email.trim().toLowerCase(),
          accounts = await readAccounts();
        if ([...demoAccounts, ...accounts].some((a) => a.email === normalized))
          throw new RegistrationError(
            "An account with this email already exists. Sign in instead.",
            409,
          );
        const account: DemoAccount = {
          id: randomUUID(),
          name: name.trim(),
          email: normalized,
          role: "farmer",
          passwordHash: await bcrypt.hash(password, 12),
        };
        accounts.push(account);
        await mkdir(directory, { recursive: true });
        const temporary = path.join(directory, randomUUID() + ".users.tmp");
        try {
          await writeFile(temporary, JSON.stringify(accounts, null, 2), {
            mode: 0o600,
          });
          await rename(temporary, file);
        } finally {
          await rm(temporary, { force: true });
        }
        return session(account);
      });
      queue = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
  };
}
