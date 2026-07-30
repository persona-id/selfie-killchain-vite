export const LEFT_SHELL_DURATION_MS = 650

/** oem.care ease-global */
export const OEM_EASE_GLOBAL = [0.7, 0.01, 0.11, 0.96] as const

export const CHROME_ENTRANCE_DELAY_S = 1.5

export const OEM_SHELL_DURATION_S = 0.85 * 1.25
export const OEM_SHELL_STAGGER_S = 0.2 * 1.25

export const CHROME_FADE_TRANSITION = {
  duration: OEM_SHELL_DURATION_S,
  ease: OEM_EASE_GLOBAL,
} as const

/** Menu/chrome fade begins when globe zoom + loads reach 100%. */
export const CHROME_MENU_REVEAL_MS = Math.round(OEM_SHELL_DURATION_S * 1000)

export const SHELL_ENTRANCE_LEFT = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: {
    ...CHROME_FADE_TRANSITION,
    delay: 0,
  },
}

export const SETTINGS_MENU_ENTRANCE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: {
    ...CHROME_FADE_TRANSITION,
    delay: OEM_SHELL_STAGGER_S,
  },
}
