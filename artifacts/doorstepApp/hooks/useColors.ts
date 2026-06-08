import { useTheme } from "@/context/ThemeContext";

import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Falls back to the light palette when no dark key is defined in
 * constants/colors.ts (the scaffold ships light-only by default).
 * When a sibling web artifact's dark tokens are synced into a `dark`
 * key, this hook will automatically switch palettes based on the
 * device's appearance setting.
 */
export function useColors() {
  const { resolvedScheme } = useTheme();
  const palettes = colors as unknown as Record<string, typeof colors.light>;
  const palette =
    resolvedScheme === "dark" && "dark" in colors
      ? palettes.dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
