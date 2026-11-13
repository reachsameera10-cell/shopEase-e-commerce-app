import { useCallback, useMemo, useState } from 'react'
import { ThemeContext } from './themeContext.js'

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    theme === 'dark' ? '#151a17' : '#fbfaf7',
  )
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => (
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  ))

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
      applyTheme(nextTheme)
      try {
        window.localStorage.setItem('shopease-theme', nextTheme)
      } catch (error) {
        console.error('Unable to save the theme preference.', error)
      }
      return nextTheme
    })
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeProvider
