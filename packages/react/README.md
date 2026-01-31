<br/>
<br/>
<img src="https://github.com/Lessify/localess/wiki/img/logo-adaptive.svg" alt="logo">
<br/>
<br/>

----

# Localess React

This client SDK is designed to work with the Localess API. It provides a simple way to interact with the Localess API from your React application.

## Installation

### NPM
````bash
npm install @localess/react
````

### Yarn
````bash
yarn add @localess/react
````

## Usage

### Initialize and Visual Editor
````tsx
import { localessInit } from "@localess/react";
import { Page, Header, Teaser, Footer } from "@/components"

localessInit({
  origin: "https://my-localess.web.app",
  spaceId: "I1LoVe2LocaLess4Rever",
  token: "Baz00KaT0KeN8S3CureLL",
  enableSync: true, //Enable Visual Editor Sync Script,
  components: {
    'page': Page,
    'header': Header,
    'teaser': Teaser,
    'footer': Footer,
  },
})
````

### React Component
Example of Header Component with Menu Items

````tsx
import { llEditable, LocalessComponent } from "@localess/react";

const Header = ({data}) => {
  return (
    <nav {...llEditable(data)}>
      {data.items.map(item => <LocalessComponent key={item._id} data={item} />)}
    </nav>
  )
}
````

### Listen for Visual Editor Events
Your application can subscribe to the Localess Visual Editor Events.
Example from NextJS 15

````tsx
import { llEditable, LocalessComponent, getLocalessClient } from "@localess/react";

export default async function Page({searchParams}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const {locale} = await searchParams
  const {data} = await fetchData(locale?.toString());
  const [ pageData, setPageData ] = useState(data);
  
  
  if (window.localess) {
    window.localess.on(['input', 'change'], (event) => {
      if (event.type === 'input' || event.type === 'change') {
        setPageData(event.data);
      }
    });
  }
  return (
    <main {...llEditable(data)}>
      {data.body.map(item => <LocalessComponent key={item._id} data={item} />)}
    </main>
  )
}

async function fetchData(locale?: string): Promise<Content<Page>> {
  const client = getLocalessClient(); // Get LocalessClient Initlialized before
  return client.getContentBySlug<Page>('home', {locale: locale ? locale : undefined});
}
````
