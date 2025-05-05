// @ts-nocheck
import React, { useMemo } from "react";
import RenderHTML from "react-native-render-html";

type HtmlRendererProps = {
  html: string;
  width: number;
  style?: Record<string, unknown>;
  selectedLanguage?: string;
};

const HtmlRenderer = ({
  html = "",
  width = 300,
  style = {},
  selectedLanguage = "en",
}: HtmlRendererProps) => {
  if (!html) return null;

  const isRTL = useMemo(
    () => ["ar", "ur", "he"].includes(selectedLanguage),
    [selectedLanguage]
  );

  const source = useMemo(() => ({ html }), [html]);

  const baseStyle = useMemo(
    () => ({
      fontFamily: "system-ui",
      fontSize: 16,
      color: "#374151",
      direction: isRTL ? "rtl" : "ltr",
      textAlign: isRTL ? "right" : "left",
      ...style,
    }),
    [style, isRTL]
  );

  const renderConfig = useMemo(
    () => ({
      enableExperimentalBRCollapsing: true,
      enableExperimentalGhostLinesPrevention: true,
      renderersProps: {
        img: { enableExperimentalPercentWidth: true },
      },
      systemFonts: ["system-ui"],
      defaultTextProps: {
        numberOfLines: 0,
        textAlign: isRTL ? "right" : "left",
      },
    }),
    [isRTL]
  );

  return (
    <RenderHTML
      source={source}
      contentWidth={width}
      baseStyle={baseStyle}
      {...renderConfig}
    />
  );
};

export default HtmlRenderer;
