import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid } from './index';
import { Box } from '../Box';

const meta: Meta<typeof Grid> = {
  title: 'Layout/Grid',
  component: Grid,
  tags: ['autodocs'],
  argTypes: {
    children: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof Grid>;

const DemoItems = () => (
  <>
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
    <div>Item 4</div>
  </>
);

export const Default: Story = {
  args: {
    g: '20',
    children: <DemoItems />,
  },
};

export const WithGtc: Story = {
  name: 'gtc 指定',
  args: {
    g: '20',
    gtc: '1fr 1fr 1fr',
    children: <DemoItems />,
  },
};

export const WithGridAreas: Story = {
  name: 'gta でエリアレイアウト',
  args: {
    g: '15',

    gtc: ['1fr 1fr', '8em 1fr 8em'],

    gta: [`'main main' 'left right'`, `'left main right'`],
    children: (
      <>
        <Box ga="left" p="15" bgc="base-2">
          Left
        </Box>
        <Box ga="main" p="15" bd>
          Center
        </Box>
        <Box ga="right" p="15" bgc="base-2">
          Right
        </Box>
      </>
    ),
  },
};
