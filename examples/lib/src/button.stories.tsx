import type { Meta, StoryObj } from '@koslibs/builder/storybook';
import { Controls, Primary, Title } from '@koslibs/builder/storybook/blocks';

import { Button } from './button.js';

const meta = {
    title: 'Example/Button',
    component: Button,
    tags: ['autodocs'],
    args: { label: 'GullEye' },
    parameters: {
        docs: {
            page: () => (
                <section data-custom-docs="builder-blocks">
                    <Title />
                    <Primary />
                    <Controls />
                </section>
            ),
        },
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
