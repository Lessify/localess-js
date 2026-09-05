import {localessInit} from "@localess/react/rsc";
import {PageLocaless} from "@/components/localess/page";
import {ButtonLocaless} from "@/components/localess/button";

export const localessClient = localessInit({
  origin: "https://demo.localess.org", // Replace it for your origin
  spaceId: "MmaT4DL0kJ6nXIILUcQF", // Replace it for your spaceId
  token: "Y4rvboPnyzVeC7LddEK5", // Replace it for your token
  debug: true,
  enableSync: true,
  components: {
    'Page': PageLocaless,
    'Button': ButtonLocaless
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
    id: 'ro',
    name: 'Romanian'
  },
  {
    id: 'ru',
    name: 'Russian'
  }
]
