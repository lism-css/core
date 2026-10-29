import type { Meta, StoryObj } from '@storybook/react-vite';
import { Flex } from './index';

const meta: Meta<typeof Flex> = {
  title: 'Layout/Flex',
  component: Flex,
  tags: ['autodocs'],
  argTypes: {
    children: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof Flex>;

const DemoItems = () => (
  <>
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
  </>
);

export const Default: Story = {
  args: {
    g: '20',
    children: <DemoItems />,
  },
};

export const WithJustify: Story = {
  name: 'jc: center',
  args: {
    g: '20',
    jc: 'center',
    children: <DemoItems />,
  },
};

export const WithAlign: Story = {
  name: 'ai: center',
  args: {
    g: '20',
    ai: 'center',
    children: <DemoItems />,
  },
};

export const WithWrap: Story = {
  name: 'fxw: wrap',
  args: {
    g: '20',
    fxw: 'wrap',
    children: (
      <>
        <div>Flex Item 1</div>
        <div>Flex Item 2</div>
        <div>Flex Item 3</div>
        <div>Flex Item 4</div>
        <div>Flex Item 5</div>
        <div>Flex Item 6</div>
      </>
    ),
  },
};
