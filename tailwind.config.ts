import type { Config } from 'tailwindcss'

// 計劃書 §6 色彩系統 + 編輯風（Morning OS 風格）暖色系與襯線字
export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        walk: { DEFAULT: '#0F6E56', bg: '#E4F1EA' },
        poop: { DEFAULT: '#B0701A', bg: '#F6EAD6' },
        ai: { DEFAULT: '#534AB7', bg: '#EEEDFE' },
        alert: { DEFAULT: '#D2483F', bg: '#F8E7E2' },
        // 編輯風暖色系
        cream: '#F4EEE1',
        surface: '#FCFAF4',
        ink: '#262217',
        muted: '#7A6F5B',
        clay: '#9E6B2F',
        sage: { DEFAULT: '#5C6B4D', bg: '#E4E8D7' },
        sand: '#EAD9B8',
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 2px 18px rgba(40, 33, 20, 0.06)',
        float: '0 12px 30px rgba(40, 33, 20, 0.12)',
      },
    },
  },
}
