import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn: "https://bdd7e6207823516c5397123d73816c7b@o4510377076457472.ingest.us.sentry.io/4510377079209984",
  tunnel: "/tunnel",
  sendDefaultPii: false,
});