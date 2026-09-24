import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldItem,
  FieldLabel,
  Fieldset,
  FieldsetLegend,
} from "./field";
import { Radio, RadioGroup } from "./radio";

const meta = {
  title: "UI/Radio",
  component: RadioGroup,
  decorators: [
    (Story) => (
      <div style={{ width: "24rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Group: Story = {
  render: () => (
    <Fieldset>
      <FieldsetLegend>Visibility</FieldsetLegend>
      <RadioGroup name="visibility" defaultValue="private" required>
        <Field name="visibility">
          <FieldItem>
            <FieldLabel>
              <Radio value="private" />
              Private
            </FieldLabel>
            <FieldDescription>Only you can see it.</FieldDescription>
          </FieldItem>
          <FieldItem>
            <FieldLabel>
              <Radio value="shared" />
              Shared
            </FieldLabel>
          </FieldItem>
          <FieldError />
        </Field>
      </RadioGroup>
    </Fieldset>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Fieldset>
      <FieldsetLegend>Visibility</FieldsetLegend>
      <RadioGroup name="visibility" defaultValue="private" disabled>
        <Field name="visibility" disabled>
          <FieldItem>
            <FieldLabel>
              <Radio value="private" />
              Private
            </FieldLabel>
          </FieldItem>
          <FieldItem>
            <FieldLabel>
              <Radio value="shared" />
              Shared
            </FieldLabel>
          </FieldItem>
        </Field>
      </RadioGroup>
    </Fieldset>
  ),
};

export const Invalid: Story = {
  render: () => (
    <Fieldset>
      <FieldsetLegend>Visibility</FieldsetLegend>
      <RadioGroup name="visibility">
        <Field name="visibility" invalid>
          <FieldItem>
            <FieldLabel>
              <Radio value="private" />
              Private
            </FieldLabel>
          </FieldItem>
          <FieldItem>
            <FieldLabel>
              <Radio value="shared" />
              Shared
            </FieldLabel>
          </FieldItem>
          <FieldError match={true}>Choose a visibility setting.</FieldError>
        </Field>
      </RadioGroup>
    </Fieldset>
  ),
};
