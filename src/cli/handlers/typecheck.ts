import { packageBin } from '../../utils/packages.js';
import { runNode } from '../process.js';

export async function typecheck(root: string): Promise<number> {
    return runNode(
        packageBin('typescript', 'tsc'),
        ['--project', 'tsconfig.json', '--noEmit'],
        root
    );
}
