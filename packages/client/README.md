<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# Localess JavaScript / TypeScript Client SDK

This client SDK is designed to work with the Localess API. It provides a simple way to interact with the Localess API from your JavaScript or TypeScript application.

> **Important:** 
> The Client is designed to be used on the server side only, as it requires your **Localess API Token** to be kept secret.
> Do not use this client in your frontend application, as it exposes your API Token to the public.

## Installation

### NPM
````bash
npm install @localess/js-client@latest
````

### Yarn
````bash
yarn add @localess/js-client@latest
````

## Client

````ts
import {localessClient} from "@localess/js-client";

const llClient = localessClient({
  // A fully qualified domain name with protocol (http/https) and port.
  origin: 'https://my-localess.web.app',
  // Localess space ID, cna be found in the Localess Space settings
  spaceId: 'I1LoVe2LocaLess4Rever',
  // Localess API token, can be found in the Localess Space settings
  token: 'Baz00KaT0KeN8S3CureLL'
});

// Fetch all Content Links
llClient.getLinks()
// Fetch content by SLUG
llClient.getContentBySlug('docs/overview')
// Fetch content by ID
llClient.getContentById('FRnIT7CUABoRCdSVVGGs')
// Fetch translations by locale
llClient.getTranslations('en') 
````

## Sync with Visual Editor

It will automatically inject Localess Sync Script in to the HTML page.

````ts
import {loadLocalessSync} from "@localess/js-client";

// A fully qualified domain name with protocol (http/https) and port.
loadLocalessSync('https://my-localess.web.app')
````
