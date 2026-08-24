export type DemoAccountRole = "admin" | "user";

export type DemoLoginAccount = {
  key: string;
  name: string;
  email: string;
  password: string;
  role: DemoAccountRole;
};

export const DEMO_PASSWORD = "Demo1234!";

export type DemoSeedAccount = DemoLoginAccount;

export const DEMO_ACCOUNTS = [
  {
    key: "admin",
    name: "Demo Admin",
    email: "admin@example.com",
    password: DEMO_PASSWORD,
    role: "admin",
  },
  {
    key: "alex",
    name: "Alex Morgan",
    email: "alex@example.com",
    password: DEMO_PASSWORD,
    role: "user",
  },
  {
    key: "sam",
    name: "Sam Rivera",
    email: "sam@example.com",
    password: DEMO_PASSWORD,
    role: "user",
  },
] as const satisfies readonly DemoSeedAccount[];

export function getDemoLoginAccounts(): DemoLoginAccount[] {
  return DEMO_ACCOUNTS.map(({ key, name, email, password, role }) => ({
    key,
    name,
    email,
    password,
    role,
  }));
}
