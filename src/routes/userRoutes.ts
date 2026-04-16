import { Elysia, t } from "elysia";
import { 
  userService, 
  userRegisterInput, 
  userLoginInput, 
  userUpdateInput,
  userRegisterResponse,
  userLoginResponse,
  userProfileResponse,
  userUpdateResponse,
  errorResponse
} from "../services/userService";

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
      response: {
        201: userRegisterResponse,
        400: errorResponse,
      },
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
      response: {
        200: userLoginResponse,
        401: errorResponse,
      },
    }
  )
  .use(authMiddleware)
  .get("/current", async ({ bearerToken, set }) => {
    if (!bearerToken) return { error: "Unauthorized" };

    const result = await userService.getCurrentUser(bearerToken);

    set.status = result.status;
    return result.response;
  }, {
    response: {
      200: userProfileResponse,
      401: errorResponse,
    }
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
      response: {
        200: userUpdateResponse,
        400: errorResponse,
        401: errorResponse,
      },
    }
  )
  .delete("/logout", async ({ bearerToken, set }) => {
    if (!bearerToken) return { error: "Unauthorized" };

    const result = await userService.logout(bearerToken);

    set.status = result.status;
    return result.response;
  }, {
    response: {
      200: t.Object({ data: t.String() }),
      401: errorResponse,
    }
  });
