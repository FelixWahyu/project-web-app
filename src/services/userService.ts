import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, sessions } from "../db/schema";
import { t } from "elysia";

export const userRegisterInput = t.Object({
  name: t.String({ maxLength: 255, minLength: 1, description: "Full name of the user", examples: ["John Doe"] }),
  username: t.String({ maxLength: 255, minLength: 3, description: "Unique username for authentication", examples: ["johndoe"] }),
  password: t.String({ minLength: 6, description: "User password (minimum 6 characters)", examples: ["secret123"] }),
});

export type UserRegisterInput = typeof userRegisterInput.static;

export const userLoginInput = t.Object({
  username: t.String({ maxLength: 255, minLength: 3, description: "Username used for login", examples: ["johndoe"] }),
  password: t.String({ maxLength: 255, minLength: 6, description: "Account password", examples: ["secret123"] }),
});

export type UserLoginInput = typeof userLoginInput.static;

export const userUpdateInput = t.Object({
  name: t.Optional(t.String({ maxLength: 255, minLength: 1, description: "New name for the user", examples: ["Jane Doe"] })),
  username: t.Optional(t.String({ maxLength: 255, minLength: 3, description: "New unique username", examples: ["janedoe"] })),
  password: t.Optional(t.String({ minLength: 6, description: "New password", examples: ["newsecret456"] })),
});

export type UserUpdateInput = typeof userUpdateInput.static;

// Response Schemas for Swagger
export const userRegisterResponse = t.Object({
  message: t.String({ description: "Success message", examples: ["User created successfully"] }),
  data: t.Object({
    id: t.Number({ examples: [1] }),
    name: t.String({ examples: ["John Doe"] }),
    username: t.String({ examples: ["johndoe"] }),
    created_at: t.Any({ description: "Registration timestamp" }),
    updated_at: t.Any({ description: "Last update timestamp" }),
  }),
});

export const userLoginResponse = t.Object({
  success: t.Boolean({ examples: [true] }),
  status: t.Number({ examples: [200] }),
  response: t.Object({
    message: t.String({ examples: ["Berhasil login."] }),
    data: t.Object({
      token: t.String({ description: "Authentication token (UUID)", examples: ["550e8400-e29b-41d4-a716-446655440000"] }),
    }),
  }),
});

export const userProfileResponse = t.Object({
  data: t.Object({
    id: t.Number({ examples: [1] }),
    name: t.String({ examples: ["John Doe"] }),
    username: t.String({ examples: ["johndoe"] }),
    created_at: t.Any(),
  }),
});

export const userUpdateResponse = t.Object({
  status: t.Number({ examples: [200] }),
  response: t.String({ examples: ["Berhasil diupdate."] }),
  data: t.Object({
    name: t.String({ examples: ["Jane Doe"] }),
    username: t.String({ examples: ["janedoe"] }),
  }),
});

export const errorResponse = t.Object({
  success: t.Optional(t.Boolean({ examples: [false] })),
  status: t.Optional(t.Number({ examples: [401] })),
  message: t.Optional(t.String({ examples: ["An error occurred"] })),
  error: t.Optional(t.String({ examples: ["Unauthorized"] })),
  response: t.Optional(t.Any()),
  data: t.Optional(t.Any()),
});

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

  async logout(token: string) {
    // Directly delete the session and check affectedRows — saves one DB round-trip
    const [result] = await db.delete(sessions).where(eq(sessions.token, token));

    // If no row was deleted, the token does not exist / already logged out
    if (result.affectedRows === 0) {
      return {
        success: false,
        status: 401,
        response: { error: "Unauthorized" },
      };
    }

    return {
      success: true,
      status: 200,
      response: { data: "Berhasil logout." },
    };
  },

  async getCurrentUser(token: string) {
    // 1. Find session by token
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token));

    // 2. If no session found, return unauthorized
    if (!session) {
      return {
        success: false,
        status: 401,
        response: { error: "Unauthorized" },
      };
    }

    // 3. Check if session has expired
    const now = new Date();
    if (session.expiresAt < now) {
      return {
        success: false,
        status: 401,
        response: { error: "Unauthorized" },
      };
    }

    // 4. Find the user associated with this session
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        created_at: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.userId));

    if (!user) {
      return {
        success: false,
        status: 401,
        response: { error: "Unauthorized" },
      };
    }

    return {
      success: true,
      status: 200,
      response: {
        data: user,
      },
    };
  },

  async updateUser(id: number, token: string, body: UserUpdateInput) {
    // 1. Validate session token
    const [session] = await db.select().from(sessions).where(eq(sessions.token, token));

    if (!session || session.expiresAt < new Date() || session.userId !== id) {
      return {
        success: false,
        status: 401,
        response: { error: "Unauthorized" },
      };
    }

    // 2. Prepare update data
    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.username) {
      // Check if username is already taken by another user
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, body.username));
      
      if (existingUser && existingUser.id !== id) {
        return {
          success: false,
          status: 400,
          response: { error: "Username already exists" },
        };
      }
      updateData.username = body.username;
    }
    if (body.password) {
      updateData.password = await Bun.password.hash(body.password);
    }

    // 3. Update in database
    await db.update(users).set(updateData).where(eq(users.id, id));

    // 4. Retrieve updated user
    const [updatedUser] = await db
      .select({
        name: users.name,
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, id));

    return {
      success: true,
      status: 200,
      response: {
        status: 200,
        response: "Berhasil diupdate.",
        data: updatedUser,
      },
    };
  },
};
