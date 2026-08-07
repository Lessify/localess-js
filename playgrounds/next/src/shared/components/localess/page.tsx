import {Page} from "@/shared/generated/localess";
import {LocalessComponentProps, localessEditable, localessEditableField} from "@localess/react";

export type PageLocalessProps = LocalessComponentProps<Page>

export function PageLocaless({data}:PageLocalessProps) {
  return <main {...localessEditable(data)} className="flex flex-col gap-4">
    <h1 {...localessEditableField('title')} className="text-center">
      {data?.title}
    </h1>
    <p {...localessEditableField('description')} className="text-center whitespace-pre-line">
      {data?.description}
    </p>
  </main>
}
