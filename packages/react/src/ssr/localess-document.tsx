import {forwardRef} from "react";
import {Content, ContentData} from "../core/models";
import {LocalessServerComponent} from "./localess-component";
import {FONT_BOLD, FONT_NORMAL} from "../console";

export type LocalessServerDocumentProps<T extends ContentData = ContentData> = {
  document: Content<T>
}

export const LocalessServerDocument = forwardRef<HTMLElement, LocalessServerDocumentProps>(({document}, ref) => {
  if (!document || !document.data) {
    console.error('LocalessServerDocument property %cdocument.data%c is not provided.', FONT_BOLD, FONT_NORMAL)
    return <div>LocalessServerDocument property <b>document.data</b> is not provided.</div>
  }

  return (
    <LocalessServerComponent ref={ref} data={document.data} links={document.links} references={document.references}/>
  );
});
