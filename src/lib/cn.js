/** Join truthy class names. Tiny stand-in for `clsx`. */
export const cn = (...classes) => classes.filter(Boolean).join(' ');
