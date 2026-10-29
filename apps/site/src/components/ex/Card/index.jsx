import { Lism } from 'lism-css/react';
import atts from 'lism-css/lib/helper/atts';

export default function Card({ layout = 'withSide', className, ...props }) {
  const defaultProps = {
    c: 'text',
    bgc: 'base',
    bdrs: '20',
    bxsh: '20',
    ov: 'h',
  };

  if (props.href) {
    defaultProps.tag = 'a';
    defaultProps.isBoxLink = true;
  }

  return <Lism {...defaultProps} {...props} className={atts(className, 'c--card')} />;
}
