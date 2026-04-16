import { describe, it, expect, beforeEach } from "bun:test";
import { app } from "../src/index";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function clearDatabase() {
  // Disable foreign key checks to truncate safely
  await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS = 0"));
  await db.execute(sql.raw("TRUNCATE TABLE sessions"));
  await db.execute(sql.raw("TRUNCATE TABLE users"));
  await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS = 1"));
}

describe("User API System Test", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe("POST /api/users (Register)", () => {
    it("should register a user successfully", async () => {
      const resp = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            username: "testuser",
            password: "password123",
          }),
        })
      );
      
      const body = await resp.json();
      expect(resp.status).toBe(201);
      expect(body.message).toBe("User created successfully");
      expect(body.data.username).toBe("testuser");
    });

    it("should fail when username is duplicated", async () => {
      // First registration
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "User 1",
            username: "sameguy",
            password: "password123",
          }),
        })
      );

      // Second registration with same username
      const resp = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "User 2",
            username: "sameguy",
            password: "password123",
          }),
        })
      );
      
      const body = await resp.json();
      expect(resp.status).toBe(400);
      expect(body.message).toBe("Username already exists");
    });

    it("should fail with invalid input (invalid length)", async () => {
      const resp = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "", // Too short
            username: "us", // Too short (min 3)
            password: "123", // Too short (min 6)
          }),
        })
      );
      
      expect(resp.status).toBe(422);
    });
  });

  describe("POST /api/users/login (Login)", () => {
    beforeEach(async () => {
      // Ensure a user exists for login tests
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Login User",
            username: "loginuser",
            password: "correctpassword",
          }),
        })
      );
    });

    it("should login successfully with correct credentials", async () => {
      const resp = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "loginuser",
            password: "correctpassword",
          }),
        })
      );
      
      const body = await resp.json();
      expect(resp.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.response.data.token).toBeDefined();
    });

    it("should fail with incorrect password", async () => {
      const resp = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "loginuser",
            password: "wrongpassword",
          }),
        })
      );
      
      const body = await resp.json();
      expect(resp.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.response.message).toBe("Username atau password salah.");
    });
  });

  describe("Protected Routes (Current, Update, Logout)", () => {
    let authToken: string;
    let userId: number;

    beforeEach(async () => {
      // 1. Register
      const regResp = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "OAuth User",
            username: "oauthuser",
            password: "password123",
          }),
        })
      );
      const regBody = await regResp.json();
      userId = regBody.data.id;

      // 2. Login to get token
      const loginResp = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "oauthuser",
            password: "password123",
          }),
        })
      );
      const loginBody = await loginResp.json();
      authToken = loginBody.response.data.token;
    });

    it("should get current user with valid token", async () => {
      const resp = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        })
      );
      
      const body = await resp.json();
      expect(resp.status).toBe(200);
      expect(body.data.username).toBe("oauthuser");
    });

    it("should deny access with invalid token", async () => {
      const resp = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            "Authorization": `Bearer invalid-token`,
          },
        })
      );
      
      expect(resp.status).toBe(401);
    });

    it("should update user profile successfully", async () => {
      const resp = await app.handle(
        new Request(`http://localhost/api/users/current/${userId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            name: "Updated Name",
          }),
        })
      );
      
      const body = await resp.json();
      expect(resp.status).toBe(200);
      expect(body.response).toBe("Berhasil diupdate.");
      expect(body.data.name).toBe("Updated Name");
    });

    it("should deny update for different user ID", async () => {
      const resp = await app.handle(
        new Request(`http://localhost/api/users/current/${userId + 999}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            name: "Hacker Attempt",
          }),
        })
      );
      
      expect(resp.status).toBe(401);
    });

    it("should logout successfully", async () => {
      const resp = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        })
      );
      
      const body = await resp.json();
      expect(resp.status).toBe(200);
      expect(body.data).toBe("Berhasil logout.");

      // Verify token is no longer valid
      const secondResp = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        })
      );
      expect(secondResp.status).toBe(401);
    });
  });
});
