import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { db } from "./db";
import { users } from "./db/schema";

const app = new Elysia()
  .use(cors())
  .get("/", () => "Welcome to Elysia + Drizzle + MySQL API")
  .group("/users", (app) =>
    app
      .get("/", async () => {
        return await db.select().from(users);
      })
      .post(
        "/",
        async ({ body }) => {
          await db.insert(users).values(body);
          return { success: true, message: "User created successfully" };
        },
        {
          body: t.Object({
            name: t.String(),
            email: t.String(),
          }),
        }
      )
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
