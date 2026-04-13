import { Elysia } from "elysia";
import { userService, userRegisterInput, userLoginInput } from "../services/userService";

export const userRoutes = new Elysia({ prefix: "/users" })
  .post(
    "/",
    async ({ body, set }) => {
      const result = await userService.register(body);

      if (!result.success) {
        set.status = result.status;
        return result.response;
      }

      set.status = result.status;
      return result.response;
    },
    {
      body: userRegisterInput,
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      const result = await userService.login(body);

      set.status = result.status;
      return {
        success: result.success,
        status: result.status,
        response: result.response,
      };
    },
    {
      body: userLoginInput,
    }
  )
  .get(
    "/current",
    async ({ headers, set }) => {
      const authHeader = headers["authorization"];

      // Validate Authorization header
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      // Extract token from "Bearer <token>"
      const token = authHeader.substring(7);

      const result = await userService.getCurrentUser(token);

      set.status = result.status;
      return result.response;
    }
  );
