import {Page} from "@/shared/generated/localess";
import {LocalessComponentProps} from "@localess/react";

export type PageLocalessProps = LocalessComponentProps<Page>

export function PageLocaless({data}:PageLocalessProps) {
  return <main className="flex flex-col gap-4">
    <h1 className="text-center">{data?.title}</h1>
    <p className="text-center whitespace-pre-line">{data?.description}</p>
  </main>;
}
