/**
 * Cities exposed by the artifact host. Slug = subdirectory under the artifact
 * base URL. Centers are approximate framing targets — MapLibre's PMTiles
 * loader will not auto-recenter, so picking a reasonable centroid + zoom per
 * city matters for first-paint quality.
 *
 * Grouped by region so the city picker can show <optgroup>s. Sorted within
 * each region by canonical Japanese order (大都市 → 都心 → 周辺).
 */
export type Region = "tokyo23" | "kanto" | "kansai" | "chubu" | "kyushu" | "hokkaido";

export interface CityEntry {
  cityCode: string;
  slug: string;
  label: string;
  labelJa: string;
  region: Region;
  center: [number, number];
  zoom: number;
}

export const REGION_LABELS: Record<Region, { en: string; ja: string }> = {
  tokyo23: { en: "Tokyo (23 wards)", ja: "東京23区" },
  kanto: { en: "Kanto", ja: "関東" },
  kansai: { en: "Kansai", ja: "関西" },
  chubu: { en: "Chubu", ja: "中部" },
  kyushu: { en: "Kyushu", ja: "九州" },
  hokkaido: { en: "Hokkaido", ja: "北海道" },
};

export const CITIES: CityEntry[] = [
  // Tokyo 23 wards — central first, then alphabetical.
  { cityCode: "13101", slug: "chiyoda", label: "Chiyoda", labelJa: "千代田区", region: "tokyo23", center: [139.7536, 35.6938], zoom: 13 },
  { cityCode: "13102", slug: "chuo", label: "Chuo", labelJa: "中央区", region: "tokyo23", center: [139.7720, 35.6707], zoom: 13 },
  { cityCode: "13103", slug: "minato", label: "Minato", labelJa: "港区", region: "tokyo23", center: [139.7514, 35.6581], zoom: 13 },
  { cityCode: "13104", slug: "shinjuku", label: "Shinjuku", labelJa: "新宿区", region: "tokyo23", center: [139.7036, 35.6938], zoom: 13 },
  { cityCode: "13105", slug: "bunkyo", label: "Bunkyo", labelJa: "文京区", region: "tokyo23", center: [139.7521, 35.7081], zoom: 13 },
  { cityCode: "13106", slug: "taito", label: "Taito", labelJa: "台東区", region: "tokyo23", center: [139.7800, 35.7126], zoom: 13 },
  { cityCode: "13107", slug: "sumida", label: "Sumida", labelJa: "墨田区", region: "tokyo23", center: [139.8014, 35.7106], zoom: 13 },
  { cityCode: "13108", slug: "koto", label: "Koto", labelJa: "江東区", region: "tokyo23", center: [139.8174, 35.6731], zoom: 12 },
  { cityCode: "13109", slug: "shinagawa", label: "Shinagawa", labelJa: "品川区", region: "tokyo23", center: [139.7305, 35.6092], zoom: 12 },
  { cityCode: "13110", slug: "meguro", label: "Meguro", labelJa: "目黒区", region: "tokyo23", center: [139.6982, 35.6413], zoom: 13 },
  { cityCode: "13111", slug: "ota", label: "Ota", labelJa: "大田区", region: "tokyo23", center: [139.7164, 35.5614], zoom: 12 },
  { cityCode: "13112", slug: "setagaya", label: "Setagaya", labelJa: "世田谷区", region: "tokyo23", center: [139.6534, 35.6464], zoom: 12 },
  { cityCode: "13113", slug: "shibuya", label: "Shibuya", labelJa: "渋谷区", region: "tokyo23", center: [139.7036, 35.6582], zoom: 13 },
  { cityCode: "13114", slug: "nakano", label: "Nakano", labelJa: "中野区", region: "tokyo23", center: [139.6638, 35.7074], zoom: 13 },
  { cityCode: "13115", slug: "suginami", label: "Suginami", labelJa: "杉並区", region: "tokyo23", center: [139.6363, 35.6996], zoom: 12 },
  { cityCode: "13116", slug: "toshima", label: "Toshima", labelJa: "豊島区", region: "tokyo23", center: [139.7158, 35.7261], zoom: 13 },
  { cityCode: "13117", slug: "kita", label: "Kita", labelJa: "北区", region: "tokyo23", center: [139.7335, 35.7530], zoom: 13 },
  { cityCode: "13118", slug: "arakawa", label: "Arakawa", labelJa: "荒川区", region: "tokyo23", center: [139.7831, 35.7361], zoom: 13 },
  { cityCode: "13119", slug: "itabashi", label: "Itabashi", labelJa: "板橋区", region: "tokyo23", center: [139.7095, 35.7515], zoom: 12 },
  { cityCode: "13120", slug: "nerima", label: "Nerima", labelJa: "練馬区", region: "tokyo23", center: [139.6516, 35.7357], zoom: 12 },
  { cityCode: "13121", slug: "adachi", label: "Adachi", labelJa: "足立区", region: "tokyo23", center: [139.8044, 35.7750], zoom: 12 },
  { cityCode: "13122", slug: "katsushika", label: "Katsushika", labelJa: "葛飾区", region: "tokyo23", center: [139.8473, 35.7434], zoom: 12 },
  { cityCode: "13123", slug: "edogawa", label: "Edogawa", labelJa: "江戸川区", region: "tokyo23", center: [139.8683, 35.7066], zoom: 12 },

  // Kanto (outside Tokyo 23)
  { cityCode: "14204", slug: "kamakura", label: "Kamakura", labelJa: "鎌倉市", region: "kanto", center: [139.5510, 35.3192], zoom: 13 },
  { cityCode: "14100", slug: "yokohama", label: "Yokohama", labelJa: "横浜市", region: "kanto", center: [139.6380, 35.4437], zoom: 12 },

  // Kansai
  { cityCode: "27100", slug: "osaka", label: "Osaka", labelJa: "大阪市", region: "kansai", center: [135.5023, 34.6937], zoom: 12 },

  // Chubu
  { cityCode: "23100", slug: "nagoya", label: "Nagoya", labelJa: "名古屋市", region: "chubu", center: [136.9066, 35.1815], zoom: 12 },

  // Kyushu
  { cityCode: "40130", slug: "fukuoka", label: "Fukuoka", labelJa: "福岡市", region: "kyushu", center: [130.4017, 33.5902], zoom: 12 },

  // Hokkaido
  { cityCode: "01100", slug: "sapporo", label: "Sapporo", labelJa: "札幌市", region: "hokkaido", center: [141.3545, 43.0618], zoom: 12 },
];

export function findCity(cityCode: string): CityEntry | null {
  return CITIES.find((c) => c.cityCode === cityCode) ?? null;
}

export function findCityBySlug(slug: string): CityEntry | null {
  return CITIES.find((c) => c.slug === slug) ?? null;
}

/**
 * Iterate cities grouped by region. Skips empty regions.
 */
export function groupedCities(): Array<{ region: Region; cities: CityEntry[] }> {
  const buckets = new Map<Region, CityEntry[]>();
  for (const city of CITIES) {
    const arr = buckets.get(city.region) ?? [];
    arr.push(city);
    buckets.set(city.region, arr);
  }
  return [...buckets.entries()].map(([region, cities]) => ({ region, cities }));
}
