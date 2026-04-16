import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { userRoutes } from "./routes/userRoutes";

export const app = new Elysia()
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Project Web App API Documentation",
          version: "1.0.0",
          description: "Interactive API documentation for the Elysia project",
        },
      },
    })
  )
  .use(cors())
  .get("/", () => "Welcome to Elysia + Drizzle + MySQL API")
  .group("/api", (app) => app.use(userRoutes));

app.listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
