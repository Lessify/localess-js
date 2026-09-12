import {Component, computed} from '@angular/core';
import {SchemaComponent} from '@localess/angular';
import {Button} from '../../../models/localess';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.component.html',
})
export class ButtonComponent extends SchemaComponent<Button> {
  computedClass = computed(() => {
    const type = this.data().type;
    let classes = "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
    switch (type) {
      case 'primary': {
        classes += " bg-primary text-primary-foreground hover:bg-primary/90"
        break
      }
      case 'secondary': {
        classes += " bg-secondary text-secondary-foreground hover:bg-secondary/80"
        break;
      }
    }
    return classes;
  })
}
