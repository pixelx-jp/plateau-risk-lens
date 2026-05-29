import { useAppStore } from "@/app/store/useAppStore";
import type { I18n } from "@/i18n/I18n";

export function OpacitySlider({ i18n }: { i18n: I18n }) {
  const opacity = useAppStore((s) => s.hazardOpacity);
  const set = useAppStore((s) => s.setHazardOpacity);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontWeight: 600 }}>{i18n.t("controls.opacity")}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={opacity}
        onChange={(event) => set(Number(event.target.value))}
      />
      <span style={{ fontSize: 11, color: "#666" }}>{(opacity * 100).toFixed(0)}%</span>
    </label>
  );
}
