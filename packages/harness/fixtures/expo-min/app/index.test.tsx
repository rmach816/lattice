import { render, screen } from '@testing-library/react-native';
import Index from './index';

describe('Index', () => {
  it('renders welcome message', () => {
    render(<Index />);
    expect(screen.getByText('Welcome to Expo')).toBeTruthy();
  });
});
