import * as Sentry from "@sentry/nextjs";

import {
  scrubSentryBreadcrumb,
  scrubSentryEvent,
  scrubSentrySpan,
} from "@/lib/monitoring/sentry-privacy";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
  tracePropagationTargets: ["localhost", /^\/(?!\/)/],
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
  },
  beforeSend: scrubSentryEvent,
  beforeBreadcrumb: scrubSentryBreadcrumb,
  beforeSendSpan: scrubSentrySpan,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
