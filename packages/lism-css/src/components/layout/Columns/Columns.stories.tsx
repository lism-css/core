import type { Meta, StoryObj } from '@storybook/react-vite';
import { Columns } from './index';
import { Box } from '../Box';

const meta: Meta<typeof Columns> = {
  title: 'Layout/Columns',
  component: Columns,
  tags: ['autodocs'],
  argTypes: {
    children: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof Columns>;

const DemoItems = () => (
  <>
    <Box bgc="base-2" p="20">
      Column 1
    </Box>
    <Box bgc="base-2" p="20">
      Column 2
    </Box>
    <Box bgc="base-2" p="20">
      Column 3
    </Box>
  </>
);

export const Default: Story = {
  args: {
    g: '20',
    children: <DemoItems />,
  },
};

export const TwoColumns: Story = {
  name: 'cols: 2',
  args: {
    g: '20',
    cols: 2,
    children: <DemoItems />,
  },
};

export const ResponsiveColumns: Story = {
  name: 'cols: responsive',
  args: {
    g: '20',
    cols: ['2', '3'],
    children: <DemoItems />,
  },
};
