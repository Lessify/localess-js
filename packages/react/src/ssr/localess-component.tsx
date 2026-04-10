import {forwardRef} from "react";
import {FONT_BOLD, FONT_NORMAL} from "../console";
import {getComponent, getFallbackComponent} from "../core/state";
import {ContentData, Links, References} from "../core/models";

export type LocalessServerComponentProps<T extends ContentData = ContentData> = {
  data: T
  links?: Links
  references?: References;
}

export const LocalessServerComponent = forwardRef<HTMLElement, LocalessServerComponentProps>(({data, links, references, ...restProps}, ref) => {
  if (!data) {
    console.error('LocalessServerComponent property %cdata%c is not provided.', FONT_BOLD, FONT_NORMAL)
    return <div>LocalessServerComponent property <b>data</b> is not provided.</div>
  }
  // Find Component from Mapping
  const Comp = getComponent(data._schema);
  if (Comp) {
    return <Comp ref={ref} data={data} links={links} references={references} {...restProps} />;
  }
  // Try to use Fallback Component
  const FallbackComponent = getFallbackComponent()
  if (FallbackComponent) {
    return <FallbackComponent ref={ref} data={data} links={links} references={references} {...restProps} />
  }
  // Missing Configuration case
  return (
    <p>
      <b>LocalessServerComponent</b> could not found component with key <b>{data._schema}</b>. <br/>
      Please check if your configuration is correct.
    </p>
  );
});
