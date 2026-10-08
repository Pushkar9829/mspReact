import { useLayoutEffect } from "react";

/**
 * Turns on the storefront theme (`html.shop`, see shared/styles/shop-tokens.css) while mounted.
 * ShopLayout and shop-styled auth pages call it; admin panels never do.
 */
export function useShopTheme(active = true) {
  useLayoutEffect(() => {
    if (!active) return undefined;
    const root = document.documentElement;
    root.classList.add("shop");
    return () => root.classList.remove("shop");
  }, [active]);
}

export default useShopTheme;
