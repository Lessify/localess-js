import {localessEditable, localessEditableField} from "@localess/react";
import type {LocalessComponentProps} from "@localess/react";
import type {Button as ButtonModel} from "@/shared/models/localess";
import {Button} from "@/components/ui/button";

export type ButtonLocalessProps = LocalessComponentProps<ButtonModel>

export default function ButtonLocaless({data}: ButtonLocalessProps) {
  return (
    <Button {...localessEditable(data)} type="button" variant={data.type === 'primary' ? 'default' : 'secondary'}>
      <span {...localessEditableField('label')}>{data.label}</span>
    </Button>
  );
}
