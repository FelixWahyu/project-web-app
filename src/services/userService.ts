import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, sessions } from "../db/schema";
import { t } from "elysia";

export const userRegisterInput = t.Object({
  name: t.String(),
  username: t.String(),
  password: t.String(),
});

export type UserRegisterInput = typeof userRegisterInput.static;

export const userLoginInput = t.Object({
  username: t.String(),
  password: t.String(),
});

export type UserLoginInput = typeof userLoginInput.static;

export const userService = {
  async register(body: UserRegisterInput) {
    // 1. Check if username already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, body.username));

    if (existingUser.length > 0) {
      return {
        success: false,
        status: 400,
        response: {
          message: "Username already exists",
          data: null,
        },
      };
    }

    // 2. Hash password using Bun's built-in bcrypt logic
    const hashedPassword = await Bun.password.hash(body.password);

    // 3. Insert into database
    const [result] = await db.insert(users).values({
      name: body.name,
      username: body.username,
      password: hashedPassword,
    });

    // 4. Retrieve created user to return full data
    const insertedId = result.insertId;
    const [newUser] = await db.select().from(users).where(eq(users.id, insertedId));

    if (!newUser) {
      return {
        success: false,
        status: 500,
        response: { message: "Failed to retrieve created user", data: null },
      };
    }

    return {
      success: true,
      status: 201,
      response: {
        message: "User created successfully",
        data: {
          id: newUser.id,
          name: newUser.name,
          username: newUser.username,
          created_at: newUser.createdAt,
          updated_at: newUser.updatedAt,
        },
      },
    };
  },

  async login(body: UserLoginInput) {
    // 1. Find user by username
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username));

    if (!user) {
      return {
        success: false,
        status: 401,
        response: {
          message: "Username atau password salah.",
          data: null,
        },
      };
    }

    // 2. Verify password against hashed password in DB
    const isPasswordValid = await Bun.password.verify(body.password, user.password);

    if (!isPasswordValid) {
      return {
        success: false,
        status: 401,
        response: {
          message: "Username atau password salah.",
          data: null,
        },
      };
    }

    // 3. Generate a secure token (UUID)
    const token = crypto.randomUUID();

    // 4. Calculate expiry: 1 day from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    // 5. Store session in DB
    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt,
    });

    return {
      success: true,
      status: 200,
      response: {
        message: "Berhasil login.",
        data: { token },
      },
    };
  },
};
