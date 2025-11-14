import autumn from "@useautumn/convex/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(autumn);

export default app;