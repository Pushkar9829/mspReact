import { allows } from "../auth.js";

/** Filter a nav config by the user's permissions (fail-closed). */
export function filterNav(nav, user) {
  return (nav?.groups || [])
    .map((g) => ({ ...g, items: g.items.filter((i) => allows(user, i.req)) }))
    .filter((g) => g.items.length);
}

/** The nav item that best matches the path (longest prefix). */
export function matchNav(nav, pathname) {
  const items = (nav?.groups || []).flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
  return items
    .filter((i) => (i.end ? pathname === i.to || pathname === `${i.to}/` : pathname === i.to || pathname.startsWith(`${i.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0];
}
