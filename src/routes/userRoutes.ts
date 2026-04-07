import { Elysia } from "elysia";
import { userService, userRegisterInput } from "../services/userService";

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
  );
