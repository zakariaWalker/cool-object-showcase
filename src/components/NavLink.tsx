import * as React from "react";
import {
  NavLink as RouterNavLink,
  NavLinkProps,
} from "react-router-dom";

import { cn } from "@/lib/utils";

type ExtraProps = {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
};

type NavLinkCompatProps = Omit<NavLinkProps, "className"> & ExtraProps;

const NavLink = React.forwardRef<
  HTMLAnchorElement,
  NavLinkCompatProps
>((props, ref) => {
  const {
    className,
    activeClassName,
    pendingClassName,
    ...rest
  } = props;

  return (
    <RouterNavLink
      ref={ref}
      {...rest}
      className={({ isActive, isPending }) =>
        cn(
          className,
          isActive && activeClassName,
          isPending && pendingClassName
        )
      }
    />
  );
});

NavLink.displayName = "NavLink";

export { NavLink };