import {localessInit} from "@localess/react/rsc";
import {PageLocaless} from "@/shared/components/localess/page";

export const localessClient = localessInit({
  origin: "https://demo.localess.org", // Replace it for your origin
  spaceId: "MmaT4DL0kJ6nXIILUcQF", // Replace it for your spaceId
  token: "Y4rvboPnyzVeC7LddEK5", // Replace it for your token
  debug: true,
  enableSync: true,
  components: {
    'Page': PageLocaless
  }
})

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
