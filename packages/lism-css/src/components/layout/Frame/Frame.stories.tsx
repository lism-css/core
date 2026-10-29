import type { Meta, StoryObj } from '@storybook/react-vite';
import { Frame } from './index';

const meta: Meta<typeof Frame> = {
  title: 'Layout/Frame',
  component: Frame,
  tags: ['autodocs'],
  argTypes: {
    children: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof Frame>;

export const Default: Story = {
  args: {
    ar: '16/9',
    bgc: 'base-2',
    children: <p>Frame content (16:9)</p>,
  },
};

export const ResponsiveAspect: Story = {
  name: 'ar: レスポンシブ',
  args: {
    ar: ['1/1', '3/2', '16/9'],
    bgc: 'base-2',
    children: <p>Responsive aspect ratio</p>,
  },
};
