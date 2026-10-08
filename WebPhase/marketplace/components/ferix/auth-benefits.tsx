/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, Heart, MapPin, Package } from "lucide-react";
import { Eyebrow } from "@/components/ferix/marks";
import { cn } from "@/lib/utils";

const ROWS = [
  { title: "Track orders", href: "/account/orders", Icon: Package },
  { title: "Save favourites", href: "/account/wishlist", Icon: Heart },
  { title: "Manage addresses", href: "/account/addresses", Icon: MapPin },
];

/**
 * The panel that introduces having an account.
 *
 * It is the first thing in the DOM, so on a phone it sits ABOVE the form, which
 * is where it earns its keep; from lg up it is ordered back to the right-hand
 * column so the desktop composition is untouched.
 *
 * Shared by sign in and register, so the two pages cannot drift apart, and the
 * closing link is passed in because it points somewhere different on each.
 */
export function AuthBenefitsPanel({
  imageUrl,
  ctaHref,
  ctaLabel,
  className,
}: {
  imageUrl: string | null;
  ctaHref: string;
  ctaLabel: string;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "relative isolate flex min-h-[240px] flex-col justify-end overflow-hidden bg-[#f8e8df] p-5 sm:min-h-[290px] sm:p-7 lg:min-h-full lg:p-9",
        "max-lg:order-1",
        className,
      )}
    >
      {imageUrl ? (
        <>
          <img src={imageUrl} alt="Shopper carrying bags" className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/72 to-transparent lg:from-white/90 lg:via-white/45" />
        </>
      ) : null}
      <div className="relative max-w-[390px]">
        <Eyebrow className="text-ember">Your shopping, together</Eyebrow>
        <h2 className="mt-2 font-display text-[23px] font-bold leading-tight text-ink sm:text-[28px]">
          Shop more. Do more. In one account.
        </h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {ROWS.map(({ title, href, Icon }) => (
            <Link
              key={title}
              href={href}
              className="flex min-h-9 items-center gap-2 rounded-[2px] border border-white/70 bg-white/85 px-2.5 text-[11px] font-semibold text-ink transition-colors hover:bg-white"
            >
              <span className="grid h-6 w-6 place-items-center rounded-[2px] bg-[#fff0e9] text-ember">
                <Icon width={13} height={13} />
              </span>
              {title}
            </Link>
          ))}
        </div>
        <Link href={ctaHref} className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-ember">
          {ctaLabel} <ArrowRight width={13} height={13} />
        </Link>
      </div>
    </aside>
  );
}
