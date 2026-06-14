import type { Config } from 'tailwindcss'

// 計劃書 §6 色彩系統
export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        walk: { DEFAULT: '#0F6E56', bg: '#E1F5EE' },
        poop: { DEFAULT: '#BA7517', bg: '#FAEEDA' },
        ai: { DEFAULT: '#534AB7', bg: '#EEEDFE' },
        alert: { DEFAULT: '#E24B4A', bg: '#FCEBEB' },
      },
    },
  },
}
