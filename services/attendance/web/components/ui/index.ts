// UI Components - Basic exports for build compatibility

export const Button = ({ children, ...props }: any) => (
  <button {...props}>{children}</button>
);

export const Input = ({ ...props }: any) => (
  <input {...props} />
);

export const Card = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const CardContent = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const CardHeader = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const CardTitle = ({ children, ...props }: any) => (
  <h3 {...props}>{children}</h3>
);

export default {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle
};