import {
  Cpu,
  Dumbbell,
  Gamepad2,
  Headphones,
  Laptop,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hashHue } from "@/lib/format";
import type { Product } from "@/lib/types";

const GLYPHS: Record<string, LucideIcon> = {
  electronics: Cpu,
  audio: Headphones,
  computing: Laptop,
  gaming: Gamepad2,
  phones: Smartphone,
  fashion: Shirt,
  home: Sofa,
  beauty: Sparkles,
  sports: Dumbbell,
  pantry: ShoppingBasket,
};

/**
 * Generated product artwork. No licensed photography in the prototype — each
 * product gets a deterministic plate derived from its id, so listings look
 * like a real catalogue and never break.
 */
export function ProductPlate({
  product,
  index = 0,
  tone = "light",
  className,
  showSku = true,
}: {
  product: Product;
  index?: number;
  tone?: "light" | "dark";
  className?: string;
  showSku?: boolean;
}) {
  const Icon = GLYPHS[product.category] ?? Cpu;
  const hue = (hashHue(product.id) + index * 47) % 360;
  const light = tone === "light";
  const gradient = light
    ? `linear-gradient(140deg, hsl(${hue} 30% 94%) 0%, hsl(${(hue + 42) % 360} 38% 86%) 55%, hsl(${(hue + 18) % 360} 26% 78%) 100%)`
    : `linear-gradient(140deg, hsl(${hue} 22% 16%) 0%, hsl(${(hue + 42) % 360} 26% 11%) 60%, hsl(${(hue + 18) % 360} 20% 8%) 100%)`;
  const gridColor = light ? "rgba(20,17,14,0.055)" : "rgba(255,255,255,0.05)";
  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      style={{ background: gradient }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
        }}
      />
      <Icon
        strokeWidth={0.9}
        className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2", light ? "text-ink/25" : "text-chalk/20")}
        style={{ width: "40%", height: "40%" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: light ? "linear-gradient(transparent, rgba(20,17,14,0.06))" : "linear-gradient(transparent, rgba(0,0,0,0.35))" }}
      />
      {showSku ? (
        <span
          className={cn(
            "absolute left-2.5 top-2.5 font-mono text-[9px] uppercase tracking-[0.16em]",
            light ? "text-ink/45" : "text-chalk/45",
          )}
        >
          {product.sku}
        </span>
      ) : null}
    </div>
  );
}

export function ProductThumb({
  product,
  index = 0,
  tone = "light",
  className,
}: {
  product: Product;
  index?: number;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <ProductPlate
      product={product}
      index={index}
      tone={tone}
      showSku={false}
      className={cn("h-full w-full", className)}
    />
  );
}
