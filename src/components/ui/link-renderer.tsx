"use client";

import * as React from "react";

export type LinkRendererProps = React.ComponentPropsWithRef<"a"> & { href: string };
export type LinkRenderer = React.ReactElement<LinkRendererProps>;

const LinkRendererContext = React.createContext<LinkRenderer>(<a href="" />);

export function LinkRendererProvider({
  children,
  link,
}: {
  children: React.ReactNode;
  link: LinkRenderer;
}) {
  return <LinkRendererContext.Provider value={link}>{children}</LinkRendererContext.Provider>;
}

export function useLinkRenderer() {
  return React.useContext(LinkRendererContext);
}
