import { defineToolbarApp } from 'astro/toolbar';

function createWindowElement(content: string) {
  const windowElement = document.createElement('astro-dev-toolbar-window');
  windowElement.innerHTML = content;
  return windowElement;
}

const links = [
  { name: 'Localess Docs', description: 'Browse the Localess documentation.', link: 'https://docs.localess.io' },
  { name: 'Report a Bug', description: 'Help us make @localess/astro better.', link: 'https://github.com/Lessify/localess-js/issues' },
];

function createCanvas() {
  return createWindowElement(`
    <style>
      #links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      #links astro-dev-toolbar-card { color: white; }
      #links astro-dev-toolbar-card h3 { margin: 0.5em 0; color: white; }
      #links astro-dev-toolbar-card p { margin: 0; }
    </style>
    <section id="links">
      ${links.map(link => `<astro-dev-toolbar-card link="${link.link}"><h3>${link.name}</h3><p>${link.description}</p></astro-dev-toolbar-card>`).join('')}
    </section>
  `);
}

export default defineToolbarApp({
  init(canvas) {
    canvas.appendChild(createCanvas());
  },
});
