import { defineConfig, devices } from '@playwright/test'

/**
 * Configuração do Playwright para testes E2E
 * Cobertura alvo: 80%+
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Testes em paralelo */
  fullyParallel: true,
  
  /* Falhar build se testes queimarem */
  forbidOnly: !!process.env.CI,
  
  /* Re-executar testes em falha */
  retries: process.env.CI ? 2 : 0,
  
  /* Workers em CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter para CI/CD */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }]
  ],
  
  /* Shared settings */
  use: {
    /* Base URL */
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    
    /* Screenshots on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
    
    /* Trace on failure */
    trace: 'on-first-retry',
    
    /* Timeouts padrão (podem ser sobrescritos por projeto) */
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  
  /* Timeout global para cada teste */
  timeout: 60000, // 60 segundos por teste

  /* Configuração de projetos (devices) */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        actionTimeout: 15000,
        navigationTimeout: 30000,
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        actionTimeout: 15000,
        navigationTimeout: 30000,
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        /* WebKit é mais lento, então aumentamos timeouts */
        actionTimeout: 30000,
        navigationTimeout: 60000,
      },
    },
    /* Mobile */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        /* Navegadores móveis precisam de mais tempo */
        actionTimeout: 30000,
        navigationTimeout: 60000,
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        /* Mobile Safari é o mais lento */
        actionTimeout: 45000,
        navigationTimeout: 90000,
      },
    },
  ],

  /* Servidor de desenvolvimento */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})

