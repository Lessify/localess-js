import { defineConfig, defineEnum, defineField, defineSchema } from '@localess/schema';

export const Status = defineEnum({
  id: 'Status',
  displayName: 'Status',
  values: [
    { name: 'Draft', value: 'draft' },
    { name: 'Published', value: 'published' },
  ],
});

export const Button = defineSchema({
  id: 'Button',
  type: 'NODE',
  displayName: 'Button',
  fields: [
    defineField({ name: 'label', kind: 'TEXT', required: true, translatable: true }),
    defineField({ name: 'link', kind: 'LINK' }),
    defineField({ name: 'status', kind: 'OPTION', source: Status }),
  ],
});

export const Page = defineSchema({
  id: 'Page',
  type: 'ROOT',
  displayName: 'Page',
  fields: [
    defineField({ name: 'title', kind: 'TEXT', required: true, translatable: true }),
    defineField({ name: 'body', kind: 'RICH_TEXT' }),
    defineField({ name: 'actions', kind: 'SCHEMAS', schemas: [Button] }),
  ],
});

export const config = defineConfig({ schemas: [Status, Button, Page] });
