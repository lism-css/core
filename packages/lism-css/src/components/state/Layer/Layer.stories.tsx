import type { Meta, StoryObj } from '@storybook/react-vite';
import { Layer } from './index';
import { Lism } from '../../Lism';

const meta: Meta<typeof Layer> = {
  title: 'State/Layer',
  component: Layer,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Lism pos="relative" p="30" bgc="base-2" h="50svh">
        <Lism as="p" o="ppp" fz="2xl" ff="mono" fw="bold">
          BACKGROUND BACKGROUND BACKGROUND BACKGROUND
        </Lism>
        <Story />
      </Lism>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Layer>;

export const Default: Story = {
  args: {
    children: <p>Layer content</p>,
  },
};

export const WithBlur: Story = {
  name: 'blur 指定',
  tags: ['!test'],
  args: {
    style: { backdropFilter: 'blur(4px)' },
    children: <p>Blurred layer</p>,
  },
};

export const CenterLayer: Story = {
  name: 'センター配置',
  tags: ['!test'],
  args: {
    m: 'auto',
    w: 'fit',
    h: 'fit',
    children: <Lism>Centered layer</Lism>,
  },
};
