/// <reference path="../.astro/types.d.ts" />

// Type declarations for Starlight virtual component modules used in component overrides.
// See: https://starlight.astro.build/guides/overriding-components/
declare module 'virtual:starlight/components/TableOfContents' {
  const TableOfContents: typeof import('@astrojs/starlight/components/TableOfContents.astro').default;
  export default TableOfContents;
}

declare module 'virtual:starlight/components/MobileTableOfContents' {
  const MobileTableOfContents: typeof import('@astrojs/starlight/components/MobileTableOfContents.astro').default;
  export default MobileTableOfContents;
}

declare module 'virtual:starlight/components/Search' {
  const Search: typeof import('@astrojs/starlight/components/Search.astro').default;
  export default Search;
}

declare module 'virtual:starlight/components/SiteTitle' {
  const SiteTitle: typeof import('@astrojs/starlight/components/SiteTitle.astro').default;
  export default SiteTitle;
}

declare module 'virtual:starlight/components/SocialIcons' {
  const SocialIcons: typeof import('@astrojs/starlight/components/SocialIcons.astro').default;
  export default SocialIcons;
}

declare module 'virtual:starlight/components/ThemeSelect' {
  const ThemeSelect: typeof import('@astrojs/starlight/components/ThemeSelect.astro').default;
  export default ThemeSelect;
}

declare module 'virtual:starlight/components/LanguageSelect' {
  const LanguageSelect: typeof import('@astrojs/starlight/components/LanguageSelect.astro').default;
  export default LanguageSelect;
}
