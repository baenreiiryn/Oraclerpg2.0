import {
  buildFeatureSourceTranslationMap,
  buildMonsterLocalizationCatalog,
  collectMonsterPresentationStrings
} from "./monster-localization.js";
import { translateFinalCommonMonsterVariant } from "./monster-localization-patterns-final.js";

/**
 * Builds the complete PT-BR presentation overlay for materialized monsters.
 *
 * The base builder reuses audited canonical feature translations and strict
 * structural projections. This wrapper then fills only still-missing visual
 * leaves with the final audited common patterns or exact source-text variants.
 * Canonical monster data is never mutated.
 */
export function buildCompleteMonsterLocalizationCatalog({
  monsters,
  featureDefinitions,
  featureCatalogs,
  nameMap,
  variantTranslations = {},
  explicitEntries = {}
}) {
  const catalog = buildMonsterLocalizationCatalog({
    monsters,
    featureDefinitions,
    featureCatalogs,
    nameMap,
    variantTranslations,
    explicitEntries
  });
  const exactMap = buildFeatureSourceTranslationMap(featureDefinitions, featureCatalogs);

  for (const monster of monsters ?? []) {
    const overlay = catalog.entries[monster.canonicalId] ?? (catalog.entries[monster.canonicalId] = {});
    for (const [pathKey, source] of Object.entries(collectMonsterPresentationStrings(monster))) {
      if (typeof overlay[pathKey] === "string") continue;
      const translated = variantTranslations[source] ?? translateFinalCommonMonsterVariant(source, exactMap);
      if (typeof translated === "string" && translated.length) overlay[pathKey] = translated;
    }
  }

  return catalog;
}
