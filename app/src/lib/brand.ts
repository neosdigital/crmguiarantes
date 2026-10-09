// Identidade nominal e logo do CRM. As cores ficam em src/app/globals.css (tokens --brand-*).
// manifest.json e sw.js (em public/) não importam módulos e repetem o nome manualmente.
export const BRAND = {
  appName: "CRM Guilherme Arantes",
  shortName: "Guilherme Arantes",
  // Logo branca com fundo transparente: usar sempre sobre os fundos escuros da paleta.
  logo: { src: "/logo-guilherme-arantes.png", width: 1254, height: 1254, alt: "Guilherme Arantes Corretor" },
} as const;
