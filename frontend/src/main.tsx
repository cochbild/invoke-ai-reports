import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import { ThemeProvider } from 'next-themes'
import { BrowserRouter } from 'react-router-dom'
import { system } from './theme'
import { FilterProvider } from './context/FilterContext'
import { Toaster } from './toaster'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider value={system}>
      <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
        <BrowserRouter>
          <FilterProvider>
            <App />
            <Toaster />
          </FilterProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ChakraProvider>
  </React.StrictMode>,
)
