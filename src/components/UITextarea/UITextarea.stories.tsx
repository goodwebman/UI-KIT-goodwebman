import type { Meta, StoryObj } from '@storybook/react-vite';
import { UITextarea } from './UITextarea';

const meta = {
  component: UITextarea,
  tags: ['autodocs'],
  title: 'Forms/UITextarea',
  argTypes: {
    error: { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof UITextarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Введите описание…' },
};

export const Error: Story = {
  args: { error: 'Обязательное поле' },
};

export const Disabled: Story = {
  args: { disabled: true, value: 'Неактивно' },
};

export const WithValue: Story = {
  args: { defaultValue: 'Long text content\nwith multiple lines', rows: 5 },
};

export const WithCounter: Story = {
  args: {
    placeholder: 'Расскажите о себе…',
    maxLength: 120,
    rows: 4,
  },
};
