export type Locale = {
  id: string;
  name: string;
}

export const DEFAULT_LOCALE: Locale = {
  id: '',
  name: 'Default'
}

export const LOCALES: Locale[] = [
  DEFAULT_LOCALE,
  {
    id: 'en',
    name: 'English'
  },
  {
    id: 'fr',
    name: 'French'
  },
  {
    id: 'de',
    name: 'German'
  },
  {
    id: 'es',
    name: 'Spanish'
  },
  {
    id: 'it',
    name: 'Italian'
  },
  {
    id: 'ro',
    name: 'Romanian'
  },
  {
    id: 'ru',
    name: 'Russian'
  }
]
