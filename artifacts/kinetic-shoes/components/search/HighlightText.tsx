import React, { useMemo } from "react";
import { Text, TextStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  text: string;
  query: string;
  style?: TextStyle;
  highlightStyle?: TextStyle;
  numberOfLines?: number;
}

export function HighlightText({
  text,
  query,
  style,
  highlightStyle,
  numberOfLines,
}: Props) {
  const colors = useColors();

  const parts = useMemo(() => {
    if (!query || query.trim().length < 2) {
      return [{ text, highlight: false }];
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    const split = text.split(regex);

    return split.map((part) => ({
      text: part,
      highlight: regex.test(part),
    }));
  }, [text, query]);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        part.highlight ? (
          <Text
            key={i}
            style={[
              style,
              {
                color: colors.primary,
                fontFamily: "Inter_600SemiBold",
              },
              highlightStyle,
            ]}
          >
            {part.text}
          </Text>
        ) : (
          <Text key={i} style={style}>
            {part.text}
          </Text>
        )
      )}
    </Text>
  );
}
