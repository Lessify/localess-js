import {LocalessSchemaProps, localessEditable, localessEditableField} from "@localess/react";
import {Button as ButtonModel} from "@/shared/models/localess";
import {Button} from "@/components/ui/button";

export type ButtonLocalessProps = LocalessSchemaProps<ButtonModel>

export function ButtonLocaless({data}: ButtonLocalessProps) {
  return (
    <Button {...localessEditable(data)} type="button" variant={data.type === 'primary' ? 'default' : 'secondary'}>
      <span {...localessEditableField('label')}>{data.label}</span>
    </Button>
  );
}
