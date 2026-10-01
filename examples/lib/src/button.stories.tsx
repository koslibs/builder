import type { Meta, StoryObj } from '@koslibs/builder/storybook';

import { Button } from './button.js';

const meta = {
    title: 'Example/Button',
    component: Button,
    tags: ['autodocs'],
    args: { label: 'GullEye' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
