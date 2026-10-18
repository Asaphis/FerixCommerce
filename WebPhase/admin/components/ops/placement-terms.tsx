import { inputClass } from "@/components/ops/table";
import { LocalDateTimeInput } from "@/components/ops/local-datetime-input";
import { ColorInput } from "@/components/shared/color-input";
import type { SectionOption } from "@/lib/api";

/**
 * The terms a section asks of one product.
 *
 * A section says what it needs: a campaign may want an offer price and a window
 * that product shows for, a plain row wants nothing at all. The fields come from
 * the section's own schema, so ticking a campaign reveals the campaign's terms
 * and ticking an ordinary row reveals nothing.
 *
 * Position is left out on purpose: the order inside a section is managed where
 * the section is, not while a product is being edited.
 */
export function PlacementTerms({ section, slot, values = {} }: {
  section: SectionOption;
  slot: string;
  values?: Record<string, unknown>;
}) {
  const fields = (section.productConfigSchema ?? []).filter((field) => field.key !== "position");
  if (!fields.length) return null;
  return (
    <div className="mt-2.5 grid gap-2 border-t border-hairline pt-2.5 sm:grid-cols-2">
      {fields.map((field) => (
        <label key={field.key} className="grid gap-1">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-chalk-dim">
            {field.label}
            {field.required ? <span className="text-signal"> *</span> : null}
          </span>
          {field.kind === "datetime" ? (
            <LocalDateTimeInput
              name={`config__${slot}__${field.key}`}
              value={values[field.key] == null ? "" : String(values[field.key])}
              required={Boolean(field.required)}
              className={inputClass}
            />
          ) : field.kind === "color" ? (
            <ColorInput
              name={`config__${slot}__${field.key}`}
              value={values[field.key] == null ? "" : String(values[field.key])}
              required={Boolean(field.required)}
              className={inputClass}
            />
          ) : (
            <input
              name={`config__${slot}__${field.key}`}
              type={field.kind === "number" ? "number" : "text"}
              step={field.kind === "number" ? "0.01" : undefined}
              min={field.kind === "number" ? 0 : undefined}
              required={Boolean(field.required)}
              defaultValue={values[field.key] == null ? "" : String(values[field.key])}
              placeholder={field.placeholder ?? ""}
              className={inputClass}
            />
          )}
        </label>
      ))}
    </div>
  );
}
