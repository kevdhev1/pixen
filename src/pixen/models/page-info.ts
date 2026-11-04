/* Basic page measurements captured after navigation and stabilization */
export type PageInfo = {
  /* Document title as reported by `document.title`. May be empty. */
  readonly title: string;

  /* Final URL after redirects (from the HTTP response, not `location.href`). */
  readonly finalUrl: string;

  /* Max height among root element measurements, in CSS pixels. */
  readonly documentHeight: number;

  /* True if the root element is wider than the viewport. */
  readonly hasHorizontalOverflow: boolean;
};
