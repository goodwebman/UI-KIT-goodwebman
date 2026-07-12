import type { Meta, StoryObj } from '@storybook/react-vite';
import { UISkeleton } from './UISkeleton';

const meta = {
  component: UISkeleton,
  tags: ['autodocs'],
  title: 'Feedback/UISkeleton',
  argTypes: {
    className: { control: 'text' },
  },
} satisfies Meta<typeof UISkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { className: 'h-4 w-3/4' } };
export const Circle: Story = { args: { className: 'size-12 rounded-full' } };
export const TextLine: Story = { args: { className: 'h-4 w-full' } };
export const CardSkeleton: Story = {
  parameters: {
    docs: {
      source: {
        code: `<div className="flex flex-col gap-3 p-4 border rounded-lg">
  <UISkeleton className="size-12 rounded-full" />
  <UISkeleton className="h-4 w-3/4" />
  <UISkeleton className="h-4 w-full" />
  <UISkeleton className="h-4 w-1/2" />
</div>`,
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-3 p-4 border rounded-lg">
      <UISkeleton className="size-12 rounded-full" />
      <UISkeleton className="h-4 w-3/4" />
      <UISkeleton className="h-4 w-full" />
      <UISkeleton className="h-4 w-1/2" />
    </div>
  ),
};
