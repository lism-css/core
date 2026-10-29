import type { Meta, StoryObj } from '@storybook/react-vite';
import { WithSide } from './index';
import { Box } from '../Box';

const meta: Meta<typeof WithSide> = {
  title: 'Layout/WithSide',
  component: WithSide,
  tags: ['autodocs'],
  argTypes: {
    children: { control: false },
    sideW: {
      control: 'text',
      description: 'サイドバーの幅',
    },
    mainW: {
      control: 'text',
      description: 'メインエリアの最小幅',
    },
  },
};

export default meta;
type Story = StoryObj<typeof WithSide>;

export const Default: Story = {
  args: {
    g: '30',
    children: (
      <>
        <Box p="15" bd>
          Main Content
        </Box>
        <Box isSide p="15" bgc="base-2">
          Side Content
        </Box>
      </>
    ),
  },
};

export const WithSideWidth: Story = {
  name: 'sideW 指定',
  args: {
    g: '30',
    sideW: '300px',
    children: (
      <>
        <Box p="15" bd>
          Main Content
        </Box>
        <Box isSide p="15" bgc="base-2">
          sideW: 300px
        </Box>
      </>
    ),
  },
};

export const WithMainWidth: Story = {
  name: 'mainW 指定',
  args: {
    g: '30',
    mainW: '40em',
    children: (
      <>
        <Box p="15" bd>
          mainW: 40em
        </Box>
        <Box isSide p="15" bgc="base-2">
          Side Content
        </Box>
      </>
    ),
  },
};

// fxd='row-reverse' で横並び時にサイドを左側に配置
export const Reversed: Story = {
  name: 'fxd: row-reverse（反転）',
  args: {
    fxd: 'row-reverse',
    g: '30',
    children: (
      <>
        <Box p="15" bd>
          Main Content
        </Box>
        <Box isSide p="15" bgc="base-2">
          Side Content
        </Box>
      </>
    ),
  },
};
