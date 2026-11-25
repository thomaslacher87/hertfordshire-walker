import { Component, type ReactNode } from 'react';

export class MapBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed)
      return (
        <p role="status">
          The map is unavailable. Browse the results list below.
        </p>
      );
    return this.props.children;
  }
}
