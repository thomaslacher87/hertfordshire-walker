import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AppRoutes } from './App';

afterEach(cleanup);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('application routes', () => {
  it('renders the countryside foundation at the root', () => {
    renderAt('/');

    expect(
      screen.getByRole('heading', {
        name: 'Walks worth looking forward to.',
      }),
    ).toBeInTheDocument();
  });

  it('renders a walk route directly', () => {
    renderAt('/walk/42');

    expect(
      screen.getByRole('heading', { name: 'Walk 42' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/reloading this URL directly verifies/i),
    ).toBeInTheDocument();
  });

  it('redirects an unknown route to the foundation', () => {
    renderAt('/not-a-page');

    expect(
      screen.getByRole('heading', {
        name: 'Walks worth looking forward to.',
      }),
    ).toBeInTheDocument();
  });
});
