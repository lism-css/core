import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { Spacer } from './index';
import { Lism } from '../../Lism';

const meta: Meta<typeof Spacer> = {
  title: 'Atomic/Spacer',
  component: Spacer,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Spacer>;

// Storybook のデコレータ用に公式の Decorator 型を使い、any を避ける
const VerticalDecorator: Decorator = (Story) => (
  <div>
    <Lism bgc="base-2" p="20">
      Before
    </Lism>
    <Story />
    <Lism bgc="base-2" p="20">
      After
    </Lism>
  </div>
);

export const Default: Story = {
  decorators: [VerticalDecorator],
  args: {
    h: '30',
  },
};

export const Large: Story = {
  name: 'h: "50"',
  tags: ['!test'],
  decorators: [VerticalDecorator],
  args: {
    h: '50',
  },
};

export const Responsive: Story = {
  name: 'レスポンシブ',
  decorators: [VerticalDecorator],
  args: {
    h: { base: '30', sm: '40', md: '50' },
  },
};

export const Horizontal: Story = {
  name: 'w 指定（横方向）',
  decorators: [
    (Story) => (
      <div className="l--flex">
        <Lism bgc="base-2" p="20">
          Left
        </Lism>
        <Story />
        <Lism bgc="base-2" p="20">
          Right
        </Lism>
      </div>
    ),
  ],
  args: {
    w: '40',
  },
};
