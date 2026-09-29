type SentryEvent = {
  request?: {
    url?: string;
    query_string?: unknown;
    data?: unknown;
    cookies?: unknown;
    env?: unknown;
    headers?: unknown;
  };
  breadcrumbs?: Array<{
    message?: string;
    data?: Record<string, unknown>;
  }>;
  user?: unknown;
  tags?: Record<string, unknown>;
};

type SentryBreadcrumb = {
  message?: string;
  data?: Record<string, unknown>;
};

type SentrySpan = {
  name: string;
  attributes: object;
  links?: Array<{ attributes?: object }>;
};

const privateAttribute =
  /query|body|cookie|authorization|password|token|email|search|payload|result/i;
const urlAttribute = /url/i;
const requestUrl = /((?:https?:\/\/|\/)[^?\s#]+)(?:\?[^\s#]*)?(?:#[^\s]*)?/g;

function scrubText(value: string): string {
  return value.replace(requestUrl, "$1");
}

function scrubAttributes(attributes: object): void {
  const values = attributes as Record<string, unknown>;

  for (const [name, value] of Object.entries(values)) {
    if (privateAttribute.test(name)) {
      delete values[name];
    } else if (urlAttribute.test(name) && typeof value === "string") {
      values[name] = scrubText(value);
    }
  }
}

export function scrubSentryEvent<T extends SentryEvent>(event: T): T {
  delete event.user;

  if (event.tags) {
    for (const name of Object.keys(event.tags)) {
      if (name.startsWith("user.")) {
        delete event.tags[name];
      }
    }
  }

  if (event.request) {
    if (event.request.url) {
      event.request.url = scrubText(event.request.url);
    }

    delete event.request.query_string;
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.env;
    delete event.request.headers;
  }

  event.breadcrumbs?.forEach(scrubSentryBreadcrumb);

  return event;
}

export function scrubSentryBreadcrumb<T extends SentryBreadcrumb>(breadcrumb: T): T {
  if (breadcrumb.message) {
    breadcrumb.message = scrubText(breadcrumb.message);
  }

  if (breadcrumb.data) {
    for (const [name, value] of Object.entries(breadcrumb.data)) {
      if (privateAttribute.test(name)) {
        delete breadcrumb.data[name];
      } else if (urlAttribute.test(name) && typeof value === "string") {
        breadcrumb.data[name] = scrubText(value);
      }
    }
  }

  return breadcrumb;
}

export function scrubSentrySpan<T extends SentrySpan>(span: T): T {
  span.name = scrubText(span.name);
  scrubAttributes(span.attributes);
  span.links?.forEach((link) => {
    if (link.attributes) {
      scrubAttributes(link.attributes);
    }
  });

  return span;
}
