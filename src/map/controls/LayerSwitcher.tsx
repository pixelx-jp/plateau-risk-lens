import { HAZARD_KEYS, type HazardKey } from "@/types/hazard";
import { useAppStore } from "@/app/store/useAppStore";
import type { I18n } from "@/i18n/I18n";

interface Props {
  i18n: I18n;
}

export function LayerSwitcher({ i18n }: Props) {
  const active = useAppStore((s) => s.activeHazards);
  const toggle = useAppStore((s) => s.toggleHazard);

  return (
    <fieldset
      style={{
        border: 0,
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <legend style={{ fontWeight: 600, marginBottom: 4 }}>
        {i18n.t("controls.layers")}
      </legend>
      {HAZARD_KEYS.map((key: HazardKey) => (
        <label
          key={key}
          style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={active.includes(key)}
            onChange={() => toggle(key)}
          />
          <span>{i18n.hazardLabel(key)}</span>
        </label>
      ))}
    </fieldset>
  );
}
