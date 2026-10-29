import type { Meta, StoryObj } from '@storybook/react-vite';
import { SwitchColumns } from './index';

const meta: Meta<typeof SwitchColumns> = {
  title: 'Layout/SwitchColumns',
  component: SwitchColumns,
  tags: ['autodocs'],
  argTypes: {
    children: { control: false },
    breakSize: {
      control: 'text',
      description: 'カラム切り替えのブレークポイント',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SwitchColumns>;

const DemoItems = () => (
  <>
    <div>Column 1</div>
    <div>Column 2</div>
  </>
);

export const Default: Story = {
  args: {
    g: '20',
    children: <DemoItems />,
  },
};

export const WithBreakSize: Story = {
  name: 'breakSize 指定',
  args: {
    g: '20',
    breakSize: '600px',
    children: <DemoItems />,
  },
};

export const ThreeColumns: Story = {
  name: '3カラム',
  args: {
    g: '20',
    children: (
      <>
        <div>Column 1</div>
        <div>Column 2</div>
        <div>Column 3</div>
      </>
    ),
  },
};

export const WithFlexGrow: Story = {
  name: '子要素の flex-grow',
  args: {
    breakSize: 's',
    g: '20',
    children: (
      <>
        <div style={{ flexGrow: 2 }}>Column 1（flexGrow: 2）</div>
        <div>Column 2</div>
      </>
    ),
  },
};
