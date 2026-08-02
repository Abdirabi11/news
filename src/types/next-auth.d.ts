import { Role } from "@prisma/client";
import "@auth/core/types";
import "@auth/core/jwt";

declare module "@auth/core/types" {
  interface User {
    role?: Role;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
  }
}