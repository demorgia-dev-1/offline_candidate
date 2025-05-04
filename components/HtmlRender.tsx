// @ts-nocheck
import React from "react";
import RenderHTML from "react-native-render-html";

interface HtmlRendererProps {
  html: string;
  width: number;
  style?: object;
  selectedLanguage?: string;
}

const HtmlRenderer = ({
  html,
  width,
  style = {},
  selectedLanguage = "en",
}: HtmlRendererProps): React.ReactElement | null => {
  const source = React.useMemo(() => ({ html }), [html]);

  const isRTL = React.useMemo(() => {
    return ["ar", "ur"].includes(selectedLanguage);
  }, [selectedLanguage]);

  const baseStyle = React.useMemo(
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

  const renderConfig = React.useMemo(
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

  if (!html) return null;

  return (
    <RenderHTML
      source={source}
      contentWidth={width}
      baseStyle={baseStyle}
      {...renderConfig}
    />
  );
};

export default React.memo(HtmlRenderer);
