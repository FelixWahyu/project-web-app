import { Elysia } from "elysia";
import { userService, userRegisterInput, userLoginInput, userUpdateInput } from "../services/userService";

// Middleware: extract Bearer token from Authorization header
// Reusable across all protected routes (DRY principle)
const authMiddleware = new Elysia().derive({ as: "scoped" }, ({ headers, set }) => {
  const authHeader = headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    set.status = 401;
    return { bearerToken: null };
  }

  return { bearerToken: authHeader.substring(7) };
});

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
  .use(authMiddleware)
  .get("/current", async ({ bearerToken, set }) => {
    if (!bearerToken) return { error: "Unauthorized" };

    const result = await userService.getCurrentUser(bearerToken);

    set.status = result.status;
    return result.response;
  })
  .patch(
    "/current/:id",
    async ({ params: { id }, bearerToken, body, set }) => {
      if (!bearerToken) return { error: "Unauthorized" };

      const result = await userService.updateUser(Number(id), bearerToken, body);

      set.status = result.status;
      return result.response;
    },
    {
      body: userUpdateInput,
    }
  )
  .delete("/logout", async ({ bearerToken, set }) => {
    if (!bearerToken) return { error: "Unauthorized" };

    const result = await userService.logout(bearerToken);

    set.status = result.status;
    return result.response;
  });
