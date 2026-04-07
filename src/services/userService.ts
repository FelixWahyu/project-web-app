import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { t } from "elysia";

export const userRegisterInput = t.Object({
  name: t.String(),
  username: t.String(),
  password: t.String(),
});

export type UserRegisterInput = typeof userRegisterInput.static;

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
};
