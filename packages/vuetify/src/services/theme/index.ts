// Extensions
import { Service } from '../service'

// Utilities
import * as ThemeUtils from './utils'

// Types
import {
  VuetifyParsedTheme,
  VuetifyThemeOptions,
  VuetifyThemes,
  VuetifyThemeVariant
} from 'vuetify/types/services/theme'

export class Theme extends Service {
  static property = 'theme'

  public disabled = false
  public options: VuetifyThemeOptions['options']
  public styleEl?: HTMLStyleElement
  public themes: VuetifyThemes = {
    light: {
      primary: '#1976D2',
      secondary: '#424242',
      accent: '#82B1FF',
      error: '#FF5252',
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FB8C00'
    },
    dark: {
      primary: '#2196F3',
      secondary: '#424242',
      accent: '#FF3F80',
      error: '#FF5252',
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FB8C00'
    }
  }

  private isDark = null as boolean | null
  private ssr = false

  constructor (options: Partial<VuetifyThemeOptions> = {}) {
    super()
    if (options.disable) {
      this.disabled = true

      return
    }

    this.options = {
      ...this.options,
      ...options.options
    }

    this.dark = Boolean(options.dark)
    const themes = options.themes || {}

    this.themes = {
      dark: this.fillVariant(themes.dark, true),
      light: this.fillVariant(themes.light, false)
    }
  }

  // When setting css, check for element
  // and apply new values
  set css (val: string) {
    this.checkStyleElement() && (this.styleEl!.innerHTML = val)
  }

  set dark (val: boolean) {
    const oldDark = this.isDark

    this.isDark = val
    // Only apply theme after dark
    // has already been set before
    oldDark != null && this.applyTheme()
  }

  get dark () {
    return Boolean(this.isDark)
  }

  // Apply current theme default
  // only called on client side
  public applyTheme (): void {
    if (this.disabled) return this.clearCss()

    const options = this.options || {}
    const parsedTheme = this.parsedTheme

    let css: string | null = ''

    // Theme cache get
    if (options.themeCache != null) {
      this.css = options.themeCache.get(parsedTheme) || this.css
    }

    // Generate styles
    css = ThemeUtils.genStyles(
      parsedTheme,
      options.customProperties
    )

    // Minify theme
    if (options.minifyTheme != null) {
      css = options.minifyTheme(css)
    }

    // Theme cache set
    if (options.themeCache != null) {
      options.themeCache.set(parsedTheme, css)
    }

    this.css = css
  }

  public clearCss (): void {
    this.css = ''
  }

  // Initialize theme for SSR and SPA
  // Attach to ssrContext head or
  // apply new theme to document
  public init (ssrContext?: any): void {
    if (this.disabled) return

    this.ssr = Boolean(ssrContext)

    if (this.ssr) {
      const options = this.options || {}
      // SSR
      const nonce = options.cspNonce ? ` nonce="${options.cspNonce}"` : ''
      ssrContext.head = ssrContext.head || ''
      ssrContext.head += `<style type="text/css" id="vuetify-theme-stylesheet"${nonce}>${this.generatedStyles}</style>`
    } else if (typeof document !== 'undefined') {
      // Client-side
      this.applyTheme()
    }
  }

  // Check for existence of style element
  private checkStyleElement (): boolean {
    if (this.ssr) return false // SSR
    if (this.styleEl) return true

    this.genStyleElement() // If doesn't have it, create it

    this.styleEl = document.getElementById('vuetify-theme-stylesheet') as HTMLStyleElement
    return Boolean(this.styleEl)
  }

  private fillVariant (
    theme: Partial<VuetifyThemeVariant> = {},
    dark: boolean
  ): VuetifyThemeVariant {
    const defaultTheme = this.themes[dark ? 'dark' : 'light']

    return Object.assign({},
      defaultTheme,
      theme
    )
  }

  // Generate the style element
  // if applicable
  private genStyleElement (): void {
    const options = this.options || {}

    this.styleEl = document.createElement('style')
    this.styleEl.type = 'text/css'
    this.styleEl.id = 'vuetify-theme-stylesheet'

    if (options.cspNonce) {
      this.styleEl.setAttribute('nonce', options.cspNonce)
    }

    // Asserts that document could
    // be null typescript is hard
    document!.head!.appendChild(this.styleEl)
  }

  get currentTheme () {
    const target = this.dark ? 'dark' : 'light'

    return this.themes![target]
  }

  get generatedStyles (): string {
    const theme = this.parsedTheme
    const options = this.options || {}
    let css

    if (options.themeCache != null) {
      css = options.themeCache.get(theme)
      /* istanbul ignore if */
      if (css != null) return css
    }

    css = ThemeUtils.genStyles(theme, options.customProperties)

    if (options.minifyTheme != null) {
      css = options.minifyTheme(css)
    }

    if (options.themeCache != null) {
      options.themeCache.set(theme, css)
    }

    return css
  }

  get parsedTheme (): VuetifyParsedTheme {
    return ThemeUtils.parse(this.currentTheme || {})
  }
}
