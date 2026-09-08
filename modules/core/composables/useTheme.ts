export const useTheme = () => {
  const theme = useState<'dark' | 'light'>('laxmtb_theme', () => 'dark')

  const applyTheme = (newTheme: 'dark' | 'light') => {
    theme.value = newTheme
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', newTheme)
      localStorage.setItem('laxmtb_theme', newTheme)
    }
  }

  const toggleTheme = () => {
    const nextTheme = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme(nextTheme)
  }

  onMounted(() => {
    const saved = localStorage.getItem('laxmtb_theme') as 'dark' | 'light' | null
    if (saved && (saved === 'dark' || saved === 'light')) {
      applyTheme(saved)
    } else {
      applyTheme('dark')
    }
  })

  return {
    theme,
    toggleTheme,
    setTheme: applyTheme
  }
}
