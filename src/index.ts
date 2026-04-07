import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { userRoutes } from "./routes/userRoutes";

const app = new Elysia()
  .use(cors())
  .get("/", () => "Welcome to Elysia + Drizzle + MySQL API")
  .group("/api", (app) => app.use(userRoutes))
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
