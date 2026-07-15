import { ImageResponse } from "next/og";
import {
  FaviconSunCompact,
  FaviconTile,
} from "@/lib/favicon-sun";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <FaviconTile size={32} radius={8}>
        <FaviconSunCompact size={32} />
      </FaviconTile>
    ),
    { ...size },
  );
}
