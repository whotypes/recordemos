import autumn from "@useautumn/convex/convex.config";
import { defineApp } from "convex/server";
import r2 from "@convex-dev/r2/convex.config.js";

const app = defineApp();
app.use(autumn);
app.use(r2);

export default app;