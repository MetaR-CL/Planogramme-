import type { Article, Shelf } from './types';
export function placementIssues(
  sh: Shelf,
  articles: Article[],
  aid: string,
  levelId: string,
  facings: number,
  replacingUid?: string,
): string[] {
  const a = articles.find((a) => a.id === aid),
    l = sh.levels.find((l) => l.id === levelId);
  if (!a || !l) return ['Article ou niveau introuvable.'];
  const used =
    (sh.place[levelId] ?? [])
      .filter((p) => p.uid !== replacingUid)
      .reduce(
        (sum, p) => sum + (articles.find((a) => a.id === p.aid)?.w ?? 0) * p.f,
        0,
      ) +
    a.w * facings;
  const errors: string[] = [];
  if (used > sh.width + 0.01)
    errors.push(
      `Dépassement de ${(used - sh.width).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} cm en largeur.`,
    );
  if (a.h > l.h)
    errors.push(`Produit de ${a.h} cm pour ${l.h} cm de hauteur disponible.`);
  if (a.d > (sh.depth ?? 40))
    errors.push(
      `Produit de ${a.d} cm pour ${sh.depth ?? 40} cm de profondeur disponible.`,
    );
  return errors;
}
