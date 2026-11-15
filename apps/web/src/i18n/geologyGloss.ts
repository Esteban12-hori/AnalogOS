/**
 * English editorial glosses of the official geological unit names and descriptions (SERNAGEOMIN via MMA; SEGEMAR/SIGAM).
 *
 * The official wording stays the record: unit names and descriptions in the geology package and in every export are
 * unchanged. These glosses are a faithful English translation for readers, shown with an explicit label and with the
 * original available next to it. Rules followed:
 * - translate term by term, keep the order of the source lists and do not add mineralogy, ages or interpretation;
 * - formation/complex proper names stay as names (“Formación Geste” → “Geste Formation”);
 * - truncations or typos in the source are flagged, not silently repaired.
 * Keys are the exact original strings; the coverage test checks every unit in the active package.
 */

export const GLOSS_LABEL = 'English editorial translation'
export const ORIGINAL_LABEL = 'Original official wording (Spanish)'

export const GEOLOGY_UNIT_NAME_EN: Readonly<Record<string, string>> = {
  'Depositos aluviales, subordinadamente coluviales o lacustres': 'Alluvial deposits, subordinately colluvial or lacustrine',
  'Secuencias y complejos volcanicos continentales': 'Continental volcanic sequences and complexes',
  'Secuencias y complejos volcanicos continentales acidos': 'Acidic continental volcanic sequences and complexes',
  'Secuencias sedimentarias de abanicos aluviales, pedimento o fluviales': 'Sedimentary sequences of alluvial fans, pediment or fluvial',
  'Secuencias sedimentarias clasticas de piedemonte, aluviales, coluviales o fluvia': 'Clastic piedmont, alluvial, colluvial or fluvial sedimentary sequences (name truncated in the source)',
  'Secuencias volcanicas continentales': 'Continental volcanic sequences',
  'Secuencias sedimentarias marinas carbonatadas y clasticas': 'Marine carbonate and clastic sedimentary sequences',
  'Depósitos aluviales actuales': 'Present-day alluvial deposits',
  'Formación Patquía - De la Cuesta': 'Patquía - De la Cuesta Formation',
  'Formación Geste': 'Geste Formation',
  'Depósitos lacustres': 'Lacustrine deposits',
  'Formación Falda Ciénaga': 'Falda Ciénaga Formation',
  'Depósitos coluviales': 'Colluvial deposits',
  'Abanicos aluviales viejos': 'Old alluvial fans',
  'Complejo volcánico Galán (Piroclásticas intermedias)': 'Galán Volcanic Complex (intermediate pyroclastics)',
  'Formación Tebequincho': 'Tebequincho Formation',
  'Depósitos aluviales y coluviales': 'Alluvial and colluvial deposits',
  'Complejo volcánico Galán (Volcánicas)': 'Galán Volcanic Complex (volcanics)',
  'Formación Pachamama': 'Pachamama Formation',
  'Depósitos aterrazados': 'Terraced deposits',
  'Rocas Plutonicas Cretacico Inferior-Cretacico Superior': 'Lower Cretaceous–Upper Cretaceous plutonic rocks',
  'Plutones Flamenco y Caldera-Pajonales': 'Flamenco and Caldera-Pajonales plutons',
}

export const GEOLOGY_UNIT_DESCRIPTION_EN: Readonly<Record<string, string>> = {
  'grava,arena,limo': 'gravel, sand, silt',
  'andesita basaltica,dacita,volcanico piroclastico': 'basaltic andesite, dacite, pyroclastic volcanic',
  'dacita,riolita,volcanico piroclastico': 'dacite, rhyolite, pyroclastic volcanic',
  'grava,arena,limo,ignimbrita': 'gravel, sand, silt, ignimbrite',
  'conglomerado,arenisca,limolita': 'conglomerate, sandstone, siltstone',
  'basalto,dacita,volcanico piroclastico,sedimentario': 'basalt, dacite, pyroclastic volcanic, sedimentary',
  'caliza,lutita,arenisca calcarea,yeso': 'limestone, shale, calcareous sandstone, gypsum',
  'Limos , arenas y gravas': 'Silts, sands and gravels',
  'Sedimentitas rojas conglomerados y areniscas, depósitos de abanícos aluviales en la parte inferior y fluviales en la superior':
    'Red sedimentary rocks, conglomerates and sandstones; alluvial-fan deposits in the lower part and fluvial deposits in the upper part',
  'Areniscas finas a medianas, conglomerados y pelitas, sedimentitas roj ambiente fluvial':
    'Fine- to medium-grained sandstones, conglomerates and pelites, red sedimentary rocks, fluvial environment (the source text is truncated: “roj”)',
  'Limos y arcillas': 'Silts and clays',
  'Grauvacas y pelitas, depósitos turbidíticos de talud, anquimetamorfismo': 'Greywackes and pelites, slope turbidite deposits, anchimetamorphism',
  'Limos, arenas y conglomerados': 'Silts, sands and conglomerates',
  'Conglomerados gruesos': 'Coarse conglomerates',
  'Ignimbrita dacítica': 'Dacitic ignimbrite',
  'Dacitas y andesitas': 'Dacites and andesites',
  'Gravas arenas y arcillas': 'Gravels, sands and clays',
  'Lava post caldera': 'Post-caldera lava',
  'Grauvacas y pelitas con intercalaciones de areniscas cuarzosas; lavas dacíticas y areniscas volcaniclásticas con anquimetamorfismo':
    'Greywackes and pelites with interbedded quartz sandstones; dacitic lavas and volcaniclastic sandstones with anchimetamorphism',
  'Esquistos y gneises con intercalaciones de calizas y anfibolitas': 'Schists and gneisses with interbedded limestones and amphibolites',
  'Conglomerados con intercalaciones de areniscas, pelitas y tobas': 'Conglomerates with interbedded sandstones, pelites and tuffs',
  'diorita,monzodiorita,granodiorita,monzogranito': 'diorite, monzodiorite, granodiorite, monzogranite',
  'diorita,gabro,monzodiorita cuarcifera,granodioriorita': 'diorite, gabbro, quartz monzodiorite, granodiorite (spelled “granodioriorita” in the source)',
  'basalto,andesita,riolita,sedimentario': 'basalt, andesite, rhyolite, sedimentary',
}

const own = (map: Readonly<Record<string, string>>, key: string | null): string | null =>
  key !== null && Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null

/** English gloss of an official unit name, or null (then only the original name is shown). */
export const unitNameEn = (name: string | null): string | null => own(GEOLOGY_UNIT_NAME_EN, name)

/** English gloss of an official unit description, or null (then the original is shown, marked as original wording). */
export const unitDescriptionEn = (description: string | null): string | null => own(GEOLOGY_UNIT_DESCRIPTION_EN, description)

/** “Original name — English gloss” for compact lists; the original official name always comes first. */
export function unitNameDisplay(name: string | null, code: string | null): string {
  if (name === null) return code ?? 'unnamed unit'
  const en = unitNameEn(name)
  return en && en !== name ? `${name} — ${en}` : name
}
