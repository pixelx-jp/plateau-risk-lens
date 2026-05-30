import { groupedCities, REGION_LABELS, findCityBySlug } from "@/app/cities";
import { useAppStore } from "@/app/store/useAppStore";
import { MOBILE_QUERY, useMediaQuery } from "@/utils/useMediaQuery";
import { useMemo } from "react";

interface Props {
  onChangeCity(slug: string, cityCode: string): void;
  currentSlug: string;
}

export function CityPicker({ onChangeCity, currentSlug }: Props) {
  const locale = useAppStore((s) => s.locale);
  const setCityCode = useAppStore((s) => s.setCityCode);
  const groups = useMemo(() => groupedCities(), []);
  const isMobile = useMediaQuery(MOBILE_QUERY);

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
        padding: isMobile ? "8px 10px" : "6px 8px",
        // 16px avoids iOS focus-zoom; 44px meets the touch-target minimum
        fontSize: isMobile ? 16 : 13,
        border: "1px solid #BBB",
        borderRadius: 4,
        background: "white",
        minHeight: isMobile ? 44 : 36,
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
