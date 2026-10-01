import { createRoot } from 'react-dom/client';

import { greeting } from './greeting.js';

import styles from './main.module.css';

const root = document.getElementById('root');
if (!root) {
    throw new Error('Missing root element');
}
createRoot(root).render(
    <main className={styles.main}>
        <h1>{greeting('GullEye')}</h1>
        <p>{import.meta.env.PUBLIC_API_URL ?? 'Local development'}</p>
        <button
            type="button"
            onClick={() => void import('./details.js').then(({ showDetails }) => showDetails())}
        >
            Details
        </button>
    </main>
);
