import {forwardRef, useEffect, useState} from "react";
import {ContentData, isBrowser, Links, References} from "@localess/client";
import {LocalessComponent} from "../core/components";
import {isSyncEnabled} from "../core/state";

export type LocalessDocumentProps<T extends ContentData = ContentData> = {
  data: T
  links?: Links
  references?: References;
}

export const LocalessDocument = forwardRef<HTMLElement, LocalessDocumentProps>(({data, links, references, ...restProps}, ref) => {
  const [contentData, setContentData] = useState(data);
  useEffect(() => {
    if (isSyncEnabled() && isBrowser()) {
      window.localess?.on(['input', 'change'], (event) => {
        console.log('Localess:event', event)
        if (event.type === 'change' || event.type === 'input') {
          setContentData(event.data)
        }
      })
    }
  })

  return (
    <LocalessComponent ref={ref} data={contentData} links={links} references={references} {...restProps}/>
  );
});
