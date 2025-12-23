import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';

test('renders login page on initial route', () => {
  render(
    <Router>
      <App />
    </Router>
  );
  expect(screen.getByText(/로그인/i)).toBeInTheDocument();
});

