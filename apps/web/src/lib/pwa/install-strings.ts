export type InstallStrings = {
  title: string;
  step1IosChrome: string;
  step1IosSafari: string;
  step1IosGeneric: string;
  step2Before: string;
  addToHomeMenuLabel: string;
  step2After: string;
  primaryInstall: string;
  primaryGotIt: string;
  dismiss: string;
};

const STRINGS = {
  pt: {
    title: "Adicione o Anna à tela inicial",
    step1IosChrome:
      "Na barra de endereço, toque no ícone de compartilhar do iPhone (quadrado com seta para cima), no canto superior direito.",
    step1IosSafari:
      "Na barra inferior do Safari, toque no ícone de compartilhar (quadrado com seta para cima).",
    step1IosGeneric:
      "Toque no ícone de compartilhar do navegador (quadrado com seta para cima). Ele costuma ficar na barra superior ou inferior, conforme o app.",
    step2Before: "Depois, escolha ",
    addToHomeMenuLabel: "Adicionar à Tela de Início",
    step2After: " na lista que abrir.",
    primaryInstall: "Adicionar à tela inicial",
    primaryGotIt: "Entendi",
    dismiss: "Agora não"
  },
  en: {
    title: "Add Anna to your Home Screen",
    step1IosChrome:
      "In the address bar, tap the iPhone share icon (square with an up arrow), at the top right.",
    step1IosSafari:
      "In Safari’s bottom bar, tap the share icon (square with an up arrow).",
    step1IosGeneric:
      "Tap your browser’s share icon (square with an up arrow). It’s usually on the top or bottom bar, depending on the app.",
    step2Before: "Then tap ",
    addToHomeMenuLabel: "Add to Home Screen",
    step2After: " in the list that appears.",
    primaryInstall: "Add to Home Screen",
    primaryGotIt: "Got it",
    dismiss: "Not now"
  },
  es: {
    title: "Añade Anna a tu pantalla de inicio",
    step1IosChrome:
      "En la barra de direcciones, toca el icono de compartir del iPhone (cuadrado con flecha hacia arriba), arriba a la derecha.",
    step1IosSafari:
      "En la barra inferior de Safari, toca el icono de compartir (cuadrado con flecha hacia arriba).",
    step1IosGeneric:
      "Toca el icono de compartir del navegador (cuadrado con flecha hacia arriba). Suele estar en la barra superior o inferior.",
    step2Before: "Después, elige ",
    addToHomeMenuLabel: "Añadir a la pantalla de inicio",
    step2After: " en la lista que se abre.",
    primaryInstall: "Añadir a la pantalla de inicio",
    primaryGotIt: "Entendido",
    dismiss: "Ahora no"
  }
} as const satisfies Record<string, InstallStrings>;

export function resolveInstallLocale(): string {
  const raw = typeof navigator !== "undefined" ? navigator.language || "pt-BR" : "pt-BR";
  const lower = raw.toLowerCase();
  if (lower.startsWith("pt")) {
    return "pt";
  }
  if (lower.startsWith("en")) {
    return "en";
  }
  if (lower.startsWith("es")) {
    return "es";
  }
  return "pt";
}

export function getInstallStrings(): InstallStrings {
  const key = resolveInstallLocale();
  if (key === "pt" || key === "en" || key === "es") {
    return STRINGS[key];
  }
  return STRINGS.pt;
}
