import type { Meta, StoryObj } from '@storybook/react-vite';
import { UISpinner } from './UISpinner';

const meta = {
  component: UISpinner,
  tags: ['autodocs'],
  title: 'Feedback/UISpinner',
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
} satisfies Meta<typeof UISpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg' } };
export const ExtraLarge: Story = { args: { size: 'xl' } };
