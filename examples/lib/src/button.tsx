import styles from './button.module.css';

export interface ButtonProps {
    label: string;
}

export function Button({ label }: ButtonProps) {
    return (
        <button type="button" className={styles.button}>
            {label}
        </button>
    );
}
