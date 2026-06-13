import Image from "next/image";
import { API_URL } from "@/lib/api";
import { gradientFor } from "@/lib/data";

export function Avatar({
  name,
  avatarUrl,
  size = 36,
  className = "",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    const src = avatarUrl.startsWith("http") ? avatarUrl : `${API_URL}${avatarUrl}`;
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const px = `${size}px`;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold uppercase text-white ${gradientFor(name)} ${className}`}
      style={{ width: px, height: px, fontSize: size * 0.38 }}
    >
      {name.slice(0, 1)}
    </span>
  );
}
