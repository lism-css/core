import type { Meta, StoryObj } from '@storybook/react-vite';
import { Flow } from './index';

const meta: Meta<typeof Flow> = {
  title: 'Layout/Flow',
  component: Flow,
  tags: ['autodocs'],
  argTypes: {
    children: { control: false },
    flow: {
      control: 'text',
      description: 'フロー方向の余白量',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Flow>;

const DemoContent = () => (
  <>
    <p>Paragraph 1</p>
    <p>Paragraph 2</p>
    <h2>Heading</h2>
    <p>Paragraph 3</p>
    <p>Paragraph 4</p>
  </>
);

export const Default: Story = {
  args: {
    children: <DemoContent />,
  },
};

export const WithFlowValue: Story = {
  name: 'flow 指定',
  args: {
    flow: '40',
    children: <DemoContent />,
  },
};

export const SmallFlow: Story = {
  name: 'flow:s',
  args: {
    flow: 's',
    children: <DemoContent />,
  },
};

// is--skipFlow で先頭要素の余白を打ち消す
export const WithSkipFlow: Story = {
  name: 'is--skipFlow',
  args: {
    children: (
      <>
        <div className="is--skipFlow">Skip flow...</div>
        <p>Lorem ipsum, Example content...</p>
        <p>Lorem ipsum, Example content...</p>
        <p>Lorem ipsum, Example content...</p>
      </>
    ),
  },
};
