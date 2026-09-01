import {LocalessRichText, LocalessServerComponent, LocalessServerComponentProps, localessEditable, localessEditableField} from "@localess/react/ssr";
import {Page} from "@/shared/models/localess";

export type PageLocalessProps = LocalessServerComponentProps<Page>

export function PageLocaless({data}:PageLocalessProps) {
  return <main {...localessEditable(data)} className="flex flex-col gap-4">
    <h1 {...localessEditableField('title')} className="text-center">
      {data?.title}
    </h1>
    <p {...localessEditableField('description')} className="text-center whitespace-pre-line">
      {data?.description}
    </p>
    <div className="flex justify-center gap-2">
      {data?.buttons?.map(button => (
        <LocalessServerComponent key={button._id} data={button} />
      ))}
    </div>
    {data?.content && (
      <div {...localessEditableField('content')} className="prose dark:prose-invert mx-auto">
        <LocalessRichText content={data.content} />
      </div>
    )}
  </main>
}
