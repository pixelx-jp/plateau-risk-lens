import { groupedCities, REGION_LABELS, findCityBySlug } from "@/app/cities";
import { useAppStore } from "@/app/store/useAppStore";
import { useMemo } from "react";

interface Props {
  onChangeCity(slug: string, cityCode: string): void;
  currentSlug: string;
}

export function CityPicker({ onChangeCity, currentSlug }: Props) {
  const locale = useAppStore((s) => s.locale);
  const setCityCode = useAppStore((s) => s.setCityCode);
  const groups = useMemo(() => groupedCities(), []);

  return (
    <select
      value={currentSlug}
      onChange={(event) => {
        const slug = event.target.value;
        const city = findCityBySlug(slug);
        if (!city) return;
        setCityCode(city.cityCode);
        onChangeCity(city.slug, city.cityCode);
      }}
      style={{
        padding: "6px 8px",
        fontSize: 13,
        border: "1px solid #BBB",
        borderRadius: 4,
        background: "white",
        minHeight: 36,
      }}
    >
      {groups.map(({ region, cities }) => (
        <optgroup key={region} label={REGION_LABELS[region][locale]}>
          {cities.map((city) => (
            <option key={city.slug} value={city.slug}>
              {locale === "ja" ? city.labelJa : city.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
