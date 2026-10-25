/** Search vocabulary, never a substitute for retrieved scientific evidence. */
const bacterialContext = /bacter|bacillus|streptococc|pneumococc/i;
export function dnaTransferScopes(topic: string): string[] | undefined {
  if (!/competence|competent|electroporation|transformation|transduction/i.test(topic))
    return undefined;
  if (!bacterialContext.test(topic) && !/foreign DNA|cloning|phage/i.test(topic)) return undefined;
  const scopes: string[] = [];
  if (/transduction/i.test(topic)) scopes.push("Bacteriophage transduction in bacteria");
  if (/natural competence|naturally competent/i.test(topic)) {
    const genera = ["Bacillus", "Streptococcus"].filter((g) => new RegExp(g, "i").test(topic));
    for (const genus of genera.length ? genera : ["Bacterial"])
      scopes.push(`${genus} natural competence transformation`);
  }
  if (/calcium chloride|CaCl2|chemical(?:ly)? (?:competence|competent|transformation)/i.test(topic))
    scopes.push("Bacterial chemical transformation calcium chloride");
  if (/electroporation/i.test(topic)) scopes.push("Bacterial electroporation transformation");
  if (/(?:uptake|uptaking).*DNA|DNA.*uptake/i.test(topic))
    scopes.push("Bacterial transformation DNA uptake");
  if (/integration|recombination/i.test(topic))
    scopes.push("Bacterial transformation homologous recombination integration");
  if (/cloning|genetic engineering/i.test(topic))
    scopes.push("Bacterial transformation cloning genetic engineering");
  return scopes.length ? scopes : undefined;
}
export function dnaTransferClarification(topic: string): string | undefined {
  if (
    /transduction/i.test(topic) &&
    /competence|competent|electroporation|calcium chloride/i.test(topic)
  )
    return "Terminology note: competence and uptake of free DNA describe transformation. Transduction is bacteriophage-mediated DNA transfer. This request covers both; distinguish them when teaching. The original requested title is retained.";
}
/** Match a defined mechanism in bacterial context; signal transduction and mammalian transfection do not qualify. */
export function dnaTransferRelevance(scope: string, body: string): number | undefined {
  if (
    !/^(?:Bacterial|Bacillus|Streptococcus|Bacteriophage) /i.test(scope) ||
    !/transformation|transduction/i.test(scope)
  )
    return undefined;
  if (
    !bacterialContext.test(body) &&
    !/Escherichia|E\.?\s*coli|pneumococc|bacteriophage/i.test(body)
  )
    return 0;
  if (/Bacteriophage transduction/.test(scope))
    return /transduc/i.test(body) && /bacteriophage|\bphage\b|prophage/i.test(body) ? 1 : 0;
  if (/natural competence/.test(scope)) {
    const genus = scope.match(/^(Bacillus|Streptococcus)/)?.[1];
    if (
      genus &&
      !new RegExp(genus === "Streptococcus" ? "streptococc|pneumococc" : genus, "i").test(body)
    )
      return 0;
    return /competen|natural(?:ly)? transform/i.test(body) && /DNA|transform/i.test(body) ? 1 : 0;
  }
  if (/calcium chloride/.test(scope))
    return /calcium|CaCl|chemical(?:ly)? (?:competent|transformation)/i.test(body) &&
      /transform|DNA/i.test(body)
      ? 1
      : 0;
  if (/electroporation/.test(scope))
    return /electroporat/i.test(body) && /DNA|transform/i.test(body) ? 1 : 0;
  if (/DNA uptake/.test(scope))
    return /DNA/i.test(body) &&
      /uptake|transport|internali[sz]|import/i.test(body) &&
      /competen|transform/i.test(body)
      ? 1
      : 0;
  if (/recombination/.test(scope))
    return /DNA/i.test(body) && /recombin|integrat/i.test(body) && /competen|transform/i.test(body)
      ? 1
      : 0;
  if (/cloning/.test(scope))
    return /transform/i.test(body) &&
      /clon|plasmid|vector|genetic (?:engineering|manipulation)/i.test(body)
      ? 1
      : 0;
  return undefined;
}

export function dnaTransferQueries(scope: string): string[] {
  if (dnaTransferRelevance(scope, "") === undefined) return [];
  const bacteria = '(bacteria OR bacterial OR Bacillus OR Streptococcus OR "Escherichia coli")';
  if (/Bacteriophage transduction/.test(scope))
    return ["(bacteriophage OR phage) AND transduction AND (bacteria OR bacterial)"];
  if (/natural competence/.test(scope)) {
    const genus = scope.match(/^(Bacillus|Streptococcus)/)?.[1];
    return [
      `${genus || bacteria} AND ("natural competence" OR "natural transformation" OR "competent cells")`,
    ];
  }
  if (/calcium chloride/.test(scope))
    return [
      `${bacteria} AND ("calcium chloride" OR CaCl2 OR "chemical transformation" OR "chemically competent") AND (DNA OR transformation)`,
    ];
  if (/electroporation/.test(scope))
    return [`${bacteria} AND electroporation AND (DNA OR transformation)`];
  if (/DNA uptake/.test(scope))
    return [`${bacteria} AND ("DNA uptake" OR "DNA transport") AND (competence OR transformation)`];
  if (/recombination/.test(scope))
    return [`${bacteria} AND transformation AND ("homologous recombination" OR "DNA integration")`];
  if (/cloning/.test(scope))
    return [`${bacteria} AND transformation AND (cloning OR "genetic engineering" OR plasmid)`];
  return [];
}

export function dnaTransferSectionTitle(scope: string): string | undefined {
  if (/^Bacteriophage transduction/.test(scope)) return "Transduction: phage-mediated transfer";
  if (/natural competence/.test(scope))
    return scope
      .replace(/ transformation$/, "")
      .replace(/^(\w+) natural competence$/, "Natural competence in $1");
  if (/calcium chloride/.test(scope)) return "Chemical competence: calcium chloride";
  if (/electroporation/.test(scope)) return "Electroporation and DNA delivery";
  if (/DNA uptake/.test(scope)) return "DNA uptake across the cell envelope";
  if (/recombination/.test(scope)) return "Integration and homologous recombination";
  if (/cloning/.test(scope)) return "Cloning and genetic engineering applications";
}
