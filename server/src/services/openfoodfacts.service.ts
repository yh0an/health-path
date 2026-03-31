export interface OFFProduct {
  id: string;
  name: string;
  brand: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export async function searchProducts(query: string): Promise<OFFProduct[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=20&fields=code,product_name,brands,nutriments`;
  const res = await fetch(url);
  const data = (await res.json()) as { products: Record<string, unknown>[] };
  return (data.products || [])
    .filter((p) => p.product_name)
    .map((p) => {
      const n = (p.nutriments as Record<string, unknown>) || {};
      return {
        id: String(p.code || ''),
        name: String(p.product_name || ''),
        brand: String(p.brands || ''),
        calories: Number(n['energy-kcal_100g'] || 0),
        proteinG: Number(n.proteins_100g || 0),
        carbsG: Number(n.carbohydrates_100g || 0),
        fatG: Number(n.fat_100g || 0),
      };
    });
}
