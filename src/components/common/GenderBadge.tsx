import styles from './GenderBadge.module.css';

interface GenderBadgeProps {
  article: 'der' | 'die' | 'das';
  style?: React.CSSProperties;
}

export default function GenderBadge({ article, style }: GenderBadgeProps) {
  const articleClass = styles[article] || '';

  return (
    <span className={`${styles.badgeGender} ${articleClass}`} style={style}>
      {article}
    </span>
  );
}
