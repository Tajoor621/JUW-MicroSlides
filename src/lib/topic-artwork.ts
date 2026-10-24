/** Small, schematic vector ornament. It is decoration only, never a scientific figure. */
export function topicArtKind(
  topic: string,
):
  | "genome"
  | "enzyme"
  | "fungal"
  | "parasite"
  | "virus"
  | "bacterium"
  | "microscopy"
  | "culture"
  | "biofilm"
  | "immunity" {
  const t = topic.toLowerCase();
  if (/microscop|gram stain|fluorescen|acid.fast|staining/.test(t)) return "microscopy";
  if (/culture|growth|agar|colony|incubat/.test(t)) return "culture";
  if (/biofilm|quorum|adhesion/.test(t)) return "biofilm";
  if (/immun|vaccin|antibod|antigen|complement/.test(t)) return "immunity";
  if (/malaria|plasmod|parasite|helminth|protozo/.test(t)) return "parasite";
  if (/fung|myco|yeast|mould|mold|candida|aspergill|cryptococc/.test(t)) return "fungal";
  if (/virus|viral|influenza|phage|coronavirus|sars/.test(t)) return "virus";
  if (/enzym|immobili[sz]|cataly|protein|ferment/.test(t)) return "enzyme";
  if (/genom|chromosom|nucleoid|\bdna\b|\brna\b|pcr|genetic|molecular/.test(t)) return "genome";
  return "bacterium";
}

export function slideArtworkTopic(topic: string, heading: string) {
  return /microscop|gram stain|fluorescen|acid.fast|staining|culture|growth|agar|colony|incubat|biofilm|quorum|adhesion|immun|vaccin|antibod|antigen|complement|malaria|plasmod|parasite|helminth|protozo|fung|myco|yeast|mould|mold|candida|aspergill|cryptococc|virus|viral|influenza|phage|coronavirus|sars|enzym|immobili[sz]|cataly|protein|ferment|genom|chromosom|nucleoid|\bdna\b|\brna\b|pcr|genetic|molecular/i.test(
    heading,
  )
    ? heading
    : topic;
}
export function topicArtworkSvg(topic: string, heading = ""): string {
  const art = topicArtKind(slideArtworkTopic(topic, heading));
  const shell = (body: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  if (art === "microscopy")
    return shell(
      '<path d="m100 30 45 25-40 68-45-25zM137 80c65 30 48 100-20 100H60M75 175v35m-35 0h145M85 145h70"/><circle cx="100" cy="147" r="12"/>',
    );
  if (art === "culture")
    return shell(
      '<ellipse cx="120" cy="135" rx="95" ry="65"/><ellipse cx="120" cy="120" rx="95" ry="65"/><circle cx="85" cy="105" r="13"/><circle cx="145" cy="140" r="20"/><circle cx="155" cy="90" r="9"/><circle cx="70" cy="140" r="7"/>',
    );
  if (art === "immunity")
    return shell(
      '<path d="m40 45 60 75v95h40v-95l60-75-30-20-50 60-50-60z"/><circle cx="120" cy="115" r="10"/>',
    );
  if (art === "biofilm")
    return shell(
      '<path d="M20 205h200M25 190c15-30 5-70 40-80 25-10 25-70 60-65 40 5 20 70 55 85 30 15 15 35 35 60z"/><rect x="60" y="145" width="40" height="20" rx="10"/><rect x="120" y="140" width="45" height="20" rx="10"/><circle cx="120" cy="90" r="11"/>',
    );
  if (art === "genome")
    return shell(
      `<path d="M72 22c120 42-24 70 96 112S48 190 168 218M168 22C48 64 192 92 72 134s120 56 0 84"/><path d="M94 38h52M77 63h86M83 91h74M94 119h52M77 147h86M83 175h74M94 203h52" opacity=".65"/><circle cx="120" cy="120" r="108" opacity=".22"/>`,
    );
  if (art === "enzyme")
    return shell(
      `<path d="M120 20 202 68v96l-82 48-82-48V68z"/><path d="M74 87c18-35 42-30 46 1 5 34 30 41 49 12M69 151c21 21 38 17 49-7 12-27 32-30 53-9"/><circle cx="120" cy="119" r="14"/><circle cx="183" cy="91" r="8"/><circle cx="56" cy="180" r="7"/>`,
    );
  if (art === "fungal")
    return shell(
      `<path d="M120 216c-2-42 4-76 0-109-4-28 8-51 0-77M119 166c-38-13-54-34-60-67M121 143c40-12 55-34 62-68M119 185c35 0 56 14 77 34M119 118c-24-4-39-17-49-38"/><circle cx="120" cy="25" r="8"/><circle cx="59" cy="98" r="8"/><circle cx="183" cy="75" r="8"/><circle cx="196" cy="219" r="8"/><circle cx="70" cy="80" r="6"/>`,
    );
  if (art === "parasite")
    return shell(
      `<ellipse cx="120" cy="120" rx="74" ry="96"/><path d="M70 100c24-40 76-42 100-1M67 137c29 36 78 36 106 0M89 55c20 21 42 21 62 0M89 185c20-21 42-21 62 0"/><circle cx="120" cy="119" r="14"/><circle cx="97" cy="108" r="5"/><circle cx="145" cy="133" r="5"/>`,
    );
  if (art === "virus")
    return shell(
      `<circle cx="120" cy="120" r="62"/><circle cx="120" cy="120" r="37" opacity=".7"/><path d="m120 20v27m0 146v27M20 120h27m146 0h27M49 49l20 20m102 102 20 20m0-142-20 20M69 171l-20 20m22-138 15 18m68 82 15 18m-24-102 6-24m-6 152-6 24"/><circle cx="120" cy="120" r="8"/>`,
    );
  return shell(
    `<rect x="45" y="83" width="150" height="74" rx="37"/><path d="M59 80 44 55m38 25-7-37m44 36V28m39 49 14-34m5 68 35-16m-30 39 39 12M60 158l-19 27m54-27-5 34m46-35 12 31m23-31 29 23"/><circle cx="92" cy="117" r="7"/><circle cx="124" cy="133" r="7"/><circle cx="153" cy="106" r="7"/>`,
  );
}
