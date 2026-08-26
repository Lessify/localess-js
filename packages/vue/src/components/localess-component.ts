import { defineComponent, h, type PropType } from 'vue';

import { getComponent, getFallbackComponent } from '../client';
import type { ContentDataSchema } from '../models';
import { localessEditable } from '../utils';

export const LocalessComponent = defineComponent({
  name: 'LocalessComponent',
  props: {
    data: {
      type: Object as PropType<ContentDataSchema>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const Comp = getComponent(props.data._schema);
      if (Comp) {
        return h(Comp, { data: props.data, ...localessEditable(props.data) });
      }
      const Fallback = getFallbackComponent();
      if (Fallback) {
        return h(Fallback, { data: props.data });
      }
      return h('p', [
        'LocalessComponent could not find component with key ',
        h('b', props.data._schema),
        '. Please check if your configuration is correct.',
      ]);
    };
  },
});
