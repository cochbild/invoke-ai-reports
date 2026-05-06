import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { BrowserRouter } from 'react-router-dom'
import { system } from './theme'
import { queryClient } from './queryClient'
import { FilterProvider } from './context/FilterContext'
import { Toaster } from './toaster'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider value={system}>
      <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <FilterProvider>
              <App />
              <Toaster />
            </FilterProvider>
          </BrowserRouter>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </ThemeProvider>
    </ChakraProvider>
  </React.StrictMode>,
)
