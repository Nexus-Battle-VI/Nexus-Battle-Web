// @ts-check
import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

/**
 * ESLint 10 con reglas basadas en informacion de tipos.
 *
 * typescript-eslint usa la API JS de TypeScript 6, que es la version instalada
 * como `typescript`. La verificacion de tipos del producto la realiza
 * TypeScript 7 mediante el alias `typescript7`. Vease ADR-003.
 */
export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**', 'node_modules/**']),

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  // `configs.flat` es la variante en formato plano; `configs['recommended-latest']`
  // conserva la forma antigua de eslintrc y ESLint 10 la rechaza.
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,
  prettier,

  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: { allowDefaultProject: ['*.js', 'scripts/*.mjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      'no-console': 'error',
    },
  },

  // Las capas compartidas no pueden depender de una funcionalidad concreta.
  // Sin esta regla, `shared` acaba importando de `features` y deja de ser
  // compartida: se convierte en el punto por el que todo se acopla con todo.
  {
    files: ['src/shared/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/**', '@/features/*'],
              message:
                'Las capas compartidas no pueden importar de features. Si el codigo es especifico de una funcionalidad, pertenece a esa feature.',
            },
          ],
        },
      ],
    },
  },

  // Una feature no importa de otra feature. La comunicacion entre ellas ocurre
  // por rutas, por estado compartido o por el cliente HTTP, no por acoplamiento
  // directo entre modulos.
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*/'],
              message:
                'Una feature no importa de otra feature. Se usa el estado compartido, las rutas o el cliente HTTP.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },

  {
    files: ['vite.config.ts', 'eslint.config.js', 'scripts/*.mjs'],
    languageOptions: { globals: globals.node },
  },
])
