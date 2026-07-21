import Image from "next/image";

const ICON_SRC = "/solarindex-icon.png";

export default function SolarIndexIcon({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={ICON_SRC}
      alt=""
      width={size}
      height={size}
      aria-hidden
      className={`rounded-[22%] object-cover ${className}`.trim()}
    />
  );
}
