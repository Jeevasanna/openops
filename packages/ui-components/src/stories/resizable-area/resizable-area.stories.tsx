import type { Meta, StoryObj } from '@storybook/react';
import { ResizableArea } from '../../components';

const meta = {
  title: 'Components/ResizableBlock',
  component: ResizableArea,
  tags: ['autodocs'],
  args: {
    initialWidth: 200,
    initialHeight: 200,
    minWidth: 150,
    minHeight: 150,
    maxWidth: 500,
    maxHeight: 500,
    children: (
      <p className="text-primary">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque
        accumsan ante magna, sit amet bibendum magna pellentesque a. Integer
        rhoncus maximus mauris, sit amet lobortis turpis elementum scelerisque.
        Pellentesque consectetur risus laoreet feugiat laoreet. Nunc non
        vulputate dui, a fermentum elit. Orci varius natoque penatibus et magnis
        dis parturient montes, nascetur ridiculus mus. Vivamus ac massa
        venenatis, faucibus lectus a, viverra leo. Proin quis pellentesque
        lorem, et accumsan massa. Nunc ut porta magna.
      </p>
    ),
  },
  argTypes: {
    children: {
      table: {
        disable: true,
      },
    },
  },
  render: (args) => (
    <div className="w-[600px] h-[600px] p-[50px] border bg-background">
      <ResizableArea {...args} className="border"></ResizableArea>
    </div>
  ),
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ResizableArea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
